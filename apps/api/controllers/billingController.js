import { stripe } from '../utils/stripeClient.js';
import { supabase } from '../utils/supabaseClient.js';

async function getOrCreateCustomer(user) {
  // store it on profiles to keep it simple
  const { data: prof } = await supabase.from('profiles').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (prof?.stripe_customer_id) return prof.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: user.email || undefined,
    metadata: { user_id: user.id }
  });

  await supabase.from('profiles').upsert({ user_id: user.id, stripe_customer_id: customer.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  return customer.id;
}

export async function createCheckoutSession(req, res) {
  try {
    const { price_id } = req.body;
    if (!price_id) return res.status(400).json({ error: 'price_id required' });

    const customerId = await getOrCreateCustomer(req.user);
    // Look up the price to choose mode and let metadata drive allowances
    const price = await stripe.prices.retrieve(price_id);
    const mode = price.type === 'one_time' ? 'payment' : 'subscription';

    const session = await stripe.checkout.sessions.create({
      mode,
      customer: customerId,
      client_reference_id: req.user.id,     // so webhook can map user
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/settings?billing=success`,
      cancel_url: `${process.env.CLIENT_URL}/settings?billing=cancel`,
      allow_promotion_codes: true
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('[billing] createCheckoutSession', e);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

export async function createPortalSession(req, res) {
  try {
    const { data: prof } = await supabase.from('profiles').select('stripe_customer_id').eq('user_id', req.user.id).maybeSingle();
    if (!prof?.stripe_customer_id) return res.status(400).json({ error: 'No customer on file' });

    const portal = await stripe.billingPortal.sessions.create({
      customer: prof.stripe_customer_id,
      return_url: `${process.env.CLIENT_URL}/settings`
    });

    res.json({ url: portal.url });
  } catch (e) {
    console.error('[billing] createPortalSession', e);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
}

// Helper: read allowances from price metadata
async function getAllowances(priceId) {
  const price = await stripe.prices.retrieve(priceId);
  const m = price.metadata || {};
  return {
    kind: m.kind || (price.type === 'one_time' ? 'onetime' : 'recurring'),
    emails: parseInt(m.emails || '0', 10),
    images: parseInt(m.images || '0', 10),
    revisions: parseInt(m.revisions || '0', 10),
    brand_limit: parseInt(m.brand_limit || '0', 10)
  };
}

// Grant or reset credits (service role bypasses RLS)
async function setPlanCredits(userId, allowances, reason) {
  const { data: existing } = await supabase.from('credit_balances').select('*').eq('user_id', userId).maybeSingle();
  const row = existing ? existing : { user_id: userId };
  row.emails_remaining = allowances.emails;
  row.images_remaining = allowances.images;
  row.revisions_remaining = allowances.revisions;
  row.brand_limit = allowances.brand_limit;
  row.updated_at = new Date().toISOString();

  await supabase.from('credit_balances').upsert(row);
  await supabase.from('credit_ledger').insert({
    user_id: userId,
    delta_emails: allowances.emails,
    delta_images: allowances.images,
    delta_revisions: allowances.revisions,
    reason: 'reset',
    source: reason
  });
}

// Increment credits (for PAYG purchases)
async function addCredits(userId, allowances, reason) {
  await supabase.rpc('consume_my_credits', { p_emails: 0, p_images: 0, p_revisions: 0, p_reason: 'noop' }); // ensure function exists (no-op)
  const { data: existing } = await supabase.from('credit_balances').select('*').eq('user_id', userId).maybeSingle();
  const row = existing ? existing : { user_id: userId };
  row.emails_remaining = (row.emails_remaining || 0) + allowances.emails;
  row.images_remaining = (row.images_remaining || 0) + allowances.images;
  row.revisions_remaining = (row.revisions_remaining || 0) + allowances.revisions;
  row.updated_at = new Date().toISOString();

  await supabase.from('credit_balances').upsert(row);
  await supabase.from('credit_ledger').insert({
    user_id: userId,
    delta_emails: allowances.emails,
    delta_images: allowances.images,
    delta_revisions: allowances.revisions,
    reason: 'purchase',
    source: reason
  });
}

export async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.warn('[stripe] webhook verify failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const customerId = session.customer;
        // Save customer id on profile
        await supabase.from('profiles').upsert({ user_id: userId, stripe_customer_id: customerId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

        // Get purchased price
        const line = session.mode === 'subscription'
          ? (session.subscription && await stripe.subscriptions.retrieve(session.subscription))
          : (await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 })).data?.[0];

        let priceId;
        if (session.mode === 'subscription') priceId = line.items?.data?.[0]?.price?.id || line.plan?.id || line.items?.data?.[0]?.plan?.id;
        else priceId = line?.price?.id;

        if (!priceId) break;

        const allowances = await getAllowances(priceId);

        if (allowances.kind === 'onetime') {
          await addCredits(userId, allowances, 'checkout.session.completed');
        } else {
          // store subscription row and set/reset credits immediately
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: session.subscription || null,
            price_id: priceId,
            status: 'active',
            current_period_end: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
          });
          await setPlanCredits(userId, allowances, 'checkout.session.completed');
        }
        break;
      }

      case 'invoice.paid': {
        // Recurring charge → reset monthly allowance to the plan’s amounts
        const invoice = event.data.object;
        if (!invoice.customer || !invoice.subscription) break;

        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const item = sub.items.data[0];
        const priceId = item?.price?.id;
        const userId = (await stripe.customers.retrieve(invoice.customer)).metadata?.user_id;

        if (!priceId || !userId) break;

        const allowances = await getAllowances(priceId);
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: invoice.customer,
          stripe_subscription_id: invoice.subscription,
          price_id: priceId,
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString()
        });
        await setPlanCredits(userId, allowances, 'invoice.paid');
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = (await stripe.customers.retrieve(sub.customer)).metadata?.user_id;
        if (!userId) break;
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          price_id: sub.items?.data?.[0]?.price?.id || null,
          status: sub.status,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null
        });
        break;
      }

      default:
        // ignore others
        break;
    }

    res.json({ received: true });
  } catch (e) {
    console.error('[stripe] webhook handler error', e);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
