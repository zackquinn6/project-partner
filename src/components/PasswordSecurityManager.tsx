import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Key, Mail, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const PasswordSecurityManager: React.FC = () => {
  const { user } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [newEmail, setNewEmail] = useState('');
  
  useEffect(() => {
    if (user?.email) {
      setNewEmail(user.email);
    }
  }, [user]);

  const handlePasswordUpdate = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      toast.success('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!newEmail || newEmail === user?.email) {
      toast.error('Please enter a new email address');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });
      
      if (error) throw error;
      
      toast.success('Email update request sent. Please check your new email for confirmation.');
    } catch (error: any) {
      console.error('Email update error:', error);
      toast.error(error.message || 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Email Update Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="w-4 h-4" />
            Email Address
          </CardTitle>
          <CardDescription className="text-xs">
            Update your account email address. You'll need to verify the new email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="current-email" className="text-xs">Current Email</Label>
            <Input
              id="current-email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-muted h-8 text-sm"
            />
          </div>
          
          <div>
            <Label htmlFor="new-email" className="text-xs">New Email Address</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter new email address"
              className="h-8 text-sm"
            />
          </div>
          
          <Button 
            onClick={handleEmailUpdate} 
            disabled={emailLoading || !newEmail || newEmail === user?.email}
            className="w-full"
            size="sm"
          >
            {emailLoading ? 'Updating...' : 'Update Email'}
          </Button>
          
          <Alert className="py-2">
            <AlertTriangle className="w-3 h-3" />
            <AlertDescription className="text-xs">
              You'll receive a confirmation email. Confirm the change before it takes effect.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Password Update Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-4 h-4" />
            Change Password
          </CardTitle>
          <CardDescription className="text-xs">
            Choose a strong password with at least 6 characters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="current-password" className="text-xs">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({
                  ...prev,
                  currentPassword: e.target.value
                }))}
                placeholder="Enter current password"
                className="h-8 text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-8 px-2"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          
          <div>
            <Label htmlFor="new-password" className="text-xs">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({
                  ...prev,
                  newPassword: e.target.value
                }))}
                placeholder="Enter new password"
                className="h-8 text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-8 px-2"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          
          <div>
            <Label htmlFor="confirm-password" className="text-xs">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({
                  ...prev,
                  confirmPassword: e.target.value
                }))}
                placeholder="Confirm new password"
                className="h-8 text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-8 px-2"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          
          {passwordData.newPassword && passwordData.confirmPassword && (
            <Alert className={`py-2 ${passwordData.newPassword === passwordData.confirmPassword ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
              {passwordData.newPassword === passwordData.confirmPassword ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <AlertDescription className="text-green-700 text-xs">
                    Passwords match
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  <AlertDescription className="text-red-700 text-xs">
                    Passwords do not match
                  </AlertDescription>
                </>
              )}
            </Alert>
          )}
          
          <Button 
            onClick={handlePasswordUpdate} 
            disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
            className="w-full"
            size="sm"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
          
          <Alert className="py-2">
            <AlertTriangle className="w-3 h-3" />
            <AlertDescription className="text-xs">
              After changing password, you may need to sign in again on other devices.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• Use unique passwords not used elsewhere</li>
            <li>• Mix uppercase, lowercase, numbers, and symbols</li>
            <li>• Avoid personal information like names or dates</li>
            <li>• Consider a password manager for strong passwords</li>
            <li>• Sign out on shared or public computers</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};