import { useCallback, useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MessagesSquare,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Download,
  Mail,
  Sparkles,
  Clock,
  Bell,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  TEMPLATE_KEYS,
  TEMPLATE_LABELS,
  TRIGGER_TYPES,
  TRIGGER_LABELS,
  type TemplateKey,
  type TriggerType,
  buildDraftContextFromRun,
  buildUpdateDraft,
  templateKeyForTrigger,
} from './buildUpdateDraft';
import { PlanningToolWindowHeaderActions } from '@/components/PlanningWizardSteps/PlanningToolWindowHeaderActions';
import {
  PLANNING_TOOL_WINDOW_CONTENT_PADDING_CLASSNAME,
  PLANNING_TOOL_WINDOW_HEADER_CLASSNAME,
  PLANNING_TOOL_WINDOW_SECONDARY_STRIP_CLASSNAME,
  PLANNING_TOOL_WINDOW_SUBTITLE_CLASSNAME,
  PLANNING_TOOL_WINDOW_TITLE_CLASSNAME,
} from '@/components/PlanningWizardSteps/planningToolWindowChrome';

type PlanRow = {
  id: string;
  project_run_id: string;
  enabled: boolean;
  sms_early_access_opt_in: boolean;
};

type StakeholderRow = {
  id: string;
  plan_id: string;
  display_name: string;
  role_label: string;
  concerns: string[];
  preferred_frequency: string;
  delivery_method: string;
  email: string | null;
  sort_order: number;
};

type ScheduleRow = {
  id: string;
  plan_id: string;
  stakeholder_id: string | null;
  template_key: string;
  cadence: string;
  next_due_at: string | null;
  last_sent_at: string | null;
};

type TriggerRow = {
  id: string;
  plan_id: string;
  trigger_type: string;
  enabled: boolean;
};

type LogRow = {
  id: string;
  channel: string;
  recipient_email: string | null;
  subject: string;
  body_text: string;
  template_key: string;
  sent_at: string;
};

type CommunicationPlanSectionKey =
  | 'overview'
  | 'people'
  | 'compose'
  | 'schedule'
  | 'triggers'
  | 'sent';

const CONCERN_OPTIONS: { id: string; label: string }[] = [
  { id: 'budget', label: 'Budget' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'safety', label: 'Safety' },
  { id: 'access', label: 'Access to the space' },
  { id: 'noise_disruption', label: 'Noise / disruption' },
  { id: 'general', label: 'General updates' },
];

const ROLE_PRESETS: { value: string; label: string }[] = [
  { value: 'spouse_or_partner', label: 'Spouse or partner' },
  { value: 'sibling_co_owner', label: 'Sibling or co-owner' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'neighbor', label: 'Neighbor affected by work' },
  { value: 'other', label: 'Other' },
];

const FREQUENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'as_needed', label: 'As needed' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'milestone', label: 'At milestones' },
];

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function cadenceDays(freq: string): number | null {
  if (freq === 'weekly') return 7;
  if (freq === 'biweekly') return 14;
  if (freq === 'monthly') return 30;
  return null;
}

function cadenceFromFreq(freq: string): 'weekly' | 'biweekly' | 'monthly' | null {
  if (freq === 'weekly') return 'weekly';
  if (freq === 'biweekly') return 'biweekly';
  if (freq === 'monthly') return 'monthly';
  return null;
}

export interface CommunicationPlanWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommunicationPlanWindow({ open, onOpenChange }: CommunicationPlanWindowProps) {
  const { user } = useAuth();
  const { currentProjectRun } = useProject();
  const runId = currentProjectRun?.id;

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [stakeholders, setStakeholders] = useState<StakeholderRow[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleRow[]>([]);
  const [triggers, setTriggers] = useState<TriggerRow[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [openRisks, setOpenRisks] = useState<{ risk_title: string; status: string | null }[]>([]);

  const [openSection, setOpenSection] = useState<CommunicationPlanSectionKey>('overview');
  const tabBodyPad = PLANNING_TOOL_WINDOW_CONTENT_PADDING_CLASSNAME;

  const [composeTemplate, setComposeTemplate] = useState<TemplateKey>('weekly_summary');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeStakeholderId, setComposeStakeholderId] = useState<string>('');

  const [stakeFormOpen, setStakeFormOpen] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<StakeholderRow | null>(null);
  const [sfName, setSfName] = useState('');
  const [sfRole, setSfRole] = useState('spouse_or_partner');
  const [sfRoleOtherText, setSfRoleOtherText] = useState('');
  const [sfConcerns, setSfConcerns] = useState<string[]>([]);
  const [sfFreq, setSfFreq] = useState('weekly');
  const [sfDelivery, setSfDelivery] = useState<'email' | 'off_app'>('email');
  const [sfEmail, setSfEmail] = useState('');

  const draftCtx = useMemo(() => {
    if (!currentProjectRun) return null;
    const openTitles = openRisks.filter((r) => r.status !== 'closed');
    return buildDraftContextFromRun(currentProjectRun, openTitles);
  }, [currentProjectRun, openRisks]);

  const refreshOpenRisks = useCallback(async () => {
    if (!runId) {
      setOpenRisks([]);
      return;
    }
    const { data, error } = await supabase
      .from('project_run_risks')
      .select('risk_title, status')
      .eq('project_run_id', runId);
    if (error) {
      console.error(error);
      setOpenRisks([]);
      return;
    }
    setOpenRisks(data ?? []);
  }, [runId]);

  const ensureTriggerRows = useCallback(async (planId: string) => {
    const rows = TRIGGER_TYPES.map((trigger_type) => ({
      plan_id: planId,
      trigger_type,
      enabled: false,
    }));
    const { error } = await supabase.from('communication_trigger_rules').insert(rows);
    if (error && error.code !== '23505') console.error('trigger seed', error);
  }, []);

  const loadAll = useCallback(async () => {
    if (!runId) {
      setPlan(null);
      setStakeholders([]);
      setScheduleItems([]);
      setTriggers([]);
      setLog([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await refreshOpenRisks();

      const { data: planRow, error: pErr } = await supabase
        .from('project_communication_plans')
        .select('id, project_run_id, enabled, sms_early_access_opt_in')
        .eq('project_run_id', runId)
        .maybeSingle();

      if (pErr) throw pErr;

      if (!planRow) {
        setPlan(null);
        setStakeholders([]);
        setScheduleItems([]);
        setTriggers([]);
        setLog([]);
        return;
      }

      setPlan(planRow as PlanRow);

      const pid = planRow.id;

      const [stRes, schRes, trRes, logRes] = await Promise.all([
        supabase
          .from('communication_stakeholders')
          .select('*')
          .eq('plan_id', pid)
          .order('sort_order', { ascending: true }),
        supabase
          .from('communication_schedule_items')
          .select('*')
          .eq('plan_id', pid)
          .order('next_due_at', { ascending: true }),
        supabase.from('communication_trigger_rules').select('*').eq('plan_id', pid),
        supabase
          .from('communication_outbound_log')
          .select('id, channel, recipient_email, subject, body_text, template_key, sent_at')
          .eq('project_run_id', runId)
          .order('sent_at', { ascending: false })
          .limit(100),
      ]);

      if (stRes.error) throw stRes.error;
      if (schRes.error) throw schRes.error;
      if (trRes.error) throw trRes.error;
      if (logRes.error) throw logRes.error;

      let triggerRows = (trRes.data ?? []) as TriggerRow[];
      if (triggerRows.length === 0) {
        await ensureTriggerRows(pid);
        const tr2 = await supabase.from('communication_trigger_rules').select('*').eq('plan_id', pid);
        if (!tr2.error && tr2.data) triggerRows = tr2.data as TriggerRow[];
      }

      setStakeholders((stRes.data ?? []) as StakeholderRow[]);
      setScheduleItems((schRes.data ?? []) as ScheduleRow[]);
      setTriggers(triggerRows);
      setLog((logRes.data ?? []) as LogRow[]);
    } catch (e) {
      console.error(e);
      toast.error('Could not load communication plan.');
    } finally {
      setLoading(false);
    }
  }, [runId, refreshOpenRisks, ensureTriggerRows]);

  useEffect(() => {
    if (open) void loadAll();
  }, [open, loadAll]);

  useEffect(() => {
    if (!draftCtx) return;
    const { subject, body } = buildUpdateDraft(composeTemplate, draftCtx);
    setComposeSubject(subject);
    setComposeBody(body);
  }, [composeTemplate, draftCtx]);

  const handleEnable = async (enabled: boolean) => {
    if (!runId || !user) return;
    try {
      if (!plan) {
        if (!enabled) return;
        const { data: inserted, error } = await supabase
          .from('project_communication_plans')
          .insert({
            project_run_id: runId,
            enabled: true,
            sms_early_access_opt_in: false,
          })
          .select('id, project_run_id, enabled, sms_early_access_opt_in')
          .single();
        if (error) throw error;
        setPlan(inserted as PlanRow);
        await ensureTriggerRows(inserted.id);
        toast.success('Communication Plan turned on for this project.');
      } else {
        const { error } = await supabase
          .from('project_communication_plans')
          .update({ enabled })
          .eq('id', plan.id);
        if (error) throw error;
        setPlan({ ...plan, enabled });
        toast.success(enabled ? 'Communication Plan enabled.' : 'Communication Plan disabled.');
      }
      await loadAll();
    } catch (e) {
      console.error(e);
      toast.error('Could not update setting.');
    }
  };

  const handleSmsOptIn = async (v: boolean) => {
    if (!plan) return;
    const { error } = await supabase
      .from('project_communication_plans')
      .update({ sms_early_access_opt_in: v })
      .eq('id', plan.id);
    if (error) {
      toast.error('Could not save preference.');
      return;
    }
    setPlan({ ...plan, sms_early_access_opt_in: v });
    toast.success(v ? "You're on the list for SMS early access." : 'SMS early access preference cleared.');
  };

  const openNewStakeholder = () => {
    setEditingStakeholder(null);
    setSfName('');
    setSfRole('spouse_or_partner');
    setSfRoleOtherText('');
    setSfConcerns(['general']);
    setSfFreq('weekly');
    setSfDelivery('email');
    setSfEmail('');
    setStakeFormOpen(true);
  };

  const openEditStakeholder = (s: StakeholderRow) => {
    setEditingStakeholder(s);
    setSfName(s.display_name);
    const preset = ROLE_PRESETS.some((r) => r.value === s.role_label);
    if (preset) {
      setSfRole(s.role_label);
      setSfRoleOtherText('');
    } else {
      setSfRole('other');
      setSfRoleOtherText(s.role_label);
    }
    setSfConcerns(s.concerns?.length ? s.concerns : ['general']);
    setSfFreq(s.preferred_frequency);
    setSfDelivery(s.delivery_method === 'off_app' ? 'off_app' : 'email');
    setSfEmail(s.email ?? '');
    setStakeFormOpen(true);
  };

  const saveStakeholder = async () => {
    if (!plan || !sfName.trim()) {
      toast.error('Name is required.');
      return;
    }
    const roleLabel =
      sfRole === 'other' ? (sfRoleOtherText.trim() || 'other') : sfRole;
    const delivery = sfDelivery;
    const emailVal = delivery === 'email' ? sfEmail.trim() : null;
    if (delivery === 'email' && !emailVal) {
      toast.error('Email is required for email delivery.');
      return;
    }

    try {
      if (editingStakeholder) {
        const { error } = await supabase
          .from('communication_stakeholders')
          .update({
            display_name: sfName.trim(),
            role_label: roleLabel,
            concerns: sfConcerns,
            preferred_frequency: sfFreq,
            delivery_method: delivery,
            email: emailVal,
          })
          .eq('id', editingStakeholder.id);
        if (error) throw error;
        toast.success('Stakeholder updated.');
      } else {
        const maxOrder = stakeholders.reduce((m, s) => Math.max(m, s.sort_order), -1);
        const { error } = await supabase.from('communication_stakeholders').insert({
          plan_id: plan.id,
          display_name: sfName.trim(),
          role_label: roleLabel,
          concerns: sfConcerns,
          preferred_frequency: sfFreq,
          delivery_method: delivery,
          email: emailVal,
          sort_order: maxOrder + 1,
        });
        if (error) throw error;
        toast.success('Stakeholder added.');
      }
      setStakeFormOpen(false);
      await loadAll();
    } catch (e) {
      console.error(e);
      toast.error('Could not save stakeholder.');
    }
  };

  const deleteStakeholder = async (id: string) => {
    const { error } = await supabase.from('communication_stakeholders').delete().eq('id', id);
    if (error) {
      toast.error('Could not remove stakeholder.');
      return;
    }
    toast.success('Removed.');
    await loadAll();
  };

  const toggleTrigger = async (row: TriggerRow, enabled: boolean) => {
    const { error } = await supabase
      .from('communication_trigger_rules')
      .update({ enabled })
      .eq('id', row.id);
    if (error) {
      toast.error('Could not update trigger.');
      return;
    }
    setTriggers((prev) => prev.map((t) => (t.id === row.id ? { ...t, enabled } : t)));
  };

  const autoGenerateSchedule = async () => {
    if (!plan) return;
    if (stakeholders.length === 0) {
      toast.error('Add at least one person before generating a schedule.');
      return;
    }
    try {
      const { error: delErr } = await supabase
        .from('communication_schedule_items')
        .delete()
        .eq('plan_id', plan.id);
      if (delErr) throw delErr;

      const now = new Date();
      const rows: {
        plan_id: string;
        stakeholder_id: string;
        template_key: string;
        cadence: string;
        next_due_at: string | null;
      }[] = [];

      for (const s of stakeholders) {
        const c = cadenceFromFreq(s.preferred_frequency);
        if (!c) continue;
        const days = cadenceDays(s.preferred_frequency);
        rows.push({
          plan_id: plan.id,
          stakeholder_id: s.id,
          template_key: 'weekly_summary',
          cadence: c,
          next_due_at: days != null ? addDays(now, days).toISOString() : null,
        });
      }

      if (rows.length === 0) {
        toast.message('No recurring frequencies to schedule.', {
          description: 'Choose weekly, biweekly, or monthly on stakeholders to get dated reminders.',
        });
        return;
      }

      const { error: insErr } = await supabase.from('communication_schedule_items').insert(rows);
      if (insErr) throw insErr;
      toast.success('Schedule generated from stakeholder frequencies.');
      await loadAll();
    } catch (e) {
      console.error(e);
      toast.error('Could not generate schedule.');
    }
  };

  const logOutboundCopy = async (stakeholderId: string | null, templateKey: string) => {
    if (!plan || !runId || !user?.id) return;
    const { error } = await supabase.from('communication_outbound_log').insert({
      plan_id: plan.id,
      project_run_id: runId,
      stakeholder_id: stakeholderId,
      channel: 'off_app_copy',
      recipient_email: null,
      subject: composeSubject.trim(),
      body_text: composeBody.trim(),
      template_key: templateKey,
      created_by_user_id: user.id,
    });
    if (error) {
      console.error(error);
      toast.error('Copied, but history log failed to save.');
      return;
    }
    await loadAll();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(
        `${composeSubject}\n\n${composeBody}`,
      );
      const sid =
        composeStakeholderId && composeStakeholderId !== '_none'
          ? composeStakeholderId
          : null;
      await logOutboundCopy(sid, composeTemplate);
      toast.success('Copied — ready to paste into iMessage, WhatsApp, Slack, or email.');
    } catch {
      toast.error('Clipboard not available.');
    }
  };

  const downloadTxt = () => {
    const blob = new Blob([`${composeSubject}\n\n${composeBody}`], {
      type: 'text/plain;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `project-update-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Download started.');
  };

  const sendEmail = async () => {
    if (!plan || !runId || !composeStakeholderId || composeStakeholderId === '_none') {
      toast.error('Choose a stakeholder who receives email.');
      return;
    }
    const sh = stakeholders.find((s) => s.id === composeStakeholderId);
    if (!sh || sh.delivery_method !== 'email' || !sh.email) {
      toast.error('That stakeholder is not set up for email.');
      return;
    }
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
      'send-communication-plan-email',
      {
        body: {
          projectRunId: runId,
          planId: plan.id,
          stakeholderId: sh.id,
          subject: composeSubject.trim(),
          bodyText: composeBody.trim(),
          templateKey: composeTemplate,
        },
      },
    );
    if (error) {
      toast.error(error.message || 'Send failed.');
      return;
    }
    if (data && typeof data === 'object' && 'error' in data && data.error) {
      toast.error(String(data.error));
      return;
    }
    toast.success('Email sent and logged.');
    await loadAll();
  };

  const draftForTrigger = (tt: TriggerType) => {
    const tk = templateKeyForTrigger(tt);
    setComposeTemplate(tk);
    setOpenSection('compose');
  };

  const now = new Date();
  const dueItems = scheduleItems.filter(
    (s) => s.next_due_at && new Date(s.next_due_at) <= now,
  );
  const upcomingItems = scheduleItems.filter(
    (s) => s.next_due_at && new Date(s.next_due_at) > now,
  );

  const stakeholderName = (id: string | null) => {
    if (!id) return '—';
    return stakeholders.find((s) => s.id === id)?.display_name ?? '—';
  };

  const focusSection = (section: CommunicationPlanSectionKey) => () => setOpenSection(section);

  if (!currentProjectRun) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className={cn(
              'fixed z-50 rounded-lg border bg-background p-6 shadow-lg',
              'inset-4 flex max-h-[calc(100dvh-2rem)] flex-col overflow-auto md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[90vh] md:w-[90vw] md:max-w-[90vw] md:-translate-x-1/2 md:-translate-y-1/2',
            )}
          >
            <DialogHeader className={PLANNING_TOOL_WINDOW_HEADER_CLASSNAME}>
              <DialogTitle className={PLANNING_TOOL_WINDOW_TITLE_CLASSNAME}>Communication Plan</DialogTitle>
              <PlanningToolWindowHeaderActions
                onCancel={() => onOpenChange(false)}
                onSaveAndClose={() => onOpenChange(false)}
              />
            </DialogHeader>
            <p className={cn(PLANNING_TOOL_WINDOW_SUBTITLE_CLASSNAME, PLANNING_TOOL_WINDOW_CONTENT_PADDING_CLASSNAME)}>
              Open a project from your dashboard first, then launch Communication Plan again.
            </p>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    );
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden border bg-background shadow-lg',
            'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'inset-0 h-[100dvh] w-full max-h-[100dvh] max-w-full rounded-none',
            'md:inset-auto md:left-[50%] md:top-[50%] md:h-[90vh] md:max-h-[90vh] md:w-[90vw] md:max-w-[90vw] md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-lg',
          )}
        >
          <DialogHeader className={cn(PLANNING_TOOL_WINDOW_HEADER_CLASSNAME, 'shrink-0')}>
            <div className="min-w-0 flex-1 space-y-1">
              <DialogTitle
                className={cn(
                  PLANNING_TOOL_WINDOW_TITLE_CLASSNAME,
                  'flex items-center gap-2'
                )}
              >
                <MessagesSquare className="h-5 w-5 shrink-0 text-primary md:h-6 md:w-6" aria-hidden />
                Communication Plan
              </DialogTitle>
              <p className={PLANNING_TOOL_WINDOW_SUBTITLE_CLASSNAME}>
                Keep the right people in the loop — without replacing your group chat.
              </p>
            </div>
            <PlanningToolWindowHeaderActions
              onCancel={() => onOpenChange(false)}
              onSaveAndClose={() => onOpenChange(false)}
            />
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {loading ? (
              <div className={tabBodyPad}>
                <p className="text-sm text-muted-foreground">Loading…</p>
              </div>
            ) : (
              <ScrollArea className="min-h-0 flex-1">
                <div
                  className={cn(
                    tabBodyPad,
                    'space-y-4 pt-3 md:pt-4'
                  )}
                >
                  <div
                    className={cn(
                      PLANNING_TOOL_WINDOW_SECONDARY_STRIP_CLASSNAME,
                      'rounded-xl border border-border/70 bg-muted/30 p-3'
                    )}
                  >
                    <div className="flex flex-wrap gap-2">
                      {([
                        ['overview', 'Overview'],
                        ['people', 'People'],
                        ['compose', 'Compose & send'],
                        ['schedule', 'Schedule'],
                        ['triggers', 'Triggers'],
                        ['sent', 'Sent & copied'],
                      ] as const).map(([key, label]) => (
                        <Button
                          key={key}
                          type="button"
                          size="sm"
                          variant={openSection === key ? 'default' : 'outline'}
                          className="h-8 text-xs"
                          onClick={() => setOpenSection(key)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Card className="border-border/70 shadow-sm">
                    <Collapsible
                      open={openSection === 'overview'}
                      onOpenChange={(next) => setOpenSection(next ? 'overview' : openSection === 'overview' ? 'people' : openSection)}
                    >
                      <CardContent className="space-y-4 p-4">
                        <CollapsibleTrigger asChild>
                          <button type="button" className="flex w-full items-center justify-between gap-3 text-left">
                            <div className="flex items-center gap-3">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                1
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold">Overview</h3>
                                <p className="text-xs text-muted-foreground">Turn it on and review the setup.</p>
                              </div>
                            </div>
                            {openSection === 'overview' ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-4 pt-1" onPointerDownCapture={focusSection('overview')}>
                            <Card className="border-border/70 bg-background">
                              <CardHeader>
                                <CardTitle className="text-base">Use for this project</CardTitle>
                                <CardDescription>
                                  Optional add-on — when off, nothing changes elsewhere in Project Partner.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1">
                                  <p className="font-medium">{plan?.enabled ? 'Enabled' : 'Disabled'}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Stakeholders, schedules, and drafts stay in one place.
                                  </p>
                                </div>
                                <Switch
                                  checked={!!plan?.enabled}
                                  onCheckedChange={(v) => void handleEnable(v)}
                                  aria-label="Enable communication plan for this project"
                                />
                              </CardContent>
                            </Card>

                            {plan?.enabled ? (
                              <>
                                <Card className="border-border/70 bg-background">
                                  <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                      <Bell className="h-4 w-4" />
                                      Text messaging
                                      <Badge variant="secondary">Coming soon</Badge>
                                    </CardTitle>
                                    <CardDescription>
                                      SMS from the app is not available yet. Email and copy-to-clipboard work today.
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-muted-foreground">
                                      Want early access when texting launches?
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={plan.sms_early_access_opt_in}
                                        onCheckedChange={(v) => void handleSmsOptIn(v)}
                                        aria-label="Opt in for SMS early access"
                                      />
                                      <span className="text-sm">Early access list</span>
                                    </div>
                                  </CardContent>
                                </Card>

                                <Card className="border-border/70 bg-background">
                                  <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                      <Sparkles className="h-4 w-4" />
                                      Recommended setup
                                    </CardTitle>
                                    <CardDescription>
                                      Uses your project&apos;s steps, schedule, budget, and risks — no guessing names.
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="flex flex-wrap gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setOpenSection('people')}>
                                      Add people
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => void autoGenerateSchedule()}>
                                      Build schedule from frequencies
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setOpenSection('compose')}>
                                      Open composer
                                    </Button>
                                  </CardContent>
                                </Card>

                                {dueItems.length > 0 ? (
                                  <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                                    <CardHeader>
                                      <CardTitle className="text-base text-amber-900 dark:text-amber-100">
                                        Updates due
                                      </CardTitle>
                                      <CardDescription>
                                        {dueItems.length} scheduled reminder{dueItems.length === 1 ? '' : 's'} — send an update when you can.
                                      </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                      {dueItems.map((item) => (
                                        <div key={item.id} className="flex flex-col gap-0.5 rounded-lg border border-amber-200/70 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                                          <span className="font-medium">{stakeholderName(item.stakeholder_id)}</span>
                                          <span className="text-muted-foreground">
                                            {item.next_due_at ? new Date(item.next_due_at).toLocaleString() : ''}
                                          </span>
                                        </div>
                                      ))}
                                      <Button size="sm" className="mt-2" onClick={() => setOpenSection('compose')}>
                                        Draft an update
                                      </Button>
                                    </CardContent>
                                  </Card>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        </CollapsibleContent>
                      </CardContent>
                    </Collapsible>
                  </Card>

                  <Card className="border-border/70 shadow-sm">
                    <Collapsible
                      open={openSection === 'people'}
                      onOpenChange={(next) => setOpenSection(next ? 'people' : openSection === 'people' ? 'compose' : openSection)}
                    >
                      <CardContent className="space-y-4 p-4">
                        <CollapsibleTrigger asChild>
                          <button type="button" className="flex w-full items-center justify-between gap-3 text-left">
                            <div className="flex items-center gap-3">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                2
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold">People</h3>
                                <p className="text-xs text-muted-foreground">Who should hear from you, and how often.</p>
                              </div>
                            </div>
                            {openSection === 'people' ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-4 pt-1" onPointerDownCapture={focusSection('people')}>
                            {!plan?.enabled ? (
                              <p className="text-sm text-muted-foreground">Turn on Communication Plan in Overview first.</p>
                            ) : (
                              <>
                                <div className="flex justify-end">
                                  <Button size="sm" onClick={openNewStakeholder}>
                                    <Plus className="mr-1 h-4 w-4" />
                                    Add person
                                  </Button>
                                </div>
                                {stakeholders.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    Add spouse, co-owners, tenants, contractors, or neighbors who should hear from you.
                                  </p>
                                ) : (
                                  <>
                                    <div className="space-y-3 md:hidden">
                                      {stakeholders.map((s) => (
                                        <Card key={s.id} className="border-border/70 bg-background">
                                          <CardContent className="space-y-3 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                              <div className="min-w-0">
                                                <div className="font-medium">{s.display_name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                  {ROLE_PRESETS.find((r) => r.value === s.role_label)?.label ?? s.role_label}
                                                </div>
                                              </div>
                                              <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditStakeholder(s)} aria-label="Edit">
                                                  <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => void deleteStakeholder(s.id)} aria-label="Remove">
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-xs">
                                              <Badge variant="secondary">
                                                {FREQUENCY_OPTIONS.find((f) => f.value === s.preferred_frequency)?.label ?? s.preferred_frequency}
                                              </Badge>
                                              <Badge variant="outline">
                                                {s.delivery_method === 'email' ? 'Email' : 'Off-app copy'}
                                              </Badge>
                                            </div>
                                            {s.email ? <p className="text-xs text-muted-foreground">{s.email}</p> : null}
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                    <div className="hidden overflow-x-auto md:block">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Frequency</TableHead>
                                            <TableHead>Channel</TableHead>
                                            <TableHead className="w-[100px]" />
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {stakeholders.map((s) => (
                                            <TableRow key={s.id}>
                                              <TableCell className="font-medium">{s.display_name}</TableCell>
                                              <TableCell className="text-sm text-muted-foreground">
                                                {ROLE_PRESETS.find((r) => r.value === s.role_label)?.label ?? s.role_label}
                                              </TableCell>
                                              <TableCell className="text-sm">
                                                {FREQUENCY_OPTIONS.find((f) => f.value === s.preferred_frequency)?.label ?? s.preferred_frequency}
                                              </TableCell>
                                              <TableCell className="text-sm">
                                                {s.delivery_method === 'email' ? (
                                                  <span className="inline-flex items-center gap-1">
                                                    <Mail className="h-3.5 w-3.5" />
                                                    Email
                                                  </span>
                                                ) : (
                                                  'Off-app (copy / paste)'
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                <div className="flex gap-1">
                                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditStakeholder(s)} aria-label="Edit">
                                                    <Pencil className="h-4 w-4" />
                                                  </Button>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => void deleteStakeholder(s.id)} aria-label="Remove">
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </CollapsibleContent>
                      </CardContent>
                    </Collapsible>
                  </Card>

                  <Card className="border-border/70 shadow-sm">
                    <Collapsible
                      open={openSection === 'compose'}
                      onOpenChange={(next) => setOpenSection(next ? 'compose' : openSection === 'compose' ? 'schedule' : openSection)}
                    >
                      <CardContent className="space-y-4 p-4">
                        <CollapsibleTrigger asChild>
                          <button type="button" className="flex w-full items-center justify-between gap-3 text-left">
                            <div className="flex items-center gap-3">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                3
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold">Compose & send</h3>
                                <p className="text-xs text-muted-foreground">Draft once, then email or copy anywhere.</p>
                              </div>
                            </div>
                            {openSection === 'compose' ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-4 pt-1" onPointerDownCapture={focusSection('compose')}>
                            {!plan?.enabled ? (
                              <p className="text-sm text-muted-foreground">
                                Enable Communication Plan in Overview to compose and log sends.
                              </p>
                            ) : (
                              <>
                                <div className="grid gap-4 lg:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Template</Label>
                                    <Select value={composeTemplate} onValueChange={(v) => setComposeTemplate(v as TemplateKey)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-72">
                                        {TEMPLATE_KEYS.map((k) => (
                                          <SelectItem key={k} value={k}>
                                            {TEMPLATE_LABELS[k]}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Stakeholder</Label>
                                    <Select value={composeStakeholderId || '_none'} onValueChange={setComposeStakeholderId}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Choose recipient" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="_none">—</SelectItem>
                                        {stakeholders.map((s) => (
                                          <SelectItem key={s.id} value={s.id}>
                                            {s.display_name}
                                            {s.delivery_method === 'email' ? ` (${s.email})` : ''}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Subject</Label>
                                  <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Message</Label>
                                  <Textarea className="min-h-[220px] font-sans text-sm" value={composeBody} onChange={(e) => setComposeBody(e.target.value)} />
                                  <p className="text-xs text-muted-foreground">
                                    Filled from your tasks, schedule, budget, and risks — edit before sending.
                                  </p>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-3">
                                  <Button
                                    onClick={() => void sendEmail()}
                                    disabled={
                                      !composeStakeholderId ||
                                      composeStakeholderId === '_none' ||
                                      stakeholders.find((x) => x.id === composeStakeholderId)?.delivery_method !== 'email'
                                    }
                                  >
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send email
                                  </Button>
                                  <Button variant="outline" onClick={() => void copyToClipboard()}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy for group chat
                                  </Button>
                                  <Button variant="outline" onClick={downloadTxt}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export .txt
                                  </Button>
                                </div>
                                <div className="rounded-md border border-dashed p-3 opacity-60">
                                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                                    Text message
                                    <Badge variant="outline">Coming soon</Badge>
                                  </div>
                                  <Button size="sm" disabled variant="secondary">
                                    Send SMS
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </CollapsibleContent>
                      </CardContent>
                    </Collapsible>
                  </Card>

                  <Card className="border-border/70 shadow-sm">
                    <Collapsible
                      open={openSection === 'schedule'}
                      onOpenChange={(next) => setOpenSection(next ? 'schedule' : openSection === 'schedule' ? 'triggers' : openSection)}
                    >
                      <CardContent className="space-y-4 p-4">
                        <CollapsibleTrigger asChild>
                          <button type="button" className="flex w-full items-center justify-between gap-3 text-left">
                            <div className="flex items-center gap-3">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                4
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold">Schedule</h3>
                                <p className="text-xs text-muted-foreground">Auto-build reminders from stakeholder frequency.</p>
                              </div>
                            </div>
                            {openSection === 'schedule' ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-4 pt-1" onPointerDownCapture={focusSection('schedule')}>
                            {!plan?.enabled ? (
                              <p className="text-sm text-muted-foreground">Enable the plan in Overview first.</p>
                            ) : (
                              <>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    Timeline from stakeholder frequencies (weekly / biweekly / monthly).
                                  </p>
                                  <Button size="sm" variant="secondary" onClick={() => void autoGenerateSchedule()}>
                                    Regenerate
                                  </Button>
                                </div>
                                {scheduleItems.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    No rows yet. Add people with a recurring frequency, then regenerate.
                                  </p>
                                ) : (
                                  <>
                                    <div className="space-y-3 md:hidden">
                                      {[...dueItems, ...upcomingItems].map((item) => (
                                        <Card key={item.id} className="border-border/70 bg-background">
                                          <CardContent className="space-y-2 p-4">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="font-medium">{stakeholderName(item.stakeholder_id)}</div>
                                              {item.next_due_at && new Date(item.next_due_at) <= now ? (
                                                <Badge variant="destructive">Due</Badge>
                                              ) : null}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                              {TEMPLATE_LABELS[item.template_key as TemplateKey] ?? item.template_key}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Cadence: {item.cadence}</div>
                                            <div className="text-xs">Next due: {item.next_due_at ? new Date(item.next_due_at).toLocaleString() : '—'}</div>
                                            <div className="text-xs text-muted-foreground">Last sent: {item.last_sent_at ? new Date(item.last_sent_at).toLocaleString() : '—'}</div>
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                    <div className="hidden overflow-x-auto md:block">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Person</TableHead>
                                            <TableHead>Template</TableHead>
                                            <TableHead>Cadence</TableHead>
                                            <TableHead>Next due</TableHead>
                                            <TableHead>Last sent</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {[...dueItems, ...upcomingItems].map((item) => (
                                            <TableRow key={item.id}>
                                              <TableCell>{stakeholderName(item.stakeholder_id)}</TableCell>
                                              <TableCell className="text-sm">{TEMPLATE_LABELS[item.template_key as TemplateKey] ?? item.template_key}</TableCell>
                                              <TableCell className="text-sm capitalize">{item.cadence}</TableCell>
                                              <TableCell className="text-sm">
                                                {item.next_due_at ? new Date(item.next_due_at).toLocaleString() : '—'}
                                                {item.next_due_at && new Date(item.next_due_at) <= now ? <Badge className="ml-2" variant="destructive">Due</Badge> : null}
                                              </TableCell>
                                              <TableCell className="text-sm text-muted-foreground">
                                                {item.last_sent_at ? new Date(item.last_sent_at).toLocaleString() : '—'}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </CollapsibleContent>
                      </CardContent>
                    </Collapsible>
                  </Card>

                  <Card className="border-border/70 shadow-sm">
                    <Collapsible
                      open={openSection === 'triggers'}
                      onOpenChange={(next) => setOpenSection(next ? 'triggers' : openSection === 'triggers' ? 'sent' : openSection)}
                    >
                      <CardContent className="space-y-4 p-4">
                        <CollapsibleTrigger asChild>
                          <button type="button" className="flex w-full items-center justify-between gap-3 text-left">
                            <div className="flex items-center gap-3">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                5
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold">Triggers</h3>
                                <p className="text-xs text-muted-foreground">Pick the project moments you want to communicate.</p>
                              </div>
                            </div>
                            {openSection === 'triggers' ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-4 pt-1" onPointerDownCapture={focusSection('triggers')}>
                            {!plan?.enabled ? (
                              <p className="text-sm text-muted-foreground">Enable the plan in Overview first.</p>
                            ) : (
                              <>
                                <p className="text-sm text-muted-foreground">
                                  Turn on triggers you care about. When something happens, open here and draft an update with one tap.
                                </p>
                                <div className="space-y-3">
                                  {TRIGGER_TYPES.map((tt) => {
                                    const row = triggers.find((t) => t.trigger_type === tt);
                                    if (!row) return null;
                                    return (
                                      <Card key={tt} className="border-border/70 bg-background">
                                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                          <div className="min-w-0 flex-1">
                                            <div className="font-medium">{TRIGGER_LABELS[tt]}</div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                              Open a draft quickly when this happens in the project.
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <Switch checked={row.enabled} onCheckedChange={(v) => void toggleTrigger(row, v)} aria-label={`Enable ${tt}`} />
                                            <Button variant="outline" size="sm" onClick={() => draftForTrigger(tt)}>
                                              Draft update
                                            </Button>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </CollapsibleContent>
                      </CardContent>
                    </Collapsible>
                  </Card>

                  <Card className="border-border/70 shadow-sm">
                    <Collapsible
                      open={openSection === 'sent'}
                      onOpenChange={(next) => setOpenSection(next ? 'sent' : openSection === 'sent' ? 'overview' : openSection)}
                    >
                      <CardContent className="space-y-4 p-4">
                        <CollapsibleTrigger asChild>
                          <button type="button" className="flex w-full items-center justify-between gap-3 text-left">
                            <div className="flex items-center gap-3">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                6
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold">Sent & copied</h3>
                                <p className="text-xs text-muted-foreground">Review recent outbound history for this run.</p>
                              </div>
                            </div>
                            {openSection === 'sent' ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-4 pt-1" onPointerDownCapture={focusSection('sent')}>
                            {!plan?.enabled ? (
                              <p className="text-sm text-muted-foreground">Enable the plan to start logging.</p>
                            ) : log.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                Sent emails and off-app copies you log from Compose appear here.
                              </p>
                            ) : (
                              <>
                                <div className="space-y-3 md:hidden">
                                  {log.map((row) => (
                                    <Card key={row.id} className="border-border/70 bg-background">
                                      <CardContent className="space-y-2 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0 flex-1 font-medium">{row.subject}</div>
                                          <Badge variant="outline">{row.channel === 'email' ? 'Email' : 'Copied'}</Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {TEMPLATE_LABELS[row.template_key as TemplateKey] ?? row.template_key}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{new Date(row.sent_at).toLocaleString()}</div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                                <div className="hidden overflow-x-auto md:block">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>When</TableHead>
                                        <TableHead>Channel</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Template</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {log.map((row) => (
                                        <TableRow key={row.id}>
                                          <TableCell className="whitespace-nowrap text-sm">{new Date(row.sent_at).toLocaleString()}</TableCell>
                                          <TableCell className="text-sm">{row.channel === 'email' ? 'Email' : 'Copied (off-app)'}</TableCell>
                                          <TableCell className="max-w-[200px] truncate text-sm">{row.subject}</TableCell>
                                          <TableCell className="text-sm text-muted-foreground">
                                            {TEMPLATE_LABELS[row.template_key as TemplateKey] ?? row.template_key}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </>
                            )}
                          </div>
                        </CollapsibleContent>
                      </CardContent>
                    </Collapsible>
                  </Card>
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>

      <Dialog open={stakeFormOpen} onOpenChange={setStakeFormOpen}>
        <DialogPortal>
          <DialogOverlay className="z-[60]" />
          <DialogPrimitive.Content
            className={cn(
              'fixed left-[50%] top-[50%] z-[61] w-[min(96vw,440px)] translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-background p-6 shadow-lg',
            )}
          >
            <DialogHeader>
              <DialogTitle>{editingStakeholder ? 'Edit person' : 'Add person'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={sfName} onChange={(e) => setSfName(e.target.value)} placeholder="Alex" />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select value={sfRole} onValueChange={setSfRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_PRESETS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {sfRole === 'other' && (
                <div className="space-y-2">
                  <Label>Describe the relationship</Label>
                  <Input
                    value={sfRoleOtherText}
                    onChange={(e) => setSfRoleOtherText(e.target.value)}
                    placeholder="e.g. Adult child who co-signed"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>They care about</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CONCERN_OPTIONS.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={sfConcerns.includes(c.id)}
                        onCheckedChange={(chk) => {
                          if (chk === true) setSfConcerns((prev) => [...new Set([...prev, c.id])]);
                          else setSfConcerns((prev) => prev.filter((x) => x !== c.id));
                        }}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>How often to update them</Label>
                <Select value={sfFreq} onValueChange={setSfFreq}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Delivery</Label>
                <Select
                  value={sfDelivery}
                  onValueChange={(v) => setSfDelivery(v as 'email' | 'off_app')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email (from the app)</SelectItem>
                    <SelectItem value="off_app">Off-app — I’ll copy into my own app</SelectItem>
                    <SelectItem value="sms" disabled>
                      Text message — Coming soon
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {sfDelivery === 'email' && (
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={sfEmail}
                    onChange={(e) => setSfEmail(e.target.value)}
                    placeholder="name@example.com"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStakeFormOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void saveStakeholder()}>Save</Button>
            </div>
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
              <span className="sr-only">Close</span>
              <span aria-hidden>×</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}
