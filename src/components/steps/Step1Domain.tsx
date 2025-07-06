import React, { useState } from 'react';
import { GradientButton } from '@/components/ui/gradient-button';
import { GradientInput } from '@/components/ui/gradient-input';
import { FormData } from '../EmailGenerator';

interface Step1DomainProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
}

export const Step1Domain: React.FC<Step1DomainProps> = ({
  formData,
  updateFormData,
  onNext,
}) => {
  const [domain, setDomain] = useState(formData.domain);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
  if (!domain.trim()) return;
  setIsLoading(true);

  try {
    // 1️⃣ brand check
    const brandRes = await fetch(`/api/brand/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: domain.trim() }),
    });
    if (!brandRes.ok) throw new Error('Failed to fetch brand');
    const brandData = await brandRes.json();

    // 2️⃣ product scrape
    const productRes = await fetch(`/api/products/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: domain.trim() }),
    });
    if (!productRes.ok) throw new Error('Failed to fetch products');
    const productSuggestions = await productRes.json();

    // 3️⃣ store in your formData
    updateFormData({
      domain: domain.trim(),
      brandData,
      products: productSuggestions.products,
    });

    onNext();
  } catch (error) {
    console.error('Failed to fetch brand info:', error);
    // fallback if brand fails
    updateFormData({ domain: domain.trim() });
    onNext();
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">
          Let's create amazing emails
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Enter your website domain to get started with personalized email generation
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        <GradientInput
          type="text"
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="text-center text-lg h-14"
          onKeyPress={(e) => e.key === 'Enter' && handleContinue()}
        />

        <GradientButton
          size="lg"
          onClick={handleContinue}
          disabled={!domain.trim() || isLoading}
          className="w-full"
          variant="solid"
        >
          {isLoading ? 'Loading...' : 'Continue'}
        </GradientButton>
      </div>
    </div>
  );
};