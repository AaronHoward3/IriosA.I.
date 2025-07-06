import React, { useState } from 'react';
import { GradientButton } from '@/components/ui/gradient-button';
import { GradientCard, GradientCardContent } from '@/components/ui/gradient-card';
import { FormData } from '../EmailGenerator';
import { X, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';

interface Step5ResultsProps {
  formData: FormData;
  onPrev: () => void;
  onRestart: () => void;
}

export const Step5Results: React.FC<Step5ResultsProps> = ({
  formData,
  onPrev,
  onRestart,
}) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedEmailId, setExpandedEmailId] = useState<number | null>(null);
  const [savedEmails, setSavedEmails] = useState<number[]>([]);
  const { toast } = useToast();
  const { theme } = useTheme();

  const handleCopyMJML = async (mjml: string, id: number) => {
    try {
      await navigator.clipboard.writeText(mjml);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy MJML:', error);
    }
  };

  const handleSaveEmail = (email: any) => {
    const existingSavedEmails = JSON.parse(localStorage.getItem('savedEmails') || '[]');
    const emailToSave = {
      id: Date.now(),
      mjml: email.content,           // save MJML code
      html: email.html,              // also save compiled HTML for preview
      domain: formData.domain,
      emailType: formData.emailType,
      createdAt: new Date().toISOString(),
    };
    const updatedSavedEmails = [...existingSavedEmails, emailToSave];
    localStorage.setItem('savedEmails', JSON.stringify(updatedSavedEmails));
    setSavedEmails(prev => [...prev, email.index]);
    toast({
      title: "Email Saved",
      description: "Your email template has been saved to My Emails.",
    });
  };

  if (!formData.generatedEmails || formData.generatedEmails.length === 0) {
    return (
      <div className="text-center space-y-8">
        <h1 className="text-3xl font-bold text-foreground">
          No emails generated
        </h1>
        <GradientButton onClick={onPrev}>
          Go Back
        </GradientButton>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat w-full h-full"
        style={{
          backgroundImage: theme === 'dark'
            ? `url(/lovable-uploads/a7f4769e-d4d7-484e-af11-ea25e93cf98e.png)`
            : `url(/lovable-uploads/8f705eeb-1097-41b5-a9f8-7fe34598da87.png)`,
        }}
      />

      <div className="relative z-20 min-h-screen px-4 py-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Your emails are ready!
          </h1>
          <p className="text-lg text-muted-foreground">
            Here are your generated {formData.emailType} emails for {formData.domain}
          </p>
        </div>

        {/* Email Cards Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {formData.generatedEmails.map((email) => (
            <GradientCard
              key={email.index}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => setExpandedEmailId(email.index)}
            >
              <GradientCardContent className="p-0 overflow-hidden border rounded relative group">
                <div className="w-full h-[300px] overflow-hidden flex justify-center items-start relative group">
                  <iframe
                    srcDoc={email.html}
                    sandbox=""
                    className="border-0"
                    style={{
                      width: "600px",
                      height: "800px",
                      pointerEvents: "none",
                      backgroundColor: "white",
                    }}
                  />
                  <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all duration-300">
                    <span className="text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      View Email
                    </span>
                  </div>
                </div>
              </GradientCardContent>
            </GradientCard>
          ))}
        </div>

        {/* Expanded Email Modal */}
        {expandedEmailId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold">Email {expandedEmailId}</h2>
                <button
                  onClick={() => setExpandedEmailId(null)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Email Preview */}
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Email Preview</h3>
                  <div className="bg-background rounded border min-h-[300px] overflow-auto p-4">
                    <div
                      dangerouslySetInnerHTML={{
                        __html:
                          formData.generatedEmails.find(
                            (email) => email.index === expandedEmailId
                          )?.html || "",
                      }}
                    />
                  </div>
                </div>

                {/* MJML Code */}
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">MJML Code</h3>
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words bg-background p-4 rounded border max-h-64 overflow-y-auto">
                    {formData.generatedEmails.find(email => email.index === expandedEmailId)?.content}
                  </pre>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <GradientButton
                    variant="white-outline"
                    onClick={() => {
                      const email = formData.generatedEmails.find(email => email.index === expandedEmailId);
                      if (email) handleCopyMJML(email.content, email.index);
                    }}
                    className="flex-1"
                  >
                    {copiedId === expandedEmailId ? 'Copied!' : 'Copy MJML'}
                  </GradientButton>
                  <GradientButton
                    variant="solid"
                    onClick={() => {
                      const email = formData.generatedEmails.find(email => email.index === expandedEmailId);
                      if (email) handleSaveEmail(email);
                    }}
                    className="flex-1 flex items-center gap-2"
                    disabled={savedEmails.includes(expandedEmailId)}
                  >
                    <Save size={16} />
                    {savedEmails.includes(expandedEmailId) ? 'Saved' : 'Save Email'}
                  </GradientButton>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-8">
          <GradientButton variant="white-outline" onClick={onPrev}>
            Back
          </GradientButton>
          <GradientButton variant="solid" onClick={onRestart}>
            Create New Emails
          </GradientButton>
        </div>
      </div>
    </div>
  );
};
