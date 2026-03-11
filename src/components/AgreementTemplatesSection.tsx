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

type AgreementType = 'liability' | 'membership';

interface TemplateVersion {
  id: string;
  type: AgreementType;
  body: string;
  created_at: string;
  updated_by: string | null;
}

const TYPE_LABELS: Record<AgreementType, string> = {
  liability: 'General Liability',
  membership: 'Membership Agreement',
};

export function AgreementTemplatesSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = useState<Record<AgreementType, TemplateVersion | null>>({
    liability: null,
    membership: null,
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
    const next = {
      liability: (liabilityRows && liabilityRows[0]) ? liabilityRows[0] as TemplateVersion : null,
      membership: (membershipRows && membershipRows[0]) ? membershipRows[0] as TemplateVersion : null,
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

  const openView = (type: AgreementType) => {
    const t = current[type];
    if (t) {
      setEditBody(t.body);
      setDialogType(type);
      setDialogMode('view');
      setDialogOpen(true);
    } else {
      toast({ title: 'No template', description: `No ${TYPE_LABELS[type]} template found.`, variant: 'destructive' });
    }
  };

  const openEdit = (type: AgreementType) => {
    const t = current[type];
    if (t) {
      setEditBody(t.body);
      setDialogType(type);
      setDialogMode('edit');
      setDialogOpen(true);
    } else {
      toast({ title: 'No template', description: `No ${TYPE_LABELS[type]} template found.`, variant: 'destructive' });
    }
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
            Agreement templates
          </CardTitle>
          <CardDescription>
            View or edit the current liability and membership agreement templates. Each save creates a new version; history is kept.
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
