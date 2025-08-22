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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Data Privacy & Security</h2>
      </div>

      <div className="grid gap-6">
        {/* Data Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Your Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download a complete copy of all your personal data stored in our system, including your profile, 
              project runs, and role assignments. This export is provided in JSON format.
            </p>
            <Button onClick={exportUserData} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Exporting...' : 'Export My Data'}
            </Button>
          </CardContent>
        </Card>

        {/* Data Deletion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Your Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This action is irreversible. Deleting your data will permanently 
                remove your profile, all project runs, and role assignments. Your account will also be signed out.
              </AlertDescription>
            </Alert>
            
            <p className="text-sm text-muted-foreground">
              If you wish to permanently delete all your personal data from our system, you can do so here. 
              This action complies with GDPR "right to erasure" requirements.
            </p>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" disabled={loading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete My Data
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Data Deletion</DialogTitle>
                  <DialogDescription>
                    Are you absolutely sure you want to delete all your data? This action cannot be undone.
                    This will permanently delete:
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>Your user profile and preferences</li>
                    <li>All your project runs and progress</li>
                    <li>Your role assignments and permissions</li>
                    <li>Any other personal data we have stored</li>
                  </ul>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={deleteUserData}
                    disabled={loading}
                  >
                    {loading ? 'Deleting...' : 'Yes, Delete Everything'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Privacy Information */}
        <Card>
          <CardHeader>
            <CardTitle>Your Privacy Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Data Protection:</strong> Your data is protected with Row Level Security (RLS) 
                policies that ensure you can only access your own information.
              </p>
              <p>
                <strong>Data Retention:</strong> We automatically clean up old session data after 90 days. 
                Your core profile and project data is retained until you choose to delete it.
              </p>
              <p>
                <strong>Admin Access:</strong> System administrators can view audit logs and security 
                information but cannot access your personal project data without proper authorization.
              </p>
              <p>
                <strong>Security Monitoring:</strong> We monitor failed login attempts and maintain 
                session logs for security purposes. This helps protect your account from unauthorized access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};