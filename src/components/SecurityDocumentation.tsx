import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Lock, Eye, AlertTriangle, Database, Code } from 'lucide-react';

/**
 * Security Documentation Component
 * 
 * Provides comprehensive documentation of the application's security architecture,
 * implemented measures, and remaining considerations for administrators.
 * 
 * This component serves as both documentation and a security review checklist
 * for administrators managing the application's security posture.
 */
export const SecurityDocumentation: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Architecture Overview
          </CardTitle>
          <CardDescription>
            Comprehensive security measures implemented across the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Authentication & Authorization
              </h4>
              <ul className="text-sm space-y-1 ml-6">
                <li>• Supabase Auth with email/password and OAuth</li>
                <li>• Row Level Security (RLS) on all user data tables</li>
                <li>• Admin role-based access control</li>
                <li>• Session management with automatic token refresh</li>
                <li>• CSRF protection with token validation</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Data Protection
              </h4>
              <ul className="text-sm space-y-1 ml-6">
                <li>• Input sanitization on all user inputs</li>
                <li>• SQL injection prevention via parameterized queries</li>
                <li>• XSS protection through Content Security Policy</li>
                <li>• Sensitive data access logging</li>
                <li>• User data isolation via RLS policies</li>
              </ul>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <h4 className="font-semibold">Security Headers Implemented</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Badge variant="secondary">Content-Security-Policy</Badge>
              <Badge variant="secondary">X-Content-Type-Options</Badge>
              <Badge variant="secondary">Referrer-Policy</Badge>
              <Badge variant="secondary">Permissions-Policy</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Note: X-Frame-Options is conditionally disabled for Lovable editor compatibility.
              CSP frame-ancestors directive provides equivalent protection.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Security Implementation
          </CardTitle>
          <CardDescription>
            Enhanced RLS policies and security functions for data protection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold">Enhanced RLS Policies</h4>
            <ul className="text-sm space-y-1 ml-4">
              <li>• <strong>Profiles table:</strong> Users can only access their own profile data</li>
              <li>• <strong>Maintenance settings:</strong> Strict user-scoped access to contact information</li>
              <li>• <strong>Failed login attempts:</strong> Admin-only access with audit logging</li>
              <li>• <strong>Security events:</strong> Comprehensive logging of all admin security actions</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold">Security Functions Available</h4>
            <ul className="text-sm space-y-1 ml-4">
              <li>• <code>get_failed_login_summary()</code> - Provides masked security reports for admins</li>
              <li>• <code>validate_admin_security_access()</code> - Validates and logs admin actions</li>
              <li>• <code>log_security_event()</code> - Comprehensive security event logging</li>
              <li>• <code>cleanup_security_logs()</code> - Automated maintenance of security data</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Security Considerations & Maintenance
          </CardTitle>
          <CardDescription>
            Ongoing security tasks and considerations for administrators
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold">Required Dashboard Configuration</h4>
            <div className="bg-warning-soft/10 p-3 rounded-md">
              <p className="text-sm">
                <strong>Action Required:</strong> Configure the following in your Supabase dashboard:
              </p>
              <ul className="text-sm mt-2 ml-4">
                <li>• Enable leaked password protection in Auth settings</li>
                <li>• Upgrade Postgres version for latest security patches</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Security Monitoring</h4>
            <ul className="text-sm space-y-1 ml-4">
              <li>• Failed login attempts are automatically rate-limited</li>
              <li>• All admin access to security data is logged and audited</li>
              <li>• Automatic cleanup of old security logs (90+ days for failed logins)</li>
              <li>• Security events are tracked with timestamps and user identification</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold">Data Privacy Compliance</h4>
            <ul className="text-sm space-y-1 ml-4">
              <li>• User profile data is isolated and only accessible by the user</li>
              <li>• Email addresses and contact information are protected via RLS</li>
              <li>• Admin access to user data is limited and audited</li>
              <li>• Failed login data uses masked email domains for analysis</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Implementation Details
          </CardTitle>
          <CardDescription>
            Technical implementation of security measures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Client-Side Protection</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>• SecurityHeadersProvider implements comprehensive header policy</li>
                <li>• Input sanitization prevents XSS and injection attacks</li>
                <li>• CSRF tokens validate form submissions</li>
                <li>• Rate limiting prevents brute force attacks</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Server-Side Security</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>• RLS policies enforce data access controls at database level</li>
                <li>• Security definer functions provide controlled admin access</li>
                <li>• Comprehensive audit trail for all security-sensitive operations</li>
                <li>• Automated maintenance tasks prevent log accumulation</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Lovable Editor Compatibility</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>• X-Frame-Options conditionally disabled for iframe embedding</li>
                <li>• CSP frame-ancestors directive provides equivalent protection</li>
                <li>• Detection logic identifies Lovable development environment</li>
                <li>• Production deployments maintain strict frame protection</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};