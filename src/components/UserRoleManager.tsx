import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Shield, User, FolderOpen, Mail } from 'lucide-react';
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
  const [projectsDialogOpenForUserId, setProjectsDialogOpenForUserId] = useState<string | null>(null);
  const [draftOwnerProjectIds, setDraftOwnerProjectIds] = useState<Record<string, string[]>>({});
  const [sendInviteForUserId, setSendInviteForUserId] = useState<string | null>(null);
  const [sendInviteEmail, setSendInviteEmail] = useState('');
  const [sendInviteProjectIds, setSendInviteProjectIds] = useState<string[]>([]);
  const [sendInviteProjectSearch, setSendInviteProjectSearch] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);

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
          .in('user_id', projectOwnerUserIds)
          .is('invitation_status', null);
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
        .eq('user_id', userId)
        .is('invitation_status', null);
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

  const openProjectsDialog = (userId: string) => {
    setDraftOwnerProjectIds(prev => ({ ...prev, [userId]: ownerProjectIds[userId] ?? [] }));
    setProjectsDialogOpenForUserId(userId);
  };

  const toggleDraftOwnerProject = (userId: string, projectId: string, selected: boolean) => {
    const current = draftOwnerProjectIds[userId] ?? ownerProjectIds[userId] ?? [];
    const next = selected
      ? [...current, projectId]
      : current.filter(id => id !== projectId);
    setDraftOwnerProjectIds(prev => ({ ...prev, [userId]: next }));
  };

  const handleSaveOwnerProjects = async () => {
    if (!projectsDialogOpenForUserId) return;
    const projectIds = draftOwnerProjectIds[projectsDialogOpenForUserId] ?? ownerProjectIds[projectsDialogOpenForUserId] ?? [];
    await saveOwnerProjects(projectsDialogOpenForUserId, projectIds);
    setProjectsDialogOpenForUserId(null);
  };

  const openSendInvite = (userId: string) => {
    const profile = users.find(u => u.user_id === userId);
    setSendInviteForUserId(userId);
    setSendInviteEmail(profile?.email?.trim() ?? '');
    setSendInviteProjectIds([]);
    setSendInviteProjectSearch('');
  };

  const toggleSendInviteProject = (projectId: string, selected: boolean) => {
    setSendInviteProjectIds(prev =>
      selected ? [...prev, projectId] : prev.filter(id => id !== projectId)
    );
  };

  const handleSendProjectOwnerInvites = async () => {
    if (!user || !sendInviteForUserId || !sendInviteEmail.trim() || sendInviteProjectIds.length === 0) return;
    setSendingInvites(true);
    try {
      const invitedProfile = users.find(u => u.user_id === sendInviteForUserId);
      const email = sendInviteEmail.trim().toLowerCase();
      const invitedUserId = invitedProfile?.user_id ?? null;
      const created: string[] = [];
      for (const projectId of sendInviteProjectIds) {
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const { data: row, error } = await supabase
          .from('project_owners')
          .insert({
            project_id: projectId,
            invited_email: email,
            invited_user_id: invitedUserId,
            invited_by: user.id,
            invitation_token: token,
            invitation_status: 'pending',
            expires_at: expiresAt.toISOString(),
            terms_version: '1.0',
          })
          .select('id')
          .single();
        if (error) {
          if ((error as { code?: string }).code === '23505') {
            toast({ title: 'Already invited', description: 'One or more invitations already exist for this project and email.', variant: 'destructive' });
          } else throw error;
          setSendingInvites(false);
          return;
        }
        if (row?.id) created.push(row.id);
      }
      for (const invitationId of created) {
        await supabase.functions.invoke('send-project-owner-invite', {
          body: { invitation_id: invitationId },
        });
      }
            setSendInviteForUserId(null);
      setSendInviteEmail('');
      setSendInviteProjectIds([]);
      loadUsers();
    } catch (err: unknown) {
      console.error('Error sending invitations:', err);
      toast({
        title: 'Error sending invitations',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSendingInvites(false);
    }
  };
  if (loading) {
    return <div className="flex justify-center p-8">Loading users...</div>;
  }

  const sendInviteProfile = sendInviteForUserId ? users.find(u => u.user_id === sendInviteForUserId) : null;

  return (
    <div className="space-y-6">
      <Dialog open={!!sendInviteForUserId} onOpenChange={(open) => !open && setSendInviteForUserId(null)}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>Send project owner invite</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {sendInviteProfile ? `Invite ${displayName(sendInviteProfile)} to become a project owner. They will receive an email and in-app notification with a link to accept the agreement.` : 'Select projects and enter email.'}
            </p>
          </DialogHeader>
          <div className="space-y-3 px-4 pb-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email address</label>
              <Input
                type="email"
                placeholder="owner@example.com"
                value={sendInviteEmail}
                onChange={(e) => setSendInviteEmail(e.target.value)}
                disabled={sendingInvites}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Projects</label>
              <Input
                type="search"
                placeholder="Search projects..."
                className="h-9"
                value={sendInviteProjectSearch}
                onChange={(e) => setSendInviteProjectSearch(e.target.value)}
                disabled={sendingInvites}
              />
              <div className="border rounded-md max-h-[220px] overflow-y-auto">
                {parentProjects
                  .filter((proj) => {
                    const q = sendInviteProjectSearch.trim().toLowerCase();
                    return !q || proj.name.toLowerCase().includes(q);
                  })
                  .map((proj) => {
                    const selected = sendInviteProjectIds.includes(proj.id);
                    return (
                      <label
                        key={proj.id}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSendInviteProject(proj.id, !selected)}
                          className="h-4 w-4 shrink-0 rounded border-2 border-primary/50"
                          disabled={sendingInvites}
                        />
                        <span className="truncate">{proj.name}</span>
                      </label>
                    );
                  })}
                {parentProjects.filter((p) => !sendInviteProjectSearch.trim() || p.name.toLowerCase().includes(sendInviteProjectSearch.trim().toLowerCase())).length === 0 && (
                  <div className="py-4 text-center text-sm text-muted-foreground">No projects found.</div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="px-4 py-3 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setSendInviteForUserId(null)} disabled={sendingInvites}>Cancel</Button>
            <Button
              onClick={handleSendProjectOwnerInvites}
              disabled={sendingInvites || !sendInviteEmail.trim() || sendInviteProjectIds.length === 0}
            >
              <Mail className="w-4 h-4 mr-2" />
              {sendingInvites ? 'Sending…' : 'Send invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                        <select
                          value={selectValue}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (ALLOWED_ROLES.includes(v as typeof ALLOWED_ROLES[number])) changeUserRole(profile.user_id, v);
                          }}
                          aria-label={`Change role for ${displayName(profile)}`}
                          className="flex h-8 w-[160px] rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          <option value="user">User</option>
                          <option value="project_owner">Project Owner</option>
                          <option value="admin">Admin</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          {role === 'project_owner' && (
                            <Dialog
                              open={projectsDialogOpenForUserId === profile.user_id}
                              onOpenChange={(open) => open ? openProjectsDialog(profile.user_id) : setProjectsDialogOpenForUserId(null)}
                            >
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="justify-start gap-2 min-w-[140px]" disabled={savingOwnerProjects[profile.user_id]}>
                                  <FolderOpen className="w-4 h-4 shrink-0" />
                                  {(ownerProjectIds[profile.user_id]?.length ?? 0) > 0
                                    ? `${ownerProjectIds[profile.user_id].length} project(s)`
                                    : 'Assign projects'}
                                </Button>
                              </DialogTrigger>
                            <DialogContent className="max-w-md max-h-[85vh] flex flex-col gap-0 p-0">
                              <DialogHeader className="px-4 pt-4 pb-2">
                                <DialogTitle>Assign projects for {displayName(profile)}</DialogTitle>
                              </DialogHeader>
                              <div className="px-4 pb-2">
                                <Input
                                  type="search"
                                  placeholder="Search projects..."
                                  className="h-9"
                                  value={projectSearch[profile.user_id] ?? ''}
                                  onChange={(e) => setProjectSearch((prev) => ({ ...prev, [profile.user_id]: e.target.value }))}
                                />
                              </div>
                              <div
                                className="flex-1 overflow-y-auto border-t px-4 py-2 min-h-0"
                                style={{ maxHeight: 320 }}
                              >
                                {parentProjects
                                  .filter((proj) => {
                                    const q = (projectSearch[profile.user_id] ?? '').trim().toLowerCase();
                                    return !q || proj.name.toLowerCase().includes(q);
                                  })
                                  .map((proj) => {
                                    const draftIds = draftOwnerProjectIds[profile.user_id] ?? ownerProjectIds[profile.user_id] ?? [];
                                    const selected = draftIds.includes(proj.id);
                                    const id = `project-${profile.user_id}-${proj.id}`;
                                    return (
                                      <label
                                        key={proj.id}
                                        htmlFor={id}
                                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                      >
                                        <input
                                          type="checkbox"
                                          id={id}
                                          checked={selected}
                                          onChange={() => toggleDraftOwnerProject(profile.user_id, proj.id, !selected)}
                                          className="h-4 w-4 shrink-0 rounded border-2 border-primary/50"
                                        />
                                        <span className="truncate">{proj.name}</span>
                                      </label>
                                    );
                                  })}
                                {parentProjects.filter((proj) => {
                                  const q = (projectSearch[profile.user_id] ?? '').trim().toLowerCase();
                                  return !q || proj.name.toLowerCase().includes(q);
                                }).length === 0 && (
                                  <div className="py-6 text-center text-sm text-muted-foreground">No projects found.</div>
                                )}
                              </div>
                              <DialogFooter className="px-4 py-3 border-t flex-shrink-0">
                                <Button variant="outline" onClick={() => setProjectsDialogOpenForUserId(null)}>
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleSaveOwnerProjects}
                                  disabled={savingOwnerProjects[profile.user_id]}
                                >
                                  {savingOwnerProjects[profile.user_id] ? 'Saving…' : 'Save'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => openSendInvite(profile.user_id)}
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Send invite
                          </Button>
                        </div>
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