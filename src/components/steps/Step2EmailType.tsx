// src/components/steps/ui/Step2EmailType.tsx

import React, { useState } from 'react';
import { GradientButton } from '@/components/ui/gradient-button';
import { GradientTextarea } from '@/components/ui/gradient-textarea';
import { GradientInput } from '@/components/ui/gradient-input';
import { EmailType, FormData, Tone, ProductLink, DesignAesthetic } from '../EmailGenerator';

interface Step2EmailTypeProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const emailTypes: { type: EmailType; label: string; description: string }[] = [
  { type: 'Promotion', label: 'Promotional', description: 'Sales and special offers' },
  { type: 'Newsletter', label: 'Newsletter', description: 'Regular updates and news' },
  { type: 'Productgrid', label: 'Product Grid', description: 'Featured products showcase' }
];

const toneOptions: { value: Tone; label: string }[] = [
  { value: 'bold', label: 'Bold' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'formal', label: 'Formal' },
  { value: 'fun', label: 'Fun' }
];

export const Step2EmailType: React.FC<Step2EmailTypeProps> = ({
  formData,
  updateFormData,
  onNext,
  onPrev,
}) => {
  const [selectedEmailType, setSelectedEmailType] = useState<EmailType | null>(formData.emailType);
  const [useCustomHero, setUseCustomHero] = useState(formData.useCustomHero ?? true);
  const [userContext, setUserContext] = useState(formData.userContext);
  const [imageContext, setImageContext] = useState(formData.imageContext ?? '');
  const [tone, setTone] = useState(formData.tone ?? 'bold');
  const [designAesthetic, setDesignAesthetic] = useState<DesignAesthetic>(formData.designAesthetic ?? 'bold_contrasting');
  const [products, setProducts] = useState<ProductLink[]>(Array.isArray(formData.products) ? formData.products : []);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductUrl, setNewProductUrl] = useState('');
  const [newProductImage, setNewProductImage] = useState('');

  const handleSelectType = (emailType: EmailType) => setSelectedEmailType(emailType);

  const handleAddProduct = () => {
    if (!newProductName.trim() || !newProductUrl.trim()) return;
    const newProduct: ProductLink = { name: newProductName.trim(), url: newProductUrl.trim(), image: newProductImage.trim() || undefined };
    const exists = products.some(p => p.name === newProduct.name || p.url === newProduct.url);
    if (!exists) {
      setProducts([...products, newProduct]);
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
    if (selectedEmailType) {
      updateFormData({
        emailType: selectedEmailType,
        useCustomHero,
        userContext,
        imageContext,
        tone,
        designAesthetic,
        products
      });
      onNext();
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Configure your email</h1>
        <p className="text-lg text-muted-foreground">Choose your email type and customize the details</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Email Type</h2>
        <div className="flex flex-col gap-4">
          {emailTypes.map((type) => (
            <GradientButton
              key={type.type}
              variant={selectedEmailType === type.type ? 'solid' : 'outline'}
              size="xl"
              onClick={() => handleSelectType(type.type)}
              className={`w-full min-h-[112px] p-0 group transition-transform duration-200 ease-in-out ${selectedEmailType === type.type ? 'scale-105' : 'hover:scale-105'}`}
            >
              <div className="flex flex-col items-center justify-center p-6 space-y-2 text-center w-full h-full">
                <h3 className="text-lg font-semibold">{type.label}</h3>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </div>
            </GradientButton>
          ))}
        </div>
      </div>

      {selectedEmailType && (
        <div className="space-y-8">
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">Use Custom Hero Image?</label>
            <div className="flex space-x-4">
              <GradientButton variant={useCustomHero ? 'solid' : 'white-outline'} onClick={() => setUseCustomHero(true)} className="flex-1 hover:scale-105">Yes</GradientButton>
              <GradientButton variant={!useCustomHero ? 'solid' : 'white-outline'} onClick={() => setUseCustomHero(false)} className="flex-1 hover:scale-105">No</GradientButton>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">Image Context</label>
            <GradientTextarea placeholder="Describe the type of imagery..." value={imageContext} onChange={(e) => setImageContext(e.target.value)} rows={4} />
          </div>

          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">User Context</label>
            <GradientTextarea placeholder="Tell us about your audience..." value={userContext} onChange={(e) => setUserContext(e.target.value)} rows={4} />
          </div>

          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">Tone</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {toneOptions.map((option) => (
                <GradientButton key={option.value} variant={tone === option.value ? 'solid' : 'white-outline'} onClick={() => setTone(option.value)} className="hover:scale-105">
                  {option.label}
                </GradientButton>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">Design Aesthetic</label>
            <div className="flex space-x-4">
              <GradientButton variant={designAesthetic === 'minimal_clean' ? 'solid' : 'white-outline'} onClick={() => setDesignAesthetic('minimal_clean')} className="flex-1 hover:scale-105">Minimal & Clean</GradientButton>
              <GradientButton variant={designAesthetic === 'bold_contrasting' ? 'solid' : 'white-outline'} onClick={() => setDesignAesthetic('bold_contrasting')} className="flex-1 hover:scale-105">Bold & Contrasting</GradientButton>
            </div>
          </div>

          {/* 🛒 Products UI Block */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">Products</label>
            {products.length === 0 && <p className="text-sm text-muted-foreground italic">No products added yet.</p>}
            {products.map((product, index) => (
              <div key={index} className="flex items-center justify-between bg-muted rounded-lg px-4 py-3">
                <div className="flex-1">
                  <div className="font-medium text-foreground">{product.name}</div>
                  <div className="text-sm text-muted-foreground">{product.url}</div>
                  {product.image && <div className="text-xs text-muted-foreground">Image: {product.image}</div>}
                  {product.description && <div className="text-xs text-muted-foreground">Description: {product.description}</div>}
                </div>
                <button onClick={() => handleRemoveProduct(index)} className="text-muted-foreground hover:text-foreground ml-4">×</button>
              </div>
            ))}
            <GradientButton onClick={() => setShowProductForm(!showProductForm)} variant="white-outline">{showProductForm ? 'Cancel' : 'Add Product'}</GradientButton>
            {showProductForm && (
              <div className="space-y-2 p-4 border border-border rounded-lg">
                <GradientInput placeholder="Product name..." value={newProductName} onChange={(e) => setNewProductName(e.target.value)} />
                <GradientInput placeholder="Product URL..." value={newProductUrl} onChange={(e) => setNewProductUrl(e.target.value)} />
                <GradientInput placeholder="Image URL (optional)" value={newProductImage} onChange={(e) => setNewProductImage(e.target.value)} />
                <div className="flex space-x-2">
                  <GradientButton variant="solid" onClick={handleAddProduct} disabled={!newProductName || !newProductUrl}>Add Product</GradientButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6">
        <GradientButton variant="white-outline" onClick={onPrev} className="hover:scale-105">Back</GradientButton>
        <GradientButton variant="solid" onClick={handleContinue} disabled={!selectedEmailType} className="hover:scale-105">Generate Email</GradientButton>
      </div>
    </div>
  );
};
