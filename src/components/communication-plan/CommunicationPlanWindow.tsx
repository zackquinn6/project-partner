import { useCallback, useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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

  const [tab, setTab] = useState('overview');
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
    setTab('compose');
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
              <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
                <div
                  className={cn(
                    PLANNING_TOOL_WINDOW_SECONDARY_STRIP_CLASSNAME,
                    'pt-0 pb-3 md:pt-1 md:pb-4'
                  )}
                >
                  <TabsList className="flex h-auto w-full flex-wrap gap-1">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="people">People</TabsTrigger>
                    <TabsTrigger value="compose">Compose & send</TabsTrigger>
                    <TabsTrigger value="schedule">Schedule</TabsTrigger>
                    <TabsTrigger value="triggers">Triggers</TabsTrigger>
                    <TabsTrigger value="sent">Sent & copied</TabsTrigger>
                  </TabsList>
                </div>

                <div className="relative min-h-0 flex-1">
                  <TabsContent
                    value="overview"
                    className="absolute inset-0 mt-0 data-[state=active]:block data-[state=inactive]:hidden"
                  >
                    <ScrollArea className="h-full">
                      <div className={`${tabBodyPad} space-y-4`}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Use for this project</CardTitle>
                        <CardDescription>
                          Optional add-on — when off, nothing changes elsewhere in Project Partner.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">
                            {plan?.enabled ? 'Enabled' : 'Disabled'}
                          </p>
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

                    {plan?.enabled && (
                      <>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
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

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              Recommended setup
                            </CardTitle>
                            <CardDescription>
                              Uses your project&apos;s steps, schedule, budget, and risks — no guessing names.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => setTab('people')}>
                              Add people
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => void autoGenerateSchedule()}>
                              Build schedule from frequencies
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setTab('compose')}>
                              Open composer
                            </Button>
                          </CardContent>
                        </Card>

                        {dueItems.length > 0 && (
                          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                            <CardHeader>
                              <CardTitle className="text-base text-amber-900 dark:text-amber-100">
                                Updates due
                              </CardTitle>
                              <CardDescription>
                                {dueItems.length} scheduled reminder
                                {dueItems.length === 1 ? '' : 's'} — send an update when you can.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                              {dueItems.map((item) => (
                                <div key={item.id} className="flex justify-between gap-2">
                                  <span>{stakeholderName(item.stakeholder_id)}</span>
                                  <span className="text-muted-foreground">
                                    {item.next_due_at
                                      ? new Date(item.next_due_at).toLocaleString()
                                      : ''}
                                  </span>
                                </div>
                              ))}
                              <Button size="sm" className="mt-2" onClick={() => setTab('compose')}>
                                Draft an update
                              </Button>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent
                    value="people"
                    className="absolute inset-0 mt-0 data-[state=active]:block data-[state=inactive]:hidden"
                  >
                    <ScrollArea className="h-full">
                      <div className={`${tabBodyPad} space-y-4`}>
                    {!plan?.enabled ? (
                      <p className="text-sm text-muted-foreground">
                        Turn on Communication Plan on the Overview tab first.
                      </p>
                    ) : (
                      <>
                        <div className="flex justify-end">
                          <Button size="sm" onClick={openNewStakeholder}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add person
                          </Button>
                        </div>
                        {stakeholders.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Add spouse, co-owners, tenants, contractors, or neighbors who should hear from you.
                          </p>
                        ) : (
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
                                  <TableCell className="text-muted-foreground text-sm">
                                    {ROLE_PRESETS.find((r) => r.value === s.role_label)?.label ??
                                      s.role_label}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {FREQUENCY_OPTIONS.find((f) => f.value === s.preferred_frequency)
                                      ?.label ?? s.preferred_frequency}
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
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => openEditStakeholder(s)}
                                        aria-label="Edit"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() => void deleteStakeholder(s.id)}
                                        aria-label="Remove"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </>
                    )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent
                    value="compose"
                    className="absolute inset-0 mt-0 data-[state=active]:block data-[state=inactive]:hidden"
                  >
                    <ScrollArea className="h-full">
                      <div className={`${tabBodyPad} space-y-4`}>
                    {!plan?.enabled ? (
                      <p className="text-sm text-muted-foreground">
                        Enable Communication Plan on the Overview tab to compose and log sends.
                      </p>
                    ) : (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Template</Label>
                            <Select
                              value={composeTemplate}
                              onValueChange={(v) => setComposeTemplate(v as TemplateKey)}
                            >
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
                            <Select
                              value={composeStakeholderId || '_none'}
                              onValueChange={setComposeStakeholderId}
                            >
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
                          <Input
                            value={composeSubject}
                            onChange={(e) => setComposeSubject(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Message</Label>
                          <Textarea
                            className="min-h-[200px] font-sans text-sm"
                            value={composeBody}
                            onChange={(e) => setComposeBody(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Filled from your tasks, schedule, budget, and risks — edit before sending.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => void sendEmail()}
                            disabled={
                              !composeStakeholderId ||
                              composeStakeholderId === '_none' ||
                              stakeholders.find((x) => x.id === composeStakeholderId)?.delivery_method !==
                                'email'
                            }
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Send email
                          </Button>
                          <Button variant="outline" onClick={() => void copyToClipboard()}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy for group chat
                          </Button>
                          <Button variant="outline" onClick={downloadTxt}>
                            <Download className="h-4 w-4 mr-2" />
                            Export .txt
                          </Button>
                        </div>
                        <div className="rounded-md border border-dashed p-3 space-y-2 opacity-60">
                          <div className="flex items-center gap-2 text-sm font-medium">
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
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent
                    value="schedule"
                    className="absolute inset-0 mt-0 data-[state=active]:block data-[state=inactive]:hidden"
                  >
                    <ScrollArea className="h-full">
                      <div className={`${tabBodyPad} space-y-4`}>
                    {!plan?.enabled ? (
                      <p className="text-sm text-muted-foreground">Enable the plan on Overview first.</p>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2 items-center justify-between">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
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
                                  <TableCell className="text-sm">
                                    {TEMPLATE_LABELS[item.template_key as TemplateKey] ??
                                      item.template_key}
                                  </TableCell>
                                  <TableCell className="capitalize text-sm">{item.cadence}</TableCell>
                                  <TableCell className="text-sm">
                                    {item.next_due_at
                                      ? new Date(item.next_due_at).toLocaleString()
                                      : '—'}
                                    {item.next_due_at && new Date(item.next_due_at) <= now && (
                                      <Badge className="ml-2" variant="destructive">
                                        Due
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {item.last_sent_at
                                      ? new Date(item.last_sent_at).toLocaleString()
                                      : '—'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </>
                    )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent
                    value="triggers"
                    className="absolute inset-0 mt-0 data-[state=active]:block data-[state=inactive]:hidden"
                  >
                    <ScrollArea className="h-full">
                      <div className={`${tabBodyPad} space-y-4`}>
                    {!plan?.enabled ? (
                      <p className="text-sm text-muted-foreground">Enable the plan on Overview first.</p>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Turn on triggers you care about. When something happens, open here and draft an
                          update with one tap — automation can hook into these later.
                        </p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Trigger</TableHead>
                              <TableHead className="w-[100px]">On</TableHead>
                              <TableHead className="w-[140px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {TRIGGER_TYPES.map((tt) => {
                              const row = triggers.find((t) => t.trigger_type === tt);
                              if (!row) return null;
                              return (
                                <TableRow key={tt}>
                                  <TableCell className="text-sm">{TRIGGER_LABELS[tt]}</TableCell>
                                  <TableCell>
                                    <Switch
                                      checked={row.enabled}
                                      onCheckedChange={(v) => void toggleTrigger(row, v)}
                                      aria-label={`Enable ${tt}`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => draftForTrigger(tt)}
                                    >
                                      Draft update
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </>
                    )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent
                    value="sent"
                    className="absolute inset-0 mt-0 data-[state=active]:block data-[state=inactive]:hidden"
                  >
                    <ScrollArea className="h-full">
                      <div className={`${tabBodyPad} space-y-4`}>
                    {!plan?.enabled ? (
                      <p className="text-sm text-muted-foreground">Enable the plan to start logging.</p>
                    ) : log.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Sent emails and off-app copies you log from Compose appear here.
                      </p>
                    ) : (
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
                              <TableCell className="text-sm whitespace-nowrap">
                                {new Date(row.sent_at).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row.channel === 'email' ? 'Email' : 'Copied (off-app)'}
                              </TableCell>
                              <TableCell className="text-sm max-w-[200px] truncate">{row.subject}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {TEMPLATE_LABELS[row.template_key as TemplateKey] ?? row.template_key}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
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
