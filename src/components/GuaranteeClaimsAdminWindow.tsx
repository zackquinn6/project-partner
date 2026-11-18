import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  CLAIM_STATUS_LABELS,
  GUARANTEE_GOAL_LABELS,
  decideGuaranteeClaim,
  fetchClaimsByStatus,
  type ClaimDecision,
  type GuaranteeClaim,
} from '@/utils/successGuarantee';

interface GuaranteeClaimsAdminWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Parses a dollar amount typed by an admin into cents, or null when blank. */
function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`"${value}" is not a dollar amount`);
  }
  return Math.round(parsed * 100);
}

function ClaimDecisionCard({ claim, onDecided }: { claim: GuaranteeClaim; onDecided: () => Promise<void> }) {
  const [cap, setCap] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const decide = async (decision: ClaimDecision) => {
    setSaving(true);
    try {
      await decideGuaranteeClaim({
        claimId: claim.id,
        decision,
        subscriptionCapCents: dollarsToCents(cap),
        amountCents: decision === 'denied' ? null : dollarsToCents(amount),
        note: note.trim(),
      });
      toast.success(CLAIM_STATUS_LABELS[decision]);
      await onDecided();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{GUARANTEE_GOAL_LABELS[claim.goal]}</Badge>
        <span className="text-xs text-muted-foreground">
          Run {claim.projectRunId} · refund requested{' '}
          {claim.refundRequestedAt ? new Date(claim.refundRequestedAt).toLocaleString() : ''}
        </span>
      </div>
      <p className="text-sm">{claim.description}</p>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">Evidence record</summary>
        <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 text-[11px]">
          {JSON.stringify(claim.evidence, null, 2)}
        </pre>
      </details>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`cap-${claim.id}`} className="text-xs">
            Subscription amount paid for the covering period ($)
          </Label>
          <Input id={`cap-${claim.id}`} value={cap} onChange={(e) => setCap(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`amount-${claim.id}`} className="text-xs">
            Approved amount ($)
          </Label>
          <Input
            id={`amount-${claim.id}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`note-${claim.id}`} className="text-xs">
          Decision note (shown to the user)
        </Label>
        <Textarea id={`note-${claim.id}`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={saving || note.trim() === ''} onClick={() => decide('approved_refund')}>
          Approve refund
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={saving || note.trim() === ''}
          onClick={() => decide('approved_credit')}
        >
          Approve credit
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={saving || note.trim() === ''}
          onClick={() => decide('denied')}
        >
          Deny
        </Button>
      </div>
    </div>
  );
}

export function GuaranteeClaimsAdminWindow({ open, onOpenChange }: GuaranteeClaimsAdminWindowProps) {
  const [claims, setClaims] = useState<GuaranteeClaim[] | null>(null);

  const load = useCallback(async () => {
    try {
      setClaims(await fetchClaimsByStatus(['refund_requested']));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setClaims([]);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-3xl md:h-[85vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-4 py-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg font-bold">Guarantee claims</DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4">
          {claims === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading claims
            </div>
          ) : claims.length === 0 ? (
            <p className="text-sm text-muted-foreground">No refund requests are waiting.</p>
          ) : (
            claims.map((claim) => <ClaimDecisionCard key={claim.id} claim={claim} onDecided={load} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
