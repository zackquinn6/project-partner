import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Shield, Activity, Download, Trash2 } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  target_user_id: string;
  action: string;
  role: string;
  target_user_email: string;
  created_at: string;
}

interface FailedLogin {
  id: string;
  email: string;
  ip_address: string | null;
  attempt_time: string;
  user_agent: string | null;
}

interface UserSession {
  id: string;
  user_id: string;
  session_start: string;
  session_end: string | null;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
}

export const SecurityDashboard: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [failedLogins, setFailedLogins] = useState<FailedLogin[]>([]);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadSecurityData = async () => {
    try {
      const [auditResult, failedResult, sessionsResult] = await Promise.all([
        supabase.from('role_audit_log').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('failed_login_attempts').select('*').order('attempt_time', { ascending: false }).limit(50),
        supabase.from('user_sessions').select('*').order('session_start', { ascending: false }).limit(50)
      ]);

      if (auditResult.error) throw auditResult.error;
      if (failedResult.error) throw failedResult.error;
      if (sessionsResult.error) throw sessionsResult.error;

      setAuditLogs(auditResult.data || []);
      setFailedLogins((failedResult.data || []) as FailedLogin[]);
      setUserSessions((sessionsResult.data || []) as UserSession[]);
    } catch (error) {
      console.error('Error loading security data:', error);
      toast({
        title: "Error",
        description: "Failed to load security data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldSessions = async () => {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_sessions');
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Cleaned up ${data} old sessions`,
      });
      
      loadSecurityData();
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      toast({
        title: "Error",
        description: "Failed to cleanup old sessions",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  if (loading) {
    return <div>Loading security dashboard...</div>;
  }

  const recentFailedLogins = failedLogins.filter(login => 
    new Date(login.attempt_time) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  const activeSessions = userSessions.filter(session => session.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Security Dashboard</h1>
        <Button onClick={loadSecurityData} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins (24h)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentFailedLogins.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Role Changes (7d)</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLogs.filter(log => 
                new Date(log.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="failed">Failed Logins</TabsTrigger>
          <TabsTrigger value="sessions">User Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Change Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Target User</TableHead>
                    <TableHead>Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={log.action === 'add' ? 'default' : 'destructive'}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.role}</TableCell>
                      <TableCell>{log.target_user_email}</TableCell>
                      <TableCell>{log.user_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Failed Login Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>User Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedLogins.map((login) => (
                    <TableRow key={login.id}>
                      <TableCell>{new Date(login.attempt_time).toLocaleString()}</TableCell>
                      <TableCell>{login.email}</TableCell>
                      <TableCell>{login.ip_address || 'Unknown'}</TableCell>
                      <TableCell className="max-w-xs truncate">{login.user_agent || 'Unknown'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>User Sessions</CardTitle>
              <Button onClick={cleanupOldSessions} variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Cleanup Old Sessions
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Ended</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-mono text-xs">{session.user_id}</TableCell>
                      <TableCell>{new Date(session.session_start).toLocaleString()}</TableCell>
                      <TableCell>
                        {session.session_end ? new Date(session.session_end).toLocaleString() : 'Active'}
                      </TableCell>
                      <TableCell>{session.ip_address || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant={session.is_active ? 'default' : 'secondary'}>
                          {session.is_active ? 'Active' : 'Ended'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};