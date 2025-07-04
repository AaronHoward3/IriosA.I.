import React, { useEffect } from 'react';
import { FormData } from '../EmailGenerator';
import { useTheme } from '@/contexts/ThemeContext';

interface Step4GenerationProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
}

export const Step4Generation: React.FC<Step4GenerationProps> = ({
  formData,
  updateFormData,
  onNext,
}) => {
  const { theme } = useTheme();

  useEffect(() => {
    const generateEmails = async () => {
      try {
        // Simulate API call to /api/generate-emails
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        
        const mockEmails = [
          {
            id: 1,
            type: formData.emailType,
            subject: `Amazing ${formData.emailType} from ${formData.domain}`,
            mjml: `<mjml><mj-body><mj-section><mj-column><mj-text>Sample ${formData.emailType} email content</mj-text></mj-column></mj-section></mj-body></mjml>`,
            preview: `This is a sample ${formData.emailType} email generated for ${formData.domain}`
          },
          {
            id: 2,
            type: formData.emailType,
            subject: `Follow-up ${formData.emailType} from ${formData.domain}`,
            mjml: `<mjml><mj-body><mj-section><mj-column><mj-text>Follow-up ${formData.emailType} email content</mj-text></mj-column></mj-section></mj-body></mjml>`,
            preview: `This is a follow-up ${formData.emailType} email for ${formData.domain}`
          },
          {
            id: 3,
            type: formData.emailType,
            subject: `Special ${formData.emailType} from ${formData.domain}`,
            mjml: `<mjml><mj-body><mj-section><mj-column><mj-text>Special ${formData.emailType} email content</mj-text></mj-column></mj-section></mj-body></mjml>`,
            preview: `This is a special ${formData.emailType} email for ${formData.domain}`
          }
        ];

        updateFormData({ generatedEmails: mockEmails });
        onNext();
      } catch (error) {
        console.error('Failed to generate emails:', error);
      }
    };

    generateEmails();
  }, [formData, updateFormData, onNext]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Conditional Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat w-full h-full"
        style={{ 
          backgroundImage: theme === 'dark' 
            ? `url(/lovable-uploads/a7f4769e-d4d7-484e-af11-ea25e93cf98e.png)`
            : `url(/lovable-uploads/8f705eeb-1097-41b5-a9f8-7fe34598da87.png)`
        }}
      />

      {/* Content */}
      <div className="relative z-20 min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Generating your emails...
            </h1>
            <p className="text-lg text-muted-foreground">
              Please wait while we create personalized emails for your brand
            </p>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-muted rounded-full animate-spin">
                <div className="absolute top-0 left-0 w-4 h-4 bg-gradient-to-r from-gradient-start to-gradient-end rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Analyzing your brand: {formData.domain}
            </p>
            <p className="text-sm text-muted-foreground">
              Creating {formData.emailType} emails with {formData.tone} tone
            </p>
            {formData.products.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Featuring {formData.products.length} product{formData.products.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
