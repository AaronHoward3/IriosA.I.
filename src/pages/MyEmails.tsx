import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Copy, Trash2, Edit } from 'lucide-react';
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

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('savedEmails') || '[]');
    setSavedEmails(saved);
  }, []);

  const handleCreateNew = () => {
    navigate('/generator?step=2');
  };

  const handleEditEmail = (id: number) => {
    navigate(`/email-editor?id=${id}`);
  };

  const handleCopyMJML = async (mjml: string) => {
    try {
      await navigator.clipboard.writeText(mjml);
      toast({
        title: "MJML Copied",
        description: "The MJML code has been copied to your clipboard.",
      });
    } catch (error) {
      console.error('Failed to copy MJML:', error);
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

  return (
    <>
      <Navigation />
      <div className="pt-16 min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Emails</h1>
              <p className="text-muted-foreground mt-2">
                View and manage your saved email templates.
              </p>
            </div>
            <GradientButton onClick={handleCreateNew} variant="solid" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New
            </GradientButton>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
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
                  <div key={email.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{email.subject || '(No Subject)'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {email.domain} • {email.emailType} • {formatDate(email.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditEmail(email.id)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setExpandedEmailId(email.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCopyMJML(email.mjml)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteEmail(email.id)}
                      >
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

        {/* Email Preview Modal */}
        {expandedEmailId && (() => {
          const current = savedEmails.find(email => email.id === expandedEmailId);
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b">
                  <h2 className="text-2xl font-bold">
                    {current?.subject || '(No Subject)'}
                  </h2>
                  <button
                    onClick={() => setExpandedEmailId(null)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Plus className="h-5 w-5 rotate-45" />
                  </button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  {/* HTML Preview (exactly like Step5 expanded view) */}
                  <div className="bg-muted rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Rendered Preview</h3>
                    <div className="bg-background rounded border min-h-[300px] overflow-auto p-4">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: current?.html || "<div>No preview available.</div>",
                        }}
                        style={{ backgroundColor: "#fff" }}
                      />
                    </div>
                  </div>

                  {/* MJML Code */}
                  <div className="bg-muted rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">MJML Code</h3>
                    <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words bg-background p-4 rounded border max-h-64 overflow-y-auto">
                      {current?.mjml}
                    </pre>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-4">
                    <GradientButton
                      variant="solid"
                      onClick={() => {
                        if (expandedEmailId) handleEditEmail(expandedEmailId);
                      }}
                      className="flex-1 flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Email
                    </GradientButton>
                    <GradientButton
                      variant="white-outline"
                      onClick={() => {
                        if (current) handleCopyMJML(current.mjml);
                      }}
                      className="flex-1"
                    >
                      Copy MJML
                    </GradientButton>
                    <GradientButton
                      variant="white-outline"
                      onClick={() => {
                        if (expandedEmailId) {
                          handleDeleteEmail(expandedEmailId);
                          setExpandedEmailId(null);
                        }
                      }}
                      className="flex-1"
                    >
                      Delete Email
                    </GradientButton>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
};

export default MyEmails;
