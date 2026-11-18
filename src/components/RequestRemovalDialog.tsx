import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type SharedTermEntity = 'tool' | 'material' | 'project' | 'category';

const ENTITY_LABEL: Record<SharedTermEntity, string> = {
  tool: 'tool',
  material: 'material',
  project: 'project',
  category: 'category',
};

const NO_REPLACEMENT = '__none__';

type Option = { public_key: string; name: string };

/** Replacement candidates: current terms of the same kind, excluding the one being removed. */
async function loadOptions(entity: SharedTermEntity, publicKey: string): Promise<Option[]> {
  const query =
    entity === 'tool'
      ? supabase.from('tools' as any).select('public_key, name')
      : entity === 'material'
        ? supabase.from('materials' as any).select('public_key, name')
        : entity === 'category'
          ? supabase.from('project_categories' as any).select('public_key, name')
          : supabase.from('projects' as any).select('public_key, name').is('parent_project_id', null);
  const { data, error } = await (query as any).order('name', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Option[]).filter((o) => o.public_key && o.public_key !== publicKey);
}

interface RequestRemovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: SharedTermEntity;
  publicKey: string;
  name: string;
  onRequested?: () => void;
}

/**
 * Shared terms are removed only when Project Partner and Toolio both approve. This starts a
 * request from Project Partner; Toolio staff decide in Toolio admin.
 */
export function RequestRemovalDialog({ open, onOpenChange, entity, publicKey, name, onRequested }: RequestRemovalDialogProps) {
  const { user } = useAuth();
  const [options, setOptions] = useState<Option[]>([]);
  const [replacement, setReplacement] = useState<string>(NO_REPLACEMENT);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReplacement(NO_REPLACEMENT);
    setReason('');
    loadOptions(entity, publicKey)
      .then(setOptions)
      .catch((error) => {
        console.error('RequestRemovalDialog options', error);
        toast.error(`Could not load ${ENTITY_LABEL[entity]}s for a replacement`);
      });
  }, [open, entity, publicKey]);

  const submit = async () => {
    if (!user?.email) {
      toast.error('Sign in again to request a removal');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc('vocab_request_removal' as any, {
      p_key: publicKey,
      p_reason: reason.trim() || null,
      p_replacement_key: replacement === NO_REPLACEMENT ? null : replacement,
      p_app: 'pp',
      p_email: user.email,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Removal of "${name}" requested. It is removed once Toolio approves.`);
    onOpenChange(false);
    onRequested?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[230] sm:max-w-lg" overlayClassName="z-[229]">
        <DialogHeader>
          <DialogTitle>Request removal of "{name}"</DialogTitle>
          <DialogDescription>
            This {ENTITY_LABEL[entity]} is shared with Toolio. It is removed only after Toolio also approves; until then it
            stays available in both apps.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="removal-replacement">Replace with</Label>
            <Select value={replacement} onValueChange={setReplacement}>
              <SelectTrigger id="removal-replacement">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[240] max-h-72">
                <SelectItem value={NO_REPLACEMENT}>No replacement</SelectItem>
                {options.map((o) => (
                  <SelectItem key={o.public_key} value={o.public_key}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Steps, saved projects, and users' owned items that use it move to the replacement. Without one, it can only be
              removed when nothing uses it.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="removal-reason">Reason</Label>
            <Textarea id="removal-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={submitting}>
            {submitting ? 'Requesting...' : 'Request removal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
