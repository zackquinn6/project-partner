import { supabase } from '@/integrations/supabase/client';
import {
  EMPTY_HELP_USAGE,
  HELP_MESSAGE_CAP,
  HelpUsageStatus,
} from '@/utils/helpChatSafety';

export type HelpThread = {
  id: string;
  user_id: string;
  project_run_id: string | null;
  template_project_id: string | null;
  template_family: string;
  step_id: string | null;
  step_title: string | null;
  phase_id: string | null;
  phase_name: string | null;
  title: string | null;
  status: string;
  last_message_at: string;
  created_at: string;
};

export type HelpMessage = {
  id: string;
  thread_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  photo_paths: string[];
  safety_flags: unknown;
  model: string | null;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any;

export async function fetchHelpUsageStatus(): Promise<HelpUsageStatus> {
  const { data, error } = await sb().rpc('get_help_usage_status');
  if (error) {
    console.error('get_help_usage_status', error);
    return EMPTY_HELP_USAGE;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return EMPTY_HELP_USAGE;
  return {
    messageCount: Number(row.message_count ?? 0),
    messageCap: Number(row.message_cap ?? HELP_MESSAGE_CAP),
    remaining: Number(row.remaining ?? HELP_MESSAGE_CAP),
    capped: Boolean(row.capped),
    periodStart: row.period_start ?? null,
    periodEnd: row.period_end ?? null,
  };
}

export async function listHelpThreadsForUser(params: {
  userId: string;
  templateFamily?: string;
  projectRunId?: string;
  limit?: number;
}): Promise<HelpThread[]> {
  let q = sb()
    .from('help_threads')
    .select('*')
    .eq('user_id', params.userId)
    .order('last_message_at', { ascending: false })
    .limit(params.limit ?? 30);

  if (params.templateFamily) {
    q = q.eq('template_family', params.templateFamily);
  }

  const { data, error } = await q;
  if (error) {
    console.error('listHelpThreadsForUser', error);
    return [];
  }
  return (data || []) as HelpThread[];
}

export async function listHelpMessages(threadId: string): Promise<HelpMessage[]> {
  const { data, error } = await sb()
    .from('help_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('listHelpMessages', error);
    return [];
  }
  return (data || []) as HelpMessage[];
}

export async function createHelpThread(input: {
  userId: string;
  projectRunId?: string | null;
  templateProjectId?: string | null;
  templateFamily: string;
  stepId?: string | null;
  stepTitle?: string | null;
  phaseId?: string | null;
  phaseName?: string | null;
  title?: string | null;
}): Promise<HelpThread | null> {
  const { data, error } = await sb()
    .from('help_threads')
    .insert({
      user_id: input.userId,
      project_run_id: input.projectRunId || null,
      template_project_id: input.templateProjectId || null,
      template_family: input.templateFamily,
      step_id: input.stepId || null,
      step_title: input.stepTitle || null,
      phase_id: input.phaseId || null,
      phase_name: input.phaseName || null,
      title: input.title || input.stepTitle || 'Project help',
      status: 'open',
    })
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('createHelpThread', error);
    return null;
  }
  return data as HelpThread;
}

export async function uploadHelpChatPhoto(userId: string, file: File): Promise<string | null> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('help-chat-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  });
  if (error) {
    console.error('uploadHelpChatPhoto', error);
    return null;
  }
  return path;
}

export async function signedHelpPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('help-chat-photos')
    .createSignedUrl(path, 3600);
  if (error) {
    console.error('signedHelpPhotoUrl', error);
    return null;
  }
  return data?.signedUrl || null;
}

export type SendHelpChatResult = {
  threadId: string;
  userMessageId: string;
  assistantMessageId: string;
  reply: string;
  safetyFlags: string[];
  usage: HelpUsageStatus;
  refused: boolean;
};

export async function sendHelpChatMessage(body: {
  threadId?: string | null;
  projectRunId?: string | null;
  templateProjectId?: string | null;
  templateFamily: string;
  stepId?: string | null;
  stepTitle?: string | null;
  phaseId?: string | null;
  phaseName?: string | null;
  message: string;
  photoPaths?: string[];
  localCodeAck?: boolean;
  instructionLevel?: string | null;
}): Promise<{ data: SendHelpChatResult | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('project-help-chat', {
    body,
  });
  if (error) {
    return { data: null, error: error.message || 'Help chat failed' };
  }
  if (data?.error) {
    return { data: null, error: String(data.error) };
  }
  return { data: data as SendHelpChatResult, error: null };
}
