import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Trash2, Plus, Shield, User, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
interface UserRoleRow {
  user_id: string;
  role: string;
  profiles: {
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
  roles: string[];
}
interface ParentProject {
  id: string;
  name: string;
}
export const UserRoleManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [parentProjects, setParentProjects] = useState<ParentProject[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const [ownerProjectIds, setOwnerProjectIds] = useState<Record<string, string[]>>({});
  const [savingOwnerProjects, setSavingOwnerProjects] = useState<Record<string, boolean>>({});
  const loadUserRoles = async () => {
    try {
      console.log('📥 Loading user roles...');
      const {
        data: profilesData,
        error: profilesError
      } = await supabase.from('user_profiles').select('user_id, email, full_name, nickname, display_name, roles');
      if (profilesError) {
        console.error('❌ Error loading profiles:', profilesError);
        throw profilesError;
      }

      console.log('✅ Loaded profiles:', profilesData?.length || 0);

      const rolesList: UserRoleRow[] = [];
      for (const p of profilesData || []) {
        const roles = Array.isArray(p.roles) ? p.roles : ['user'];
        for (const role of roles) {
          rolesList.push({
            user_id: p.user_id,
            role,
            profiles: { full_name: p.full_name, nickname: p.nickname }
          });
        }
      }

      console.log('✅ Combined user roles with profiles:', rolesList.length);
      setUserRoles(rolesList);
      const users = (profilesData || []).map(p => ({
        user_id: p.user_id,
        email: p.email ?? null,
        full_name: p.full_name ?? null,
        nickname: p.nickname ?? null,
        display_name: p.display_name ?? null,
        roles: Array.isArray(p.roles) ? p.roles : ['user']
      }));
      setAllUsers(users);

      const projectOwnerUserIds = [...new Set(rolesList.filter(r => r.role === 'project_owner').map(r => r.user_id))];
      if (projectOwnerUserIds.length > 0) {
        const { data: ownersData } = await supabase
          .from('project_owners')
          .select('user_id, project_id')
          .in('user_id', projectOwnerUserIds);
        const byUser: Record<string, string[]> = {};
        for (const uid of projectOwnerUserIds) byUser[uid] = [];
        for (const row of ownersData || []) {
          if (!byUser[row.user_id]) byUser[row.user_id] = [];
          byUser[row.user_id].push(row.project_id);
        }
        setOwnerProjectIds(byUser);
      } else {
        setOwnerProjectIds({});
      }
    } catch (error: any) {
      console.error('❌ Error loading user roles:', error);
      toast({
        title: "Error loading user roles",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    }
  };
  useEffect(() => {
    const loadParentProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .is('parent_project_id', null)
        .order('name');
      setParentProjects((data as ParentProject[]) || []);
    };
    loadParentProjects();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadUserRoles();
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
      const profile = allUsers.find(p => p.user_id === selectedUserId);
      const currentRoles = profile?.roles ?? [];
      if (currentRoles.includes(newUserRole)) {
        toast({
          title: "Role already exists",
          description: "This user already has this role.",
          variant: "destructive"
        });
        return;
      }

      const newRoles = [...currentRoles, newUserRole];
      const { error } = await supabase
        .from('user_profiles')
        .update({ roles: newRoles })
        .eq('user_id', selectedUserId);

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

  const updateUserRole = async (userId: string, oldRole: string, newRole: string) => {
    if (!user) return;
    try {
      if (oldRole === 'project_owner') {
        const { error: delError } = await supabase
          .from('project_owners')
          .delete()
          .eq('user_id', userId);
        if (delError) throw delError;
      }
      const profile = allUsers.find(p => p.user_id === userId);
      const currentRoles = (profile?.roles ?? []).filter(r => r !== oldRole);
      if (!currentRoles.includes(newRole)) currentRoles.push(newRole);
      const { error } = await supabase
        .from('user_profiles')
        .update({ roles: currentRoles })
        .eq('user_id', userId);
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
  const removeUserRole = async (userId: string, role: string) => {
    if (!user) return;

    try {
      if (role === 'project_owner') {
        const { error: delError } = await supabase
          .from('project_owners')
          .delete()
          .eq('user_id', userId);
        if (delError) throw delError;
      }
      const profile = allUsers.find(p => p.user_id === userId);
      let newRoles = (profile?.roles ?? []).filter(r => r !== role);
      if (newRoles.length === 0) newRoles = ['user'];
      const { error } = await supabase
        .from('user_profiles')
        .update({ roles: newRoles })
        .eq('user_id', userId);
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

  const saveOwnerProjects = async (userId: string, projectIds: string[]) => {
    if (!user) return;
    setSavingOwnerProjects(prev => ({ ...prev, [userId]: true }));
    try {
      const { error: delError } = await supabase
        .from('project_owners')
        .delete()
        .eq('user_id', userId);
      if (delError) throw delError;
      if (projectIds.length > 0) {
        const { error: insError } = await supabase
          .from('project_owners')
          .insert(projectIds.map(project_id => ({
            project_id,
            user_id: userId,
            created_by: user.id
          })));
        if (insError) throw insError;
      }
      setOwnerProjectIds(prev => ({ ...prev, [userId]: projectIds }));
      toast({ title: "Saved", description: "Assigned projects updated" });
    } catch (error: any) {
      toast({
        title: "Error updating assigned projects",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingOwnerProjects(prev => ({ ...prev, [userId]: false }));
    }
  };

  const toggleOwnerProject = (userId: string, projectId: string, selected: boolean) => {
    const current = ownerProjectIds[userId] ?? [];
    const next = selected
      ? [...current, projectId]
      : current.filter(id => id !== projectId);
    saveOwnerProjects(userId, next);
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
                  <TableHead>Projects owned</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRoles.map(userRole => <TableRow key={`${userRole.user_id}-${userRole.role}`}>
                    <TableCell className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {userRole.profiles?.full_name || userRole.profiles?.nickname || 'Unknown User'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={userRole.role}
                        onValueChange={(v) => {
                          if (v !== userRole.role) {
                            updateUserRole(userRole.user_id, userRole.role, v);
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
                      {userRole.role === 'project_owner' ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-start gap-2" disabled={savingOwnerProjects[userRole.user_id]}>
                              <FolderOpen className="w-4 h-4" />
                              {(ownerProjectIds[userRole.user_id]?.length ?? 0) > 0
                                ? `${ownerProjectIds[userRole.user_id].length} project(s)`
                                : 'Select projects'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search projects..." />
                              <CommandEmpty>No projects found.</CommandEmpty>
                              <CommandGroup>
                                {parentProjects.map((proj) => {
                                  const selected = (ownerProjectIds[userRole.user_id] ?? []).includes(proj.id);
                                  return (
                                    <CommandItem
                                      key={proj.id}
                                      onSelect={() => toggleOwnerProject(userRole.user_id, proj.id, !selected)}
                                    >
                                      <Checkbox checked={selected} className="mr-2" />
                                      <span className="truncate">{proj.name}</span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      {userRole.role !== 'user' ? (
                        <Button size="sm" variant="ghost" onClick={() => removeUserRole(userRole.user_id, userRole.role)} className="text-destructive hover:text-destructive">
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