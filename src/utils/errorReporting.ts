import { toast as sonnerToast } from 'sonner';
import { toast as uiToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

type ToastPresenter = 'sonner' | 'ui-toast' | 'none';

type ErrorReportContext = {
  source: string;
  operation: string;
  userId?: string | null;
  projectId?: string | null;
  projectRunId?: string | null;
  stepId?: string | null;
  retryable?: boolean;
  error: unknown;
  userMessage: string;
  notificationTitle?: string;
  notificationBody?: string;
  toastPresenter?: ToastPresenter;
};

type SerializedError = {
  name?: string;
  message: string;
  stack?: string;
  code?: string;
  details?: string;
  hint?: string;
};

const SOURCE_PREFIX: Record<string, string> = {
  project_catalog: 'CAT',
  project_actions: 'PAC',
  kickoff: 'KOF',
  planning_workflow: 'PLN',
  project_workflow: 'WRK',
  shopping_checklist: 'SHP',
  notifications: 'NTF',
};

function normalizeSegment(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned.length > 0 ? cleaned.toUpperCase() : 'UNKNOWN';
}

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const extra = error as Error & {
      code?: string;
      details?: string;
      hint?: string;
    };
    return {
      name: extra.name,
      message: extra.message || 'Unknown error',
      stack: extra.stack,
      code: typeof extra.code === 'string' ? extra.code : undefined,
      details: typeof extra.details === 'string' ? extra.details : undefined,
      hint: typeof extra.hint === 'string' ? extra.hint : undefined,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (error && typeof error === 'object') {
    const maybeError = error as Record<string, unknown>;
    return {
      name: typeof maybeError.name === 'string' ? maybeError.name : undefined,
      message:
        typeof maybeError.message === 'string'
          ? maybeError.message
          : 'Unknown error',
      stack: typeof maybeError.stack === 'string' ? maybeError.stack : undefined,
      code: typeof maybeError.code === 'string' ? maybeError.code : undefined,
      details: typeof maybeError.details === 'string' ? maybeError.details : undefined,
      hint: typeof maybeError.hint === 'string' ? maybeError.hint : undefined,
    };
  }

  return { message: 'Unknown error' };
}

function buildSupportCode(source: string, operation: string): string {
  const sourcePrefix = SOURCE_PREFIX[source] ?? normalizeSegment(source).slice(0, 3);
  const operationSegment = normalizeSegment(operation).slice(0, 4);
  const randomSegment = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${sourcePrefix}-${operationSegment}-${randomSegment}`;
}

function showImmediateError(message: string, presenter: ToastPresenter): void {
  if (presenter === 'none') return;

  if (presenter === 'ui-toast') {
    uiToast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
    return;
  }

  sonnerToast.error(message);
}

async function persistErrorNotification({
  userId,
  source,
  operation,
  supportCode,
  serializedError,
  userMessage,
  notificationTitle,
  notificationBody,
  projectId,
  projectRunId,
  stepId,
  retryable,
}: {
  userId?: string | null;
  source: string;
  operation: string;
  supportCode: string;
  serializedError: SerializedError;
  userMessage: string;
  notificationTitle?: string;
  notificationBody?: string;
  projectId?: string | null;
  projectRunId?: string | null;
  stepId?: string | null;
  retryable?: boolean;
}): Promise<void> {
  if (!userId) return;

  const { error } = await (supabase.from('notifications' as never) as any).insert({
    user_id: userId,
    type: 'runtime_error',
    title: notificationTitle ?? 'App error',
    body:
      notificationBody ??
      `${userMessage} Error code: ${supportCode}`,
    metadata: {
      error_code: supportCode,
      source,
      operation,
      retryable: retryable === true,
      project_id: projectId ?? null,
      project_run_id: projectRunId ?? null,
      step_id: stepId ?? null,
      error_name: serializedError.name ?? null,
      error_message: serializedError.message,
      error_code_raw: serializedError.code ?? null,
      error_details: serializedError.details ?? null,
      error_hint: serializedError.hint ?? null,
      error_stack: serializedError.stack ?? null,
    },
  });

  if (error) {
    console.error('Failed to persist runtime error notification:', error, {
      supportCode,
      source,
      operation,
    });
  }
}

export async function reportUserFacingError({
  source,
  operation,
  userId,
  projectId,
  projectRunId,
  stepId,
  retryable = true,
  error,
  userMessage,
  notificationTitle,
  notificationBody,
  toastPresenter = 'sonner',
}: ErrorReportContext): Promise<string> {
  const supportCode = buildSupportCode(source, operation);
  const serializedError = serializeError(error);

  console.error(`[${supportCode}] ${source}.${operation}`, error);

  showImmediateError(`${userMessage} Error code: ${supportCode}`, toastPresenter);

  await persistErrorNotification({
    userId,
    source,
    operation,
    supportCode,
    serializedError,
    userMessage,
    notificationTitle,
    notificationBody,
    projectId,
    projectRunId,
    stepId,
    retryable,
  });

  return supportCode;
}

export function getNotificationSupportCode(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  const value = metadata?.error_code;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}
