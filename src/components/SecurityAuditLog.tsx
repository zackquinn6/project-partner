import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Shield, UserMinus, UserPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserRole } from '@/hooks/useUserRole';

interface AuditLogEntry {
  id: string;
  user_id: string;
  target_user_id: string;
  action: string;
  role: string;
  target_user_email: string;
  created_at: string;
}

interface FailedLoginAttempt {
  id: string;
  email: string;
  attempted_at: string;
  user_agent: string;
}

export const SecurityAuditLog: React.FC = () => {
  const { isAdmin } = useUserRole();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [failedLogins, setFailedLogins] = useState<FailedLoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const loadSecurityData = async () => {
      try {
        setLoading(true);
        
        // Load role audit logs
        const { data: roleData, error: roleError } = await supabase
          .from('role_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (roleError) throw roleError;

        // Load failed login attempts
        const { data: loginData, error: loginError } = await supabase
          .from('failed_login_attempts')
          .select('*')
          .order('attempted_at', { ascending: false })
          .limit(50);

        if (loginError) throw loginError;

        setAuditLogs(roleData || []);
        setFailedLogins(loginData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load security data');
      } finally {
        setLoading(false);
      }
    };

    loadSecurityData();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You need admin privileges to view security audit logs.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return <div className="p-4">Loading security audit logs...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'add': return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'remove': return <UserMinus className="h-4 w-4 text-red-500" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    const variant = action === 'add' ? 'default' : 'destructive';
    return <Badge variant={variant}>{action.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Changes Audit Log
          </CardTitle>
          <CardDescription>
            Track all role assignments and removals in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No role changes recorded</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Target User</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.role}</Badge>
                    </TableCell>
                    <TableCell>{log.target_user_email}</TableCell>
                    <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Failed Login Attempts
          </CardTitle>
          <CardDescription>
            Monitor suspicious login activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {failedLogins.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No failed login attempts recorded</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>User Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedLogins.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell>{attempt.email}</TableCell>
                    <TableCell>{new Date(attempt.attempted_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                      {attempt.user_agent}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};