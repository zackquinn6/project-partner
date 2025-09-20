import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield, Eye, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MaskedProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email_masked: string | null;
  full_name_masked: string | null;
  created_at: string;
  skill_level: string | null;
  home_ownership: string | null;
  home_state: string | null;
}

interface MaskedHome {
  id: string;
  user_id: string;
  name: string;
  address_masked: string | null;
  city: string | null;
  state: string | null;
  home_type: string | null;
  build_year: string | null;
  created_at: string;
}

interface SecureAdminUserViewProps {
  userId: string;
  userEmail?: string;
}

export const SecureAdminUserView: React.FC<SecureAdminUserViewProps> = ({ userId, userEmail }) => {
  const [profile, setProfile] = useState<MaskedProfile | null>(null);
  const [homes, setHomes] = useState<MaskedHome[]>([]);
  const [loading, setLoading] = useState(false);
  const [accessReason, setAccessReason] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');
  const [supervisorEmail, setSupervisorEmail] = useState('');
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const { toast } = useToast();

  const loadMaskedProfile = async (reason: string) => {
    if (!reason.trim() || reason.trim().length < 5) {
      toast({
        title: "Access Reason Required",
        description: "Please provide a valid reason (minimum 5 characters)",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_masked_profile_for_admin', {
        profile_user_id: userId,
        access_reason: reason
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setProfile(data[0]);
        toast({
          title: "Profile Accessed",
          description: "Masked profile data loaded successfully. Access logged.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error loading masked profile:', error);
      toast({
        title: "Access Failed",
        description: "Failed to load profile data. Check permissions.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMaskedHomes = async (reason: string) => {
    if (!reason.trim() || reason.trim().length < 5) {
      toast({
        title: "Access Reason Required",
        description: "Please provide a valid reason (minimum 5 characters)",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_masked_home_for_admin', {
        home_user_id: userId,
        access_reason: reason
      });

      if (error) throw error;
      
      if (data) {
        setHomes(data);
        toast({
          title: "Home Data Accessed", 
          description: "Masked home data loaded successfully. Access logged.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error loading masked homes:', error);
      toast({
        title: "Access Failed",
        description: "Failed to load home data. Check permissions.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const requestEmergencyAccess = async () => {
    if (!emergencyReason.trim() || emergencyReason.trim().length < 20) {
      toast({
        title: "Emergency Reason Required",
        description: "Please provide a detailed emergency reason (minimum 20 characters)",
        variant: "destructive"
      });
      return;
    }

    if (!supervisorEmail.trim() || !supervisorEmail.includes('@')) {
      toast({
        title: "Supervisor Email Required",
        description: "Please provide a valid supervisor email address",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('request_emergency_data_access', {
        target_user_id: userId,
        emergency_reason: emergencyReason,
        supervisor_email: supervisorEmail
      });

      if (error) throw error;
      
      toast({
        title: "Emergency Access Requested",
        description: data || "Emergency access logged and supervisor notified",
        variant: "default"
      });
      setShowEmergencyDialog(false);
      setEmergencyReason('');
      setSupervisorEmail('');
    } catch (error) {
      console.error('Error requesting emergency access:', error);
      toast({
        title: "Request Failed",
        description: "Failed to request emergency access",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Access Controls */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-800">Secure Admin Access</CardTitle>
          </div>
          <CardDescription className="text-amber-700">
            All access to sensitive user data is logged and monitored. Provide justification for data access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access-reason">Access Reason</Label>
            <Textarea
              id="access-reason"
              placeholder="Provide specific reason for accessing this user's data (minimum 5 characters)"
              value={accessReason}
              onChange={(e) => setAccessReason(e.target.value)}
              className="min-h-20"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => loadMaskedProfile(accessReason)}
              disabled={loading || accessReason.trim().length < 5}
              variant="outline"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              Load Profile (Masked)
            </Button>
            
            <Button 
              onClick={() => loadMaskedHomes(accessReason)}
              disabled={loading || accessReason.trim().length < 5}
              variant="outline"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              Load Home Data (Masked)
            </Button>

            <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Emergency Access
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Emergency Data Access</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency-reason">Emergency Reason</Label>
                    <Textarea
                      id="emergency-reason"
                      placeholder="Provide detailed emergency justification (minimum 20 characters)"
                      value={emergencyReason}
                      onChange={(e) => setEmergencyReason(e.target.value)}
                      className="min-h-24"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="supervisor-email">Supervisor Email</Label>
                    <Input
                      id="supervisor-email"
                      type="email"
                      placeholder="supervisor@company.com"
                      value={supervisorEmail}
                      onChange={(e) => setSupervisorEmail(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    onClick={requestEmergencyAccess}
                    disabled={loading}
                    className="w-full"
                    variant="destructive"
                  >
                    Request Emergency Access
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* User Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div><strong>User ID:</strong> {userId}</div>
            {userEmail && <div><strong>Email:</strong> {userEmail}</div>}
            <Badge variant="secondary">Data access requires justification</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Masked Profile Data */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Profile Data (Masked)
            </CardTitle>
            <CardDescription>
              Sensitive information has been masked for privacy protection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><strong>Display Name:</strong> {profile.display_name || 'Not set'}</div>
              <div><strong>Email:</strong> {profile.email_masked || 'Not set'}</div>
              <div><strong>Full Name:</strong> {profile.full_name_masked || 'Not set'}</div>
              <div><strong>Skill Level:</strong> {profile.skill_level || 'Not set'}</div>
              <div><strong>Home Ownership:</strong> {profile.home_ownership || 'Not set'}</div>
              <div><strong>State:</strong> {profile.home_state || 'Not set'}</div>
              <div><strong>Account Created:</strong> {new Date(profile.created_at).toLocaleDateString()}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Masked Home Data */}
      {homes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Home Data (Masked)
            </CardTitle>
            <CardDescription>
              Address information has been masked for privacy protection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {homes.map((home) => (
                <div key={home.id} className="border rounded p-4 space-y-2">
                  <div><strong>Home Name:</strong> {home.name}</div>
                  <div><strong>Address:</strong> {home.address_masked || 'Not provided'}</div>
                  <div><strong>City:</strong> {home.city || 'Not provided'}</div>
                  <div><strong>State:</strong> {home.state || 'Not provided'}</div>
                  <div><strong>Home Type:</strong> {home.home_type || 'Not specified'}</div>
                  <div><strong>Build Year:</strong> {home.build_year || 'Not specified'}</div>
                  <div><strong>Added:</strong> {new Date(home.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Notice */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="text-red-800">
              <strong>Security Notice:</strong> All access to user data is logged with timestamps, 
              IP addresses, and justifications. This access is subject to audit and review by 
              security teams. Misuse of admin privileges may result in account suspension.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};