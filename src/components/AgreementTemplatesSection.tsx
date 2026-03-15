import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Shield, Edit, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type AgreementType = 'liability' | 'membership' | 'project_owner' | 'privacy';

interface TemplateVersion {
  id: string;
  type: AgreementType;
  body: string;
  created_at: string;
  updated_by: string | null;
}

const TYPE_LABELS: Record<AgreementType, string> = {
  liability: 'Usage Agreement',
  membership: 'Membership Agreement',
  project_owner: 'Project Owner Agreement',
  privacy: 'Privacy Policy',
};

const PLACEHOLDER_PROJECT_OWNER_AGREEMENT = `Project Owner Agreement (Placeholder)

This is placeholder content for the Project Partner Project Owner Agreement. You can edit this template later.

1. Role
As a Project Owner you may be assigned to specific projects and granted access to manage those projects within the app.

2. Responsibilities
You agree to use project owner features in accordance with Project Partner policies and to keep project content accurate and appropriate.

3. Acceptance
By accepting this agreement you confirm you have read and agree to the terms above.`.trim();

const PLACEHOLDER_PRIVACY_POLICY = `Privacy Policy (Placeholder)

This is placeholder content for the Project Partner Privacy Policy. You can edit this template later.

- What we collect
- How we use your data
- How we protect your data
- Your choices`.trim();

export function AgreementTemplatesSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = useState<Record<AgreementType, TemplateVersion | null>>({
    liability: null,
    membership: null,
    project_owner: null,
    privacy: null,
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<AgreementType | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCurrent = useCallback(async (): Promise<Record<AgreementType, TemplateVersion | null>> => {
    const { data: liabilityRows } = await supabase
      .from('agreement_templates')
      .select('id, type, body, created_at, updated_by')
      .eq('type', 'liability')
      .order('created_at', { ascending: false })
      .limit(1);
    const { data: membershipRows } = await supabase
      .from('agreement_templates')
      .select('id, type, body, created_at, updated_by')
      .eq('type', 'membership')
      .order('created_at', { ascending: false })
      .limit(1);
    const { data: projectOwnerRows } = await supabase
      .from('agreement_templates')
      .select('id, type, body, created_at, updated_by')
      .eq('type', 'project_owner')
      .order('created_at', { ascending: false })
      .limit(1);
    const { data: privacyRows } = await supabase
      .from('agreement_templates')
      .select('id, type, body, created_at, updated_by')
      .eq('type', 'privacy')
      .order('created_at', { ascending: false })
      .limit(1);
    const next = {
      liability: (liabilityRows && liabilityRows[0]) ? liabilityRows[0] as TemplateVersion : null,
      membership: (membershipRows && membershipRows[0]) ? membershipRows[0] as TemplateVersion : null,
      project_owner: (projectOwnerRows && projectOwnerRows[0]) ? projectOwnerRows[0] as TemplateVersion : null,
      privacy: (privacyRows && privacyRows[0]) ? privacyRows[0] as TemplateVersion : null,
    };
    setCurrent(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchCurrent();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchCurrent]);

  const placeholderFor = (type: AgreementType) =>
    type === 'project_owner' ? PLACEHOLDER_PROJECT_OWNER_AGREEMENT : type === 'privacy' ? PLACEHOLDER_PRIVACY_POLICY : '';

  const openView = (type: AgreementType) => {
    const t = current[type];
    setEditBody(t?.body ?? placeholderFor(type));
    setDialogType(type);
    setDialogMode('view');
    setDialogOpen(true);
  };

  const openEdit = (type: AgreementType) => {
    const t = current[type];
    setEditBody(t?.body ?? placeholderFor(type));
    setDialogType(type);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (dialogType == null || !editBody.trim() || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agreement_templates')
        .insert({ type: dialogType, body: editBody.trim(), updated_by: user.id });
      if (error) throw error;
      toast({ title: 'Saved', description: `${TYPE_LABELS[dialogType]} template updated. A new version was saved.` });
      const updated = await fetchCurrent();
      setEditBody(updated[dialogType]?.body ?? editBody);
      setDialogMode('view');
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to save template', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const displayBody = dialogMode === 'view' && dialogType
    ? (() => {
        const t = current[dialogType];
        const header = t
          ? `Last updated: ${format(new Date(t.created_at), 'PPpp')}\n\n`
          : '';
        return header + (t?.body ?? editBody);
      })()
    : editBody;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Agreement Templates & Policies
          </CardTitle>
          <CardDescription>
            View or edit the current usage agreement, membership agreement, project owner agreement, and privacy policy templates. Each save creates a new version; history is kept.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agreement type</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="w-[240px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    {TYPE_LABELS.liability}
                  </TableCell>
                  <TableCell>
                    {current.liability
                      ? format(new Date(current.liability.created_at), 'PPp')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openView('liability')}>
                        <Eye className="h-4 w-4 mr-1" />
                        Open template
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit('liability')}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {TYPE_LABELS.membership}
                  </TableCell>
                  <TableCell>
                    {current.membership
                      ? format(new Date(current.membership.created_at), 'PPp')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openView('membership')}>
                        <Eye className="h-4 w-4 mr-1" />
                        Open template
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit('membership')}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    {TYPE_LABELS.project_owner}
                  </TableCell>
                  <TableCell>
                    {current.project_owner
                      ? format(new Date(current.project_owner.created_at), 'PPp')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openView('project_owner')}>
                        <Eye className="h-4 w-4 mr-1" />
                        Open template
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit('project_owner')}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    {TYPE_LABELS.privacy}
                  </TableCell>
                  <TableCell>
                    {current.privacy
                      ? format(new Date(current.privacy.created_at), 'PPp')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openView('privacy')}>
                        <Eye className="h-4 w-4 mr-1" />
                        Open template
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit('privacy')}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {dialogType ? TYPE_LABELS[dialogType] : 'Agreement'}
              {dialogMode === 'edit' && ' — Edit'}
            </DialogTitle>
          </DialogHeader>
          {dialogMode === 'view' ? (
            <>
              <ScrollArea className="h-[60vh] min-h-[300px] border rounded-md p-4 shrink-0">
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{displayBody}</pre>
              </ScrollArea>
              <div className="flex justify-end gap-2 pt-2 shrink-0">
                <Button variant="outline" onClick={() => dialogType && openEdit(dialogType)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button onClick={() => setDialogOpen(false)}>Close</Button>
              </div>
            </>
          ) : (
            <>
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="Agreement body..."
              />
              <div className="flex justify-end gap-2 pt-2 shrink-0">
                <Button variant="outline" onClick={() => setDialogMode('view')} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || !editBody.trim()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save new version
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
