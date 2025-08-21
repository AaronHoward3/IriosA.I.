import React, { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Pencil, X, Check, Copy } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useToast } from '@/hooks/use-toast';

type UsedBrand = { domain: string; primary_color: string | null; link_color: string | null };

type Credits = {
  emails_remaining: number;
  images_remaining: number;
  revisions_remaining: number;
  brand_limit: number | null;
  updated_at: string | null;
};

type SavedImage = {
  id: string;
  public_url: string;
  path: string;
  created_at: string;
  width?: number | null;
  height?: number | null;
};

const API_ROOT = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ---- Plan definitions ----
const PLANS = [
  {
    key: 'PAYG',
    title: 'Pay As You Go',
    priceLabel: '$9 one-time',
    blurb: 'Simple credits pack. No renewal.',
    priceId: import.meta.env.VITE_STRIPE_PRICE_PAYG as string | undefined,
    bullets: ['10 emails', '1 image', '20 revisions', '1 brand'],
    quotas: { emails: 10, images: 1, revisions: 20, brands: 1 },
  },
  {
    key: 'STARTER',
    title: 'Starter',
    priceLabel: '$19 / mo',
    blurb: 'For getting started with regular campaigns.',
    priceId: import.meta.env.VITE_STRIPE_PRICE_STARTER as string | undefined,
    bullets: ['30 emails', '5 images', '60 revisions', '2 brands'],
    quotas: { emails: 30, images: 5, revisions: 60, brands: 2 },
  },
  {
    key: 'GROWTH',
    title: 'Growth',
    priceLabel: '$49 / mo',
    blurb: 'For growing teams and higher volume.',
    priceId: import.meta.env.VITE_STRIPE_PRICE_GROWTH as string | undefined,
    bullets: ['120 emails', '25 images', '300 revisions', '5 brands'],
    quotas: { emails: 120, images: 25, revisions: 300, brands: 5 },
  },
  {
    key: 'SCALE',
    title: 'Scale',
    priceLabel: '$99 / mo',
    blurb: 'For scale and frequent iterations.',
    priceId: import.meta.env.VITE_STRIPE_PRICE_SCALE as string | undefined,
    bullets: ['300 emails', '75 images', '900 revisions', '15 brands'],
    quotas: { emails: 300, images: 75, revisions: 900, brands: 15 },
  },
];

function normalizeDomain(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

const priceToPlanKey: Record<string, 'PAYG' | 'STARTER' | 'GROWTH' | 'SCALE'> = {
  [import.meta.env.VITE_STRIPE_PRICE_PAYG || '']: 'PAYG',
  [import.meta.env.VITE_STRIPE_PRICE_STARTER || '']: 'STARTER',
  [import.meta.env.VITE_STRIPE_PRICE_GROWTH || '']: 'GROWTH',
  [import.meta.env.VITE_STRIPE_PRICE_SCALE || '']: 'SCALE',
};

function quotasFor(key: 'PAYG' | 'STARTER' | 'GROWTH' | 'SCALE' | 'FREE') {
  if (key === 'FREE') return { emails: 0, images: 0, revisions: 0, brands: 0 };
  const found = PLANS.find(p => p.key === key);
  return found?.quotas ?? { emails: 0, images: 0, revisions: 0, brands: 0 };
}

function pct(rem: number, total: number) {
  if (total <= 0) return 0;
  const v = Math.max(0, Math.min(1, rem / total));
  return Math.round(v * 100);
}

const Bar: React.FC<{ label: string; remaining: number; total: number; className?: string }> = ({ label, remaining, total, className }) => {
  const percent = pct(remaining, total);
  const used = total > 0 ? total - remaining : 0;
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        {total > 0 ? (
          <span className="text-xs text-muted-foreground">{remaining} / {total}</span>
        ) : (
          <span className="text-xs text-muted-foreground">{remaining} remaining</span>
        )}
      </div>
      <div className="w-full h-2 rounded bg-muted overflow-hidden">
        <div
          className="h-2 bg-primary transition-all"
          style={{ width: `${percent}%` }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        />
      </div>
      {total > 0 && used > 0 && (
        <div className="mt-1 text-[11px] text-muted-foreground">{used} used</div>
      )}
    </div>
  );
};

const Settings: React.FC = () => {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();

  // Profile
  const [name, setName] = useState('');
  const [emailField, setEmailField] = useState('');

  // Subscription snapshot
  const [sub, setSub] = useState<{ status?: string; price_id?: string; current_period_end?: string } | null>(null);

  // Credits snapshot
  const [credits, setCredits] = useState<Credits | null>(null);
  const [brandCount, setBrandCount] = useState<number>(0);

  // Brands + saved images
  const [usedBrands, setUsedBrands] = useState<UsedBrand[]>([]);
  const [imagesByDomain, setImagesByDomain] = useState<Record<string, SavedImage[]>>({});

  // Edit brand modal
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [brandDomain, setBrandDomain] = useState('');
  const [color1, setColor1] = useState('#4f46e5');
  const [color2, setColor2] = useState('#22d3ee');
  const isBrandValid = useMemo(() => normalizeDomain(brandDomain).length > 0, [brandDomain]);

  // Plan picker modal
  const [showPlanModal, setShowPlanModal] = useState(false);

  // --- Profile: load & save ---
  useEffect(() => {
    if (!user) return;
    setEmailField(user.email ?? '');
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.display_name) setName(data.display_name);
    })();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: user.id,
          display_name: name || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile saved' });
    }
  };

  // --- Subscription snapshot ---
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('status, price_id, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle();
      setSub(data ?? null);
    })();
  }, [user]);

  // --- Credits snapshot ---
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API_ROOT}/api/credits/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setCredits(json.balance as Credits);
        setBrandCount(json.brand_count as number);
      }
    })();
  }, [user]);

  const startCheckout = async (priceId: string) => {
    if (!priceId) {
      toast({ title: 'Missing price', description: 'Set the VITE_STRIPE_PRICE_* env for this plan.', variant: 'destructive' });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const res = await fetch(`${API_ROOT}/api/billing/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ price_id: priceId }),
    });
    const json = await res.json();
    if (json?.url) window.location.href = json.url;
    else toast({ title: 'Checkout error', description: json?.error || 'Unable to start checkout', variant: 'destructive' });
  };

  // --- Brands list + colors ---
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: domainsRows } = await supabase
        .from('emails')
        .select('brand_domain')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const domains = Array.from(
        new Set((domainsRows || [])
          .map((r: any) => normalizeDomain(r?.brand_domain || ''))
          .filter(Boolean))
      );

      if (domains.length === 0) {
        setUsedBrands([]);
        setImagesByDomain({});
        return;
      }

      const { data: cacheRows } = await supabase
        .from('brand_cache')
        .select('domain, primary_color, link_color')
        .in('domain', domains);

      const brands = (cacheRows || []).map((r: any) => ({
        domain: r.domain,
        primary_color: r.primary_color ?? null,
        link_color: r.link_color ?? null,
      }));

      setUsedBrands(brands);

      // fetch saved images per brand
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const imagesMap: Record<string, SavedImage[]> = {};
      for (const b of brands) {
        try {
          const resp = await fetch(`${API_ROOT}/api/images?domain=${encodeURIComponent(b.domain)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!resp.ok) continue;
          const json = await resp.json();
          imagesMap[b.domain] = json?.images || [];
        } catch {
          // ignore
        }
      }
      setImagesByDomain(imagesMap);
    })();
  }, [user]);

  const openBrandModal = (brand?: UsedBrand) => {
    if (brand) {
      setBrandDomain(brand.domain);
      setColor1(brand.primary_color || '#4f46e5');
      setColor2(brand.link_color || '#22d3ee');
      setShowBrandModal(true);
    }
  };

  const closeBrandModal = () => setShowBrandModal(false);

  const saveBrandColors = async () => {
    const domain = normalizeDomain(brandDomain);
    if (!domain) return;

    try {
      const res = await fetch(`${API_ROOT}/api/brand/colors`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, primary_color: color1, link_color: color2 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to update brand colors');

      setUsedBrands((prev) =>
        prev.map((b) => (b.domain === domain ? { ...b, primary_color: color1, link_color: color2 } : b))
      );
      toast({ title: 'Brand colors updated', description: domain });
      closeBrandModal();
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  // Plan/usage helpers
  const planKey: 'FREE' | 'PAYG' | 'STARTER' | 'GROWTH' | 'SCALE' = useMemo(() => {
    const pid = sub?.price_id || '';
    if (pid.startsWith('manual:')) {
      const k = pid.split(':')[1]?.toUpperCase();
      if (k === 'STARTER' || k === 'GROWTH' || k === 'SCALE') return k as any;
    }
    const mapped = priceToPlanKey[pid];
    if (mapped) return mapped;
    if (!sub?.status || sub.status !== 'active') {
      if ((credits?.emails_remaining || 0) > 0 || (credits?.images_remaining || 0) > 0 || (credits?.revisions_remaining || 0) > 0) {
        return 'PAYG';
      }
    }
    return sub?.status === 'active' ? 'STARTER' : 'FREE';
  }, [sub?.price_id, sub?.status, credits?.emails_remaining, credits?.images_remaining, credits?.revisions_remaining]);

  const totals = quotasFor(planKey);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied URL to clipboard' });
    } catch {}
  };

  return (
    <>
      <Navigation />
      <div className="pt-16 min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Account Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage your profile, preferences, brands, and billing.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information and account details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={emailField} disabled placeholder="you@example.com" />
                  </div>
                  <Button onClick={handleSaveProfile}>Save Changes</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>Your current subscription and usage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Credits bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Bar label="Emails" remaining={credits?.emails_remaining ?? 0} total={totals.emails} />
                    <Bar label="Images" remaining={credits?.images_remaining ?? 0} total={totals.images} />
                    <Bar label="Revisions" remaining={credits?.revisions_remaining ?? 0} total={totals.revisions} />
                    <Bar
                      label="Brands"
                      remaining={(credits?.brand_limit ?? 0) - (brandCount ?? 0) >= 0
                        ? (credits?.brand_limit ?? 0) - (brandCount ?? 0)
                        : 0}
                      total={totals.brands}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Used brands: {brandCount} {credits?.brand_limit != null ? `/ ${credits.brand_limit}` : ''}</span>
                    {sub?.current_period_end && (
                      <span>Renews: {new Date(sub.current_period_end).toLocaleDateString()}</span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <GradientButton
                      variant="solid"
                      onClick={() => setShowPlanModal(true)}
                      className="!bg-primary !text-primary-foreground"
                    >
                      Manage Plan
                    </GradientButton>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-8 space-y-6">
              {/* Brands */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Brands</span>
                    {/* Removed "Add Brand" button by request */}
                  </CardTitle>
                  <CardDescription>Brands you’ve used appear here. Edit to tweak cached colors.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {usedBrands.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No brands yet. Generate an email to see brands here.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {usedBrands.map((b) => {
                        const imgs = imagesByDomain[b.domain] || [];
                        return (
                          <Card key={b.domain} className="overflow-hidden">
                            <div
                              className="h-20 w-full"
                              style={{
                                backgroundImage: `linear-gradient(90deg, ${b.primary_color || '#4f46e5'}, ${b.link_color || '#22d3ee'})`,
                              }}
                            />
                            <CardContent className="pt-4 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{b.domain}</p>
                                  <div className="mt-2 flex items-center gap-2">
                                    <span
                                      className="inline-block h-4 w-4 rounded"
                                      style={{ backgroundColor: b.primary_color || '#4f46e5' }}
                                    />
                                    <span
                                      className="inline-block h-4 w-4 rounded"
                                      style={{ backgroundColor: b.link_color || '#22d3ee' }}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {(b.primary_color || '#4f46e5').toUpperCase()} → {(b.link_color || '#22d3ee').toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openBrandModal(b)}
                                  aria-label="Edit brand"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Saved Images Gallery */}
                              <div className="space-y-2">
                                <div className="text-xs text-muted-foreground">Saved images</div>
                                {imgs.length === 0 ? (
                                  <div className="text-xs text-muted-foreground italic">None yet — generate or reuse a hero image to save it here.</div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-3">
                                    {imgs.slice(0, 4).map((img) => (
                                      <div key={img.id} className="border border-border rounded-lg p-2">
                                        <img
                                          src={img.public_url}
                                          alt="Saved"
                                          className="w-full h-24 object-cover rounded"
                                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                                        />
                                        <div className="mt-2 text-[11px] break-all text-muted-foreground">
                                          {img.public_url}
                                        </div>
                                        <div className="mt-1 flex justify-end">
                                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => copy(img.public_url)}>
                                            <Copy className="w-3.5 h-3.5 mr-1" /> Copy URL
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Edit Modal (kept for editing colors; no add button anymore) */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit Brand</CardTitle>
                <Button variant="ghost" size="icon" onClick={closeBrandModal} aria-label="Close">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription>Update cached colors for this domain.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand-domain">Brand domain</Label>
                <Input id="brand-domain" value={brandDomain} onChange={(e) => setBrandDomain(e.target.value)} disabled />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-primary">Primary</Label>
                  <input
                    id="brand-primary"
                    type="color"
                    value={color1}
                    onChange={(e) => setColor1(e.target.value)}
                    className="h-10 w-full rounded-md border bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-link">Link</Label>
                  <input
                    id="brand-link"
                    type="color"
                    value={color2}
                    onChange={(e) => setColor2(e.target.value)}
                    className="h-10 w-full rounded-md border bg-background"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeBrandModal}>Cancel</Button>
                <GradientButton
                  onClick={saveBrandColors}
                  disabled={!isBrandValid}
                  className="!bg-primary !text-primary-foreground disabled:opacity-60"
                >
                  Save
                </GradientButton>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plan Picker Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-5xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Choose a Plan</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowPlanModal(false)} aria-label="Close">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription>Select the plan that fits your workflow. You can change or cancel anytime.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {PLANS.map((p) => {
                  const disabled = !p.priceId;
                  return (
                    <Card key={p.key} className="flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-xl">{p.title}</CardTitle>
                        <CardDescription>{p.blurb}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <div className="text-2xl font-semibold mb-3">{p.priceLabel}</div>
                        <ul className="space-y-2 text-sm mb-4">
                          {p.bullets.map((b) => (
                            <li key={b} className="flex items-center gap-2">
                              <Check className="h-4 w-4" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                        <GradientButton
                          variant="solid"
                          disabled={disabled}
                          onClick={() => startCheckout(p.priceId!)}
                          className="mt-auto !bg-primary !text-primary-foreground disabled:opacity-60"
                        >
                          {disabled ? 'Set Price ID in .env' : 'Select'}
                        </GradientButton>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default Settings;
