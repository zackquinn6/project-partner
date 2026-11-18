import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { AssumptionsList } from '@/components/AssumptionsList';
import type { RunAssumption } from '@/utils/projectAssumptions';

interface AssumptionsAcknowledgementDialogProps {
  open: boolean;
  assumptions: RunAssumption[];
  onCancel: () => void;
  onAcknowledge: () => Promise<void>;
}

/** Shown before the plan baseline locks when the run still has unacknowledged assumptions. */
export function AssumptionsAcknowledgementDialog({
  open,
  assumptions,
  onCancel,
  onAcknowledge,
}: AssumptionsAcknowledgementDialogProps) {
  const [saving, setSaving] = useState(false);

  const handleAcknowledge = async () => {
    setSaving(true);
    try {
      await onAcknowledge();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onCancel()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plan assumptions</DialogTitle>
          <DialogDescription>
            Your plan is built on these conditions. Items marked "Not covered by the plan" are not
            handled if they turn out false, and they bound the success guarantee.
          </DialogDescription>
        </DialogHeader>
        <AssumptionsList assumptions={assumptions} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Back to planning
          </Button>
          <Button onClick={handleAcknowledge} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Acknowledge and lock plan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
