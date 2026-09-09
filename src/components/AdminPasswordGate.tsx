import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AdminPasswordGateProps {
  onAuthenticated: () => void;
  onCancel: () => void;
}

const AdminPasswordGate: React.FC<AdminPasswordGateProps> = ({ onAuthenticated, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasAdminRole, setHasAdminRole] = useState<boolean | null>(null);
  const { user, loading } = useAuth();

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) {
      setHasAdminRole(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('is_admin', { check_user_id: user.id });
      
      if (error) {
        console.error('Error checking admin role:', error);
        setHasAdminRole(false);
      } else {
        setHasAdminRole(data);
        if (data) {
          onAuthenticated();
        }
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      setHasAdminRole(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <p className="text-muted-foreground">Verifying admin access...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Authentication Required</CardTitle>
            <CardDescription>
              You must be logged in to access admin features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={onCancel} 
              className="w-full"
              variant="outline"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasAdminRole === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription>
              You don't have admin privileges to access this area
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                  Contact an administrator to request admin access for your account
                </p>
              </div>
              <Button 
                onClick={onCancel} 
                className="w-full"
                variant="outline"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // This return shouldn't be reached if hasAdminRole is true, 
  // as onAuthenticated() is called in the useEffect
  return null;
};

export default AdminPasswordGate;