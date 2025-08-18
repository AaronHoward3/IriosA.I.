import React, { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun, Pencil, Trash2, Link as LinkIcon } from 'lucide-react';

type Brand = {
  id: string;
  url: string;
  color1: string;
  color2: string;
};

const BRANDS_STORAGE_KEY = 'irios:brands';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();

  // --- Brands state & persistence ---
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [brandUrl, setBrandUrl] = useState('');
  const [color1, setColor1] = useState('#4f46e5'); // sensible defaults
  const [color2, setColor2] = useState('#22d3ee');

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(BRANDS_STORAGE_KEY) : null;
      if (raw) setBrands(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(BRANDS_STORAGE_KEY, JSON.stringify(brands));
      }
    } catch {}
  }, [brands]);

  const resetBrandForm = () => {
    setEditingId(null);
    setBrandUrl('');
    setColor1('#4f46e5');
    setColor2('#22d3ee');
  };

  const handleAddOrUpdateBrand = () => {
    if (!brandUrl.trim()) return;

    if (editingId) {
      setBrands(prev =>
        prev.map(b =>
          b.id === editingId ? { ...b, url: brandUrl.trim(), color1, color2 } : b
        )
      );
    } else {
      setBrands(prev => [
        ...prev,
        {
          id: `${Date.now()}`, // lightweight unique id
          url: brandUrl.trim(),
          color1,
          color2,
        },
      ]);
    }
    resetBrandForm();
  };

  const handleEditBrand = (b: Brand) => {
    setEditingId(b.id);
    setBrandUrl(b.url);
    setColor1(b.color1);
    setColor2(b.color2);
  };

  const handleDeleteBrand = (id: string) => {
    setBrands(prev => prev.filter(b => b.id !== id));
    if (editingId === id) resetBrandForm();
  };

  const isFormValid = brandUrl.trim().length > 0;

  return (
    <>
      <Navigation />
      <div className="pt-16 min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Account Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage your profile, preferences, security, and brands.
            </p>
          </div>

          {/* Dashboard grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-4 space-y-6">
              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information and account details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Enter your name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="Enter your email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain</Label>
                    <Input id="domain" placeholder="example.com" />
                  </div>
                  <Button>Save Changes</Button>
                </CardContent>
              </Card>

              {/* Account Security */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Security</CardTitle>
                  <CardDescription>Manage your account security settings.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline">Change Password</Button>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-8 space-y-6">
              {/* Appearance */}
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

              {/* Subscription */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Subscription
                    <Badge variant="secondary">Free Plan</Badge>
                  </CardTitle>
                  <CardDescription>Your current subscription plan and billing information.</CardDescription>
                </CardHeader>
                <CardContent>
                  <GradientButton variant="solid">Upgrade Plan</GradientButton>
                </CardContent>
              </Card>

              {/* Brands (New) */}
              <Card>
                <CardHeader>
                  <CardTitle>Brands</CardTitle>
                  <CardDescription>
                    Add a brand URL and two brand colors. These are saved locally for now (persisted in your browser).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add/Edit form */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-7 space-y-2">
                      <Label htmlFor="brand-url">Brand URL</Label>
                      <div className="relative">
                        <Input
                          id="brand-url"
                          placeholder="https://yourbrand.com"
                          value={brandUrl}
                          onChange={(e) => setBrandUrl(e.target.value)}
                          className="pr-10"
                        />
                        <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="brand-color-1">Primary</Label>
                      <input
                        id="brand-color-1"
                        type="color"
                        value={color1}
                        onChange={(e) => setColor1(e.target.value)}
                        className="h-10 w-full rounded-md border bg-background"
                        aria-label="Primary color"
                        title="Primary color"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="brand-color-2">Secondary</Label>
                      <input
                        id="brand-color-2"
                        type="color"
                        value={color2}
                        onChange={(e) => setColor2(e.target.value)}
                        className="h-10 w-full rounded-md border bg-background"
                        aria-label="Secondary color"
                        title="Secondary color"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end gap-2">
                      <GradientButton
                        variant="solid"
                        onClick={handleAddOrUpdateBrand}
                        disabled={!isFormValid}
                        className="w-full"
                      >
                        {editingId ? 'Save' : 'Add'}
                      </GradientButton>
                    </div>
                  </div>

                  {editingId && (
                    <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                      <span>Editing existing brand…</span>
                      <Button variant="ghost" size="sm" onClick={resetBrandForm}>
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Saved brands */}
                  {brands.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No brands yet. Add your first brand using the form above.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {brands.map((b) => (
                        <Card key={b.id} className="overflow-hidden">
                          <div
                            className="h-20 w-full"
                            style={{
                              backgroundImage: `linear-gradient(90deg, ${b.color1}, ${b.color2})`,
                            }}
                            aria-hidden
                          />
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{b.url}</p>
                                <div className="mt-2 flex items-center gap-2">
                                  <span
                                    className="inline-block h-4 w-4 rounded"
                                    style={{ backgroundColor: b.color1 }}
                                    title={b.color1}
                                  />
                                  <span
                                    className="inline-block h-4 w-4 rounded"
                                    style={{ backgroundColor: b.color2 }}
                                    title={b.color2}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {b.color1.toUpperCase()} → {b.color2.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditBrand(b)}
                                  aria-label="Edit brand"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => handleDeleteBrand(b.id)}
                                  aria-label="Delete brand"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
    </>
  );
};

export default Settings;
