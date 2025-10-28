import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Shield, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: {
    email: string;
    display_name: string;
  } | null;
}
interface UserProfile {
  user_id: string;
  email: string;
  display_name: string;
}
export const UserRoleManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const loadUserRoles = async () => {
    try {
      // First get user roles
      const {
        data: rolesData,
        error: rolesError
      } = await supabase.from('user_roles').select('*').order('created_at', {
        ascending: false
      });
      if (rolesError) throw rolesError;

      // Then get profiles separately and match them
      const {
        data: profilesData,
        error: profilesError
      } = await supabase.from('profiles').select('user_id, email, display_name');
      if (profilesError) throw profilesError;

      // Combine the data
      const userRolesWithProfiles = (rolesData || []).map(role => ({
        ...role,
        profiles: profilesData?.find(profile => profile.user_id === role.user_id) || null
      }));
      setUserRoles(userRolesWithProfiles);
    } catch (error) {
      console.error('Error loading user roles:', error);
      toast({
        title: "Error loading user roles",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };
  const loadAllUsers = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('user_id, email, display_name').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadUserRoles(), loadAllUsers()]);
      setLoading(false);
    };
    loadData();
  }, []);
  const addUserRole = async () => {
    console.log('🔧 addUserRole called', { newUserEmail, newUserRole, user });
    
    if (!user) {
      console.log('❌ No user authenticated');
      return;
    }

    // Basic validation
    if (!newUserEmail || !newUserRole) {
      console.log('❌ Missing fields', { newUserEmail, newUserRole });
      toast({
        title: "Please fill all fields",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail)) {
      toast({
        title: "Invalid email format",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🔍 Searching for user in allUsers:', allUsers.length, 'users');
      console.log('📋 Available users:', allUsers.map(u => u.email));
      
      // Find user by email
      const targetUser = allUsers.find(u => u.email.toLowerCase() === newUserEmail.toLowerCase());
      console.log('🔍 Target user found:', targetUser);
      
      if (!targetUser) {
        console.log('❌ User not found');
        toast({
          title: "User not found",
          description: `The user "${newUserEmail}" hasn't signed up yet. Ask them to create an account first.`,
          variant: "destructive"
        });
        return;
      }

      // Check if role already exists
      const existingRole = userRoles.find(ur => ur.user_id === targetUser.user_id && ur.role === newUserRole);
      if (existingRole) {
        toast({
          title: "Role already exists",
          description: "This user already has this role.",
          variant: "destructive"
        });
        return;
      }

      console.log('📝 Inserting role:', { user_id: targetUser.user_id, role: newUserRole });
      
      const { error, data } = await supabase.from('user_roles').insert({
        user_id: targetUser.user_id,
        role: newUserRole
      }).select();
      
      console.log('✅ Insert result:', { error, data });
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: `Role ${newUserRole} added successfully`
      });

      setNewUserEmail('');
      setNewUserRole('user');
      await loadUserRoles();
    } catch (error: any) {
      console.error('Error adding user role:', error);
      toast({
        title: "Error adding role",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    }
  };
  const removeUserRole = async (roleId: string, userEmail: string, role: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
      if (error) throw error;

      await loadUserRoles();
      
      toast({
        title: "Success",
        description: "Role removed successfully"
      });
    } catch (error: any) {
      console.error('Error removing user role:', error);
      toast({
        title: "Error removing role",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    }
  };
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'project_owner':
        return 'default';
      default:
        return 'outline';
    }
  };
  if (loading) {
    return <div className="flex justify-center p-8">Loading user roles...</div>;
  }
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            User Role Management
          </CardTitle>
          <CardDescription>
            Manage user roles and permissions. Users must sign up before roles can be assigned.
            {allUsers.length > 0 && (
              <div className="mt-2 text-sm">
                Available users: {allUsers.map(u => u.email).join(', ')}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">User Email</label>
              <Input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="user@example.com" type="email" />
            </div>
            <div className="w-48">
              <label className="text-sm font-medium">Role</label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="project_owner">Project Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              type="button"
              onClick={() => {
                console.log('🔘 Button clicked!');
                addUserRole();
              }} 
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Role
            </Button>
          </div>

          {userRoles.length > 0 ? <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRoles.map(userRole => <TableRow key={userRole.id}>
                    <TableCell className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {userRole.profiles?.display_name || 'Unknown User'}
                    </TableCell>
                    <TableCell>{userRole.profiles?.email || 'No email'}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(userRole.role)}>
                        {userRole.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(userRole.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => removeUserRole(userRole.id, userRole.profiles?.email || 'Unknown', userRole.role)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table> : <div className="text-center py-8 text-muted-foreground">
              No user roles found. Add roles to users to get started.
            </div>}
        </CardContent>
      </Card>

      
    </div>;
};