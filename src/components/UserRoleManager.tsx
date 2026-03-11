import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
    full_name: string | null;
    nickname: string | null;
  } | null;
}
interface UserProfile {
  user_id: string;
  email: string | null;
  full_name: string | null;
  nickname: string | null;
  display_name?: string | null;
}
export const UserRoleManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const loadUserRoles = async () => {
    try {
      console.log('📥 Loading user roles...');
      // First get user roles
      const {
        data: rolesData,
        error: rolesError
      } = await supabase.from('user_roles').select('*').order('created_at', {
        ascending: false
      });
      
      if (rolesError) {
        console.error('❌ Error loading roles:', rolesError);
        throw rolesError;
      }

      console.log('✅ Loaded roles:', rolesData?.length || 0);

      // Then get profiles separately and match them
      const {
        data: profilesData,
        error: profilesError
      } = await supabase.from('profiles').select('user_id, email, full_name, nickname, display_name');
      if (profilesError) {
        console.error('❌ Error loading profiles:', profilesError);
        throw profilesError;
      }

      console.log('✅ Loaded profiles:', profilesData?.length || 0);

      // Build list: every profile appears at least once (with role from user_roles or default "user")
      const rolesWithProfiles = (rolesData || []).map(role => ({
        ...role,
        profiles: profilesData?.find(profile => profile.user_id === role.user_id) || null
      }));
      const userIdsWithRoles = new Set((rolesData || []).map((r: { user_id: string }) => r.user_id));
      const profilesWithoutRole = (profilesData || []).filter(p => !userIdsWithRoles.has(p.user_id));
      const defaultUserRows: UserRole[] = profilesWithoutRole.map(profile => ({
        id: '',
        user_id: profile.user_id,
        role: 'user',
        created_at: new Date().toISOString(),
        profiles: profile
      }));
      const userRolesWithProfiles = [...rolesWithProfiles, ...defaultUserRows];

      console.log('✅ Combined user roles with profiles:', userRolesWithProfiles.length);
      setUserRoles(userRolesWithProfiles);
    } catch (error: any) {
      console.error('❌ Error loading user roles:', error);
      toast({
        title: "Error loading user roles",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    }
  };
  const loadAllUsers = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('user_id, email, full_name, nickname, display_name').order('user_id');
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
    if (!user) return;

    if (!selectedUserId || !newUserRole) {
      toast({
        title: "Please select a user and role",
        variant: "destructive"
      });
      return;
    }

    try {
      const existingRole = userRoles.find(ur => ur.user_id === selectedUserId && ur.role === newUserRole);
      if (existingRole) {
        toast({
          title: "Role already exists",
          description: "This user already has this role.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.from('user_roles').insert({
        user_id: selectedUserId,
        role: newUserRole
      }).select();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role ${newUserRole} added successfully`
      });

      setSelectedUserId('');
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

  const updateUserRole = async (roleId: string, newRole: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('id', roleId);
      if (error) throw error;
      await loadUserRoles();
      toast({
        title: "Success",
        description: "Role updated"
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error updating role",
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
            Manage user roles and permissions. Select a user and role to add, or change role in the table.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 min-w-0">
              <label className="text-sm font-medium">User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.email || u.display_name || u.full_name || u.nickname || u.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              onClick={addUserRole}
              className="flex items-center gap-2"
              disabled={!selectedUserId}
            >
              <Plus className="w-4 h-4" />
              Add Role
            </Button>
          </div>

          {userRoles.length > 0 ? <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRoles.map(userRole => <TableRow key={userRole.id || `profile-${userRole.user_id}`}>
                    <TableCell className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {userRole.profiles?.full_name || userRole.profiles?.nickname || 'Unknown User'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={userRole.role}
                        onValueChange={(v) => {
                          if (userRole.id) {
                            updateUserRole(userRole.id, v);
                          } else {
                            supabase.from('user_roles').insert({ user_id: userRole.user_id, role: v }).then(({ error }) => {
                              if (error) toast({ title: "Error adding role", description: error.message, variant: "destructive" });
                              else loadUserRoles();
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="project_owner">Project Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {userRole.id ? new Date(userRole.created_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      {userRole.id ? (
                        <Button size="sm" variant="ghost" onClick={() => removeUserRole(userRole.id, userRole.profiles?.full_name || userRole.profiles?.nickname || 'Unknown', userRole.role)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">Default</span>
                      )}
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