import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { GradientButton } from '../ui/gradient-button';
import { GradientTextarea } from '../ui/gradient-textarea';
import { GradientInput } from '../ui/gradient-input';
import BrandColorControls from '../BrandColorControls';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

import {
  EmailType,
  FormData,
  Tone,
  ProductLink,
  DesignAesthetic,
} from '../EmailGenerator';

interface Step2EmailTypeProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const EMAIL_TYPES: { value: EmailType; label: string; description: string }[] = [
  { value: 'Promotion',  label: 'Promotional',  description: 'Sales and special offers' },
  { value: 'Newsletter', label: 'Newsletter',   description: 'Regular updates and news' },
  { value: 'Productgrid',label: 'Product Grid', description: 'Featured products showcase' },
];

const TONES: { value: Tone; label: string }[] = [
  { value: 'bold',     label: 'Bold' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'formal',   label: 'Formal' },
  { value: 'fun',      label: 'Fun' },
];

/** Values must match backend STYLE_PACKS keys exactly */
const DESIGN_STYLES: { value: DesignAesthetic; label: string; blurb?: string }[] = [
  { value: 'minimal_clean',    label: 'Minimal & Clean',    blurb: 'Whitespace, simple typography' },
  { value: 'bold_contrasting', label: 'Bold & Contrasting', blurb: 'High contrast, punchy CTAs' },
  { value: 'magazine_serif',   label: 'Elegant Serif',      blurb: 'Editorial, premium feel' },
  { value: 'warm_editorial',   label: 'Warm Editorial',     blurb: 'Serif headlines, paper texture' },
  { value: 'neo_brutalist',    label: 'Neo Brutalist',      blurb: 'Chunky type, stark blocks' },
  { value: 'gradient_glow',    label: 'Gradient Glow',      blurb: 'Dark canvas, glowing gradients' },
  { value: 'pastel_soft',      label: 'Pastel Soft',        blurb: 'Soft colors, friendly shapes' },
  { value: 'luxe_mono',        label: 'Luxe Mono',          blurb: 'Monochrome, refined' },
];

export const Step2EmailType: React.FC<Step2EmailTypeProps> = ({
  formData,
  updateFormData,
  onNext,
  onPrev,
}) => {
  const [selectedEmailType, setSelectedEmailType] = useState<EmailType | null>(formData.emailType);
  const [useCustomHero, setUseCustomHero] = useState<boolean>(formData.useCustomHero ?? true);
  const [userContext, setUserContext] = useState<string>(formData.userContext ?? '');
  const [imageContext, setImageContext] = useState<string>(formData.imageContext ?? '');
  const [tone, setTone] = useState<Tone>(formData.tone ?? 'bold');
  const [designAesthetic, setDesignAesthetic] =
    useState<DesignAesthetic>(formData.designAesthetic ?? 'bold_contrasting');

  const [products, setProducts] = useState<ProductLink[]>(
    Array.isArray(formData.products) ? formData.products : []
  );
  const [showProductForm, setShowProductForm] = useState<boolean>(false);
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductUrl, setNewProductUrl] = useState<string>('');
  const [newProductImage, setNewProductImage] = useState<string>('');

  // --- pulled from Step 1’s brand payload ---
  const scrapedPrimary = formData?.brandData?.brandData?.primary_color || '';
  const scrapedSecondary = formData?.brandData?.brandData?.link_color || '';

  // Keep brandData in sync when user edits colors
  const handleColorsChange = (colors: { primary_color: string; link_color: string }) => {
    const existing = formData.brandData || {};
    const updated = {
      ...existing,
      brandData: {
        ...(existing.brandData || {}),
        primary_color: colors.primary_color,
        link_color: colors.link_color,
      },
      // mirror to top-level for generator compatibility
      primary_color: colors.primary_color,
      link_color: colors.link_color,
    };
    updateFormData({ brandData: updated });
  };

  const selectedTypeLabel = useMemo(
    () => EMAIL_TYPES.find(t => t.value === selectedEmailType)?.label ?? 'Select type…',
    [selectedEmailType]
  );
  const selectedToneLabel = useMemo(
    () => TONES.find(t => t.value === tone)?.label ?? 'Select tone…',
    [tone]
  );
  const selectedStyleLabel = useMemo(
    () => DESIGN_STYLES.find(s => s.value === designAesthetic)?.label ?? 'Select style…',
    [designAesthetic]
  );

  const handleAddProduct = () => {
    if (!newProductName.trim() || !newProductUrl.trim()) return;
    const newProduct: ProductLink = {
      name: newProductName.trim(),
      url: newProductUrl.trim(),
      image: newProductImage.trim() || undefined,
    };
    const exists = products.some(p => p.name === newProduct.name || p.url === newProduct.url);
    if (!exists) {
      setProducts(prev => [...prev, newProduct]);
      setNewProductName('');
      setNewProductUrl('');
      setNewProductImage('');
      setShowProductForm(false);
    }
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    if (!selectedEmailType) return;
    updateFormData({
      emailType: selectedEmailType,
      useCustomHero,
      userContext,
      imageContext,
      tone,
      designAesthetic,   // <- send only this
      products,
    });
    onNext();
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Configure your email</h1>
        <p className="text-lg text-muted-foreground">
          Choose your type, tone, and style — text inputs stay inline.
        </p>
      </div>

      {/* Email Type */}
      <div className="space-y-2">
        <label className="text-lg font-medium text-foreground">Email Type</label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <GradientButton variant="white-outline" className="w-full justify-between">
              <span>{selectedTypeLabel}</span>
              <ChevronDown className="w-4 h-4 opacity-70" />
            </GradientButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[320px] p-2">
            {EMAIL_TYPES.map(t => (
              <DropdownMenuItem
                key={t.value}
                onClick={() => setSelectedEmailType(t.value)}
                className="flex flex-col items-start gap-0.5 py-3"
              >
                <span className="font-medium">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.description}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tone */}
      <div className="space-y-2">
        <label className="text-lg font-medium text-foreground">Tone</label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <GradientButton variant="white-outline" className="w-full justify-between">
              <span>{selectedToneLabel}</span>
              <ChevronDown className="w-4 h-4 opacity-70" />
            </GradientButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[240px]">
            {TONES.map(t => (
              <DropdownMenuItem key={t.value} onClick={() => setTone(t.value)}>
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Design Style */}
      <div className="space-y-2">
        <label className="text-lg font-medium text-foreground">Design Style</label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <GradientButton variant="white-outline" className="w-full justify-between">
              <span>{selectedStyleLabel}</span>
              <ChevronDown className="w-4 h-4 opacity-70" />
            </GradientButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[520px] max-h-[360px] overflow-auto p-2">
            <div className="grid grid-cols-2 gap-2">
              {DESIGN_STYLES.map(s => (
                <DropdownMenuItem
                  key={s.value}
                  onClick={() => setDesignAesthetic(s.value)}
                  className="flex flex-col items-start gap-0.5 py-3"
                >
                  <span className="font-medium">{s.label}</span>
                  {s.blurb && <span className="text-xs text-muted-foreground">{s.blurb}</span>}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Brand Colors (scraped + editable) */}
      {formData.brandData && (
        <div className="space-y-2">
          <label className="text-lg font-medium text-foreground">Brand Colors</label>
          <BrandColorControls
            scrapedPrimary={scrapedPrimary}
            scrapedSecondary={scrapedSecondary}
            brandDomain={formData.domain}
            onChange={handleColorsChange}
          />
        </div>
      )}

      {/* Use Custom Hero */}
      <div className="space-y-2">
        <label className="text-lg font-medium text-foreground">Use Custom Hero Image?</label>
        <div className="flex gap-3">
          <GradientButton
            variant={useCustomHero ? 'solid' : 'white-outline'}
            onClick={() => setUseCustomHero(true)}
            className="flex-1"
          >
            Yes
          </GradientButton>
          <GradientButton
            variant={!useCustomHero ? 'solid' : 'white-outline'}
            onClick={() => setUseCustomHero(false)}
            className="flex-1"
          >
            No
          </GradientButton>
        </div>
      </div>

      {/* Text inputs */}
      <div className="space-y-2">
        <label className="text-lg font-medium text-foreground">Image Context</label>
        <GradientTextarea
          placeholder="Describe the type of imagery..."
          value={imageContext}
          onChange={(e) => setImageContext(e.target.value)}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <label className="text-lg font-medium text-foreground">User Context</label>
        <GradientTextarea
          placeholder="Tell us about your audience..."
          value={userContext}
          onChange={(e) => setUserContext(e.target.value)}
          rows={4}
        />
      </div>

      {/* Products */}
      <div className="space-y-4">
        <label className="text-lg font-medium text-foreground">Products</label>
        {products.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No products added yet.</p>
        )}
        {products.map((product, index) => (
          <div key={index} className="flex items-center justify-between bg-muted rounded-lg px-4 py-3">
            <div className="flex-1">
              <div className="font-medium text-foreground">{product.name}</div>
              <div className="text-sm text-muted-foreground">{product.url}</div>
              {product.image && <div className="text-xs text-muted-foreground">Image: {product.image}</div>}
            </div>
            <button
              onClick={() => handleRemoveProduct(index)}
              className="text-muted-foreground hover:text-foreground ml-4"
            >
              ×
            </button>
          </div>
        ))}

        <GradientButton onClick={() => setShowProductForm(!showProductForm)} variant="white-outline">
          {showProductForm ? 'Cancel' : 'Add Product'}
        </GradientButton>

        {showProductForm && (
          <div className="space-y-2 p-4 border border-border rounded-lg">
            <GradientInput
              placeholder="Product name..."
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
            />
            <GradientInput
              placeholder="Product URL (https://...)"
              value={newProductUrl}
              onChange={(e) => setNewProductUrl(e.target.value)}
            />
            <GradientInput
              placeholder="Image URL (optional)"
              value={newProductImage}
              onChange={(e) => setNewProductImage(e.target.value)}
            />
            <div className="flex gap-2">
              <GradientButton
                variant="solid"
                onClick={handleAddProduct}
                disabled={!newProductName || !newProductUrl}
              >
                Add Product
              </GradientButton>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex justify-between pt-6">
        <GradientButton variant="white-outline" onClick={onPrev}>Back</GradientButton>
        <GradientButton variant="solid" onClick={handleContinue} disabled={!selectedEmailType}>
          Generate Email
        </GradientButton>
      </div>
    </div>
  );
};
