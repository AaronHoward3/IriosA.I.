
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Step1Domain } from './steps/Step1Domain';
import { Step2EmailType } from './steps/Step2EmailType';
import { Step4Generation } from './steps/Step4Generation';
import { Step5Results } from './steps/Step5Results';

export type EmailType = 'Promotion' | 'Newsletter' | 'Productgrid' | 'AbandonedCart';
export type Tone = 'bold' | 'friendly' | 'formal' | 'fun';

export interface ProductLink {
  name: string;
  url: string;
  image?: string;
  description?: string;
}

export interface FormData {
  domain: string;
  emailType: EmailType | null;
  useCustomHero: boolean;
  userContext: string;
  tone: Tone;
  products: ProductLink[];
  brandData?: any;
  generatedEmails?: any[];
}

const EmailGenerator = () => {
  const [searchParams] = useSearchParams();
  const stepParam = searchParams.get('step');
  const initialStep = stepParam ? parseInt(stepParam) : 1;
  
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [formData, setFormData] = useState<FormData>({
    domain: '',
    emailType: null,
    useCustomHero: true,
    userContext: '',
    tone: 'bold',
    products: [],
  });

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleRestart = () => {
    const currentDomain = formData.domain; // Preserve the domain
    setCurrentStep(2); // Go to step 2 instead of step 1
    setFormData({
      domain: currentDomain, // Keep the domain
      emailType: null,
      useCustomHero: true,
      userContext: '',
      tone: 'bold',
      products: [],
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1Domain
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
          />
        );
      case 2:
        return (
          <Step2EmailType
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 3:
        return (
          <Step4Generation
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
          />
        );
      case 4:
        return (
          <Step5Results
            formData={formData}
            onPrev={prevStep}
            onRestart={handleRestart}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Step content */}
        <div className="max-w-2xl mx-auto">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default EmailGenerator;
