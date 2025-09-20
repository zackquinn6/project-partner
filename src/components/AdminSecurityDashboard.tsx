import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Activity, FileText, Eye, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SecureAdminUserView } from './SecureAdminUserView';

interface SensitiveDataAccess {
  id: string;
  admin_user_id: string;
  accessed_table: string;
  accessed_user_id: string | null;
  access_type: string;
  data_fields_accessed: string[];
  justification: string | null;
  ip_address: unknown;
  created_at: string;
}

interface AdminSession {
  id: string;
  admin_user_id: string;
  session_start: string;
  session_end: string | null;
  ip_address: unknown;
  is_active: boolean;
  sensitive_data_accessed: boolean;
  created_at: string;
}

export const AdminSecurityDashboard: React.FC = () => {
  const [sensitiveAccess, setSensitiveAccess] = useState<SensitiveDataAccess[]>([]);
  const [adminSessions, setAdminSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Load sensitive data access logs
      const { data: accessData, error: accessError } = await supabase
        .from('admin_sensitive_data_access')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (accessError) throw accessError;
      setSensitiveAccess(accessData || []);

      // Load admin sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from('admin_sessions')
        .select('*')
        .order('session_start', { ascending: false })
        .limit(20);
      
      if (sessionError) throw sessionError;
      setAdminSessions(sessionData || []);

    } catch (error) {
      console.error('Error loading security data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load security dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startSecureSession = async () => {
    try {
      const { data, error } = await supabase.rpc('start_admin_session');
      if (error) throw error;
      
      toast({
        title: "Secure Session Started",
        description: "Admin session initiated with full audit logging",
        variant: "default"
      });
      
      loadSecurityData();
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: "Session Start Failed",
        description: "Failed to start secure admin session",
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (accessType: string) => {
    switch (accessType) {
      case 'emergency_request':
        return 'bg-red-100 text-red-800';
      case 'masked_view':
        return 'bg-blue-100 text-blue-800';
      case 'justified_access':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Admin Security Dashboard</h2>
          <p className="text-muted-foreground">Monitor and audit all administrative access to sensitive data</p>
        </div>
        <Button onClick={startSecureSession} variant="outline">
          <Shield className="h-4 w-4 mr-2" />
          Start Secure Session
        </Button>
      </div>

      {/* Critical Security Alert */}
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Security Notice:</strong> This dashboard provides access to sensitive user data. 
          All actions are logged and monitored. Misuse of administrative privileges is strictly prohibited 
          and may result in account suspension and legal action.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="access-logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="access-logs">
            <FileText className="h-4 w-4 mr-2" />
            Access Logs
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Activity className="h-4 w-4 mr-2" />
            Admin Sessions
          </TabsTrigger>
          <TabsTrigger value="user-view">
            <Eye className="h-4 w-4 mr-2" />
            Secure User View
          </TabsTrigger>
        </TabsList>

        {/* Access Logs Tab */}
        <TabsContent value="access-logs">
          <Card>
            <CardHeader>
              <CardTitle>Sensitive Data Access Logs</CardTitle>
              <CardDescription>
                Recent access to user profiles, home addresses, and other sensitive information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading access logs...</div>
              ) : (
                <div className="space-y-3">
                  {sensitiveAccess.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No sensitive data access recorded yet
                    </div>
                  ) : (
                    sensitiveAccess.map((access) => (
                      <div key={access.id} className="border rounded p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={getSeverityColor(access.access_type)}>
                                {access.access_type}
                              </Badge>
                              <span className="font-medium">{access.accessed_table}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Fields: {access.data_fields_accessed.join(', ')}
                            </div>
                            {access.justification && (
                              <div className="text-sm">
                                <strong>Reason:</strong> {access.justification}
                              </div>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div>{new Date(access.created_at).toLocaleString()}</div>
                            {access.ip_address && <div>IP: {String(access.ip_address)}</div>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Admin Sessions</CardTitle>
              <CardDescription>
                Active and recent administrative sessions with audit tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading session data...</div>
              ) : (
                <div className="space-y-3">
                  {adminSessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No admin sessions recorded yet
                    </div>
                  ) : (
                    adminSessions.map((session) => (
                      <div key={session.id} className="border rounded p-4">
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={session.is_active ? "default" : "secondary"}>
                                {session.is_active ? "Active" : "Ended"}
                              </Badge>
                              {session.sensitive_data_accessed && (
                                <Badge variant="destructive">Sensitive Data Accessed</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Started: {new Date(session.session_start).toLocaleString()}
                            </div>
                            {session.session_end && (
                              <div className="text-sm text-muted-foreground">
                                Ended: {new Date(session.session_end).toLocaleString()}
                              </div>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {session.ip_address && <div>IP: {String(session.ip_address)}</div>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User View Tab */}
        <TabsContent value="user-view">
          <Card>
            <CardHeader>
              <CardTitle>Secure User Data Viewer</CardTitle>
              <CardDescription>
                Access user data with privacy protection and complete audit logging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">User ID</label>
                  <input
                    type="text"
                    placeholder="Enter user UUID to view masked data"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  />
                </div>
                
                {selectedUserId && (
                  <SecureAdminUserView userId={selectedUserId} />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};