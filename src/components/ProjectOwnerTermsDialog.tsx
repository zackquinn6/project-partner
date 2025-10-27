import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, FileText } from 'lucide-react';

interface ProjectOwnerTermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invitationId: string;
  onAccepted?: () => void;
}

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

export const ProjectOwnerTermsDialog: React.FC<ProjectOwnerTermsDialogProps> = ({
  open,
  onOpenChange,
  invitationId,
  onAccepted
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!user || !accepted) return;

    setLoading(true);

    try {
      // Record terms acceptance
      const { error: termsError } = await supabase
        .from('project_owner_terms_acceptances')
        .insert({
          user_id: user.id,
          invitation_id: invitationId,
          terms_version: '1.0',
          ip_address: null, // Could be captured with a backend service
          user_agent: navigator.userAgent
        });

      if (termsError) throw termsError;

      // Update invitation status
      const { error: invitationError } = await supabase
        .from('project_owner_invitations')
        .update({
          status: 'accepted',
          invited_user_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (invitationError) throw invitationError;

      // Add project_owner role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'project_owner'
        });

      if (roleError && roleError.code !== '23505') { // Ignore duplicate key error
        throw roleError;
      }

      toast({
        title: "Welcome, Project Owner!",
        description: "You have successfully accepted the terms and can now create and manage projects.",
      });

      onOpenChange(false);
      onAccepted?.();
    } catch (error) {
      console.error('Error accepting terms:', error);
      toast({
        title: "Error accepting terms",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Project Owner Terms and Responsibilities
          </DialogTitle>
          <DialogDescription>
            Please read and accept the terms to become a Project Owner
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] w-full border rounded-md p-4">
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {PROJECT_OWNER_TERMS}
          </div>
        </ScrollArea>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="accept-terms"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
          />
          <label
            htmlFor="accept-terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I have read and accept the Project Owner terms and responsibilities
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Decline
          </Button>
          <Button onClick={handleAccept} disabled={!accepted || loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Accept and Continue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
