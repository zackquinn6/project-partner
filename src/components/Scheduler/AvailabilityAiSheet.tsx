import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, Undo2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  parseAvailabilityNl,
  type AvailabilityNlPatch,
} from '@/utils/availabilityNlApi';
import {
  applyContractorPatches,
  applyTeamMemberPatches,
  type ContractorAvailabilityShape,
  type TeamMemberAvailabilityShape,
} from '@/utils/applyAvailabilityPatches';
import { formatYmd, usHolidaysInRange } from '@/utils/usHolidays';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface AvailabilityAiSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: TeamMemberAvailabilityShape[];
  onTeamMembersChange: (members: TeamMemberAvailabilityShape[]) => void;
  contractors?: ContractorAvailabilityShape[];
  onContractorsChange?: (contractors: ContractorAvailabilityShape[]) => void;
  targetDate?: string;
  dropDeadDate?: string;
  /** Prefill focus member id (e.g. from calendar "Describe instead") */
  focusMemberId?: string | null;
}

export function AvailabilityAiSheet({
  open,
  onOpenChange,
  teamMembers,
  onTeamMembersChange,
  contractors = [],
  onContractorsChange,
  targetDate,
  dropDeadDate,
  focusMemberId,
}: AvailabilityAiSheetProps) {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [lastSummary, setLastSummary] = useState<string[]>([]);
  const [undoSnapshot, setUndoSnapshot] = useState<{
    team: TeamMemberAvailabilityShape[];
    contractors: ContractorAvailabilityShape[];
  } | null>(null);

  const knownHolidays = useMemo(() => {
    const from = new Date();
    const to = dropDeadDate
      ? (() => {
          const [y, m, d] = dropDeadDate.split('-').map(Number);
          return new Date(y, m - 1, d);
        })()
      : new Date(from.getFullYear(), from.getMonth() + 3, from.getDate());
    return usHolidaysInRange(from, to);
  }, [dropDeadDate]);

  const resetConversation = () => {
    setTurns([]);
    setInput('');
    setLastSummary([]);
  };

  const handleUndo = () => {
    if (!undoSnapshot) return;
    onTeamMembersChange(undoSnapshot.team);
    onContractorsChange?.(undoSnapshot.contractors);
    setUndoSnapshot(null);
    setLastSummary([]);
    toast({ title: 'Availability restored', description: 'Reverted the last AI update.' });
  };

  const applyReadyPatches = (patches: AvailabilityNlPatch[]) => {
    const teamResult = applyTeamMemberPatches(teamMembers, patches);
    const contractorResult = applyContractorPatches(contractors, patches);

    if (teamResult.unresolved.length || contractorResult.unresolved.length) {
      const names = [...teamResult.unresolved, ...contractorResult.unresolved];
      setTurns((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I couldn't match: ${names.join(', ')}. Which team member or contractor should this apply to?`,
        },
      ]);
      return false;
    }

    setUndoSnapshot({
      team: teamMembers.map((m) => ({
        ...m,
        availability: { ...m.availability },
        blackoutDates: [...(m.blackoutDates ?? [])],
        workingHours: { ...m.workingHours },
      })),
      contractors: contractors.map((c) => ({
        ...c,
        availabilityDates: { ...c.availabilityDates },
        notAvailableDates: [...(c.notAvailableDates ?? [])],
      })),
    });

    onTeamMembersChange(teamResult.next);
    if (contractorResult.next.length && onContractorsChange) {
      onContractorsChange(contractorResult.next);
    }

    const summary = [...teamResult.summary, ...contractorResult.summary];
    setLastSummary(summary);
    return true;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput('');
    const nextTurns: ChatTurn[] = [...turns, { role: 'user', content: text }];
    setTurns(nextTurns);

    try {
      const focusHint =
        focusMemberId && teamMembers.find((m) => m.id === focusMemberId)
          ? ` (Prefer applying to team member id ${focusMemberId} / ${teamMembers.find((m) => m.id === focusMemberId)?.name} unless the user names someone else.)`
          : '';

      const result = await parseAvailabilityNl({
        message: text + focusHint,
        conversation: nextTurns.slice(0, -1),
        context: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          today: formatYmd(new Date()),
          targetDate: targetDate || null,
          dropDeadDate: dropDeadDate || null,
          teamRoster: teamMembers.map((m) => ({
            id: m.id,
            name: m.name,
            type: m.type,
          })),
          contractorRoster: contractors.map((c) => ({ id: c.id, name: c.name })),
          knownHolidays,
        },
      });

      let assistantContent = result.assistantMessage;
      if (result.clarifyingQuestions.length > 0) {
        assistantContent +=
          (assistantContent ? '\n\n' : '') +
          result.clarifyingQuestions.map((q) => `• ${q}`).join('\n');
      }

      if (result.status === 'ready' && result.patches.length > 0) {
        const applied = applyReadyPatches(result.patches);
        if (applied) {
          assistantContent +=
            (assistantContent ? '\n\n' : '') +
            'Updated availability. You can undo if this looks wrong.';
        }
      }

      setTurns((prev) => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Failed to parse availability';
      setTurns((prev) => [...prev, { role: 'assistant', content: msg }]);
      toast({ title: 'Availability AI failed', description: msg, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetConversation();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            Describe availability
          </DialogTitle>
          <DialogDescription className="text-xs">
            Text alternative to the calendar. Example: “Vacation this weekend; after 5pm Mon–Thu. No Labor Day or Mother’s Day.”
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-[220px] max-h-[40vh] px-4 py-3">
          <div className="space-y-3">
            {turns.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Try: “Mike the tiler is only free Saturdays 8–2.” I’ll ask if anything is unclear, then write it into team/contractor availability.
              </p>
            )}
            {turns.map((t, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  t.role === 'user' ? 'bg-primary/10 ml-6' : 'bg-muted/50 mr-6'
                }`}
              >
                {t.content}
              </div>
            ))}
            {lastSummary.length > 0 && (
              <div className="space-y-1 rounded-lg border p-2">
                <p className="text-xs font-medium">What changed</p>
                {lastSummary.map((s, i) => (
                  <Badge key={i} variant="outline" className="mr-1 mb-1 text-xs font-normal">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 pt-2 border-t space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe when you (or a contractor) can or can’t work…"
            className="min-h-[72px] text-sm"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!undoSnapshot}
              onClick={handleUndo}
              className="h-8 text-xs"
            >
              <Undo2 className="w-3.5 h-3.5 mr-1" />
              Undo
            </Button>
            <Button type="button" size="sm" className="h-8" disabled={busy || !input.trim()} onClick={() => void send()}>
              {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AvailabilityAiSheet;
