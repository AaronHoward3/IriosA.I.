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
      // Simulate API call to /api/brand-info
      // In real implementation, replace with actual API call
      const response = await fetch(`/api/brand-info?domain=${encodeURIComponent(domain)}`);
      const brandData = await response.json();
      
      updateFormData({ 
        domain: domain.trim(), 
        brandData 
      });
      onNext();
    } catch (error) {
      console.error('Failed to fetch brand info:', error);
      // Continue anyway for demo purposes
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