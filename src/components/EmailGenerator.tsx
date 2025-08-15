import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navigation from './Navigation';
import { Step1Domain } from './steps/Step1Domain';
import { Step2EmailType } from './steps/Step2EmailType';
import { Step4Generation } from './steps/Step4Generation';
import { Step5Results } from './steps/Step5Results';

export type EmailType = 'Promotion' | 'Newsletter' | 'Productgrid';
export type Tone = 'bold' | 'friendly' | 'formal' | 'fun';

/** Skin IDs must match your backend STYLE_PACKS keys */
export type DesignAesthetic =
  | 'minimal_clean'
  | 'bold_contrasting'
  | 'magazine_serif'
  | 'warm_editorial'
  | 'neo_brutalist'
  | 'gradient_glow'
  | 'pastel_soft'
  | 'luxe_mono';

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
  imageContext: string;
  tone: Tone;
  designAesthetic: DesignAesthetic; // <- keep only this
  products: ProductLink[];
  brandData?: any;
  generatedEmails?: any[];
  subjectLine?: string;
}

const EmailGenerator: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialStep = searchParams.get('step') ? parseInt(searchParams.get('step') as string, 10) : 1;

  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [formData, setFormData] = useState<FormData>({
    domain: '',
    emailType: null,
    useCustomHero: true,
    userContext: '',
    imageContext: '',
    tone: 'bold',
    designAesthetic: 'bold_contrasting',
    products: [],
    subjectLine: '',
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const updateFormData = (updates: Partial<FormData>) =>
    setFormData(prev => ({ ...prev, ...updates }));

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, 4));
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1));

  const handleRestart = () => {
    const keepDomain = formData.domain;
    setCurrentStep(2);
    setFormData({
      domain: keepDomain,
      emailType: null,
      useCustomHero: true,
      userContext: '',
      imageContext: '',
      tone: 'bold',
      designAesthetic: 'bold_contrasting',
      products: [],
      subjectLine: '',
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
        // If you have a Step3Customizations, swap it in here.
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
      <Navigation onHomeClick={() => setCurrentStep(1)} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default EmailGenerator;
