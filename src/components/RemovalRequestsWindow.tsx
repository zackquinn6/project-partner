import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TermProposalsSection } from '@/components/TermProposalsSection';
import { toast } from 'sonner';

export type SharedItemType = 'tool' | 'material' | 'project' | 'category';

export const SHARED_ITEM_TYPE_LABEL: Record<SharedItemType, string> = {
  tool: 'Tool',
  material: 'Material',
  project: 'Project',
  category: 'Category',
};

type RemovalRequest = {
  id: string;
  public_key: string;
  item_name: string;
  vocab_keys: { entity: SharedItemType };
  requested_by_app: 'pp' | 'toolio';
  requested_by_email: string;
  reason: string | null;
  replacement_key: string | null;
  replacement_name: string | null;
  pp_decision: 'approve' | 'reject' | null;
  toolio_decision: 'approve' | 'reject' | null;
  status: 'open' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
};

const APP_LABEL = { pp: 'Project Partner', toolio: 'Toolio' } as const;

interface RemovalRequestsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Two-sided removal of shared items: both apps approve before an item is removed. */
export function RemovalRequestsWindow({ open, onOpenChange }: RemovalRequestsWindowProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RemovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.from('vocab_removal_requests' as any) as any)
      .select('*, vocab_keys!vocab_removal_requests_public_key_fkey(entity)')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(`Could not load removal requests: ${error.message}`);
      return;
    }
    const rows = (data ?? []) as RemovalRequest[];
    setRequests([...rows.filter((r) => r.status === 'open'), ...rows.filter((r) => r.status !== 'open')]);
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const act = async (request: RemovalRequest, action: 'approve' | 'reject' | 'cancel') => {
    if (!user?.email) {
      toast.error('Sign in again to act on removal requests');
      return;
    }
    setBusyId(request.id);
    const { error } =
      action === 'cancel'
        ? await supabase.rpc('vocab_cancel_removal' as any, { p_request_id: request.id, p_app: 'pp', p_email: user.email })
        : await supabase.rpc('vocab_decide_removal' as any, {
            p_request_id: request.id,
            p_app: 'pp',
            p_decision: action,
            p_email: user.email,
          });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      action === 'approve'
        ? `"${request.item_name}" removed`
        : action === 'reject'
          ? `Kept "${request.item_name}"`
          : 'Request cancelled',
    );
    void load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[95vw] flex-col md:max-h-[calc(100dvh-6rem)] md:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Requests</DialogTitle>
          <DialogDescription>
            Shared categories, projects, tools, and materials change only when Project Partner and Toolio both approve.
          </DialogDescription>
        </DialogHeader>
        <TermProposalsSection />
        <h3 className="text-sm font-semibold">Removal requests</h3>
        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No removal requests.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Asked by</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Replace with</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.item_name}</TableCell>
                    <TableCell className="text-xs">{SHARED_ITEM_TYPE_LABEL[r.vocab_keys.entity]}</TableCell>
                    <TableCell className="text-xs">
                      {APP_LABEL[r.requested_by_app]}
                      <div className="text-muted-foreground">{r.requested_by_email}</div>
                    </TableCell>
                    <TableCell className="max-w-xs text-xs">{r.reason ?? '-'}</TableCell>
                    <TableCell className="text-xs">{r.replacement_name ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'open' ? 'default' : 'secondary'}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === 'open' && r.requested_by_app === 'toolio' ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => act(r, 'reject')}>
                            Keep
                          </Button>
                          <Button size="sm" variant="destructive" disabled={busyId === r.id} onClick={() => act(r, 'approve')}>
                            Remove
                          </Button>
                        </div>
                      ) : r.status === 'open' ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-muted-foreground">Waiting for Toolio</span>
                          <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => act(r, 'cancel')}>
                            Cancel
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
