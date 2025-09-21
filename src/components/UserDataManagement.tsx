import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Download, Trash2, AlertTriangle, Shield } from 'lucide-react';

export const UserDataManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const exportUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('export_user_data', {
        user_uuid: user.id
      });

      if (error) throw error;

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Your data has been exported successfully",
      });
    } catch (error) {
      console.error('Error exporting user data:', error);
      toast({
        title: "Error",
        description: "Failed to export user data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('delete_user_data', {
        user_uuid: user.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your data has been deleted successfully",
      });

      // Sign out the user after data deletion
      await supabase.auth.signOut();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting user data:', error);
      toast({
        title: "Error",
        description: "Failed to delete user data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {/* Data Export */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" />
              Export Your Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Download a complete copy of all your personal data including profile, project runs, and role assignments in JSON format.
            </p>
            <Button onClick={exportUserData} disabled={loading} size="sm">
              <Download className="h-3 w-3 mr-2" />
              {loading ? 'Exporting...' : 'Export My Data'}
            </Button>
          </CardContent>
        </Card>

        {/* Data Deletion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-destructive text-base">
              <Trash2 className="h-4 w-4" />
              Delete Your Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert className="py-2">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                <strong>Warning:</strong> Irreversible action. Permanently removes profile, project runs, and role assignments.
              </AlertDescription>
            </Alert>
            
            <p className="text-xs text-muted-foreground">
              Permanently delete all personal data. Complies with GDPR "right to erasure" requirements.
            </p>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" disabled={loading} size="sm">
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete My Data
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base">Confirm Data Deletion</DialogTitle>
                  <DialogDescription className="text-sm">
                    Are you sure? This will permanently delete:
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                    <li>User profile and preferences</li>
                    <li>All project runs and progress</li>
                    <li>Role assignments and permissions</li>
                    <li>Any other personal data stored</li>
                  </ul>
                </div>
                <DialogFooter className="gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={loading}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={deleteUserData}
                    disabled={loading}
                    size="sm"
                  >
                    {loading ? 'Deleting...' : 'Delete Everything'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Privacy Information */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your Privacy Rights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                <strong>Data Protection:</strong> RLS policies ensure you only access your own information.
              </p>
              <p>
                <strong>Data Retention:</strong> Session data auto-cleaned after 90 days. Profile data retained until deleted.
              </p>
              <p>
                <strong>Admin Access:</strong> Admins view audit logs but need authorization for personal project data.
              </p>
              <p>
                <strong>Security Monitoring:</strong> Login attempts and sessions monitored for account protection.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};