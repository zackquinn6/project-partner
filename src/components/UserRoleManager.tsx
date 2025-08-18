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
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const {
    toast
  } = useToast();
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
    if (!newUserEmail || !newUserRole) {
      toast({
        title: "Please fill all fields",
        variant: "destructive"
      });
      return;
    }
    try {
      // Find user by email
      const user = allUsers.find(u => u.email.toLowerCase() === newUserEmail.toLowerCase());
      if (!user) {
        toast({
          title: "User not found",
          description: "Please make sure the user has signed up first.",
          variant: "destructive"
        });
        return;
      }

      // Check if role already exists
      const existingRole = userRoles.find(ur => ur.user_id === user.user_id && ur.role === newUserRole);
      if (existingRole) {
        toast({
          title: "Role already exists",
          description: "This user already has this role.",
          variant: "destructive"
        });
        return;
      }
      const {
        error
      } = await supabase.from('user_roles').insert({
        user_id: user.user_id,
        role: newUserRole
      });
      if (error) throw error;
      setNewUserEmail('');
      setNewUserRole('user');
      await loadUserRoles();
    } catch (error) {
      console.error('Error adding user role:', error);
      toast({
        title: "Error adding role",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };
  const removeUserRole = async (roleId: string, userEmail: string, role: string) => {
    try {
      const {
        error
      } = await supabase.from('user_roles').delete().eq('id', roleId);
      if (error) throw error;
      await loadUserRoles();
    } catch (error) {
      console.error('Error removing user role:', error);
      toast({
        title: "Error removing role",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
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
            Manage user roles and permissions for the application
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
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addUserRole} className="flex items-center gap-2">
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