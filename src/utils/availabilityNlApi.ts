import { supabase } from '@/integrations/supabase/client';

export type AvailabilityNlStatus = 'needs_clarification' | 'ready';

export interface AvailabilityNlPatch {
  target: {
    kind: 'team_member' | 'contractor';
    id: string | null;
    nameHint: string | null;
  };
  weekendsOnly: boolean;
  weekdaysAfterFivePm: boolean;
  workingHours: { start: string; end: string };
  availableSlots: { date: string; start: string; end: string }[];
  blackoutDates: string[];
  notes: string | null;
}

export interface AvailabilityNlResponse {
  assistantMessage: string;
  status: AvailabilityNlStatus;
  clarifyingQuestions: string[];
  patches: AvailabilityNlPatch[];
}

export interface AvailabilityNlContext {
  timezone: string;
  today: string;
  targetDate?: string | null;
  dropDeadDate?: string | null;
  teamRoster: { id: string; name: string; type?: string }[];
  contractorRoster: { id: string; name: string }[];
  knownHolidays: { name: string; date: string }[];
}

export async function parseAvailabilityNl(args: {
  message: string;
  conversation: { role: 'user' | 'assistant'; content: string }[];
  context: AvailabilityNlContext;
}): Promise<AvailabilityNlResponse> {
  const { data, error } = await supabase.functions.invoke('parse-availability-nl', {
    body: {
      message: args.message,
      conversation: args.conversation,
      context: args.context,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to parse availability');
  }

  const payload = data as AvailabilityNlResponse & { error?: string };
  if (payload?.error) {
    throw new Error(payload.error);
  }

  return {
    assistantMessage: payload.assistantMessage || '',
    status: payload.status === 'ready' ? 'ready' : 'needs_clarification',
    clarifyingQuestions: Array.isArray(payload.clarifyingQuestions) ? payload.clarifyingQuestions : [],
    patches: Array.isArray(payload.patches) ? payload.patches : [],
  };
}
