import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SecurityAuditLog } from '@/components/SecurityAuditLog';
import { DataExportManager } from '@/components/DataExportManager';
import { UserRoleManager } from '@/components/UserRoleManager';
import { Shield, Users, Download, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserRole } from '@/hooks/useUserRole';

export const SecurityManagement: React.FC = () => {
  const { isAdmin } = useUserRole();

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Security Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage security settings, audit logs, and data privacy
        </p>
      </div>

      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important Configuration Required:</strong> To complete security setup, 
          please configure these settings in your Supabase dashboard:
          <ul className="mt-2 list-disc list-inside space-y-1">
            <li>Set OTP expiry to 10 minutes (Auth {'>'} Settings)</li>
            <li>Enable leaked password protection (Auth {'>'} Settings)</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="privacy" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Data Privacy
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Roles
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security Audit
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Data Privacy & Export</CardTitle>
              <CardDescription>
                Manage your personal data and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataExportManager />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="roles">
              <Card>
                <CardHeader>
                  <CardTitle>User Role Management</CardTitle>
                  <CardDescription>
                    Manage user roles and permissions (Admin only)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserRoleManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit">
              <Card>
                <CardHeader>
                  <CardTitle>Security Audit Logs</CardTitle>
                  <CardDescription>
                    Monitor security events and user activities (Admin only)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SecurityAuditLog />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};