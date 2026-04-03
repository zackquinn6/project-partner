import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';

const PROJECT_OWNER_TERMS = `
# Project Owner Terms and Responsibilities

## Quality Responsibility
As a Project Owner, you are responsible for:

1. **Content Quality**: Ensuring all project content, instructions, and materials are accurate, safe, and appropriate for DIY users.

2. **Safety Standards**: Verifying that all project steps include proper safety warnings, required protective equipment, and hazard notifications.

3. **Testing and Validation**: Testing project workflows before publication to ensure they are complete, accurate, and achievable by users of the stated skill level.

4. **Regulatory Compliance**: Ensuring projects comply with relevant building codes, safety regulations, and legal requirements in applicable jurisdictions.

## Content Management
You agree to:

1. **Regular Updates**: Keep project content current with industry best practices, updated safety standards, and new techniques.

2. **User Feedback**: Monitor and respond to user feedback, questions, and reported issues with your projects.

3. **Version Control**: Maintain proper version control and document significant changes to projects.

4. **Intellectual Property**: Ensure you have the right to publish all content, images, and materials included in your projects.

## Liability and Disclaimers

1. **Professional Advice**: You acknowledge that projects are for informational purposes and may not replace professional advice for complex or regulated work.

2. **User Assumption of Risk**: Users assume their own risk when following project instructions, but you must provide complete and accurate information.

3. **Limitation of Liability**: While the platform provides tools and infrastructure, you maintain responsibility for the quality and safety of your project content.

## Ethical Standards
You commit to:

1. **Transparency**: Clearly disclosing any affiliations, sponsorships, or financial interests related to recommended products or services.

2. **Accessibility**: Creating content that is accessible and inclusive for users of varying skill levels and abilities.

3. **Environmental Responsibility**: Promoting sustainable practices and environmentally responsible approaches where applicable.

## Removal and Suspension
The platform administrators reserve the right to:

1. Remove or suspend projects that violate these terms
2. Revoke Project Owner status for repeated violations
3. Request modifications to projects that don't meet quality or safety standards

By accepting these terms, you acknowledge understanding and agreeing to uphold these responsibilities as a Project Owner.
`;

interface InvitationRow {
  id: string;
  project_id: string;
  project_name: string;
  invited_email: string;
  status: string;
  expires_at: string;
}

export default function AcceptProjectOwnerInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user } = useAuth();
  const { toast } = useToast();
  const [invitation, setInvitation] = useState<InvitationRow | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptedProjectName, setAcceptedProjectName] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_project_owner_invitation_by_token', { p_token: token });
      if (cancelled) return;
      if (error) {
        setInvitation(null);
        setLoading(false);
        return;
      }
      const row = Array.isArray(data) && data.length > 0 ? (data[0] as InvitationRow) : null;
      setInvitation(row ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleAccept = async () => {
    if (!user || !invitation || !checked) return;
    setAccepting(true);
    try {
      const { error } = await supabase.rpc('accept_project_owner_invitation', { p_invitation_id: invitation.id });
      if (error) throw error;
      setAcceptedProjectName(invitation.project_name);
      setAccepted(true);
    } catch (err) {
      console.error('Accept invitation error:', err);
      toast({
        title: 'Could not accept invitation',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <p className="text-muted-foreground">Missing invitation token. Use the link from your invitation email.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <p className="text-muted-foreground">This invitation is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (accepted && acceptedProjectName) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>You’re all set</CardTitle>
              <CardDescription>
                You have accepted the Project Owner agreement for {acceptedProjectName}. You now have access to Project Management and Project Analytics for that project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/">Go to home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    const returnUrl = `${typeof window !== 'undefined' ? window.location.pathname : ''}${window.location.search}`;
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <Card>
            <CardHeader>
              <CardTitle>Sign in to accept</CardTitle>
              <CardDescription>
                You’ve been invited to become a Project Owner for <strong>{invitation.project_name}</strong>. Sign in with the email this invitation was sent to to accept the agreement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to={`/auth?redirect=${encodeURIComponent(returnUrl)}`}>Sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Project Owner agreement: {invitation.project_name}
            </CardTitle>
            <CardDescription>
              Read and accept the terms below to become a Project Owner for this project. You will get access to Project Management and Project Analytics for this project only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[320px] w-full border rounded-md p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {PROJECT_OWNER_TERMS}
              </div>
            </ScrollArea>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accept-terms"
                checked={checked}
                onCheckedChange={(c) => setChecked(c === true)}
              />
              <label htmlFor="accept-terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I have read and accept the Project Owner terms and responsibilities
              </label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/">Decline</Link>
              </Button>
              <Button onClick={handleAccept} disabled={!checked || accepting}>
                {accepting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Accepting…
                  </>
                ) : (
                  'Accept and continue'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
