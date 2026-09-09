import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle, Activity, Users, Eye, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  description: string;
  user_email: string;
  created_at: string;
  additional_data: any;
}

interface SuspiciousActivity {
  user_id: string;
  user_email: string;
  risk_score: number;
  suspicious_events: any;
}

export const SecurityMonitoringDashboard: React.FC = () => {
  const { toast } = useToast();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState<SuspiciousActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSecurityEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('security_events_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSecurityEvents((data as any) || []);
    } catch (error) {
      console.error('Error loading security events:', error);
      toast({
        title: "Error loading security events",
        description: "Please check your admin permissions.",
        variant: "destructive",
      });
    }
  };

  const loadSuspiciousActivity = async () => {
    try {
      const { data, error } = await supabase.rpc('detect_suspicious_activity' as any);
      if (error) throw error;
      setSuspiciousActivity((data as any) || []);
    } catch (error) {
      console.error('Error loading suspicious activity:', error);
      // Don't show toast for this as it might be a permissions issue
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([loadSecurityEvents(), loadSuspiciousActivity()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 100) return 'destructive';
    if (score >= 50) return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading security data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Security Monitoring Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor security events and detect suspicious activity
          </p>
        </div>
        <Button onClick={refreshData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Security Alerts */}
      {suspiciousActivity.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Suspicious Activity Detected</AlertTitle>
          <AlertDescription>
            {suspiciousActivity.length} user(s) showing suspicious behavior patterns. Review the activity below.
          </AlertDescription>
        </Alert>
      )}

      {/* Suspicious Activity Table */}
      {suspiciousActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Suspicious Activity (24h)
            </CardTitle>
            <CardDescription>
              Users with elevated risk scores based on recent activity patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Email</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Critical Events</TableHead>
                  <TableHead>Rate Violations</TableHead>
                  <TableHead>Unique IPs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspiciousActivity.map((activity, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {activity.user_email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRiskScoreColor(activity.risk_score)}>
                        {activity.risk_score}
                      </Badge>
                    </TableCell>
                    <TableCell>{activity.suspicious_events.critical_events || 0}</TableCell>
                    <TableCell>{activity.suspicious_events.rate_limit_violations || 0}</TableCell>
                    <TableCell>{activity.suspicious_events.unique_ips || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Security Events
          </CardTitle>
          <CardDescription>
            Latest security events and system activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securityEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              No security events found. Security monitoring is active.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {securityEvents.slice(0, 20).map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {event.event_type.replace(/_/g, ' ').toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityColor(event.severity)}>
                        {event.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {event.description}
                    </TableCell>
                    <TableCell>{event.user_email || 'System'}</TableCell>
                    <TableCell>
                      {new Date(event.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Security Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Total Events (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityEvents.length}</div>
            <p className="text-xs text-muted-foreground">Security events logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityEvents.filter(e => ['high', 'critical'].includes(e.severity)).length}
            </div>
            <p className="text-xs text-muted-foreground">Critical & high severity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Suspicious Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suspiciousActivity.length}</div>
            <p className="text-xs text-muted-foreground">Elevated risk scores</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};