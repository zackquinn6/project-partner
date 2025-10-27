import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Loader2 } from 'lucide-react';
import { validateEmail } from '@/utils/enhancedInputSanitization';

interface ProjectOwnerInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvitationSent?: () => void;
}

export const ProjectOwnerInvitationDialog: React.FC<ProjectOwnerInvitationDialogProps> = ({
  open,
  onOpenChange,
  onInvitationSent
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendInvitation = async () => {
    if (!user || !email) return;

    if (!validateEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Generate invitation token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Check if user already exists
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email.toLowerCase())
        .single();

      const { error } = await supabase
        .from('project_owner_invitations')
        .insert({
          invited_by: user.id,
          invited_email: email.toLowerCase(),
          invited_user_id: profileData?.user_id || null,
          invitation_token: token,
          expires_at: expiresAt.toISOString(),
          status: 'pending',
          terms_version: '1.0'
        });

      if (error) throw error;

      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${email}`,
      });

      setEmail('');
      onOpenChange(false);
      onInvitationSent?.();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error sending invitation",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Project Owner</DialogTitle>
          <DialogDescription>
            Send an invitation to become a Project Owner. They will need to accept the terms and conditions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email Address</label>
            <Input
              type="email"
              placeholder="owner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleSendInvitation}
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
