import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import { ProjectOwnerInvitationDialog } from './ProjectOwnerInvitationDialog';
import { ProjectOwnerTermsDialog } from './ProjectOwnerTermsDialog';

interface Invitation {
  id: string;
  invited_email: string;
  status: string;
  created_at: string;
  expires_at: string;
  invited_by: string;
  invitation_token: string;
}

export const ProjectOwnerInvitationsList: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [selectedInvitationId, setSelectedInvitationId] = useState<string>('');

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('project_owner_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast({
        title: "Error loading invitations",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Declined</Badge>;
      case 'expired':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const handleAcceptInvitation = (invitationId: string) => {
    setSelectedInvitationId(invitationId);
    setTermsDialogOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading invitations...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Project Owner Invitations
              </CardTitle>
              <CardDescription>
                Manage invitations to become Project Owners
              </CardDescription>
            </div>
            <Button onClick={() => setInviteDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {invitations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.invited_email}</TableCell>
                    <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                    <TableCell>{new Date(invitation.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(invitation.expires_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {invitation.status === 'pending' && invitation.invited_by !== user?.id && (
                        <Button
                          size="sm"
                          onClick={() => handleAcceptInvitation(invitation.id)}
                        >
                          Review Terms
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No invitations found. Send an invitation to get started.
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectOwnerInvitationDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvitationSent={loadInvitations}
      />

      {selectedInvitationId && (
        <ProjectOwnerTermsDialog
          open={termsDialogOpen}
          onOpenChange={setTermsDialogOpen}
          invitationId={selectedInvitationId}
          onAccepted={loadInvitations}
        />
      )}
    </>
  );
};
