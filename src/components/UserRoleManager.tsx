import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Shield, User, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const ALLOWED_ROLES = ['user', 'project_owner', 'admin'] as const;

interface UserProfileRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  nickname: string | null;
  display_name: string | null;
  roles: string[];
}

interface ParentProject {
  id: string;
  name: string;
}

function displayName(p: UserProfileRow): string {
  return p.email || p.display_name || p.full_name || p.nickname || p.user_id;
}

function currentRole(roles: string[]): string {
  const r = Array.isArray(roles) ? roles : [];
  for (const allowed of ALLOWED_ROLES) {
    if (r.includes(allowed)) return allowed;
  }
  return 'user';
}

export const UserRoleManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfileRow[]>([]);
  const [parentProjects, setParentProjects] = useState<ParentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerProjectIds, setOwnerProjectIds] = useState<Record<string, string[]>>({});
  const [savingOwnerProjects, setSavingOwnerProjects] = useState<Record<string, boolean>>({});
  const [projectSearch, setProjectSearch] = useState<Record<string, string>>({});

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data: profilesData, error: profilesError } = await supabase
        .rpc('get_user_profiles_for_role_management');

      if (profilesError) {
        console.error('❌ Error loading user profiles:', profilesError);
        throw profilesError;
      }

      const rows: UserProfileRow[] = (profilesData || []).map((p: { user_id: string; email: string | null; full_name: string | null; nickname: string | null; display_name: string | null; roles: string[] }) => ({
        user_id: p.user_id,
        email: p.email ?? null,
        full_name: p.full_name ?? null,
        nickname: p.nickname ?? null,
        display_name: p.display_name ?? null,
        roles: Array.isArray(p.roles) ? p.roles : ['user']
      }));

      rows.sort((a, b) => displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' }));
      setUsers(rows);

      const projectOwnerUserIds = rows
        .filter(r => currentRole(r.roles) === 'project_owner')
        .map(r => r.user_id);
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
      console.error('❌ Error loading user_profiles:', error);
      toast({
        title: "Error loading user profiles",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
    loadUsers();
  }, []);

  const changeUserRole = async (userId: string, newRole: string) => {
    if (!user) return;
    if (!ALLOWED_ROLES.includes(newRole as typeof ALLOWED_ROLES[number])) return;
    try {
      const { error } = await supabase.rpc('set_user_role_for_management', {
        p_user_id: userId,
        p_new_role: newRole
      });
      if (error) throw error;
      await loadUsers();
      toast({ title: "Success", description: "Role updated" });
    } catch (error: any) {
      console.error('Error changing role:', error);
      toast({
        title: "Error updating role",
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
  if (loading) {
    return <div className="flex justify-center p-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            User Role Management
          </CardTitle>
          <CardDescription>
            All users are in user_profiles and default to role &quot;user&quot;. Change a user&apos;s role using the dropdown. Sorted alphabetically by name or email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Change role</TableHead>
                  <TableHead>Projects owned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((profile) => {
                  const role = currentRole(profile.roles);
                  const selectValue = ALLOWED_ROLES.includes(role as typeof ALLOWED_ROLES[number]) ? role : 'user';
                  return (
                    <TableRow key={profile.user_id}>
                      <TableCell className="flex items-center gap-2">
                        <User className="w-4 h-4 shrink-0" />
                        {displayName(profile)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={selectValue}
                          onValueChange={(v) => {
                            if (v !== selectValue) changeUserRole(profile.user_id, v);
                          }}
                        >
                          <SelectTrigger className="w-[160px] h-8" aria-label={`Change role for ${displayName(profile)}`}>
                            <SelectValue placeholder="Change role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="project_owner">Project Owner</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {role === 'project_owner' ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full justify-start gap-2 min-w-[140px]" disabled={savingOwnerProjects[profile.user_id]}>
                                <FolderOpen className="w-4 h-4 shrink-0" />
                                {(ownerProjectIds[profile.user_id]?.length ?? 0) > 0
                                  ? `${ownerProjectIds[profile.user_id].length} project(s)`
                                  : 'Select projects'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[320px] p-0 z-[100]"
                              align="start"
                              onOpenAutoFocus={(e) => e.preventDefault()}
                            >
                              <div className="flex flex-col" style={{ maxHeight: 'min(70vh, 400px)' }}>
                                <div className="flex-shrink-0 p-2 border-b">
                                  <Input
                                    type="search"
                                    placeholder="Search projects..."
                                    className="h-9"
                                    value={projectSearch[profile.user_id] ?? ''}
                                    onChange={(e) => setProjectSearch((prev) => ({ ...prev, [profile.user_id]: e.target.value }))}
                                  />
                                </div>
                                <div
                                  className="flex-1 overflow-y-auto overflow-x-hidden p-1 min-h-0"
                                  style={{ maxHeight: 280, WebkitOverflowScrolling: 'touch' }}
                                  role="listbox"
                                >
                                  {parentProjects
                                    .filter((proj) => {
                                      const q = (projectSearch[profile.user_id] ?? '').trim().toLowerCase();
                                      return !q || proj.name.toLowerCase().includes(q);
                                    })
                                    .map((proj) => {
                                      const selected = (ownerProjectIds[profile.user_id] ?? []).includes(proj.id);
                                      return (
                                        <div
                                          key={proj.id}
                                          role="option"
                                          aria-selected={selected}
                                          className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground select-none"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleOwnerProject(profile.user_id, proj.id, !selected);
                                          }}
                                        >
                                          <Checkbox checked={selected} className="pointer-events-none shrink-0" />
                                          <span className="truncate">{proj.name}</span>
                                        </div>
                                      );
                                    })}
                                  {parentProjects.filter((proj) => {
                                    const q = (projectSearch[profile.user_id] ?? '').trim().toLowerCase();
                                    return !q || proj.name.toLowerCase().includes(q);
                                  }).length === 0 && (
                                    <div className="py-6 text-center text-sm text-muted-foreground">No projects found.</div>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No users found in user_profiles.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};