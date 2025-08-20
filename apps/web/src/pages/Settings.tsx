import React, { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun, Pencil, Plus, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useToast } from '@/hooks/use-toast';

type UsedBrand = { domain: string; primary_color: string | null; link_color: string | null };

const API_ROOT = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function normalizeDomain(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useSupabaseAuth();
  const { toast } = useToast();

  // Profile
  const [name, setName] = useState('');
  const [emailField, setEmailField] = useState('');

  // Subscription snapshot
  const [sub, setSub] = useState<{ status?: string; price_id?: string } | null>(null);

  // Brands (list + modal state)
  const [usedBrands, setUsedBrands] = useState<UsedBrand[]>([]);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [brandDomain, setBrandDomain] = useState('');
  const [color1, setColor1] = useState('#4f46e5');
  const [color2, setColor2] = useState('#22d3ee');
  const isBrandValid = useMemo(() => normalizeDomain(brandDomain).length > 0, [brandDomain]);

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
        .select('status, price_id')
        .eq('user_id', user.id)
        .maybeSingle();
      setSub(data ?? null);
    })();
  }, [user]);

  const startCheckout = async (priceId?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const res = await fetch(`${API_ROOT}/api/billing/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        price_id: priceId || import.meta.env.VITE_STRIPE_PRICE_STARTER,
      }),
    });
    const json = await res.json();
    if (json?.url) window.location.href = json.url;
    else toast({ title: 'Checkout error', description: json?.error || 'Unable to start checkout', variant: 'destructive' });
  };

  const openPortal = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const res = await fetch(`${API_ROOT}/api/billing/portal`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json?.url) window.location.href = json.url;
    else toast({ title: 'Portal error', description: json?.error || 'Unable to open billing portal', variant: 'destructive' });
  };

  // --- Brands: load list (user's used domains) + join brand_cache for colors ---
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: domainsRows, error: dErr } = await supabase
        .from('emails')
        .select('brand_domain')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (dErr) return;

      const domains = Array.from(
        new Set(
          (domainsRows || [])
            .map((r: any) => normalizeDomain(r?.brand_domain || ''))
            .filter(Boolean)
        )
      );
      if (domains.length === 0) {
        setUsedBrands([]);
        return;
      }

      const { data: cacheRows, error: cErr } = await supabase
        .from('brand_cache')
        .select('domain, primary_color, link_color')
        .in('domain', domains);
      if (cErr) return;

      setUsedBrands(
        (cacheRows || []).map((r: any) => ({
          domain: r.domain,
          primary_color: r.primary_color ?? null,
          link_color: r.link_color ?? null,
        }))
      );
    })();
  }, [user]);

  // --- Brand modal handlers ---
  const openBrandModal = (brand?: UsedBrand) => {
    if (brand) {
      setBrandDomain(brand.domain);
      setColor1(brand.primary_color || '#4f46e5');
      setColor2(brand.link_color || '#22d3ee');
    } else {
      setBrandDomain('');
      setColor1('#4f46e5');
      setColor2('#22d3ee');
    }
    setShowBrandModal(true);
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

      setUsedBrands((prev) => {
        const exists = prev.some((b) => b.domain === domain);
        const updated = { domain, primary_color: color1, link_color: color2 };
        return exists ? prev.map((b) => (b.domain === domain ? updated : b)) : [updated, ...prev];
      });

      toast({ title: 'Brand colors updated', description: domain });
      closeBrandModal();
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <Navigation />
      <div className="pt-16 min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Account Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage your profile, preferences, and brands.</p>
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
                  <CardTitle>Account Security</CardTitle>
                  <CardDescription>Manage your account security settings.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" disabled>Change Password</Button>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-8 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize how the application looks and feels.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      <Label htmlFor="dark-mode">Dark Mode</Label>
                    </div>
                    <Switch id="dark-mode" checked={theme === 'dark'} onCheckedChange={toggleTheme} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Subscription
                    <Badge variant={sub?.status === 'active' ? 'default' : 'secondary'}>
                      {sub?.status ? sub.status : 'Free Plan'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Your current subscription plan and billing information.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-3 flex-wrap">
                  <GradientButton
                    variant="solid"
                    onClick={() => startCheckout()} // defaults to VITE_STRIPE_PRICE_STARTER
                    className="!bg-primary !text-primary-foreground"
                  >
                    Upgrade Plan
                  </GradientButton>
                  <Button variant="outline" onClick={openPortal}>Manage Billing</Button>
                </CardContent>
              </Card>

              {/* Brands */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Brands</span>
                    <Button size="sm" variant="outline" onClick={() => openBrandModal()}>
                      <Plus className="h-4 w-4 mr-1" /> Add Brand
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Brands you’ve used will appear here. Click edit to update the global brand cache.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Inline brand URL + colors removed per request */}

                  {usedBrands.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No brands yet. Generate an email or add a brand.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {usedBrands.map((b) => (
                        <Card key={b.domain} className="overflow-hidden">
                          <div
                            className="h-20 w-full"
                            style={{
                              backgroundImage: `linear-gradient(90deg, ${b.primary_color || '#4f46e5'}, ${b.link_color || '#22d3ee'})`,
                            }}
                          />
                          <CardContent className="pt-4">
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
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Edit / Add Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {usedBrands.some((b) => b.domain === normalizeDomain(brandDomain)) ? 'Edit Brand' : 'Add Brand'}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={closeBrandModal} aria-label="Close">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription>Update the domain and colors, then save to the global cache.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand-domain">Brand URL / Domain</Label>
                <Input
                  id="brand-domain"
                  placeholder="gfuel.com"
                  value={brandDomain}
                  onChange={(e) => setBrandDomain(e.target.value)}
                />
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
    </>
  );
};

export default Settings;
