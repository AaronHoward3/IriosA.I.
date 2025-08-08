import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Eye, Copy, Trash2, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


interface SavedEmail {
  id: number;
  subject?: string;
  mjml: string;
  html?: string;
  domain: string;
  emailType: string;
  createdAt: string;
}

const MyEmails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [savedEmails, setSavedEmails] = useState<SavedEmail[]>([]);
  const [expandedEmailId, setExpandedEmailId] = useState<number | null>(null);
  const [copyDropdownOpenId, setCopyDropdownOpenId] = useState<number | null>(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('savedEmails') || '[]');
    setSavedEmails(saved);
  }, []);

  const handleCreateNew = () => {
    navigate('/generator?step=2');
  };

  const handleCopy = async (text: string, type: 'MJML' | 'HTML') => {
    try {
      await navigator.clipboard.writeText(text);
      
      toast({
        title: `${type} Copied`,
        description: `Copied ${type} code to clipboard.`,
      });

    } catch (error) {
      console.error(`Failed to copy ${type}:`, error);
    }
  };

  const handleDeleteEmail = (id: number) => {
    const updatedEmails = savedEmails.filter(email => email.id !== id);
    setSavedEmails(updatedEmails);
    localStorage.setItem('savedEmails', JSON.stringify(updatedEmails));
    toast({
      title: "Email Deleted",
      description: "The email template has been deleted.",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  };

  const currentEmail = savedEmails.find(email => email.id === expandedEmailId);

  return (
    <>
      <Navigation />
      <div className="pt-16 min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Emails</h1>
              <p className="text-muted-foreground mt-2">
                View and manage your saved email templates.
              </p>
            </div>
            <GradientButton onClick={handleCreateNew} variant="solid" className="flex items-center gap-2 transition-transform duration-200 ease-in-out hover:scale-105">
              <Plus className="h-4 w-4" />
              Create New
            </GradientButton>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                Saved Email Templates
                <Badge variant="secondary">{savedEmails.length} Templates</Badge>
              </CardTitle>
              <CardDescription>
                Your saved email templates and campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {savedEmails.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No saved emails yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate some emails and save them to see them here.
                  </p>
                </div>
              ) : (
                savedEmails.map((email) => (
                  <div key={email.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-2xl bg-muted/40">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-foreground">{email.subject || '(No Subject)'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {email.domain} • {email.emailType} • {formatDate(email.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end relative">
                      <Button variant="outline" size="sm" onClick={() => setExpandedEmailId(email.id)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <div
                        className="relative inline-block"
                        onMouseEnter={() => setCopyDropdownOpenId(email.id)}
                        onMouseLeave={() => setCopyDropdownOpenId(null)}
                      >
                        <Button variant="outline" size="sm">
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                        {copyDropdownOpenId === email.id && (
                          <div className="absolute top-[100%] right-0 bg-popover border rounded-md shadow-md z-50 overflow-hidden">
                            <button
                              onClick={() => handleCopy(email.mjml, 'MJML')}
                              className="block w-full text-left px-4 py-2 text-sm hover:bg-accent"
                            >
                              Copy MJML
                            </button>
                            <button
                              onClick={() => handleCopy(email.html || '', 'HTML')}
                              className="block w-full text-left px-4 py-2 text-sm hover:bg-accent"
                            >
                              Copy HTML
                            </button>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteEmail(email.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {expandedEmailId && currentEmail && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="relative">
      {/* Exit Button */}
      <div className="absolute -top-4 -right-4 z-10">
        <button
          onClick={() => setExpandedEmailId(null)}
          className="transition bg-gradient-to-br from-green-300 to-emerald-500 text-white p-2 rounded-full shadow hover:brightness-110"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Modal Container */}
      <div className="bg-background rounded-lg w-full max-w-[90rem] h-[90vh] overflow-hidden shadow-lg flex flex-col lg:flex-row">
        {/* LEFT PANEL */}
        <div className="w-full lg:w-1/2 h-[50vh] lg:h-full p-6">
          <div className="bg-muted rounded-lg h-full flex flex-col shadow border border-border">
            <div className="p-4 border-b border-border font-semibold text-foreground flex justify-between items-center">
              <span>Subject Line: {currentEmail.subject || '(No Subject)'}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-auto bg-background rounded-b-lg">
              <iframe
                srcDoc={currentEmail.html}
                sandbox=""
                className="w-full h-full border-0"
                style={{ backgroundColor: 'white' }}
              />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-full lg:w-1/2 h-[50vh] lg:h-full p-6 flex flex-col space-y-4">
          {/* MJML Box */}
          <div className="flex-1 min-h-0 bg-muted rounded-lg border border-border flex flex-col shadow overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold text-foreground">MJML Code</h3>
              <GradientButton size="sm" variant="white-outline" onClick={() => handleCopy(currentEmail.mjml, 'MJML')}>
                <Copy className="w-4 h-4 mr-2" />
                Copy MJML
              </GradientButton>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-4 bg-background text-sm text-muted-foreground">
              <pre className="whitespace-pre-wrap break-words">{currentEmail.mjml}</pre>
            </div>
          </div>

          {/* HTML Box */}
          <div className="flex-1 min-h-0 bg-muted rounded-lg border border-border flex flex-col shadow overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold text-foreground">HTML Code</h3>
              <GradientButton size="sm" variant="white-outline" onClick={() => handleCopy(currentEmail.html || '', 'HTML')}>
                <Copy className="w-4 h-4 mr-2" />
                Copy HTML
              </GradientButton>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-4 bg-background text-sm text-muted-foreground">
              <pre className="whitespace-pre-wrap break-words">{currentEmail.html}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
      </div>
    </>
  );
};

export default MyEmails;
