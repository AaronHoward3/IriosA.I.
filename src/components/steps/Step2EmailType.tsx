
import React, { useState } from 'react';
import { GradientButton } from '@/components/ui/gradient-button';
import { GradientTextarea } from '@/components/ui/gradient-textarea';
import { GradientInput } from '@/components/ui/gradient-input';
import { EmailType, FormData, Tone, ProductLink } from '../EmailGenerator';

interface Step2EmailTypeProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const emailTypes: { type: EmailType; label: string; description: string }[] = [
  {
    type: 'promotional',
    label: 'Promotional',
    description: 'Sales and special offers'
  },
  {
    type: 'newsletter',
    label: 'Newsletter',
    description: 'Regular updates and news'
  },
  {
    type: 'product-grid',
    label: 'Product Grid',
    description: 'Featured products showcase'
  },
  {
    type: 'abandoned-cart',
    label: 'Abandoned Cart',
    description: 'Recovery and reminder emails'
  }
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
  const [tone, setTone] = useState(formData.tone ?? 'bold');
  const [products, setProducts] = useState<ProductLink[]>(formData.products);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductUrl, setNewProductUrl] = useState('');
  const [newProductImage, setNewProductImage] = useState('');

  const handleSelectType = (emailType: EmailType) => {
    setSelectedEmailType(emailType);
  };

  const handleAddProduct = () => {
    if (newProductName.trim() && newProductUrl.trim()) {
      const newProduct: ProductLink = {
        name: newProductName.trim(),
        url: newProductUrl.trim(),
        image: newProductImage.trim() || undefined
      };
      
      const exists = products.some(p => p.name === newProduct.name || p.url === newProduct.url);
      
      if (!exists) {
        const updatedProducts = [...products, newProduct];
        setProducts(updatedProducts);
        setNewProductName('');
        setNewProductUrl('');
        setNewProductImage('');
        setShowProductForm(false);
      }
    }
  };

  const handleRemoveProduct = (index: number) => {
    const updatedProducts = products.filter((_, i) => i !== index);
    setProducts(updatedProducts);
  };

  const handleContinue = () => {
    if (selectedEmailType) {
      updateFormData({
        emailType: selectedEmailType,
        useCustomHero,
        userContext,
        tone,
        products,
      });
      onNext();
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Configure your email
        </h1>
        <p className="text-lg text-muted-foreground">
          Choose your email type and customize the details
        </p>
      </div>

      {/* Email Type Selection */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Email Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emailTypes.map((type) => (
            <GradientButton
              key={type.type}
              variant={selectedEmailType === type.type ? "solid" : "outline"}
              size="xl"
              onClick={() => handleSelectType(type.type)}
              className="h-auto p-0 group"
            >
              <div className="flex flex-col items-center justify-center p-6 space-y-2 text-center">
                <h3 className="text-lg font-semibold">{type.label}</h3>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </div>
            </GradientButton>
          ))}
        </div>
      </div>

      {selectedEmailType && (
        <div className="space-y-8">
          {/* Custom Hero Toggle */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              Use Custom Hero Image?
            </label>
            <div className="flex space-x-4">
              <GradientButton
                variant={useCustomHero ? "solid" : "white-outline"}
                onClick={() => setUseCustomHero(true)}
                className="flex-1"
              >
                Yes
              </GradientButton>
              <GradientButton
                variant={!useCustomHero ? "solid" : "white-outline"}
                onClick={() => setUseCustomHero(false)}
                className="flex-1"
              >
                No
              </GradientButton>
            </div>
          </div>

          {/* User Context */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              User Context
            </label>
            <GradientTextarea
              placeholder="Tell us about your audience, goals, or any specific requirements..."
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              rows={4}
            />
          </div>

          {/* Tone Selection */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              Tone
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {toneOptions.map((option) => (
                <GradientButton
                  key={option.value}
                  variant={tone === option.value ? "solid" : "white-outline"}
                  onClick={() => setTone(option.value)}
                >
                  {option.label}
                </GradientButton>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              Products
            </label>
            
            <div>
              {!showProductForm && (
                <GradientButton 
                  variant="white-outline" 
                  onClick={() => setShowProductForm(true)}
                >
                  Add Product
                </GradientButton>
              )}

              {showProductForm && (
                <div className="space-y-3 p-4 border border-border rounded-lg">
                  <GradientInput
                    placeholder="Product name..."
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                  />
                  <GradientInput
                    placeholder="Product URL (https://...)..."
                    value={newProductUrl}
                    onChange={(e) => setNewProductUrl(e.target.value)}
                  />
                  <GradientInput
                    placeholder="Product image URL (optional)..."
                    value={newProductImage}
                    onChange={(e) => setNewProductImage(e.target.value)}
                  />
                  <div className="flex space-x-2">
                    <GradientButton 
                      variant="white-outline"
                      onClick={() => {
                        setShowProductForm(false);
                        setNewProductName('');
                        setNewProductUrl('');
                        setNewProductImage('');
                      }}
                    >
                      Cancel
                    </GradientButton>
                    <GradientButton 
                      variant="solid"
                      onClick={handleAddProduct} 
                      disabled={!newProductName.trim() || !newProductUrl.trim()}
                    >
                      Add Product
                    </GradientButton>
                  </div>
                </div>
              )}
            </div>
            
            {products.length > 0 && (
              <div className="space-y-2">
                {products.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-muted rounded-lg px-4 py-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{product.name}</div>
                      <div className="text-sm text-muted-foreground">{product.url}</div>
                      {product.image && (
                        <div className="text-xs text-muted-foreground">Image: {product.image}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveProduct(index)}
                      className="text-muted-foreground hover:text-foreground ml-4"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <GradientButton variant="white-outline" onClick={onPrev}>
          Back
        </GradientButton>
        <GradientButton 
          variant="solid" 
          onClick={handleContinue}
          disabled={!selectedEmailType}
        >
          Generate Emails
        </GradientButton>
      </div>
    </div>
  );
};
