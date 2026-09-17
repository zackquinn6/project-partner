import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  RISK_RULE_EFFECTS,
  RISK_RULE_OPERATORS,
  RISK_RULE_OPERATOR_LABELS,
  loadProjectRiskRules,
  type ProjectRiskRule,
  type RiskRuleCondition,
  type RiskRuleEffect,
  type RiskRuleOperator,
  type RiskRuleTargetKind,
} from '@/utils/projectRiskLogic';
import { RISK_SIGNALS, RISK_SIGNAL_KEYS, type RiskSignalKey } from '@/utils/riskSignals';

const EFFECT_LABELS: Record<RiskRuleEffect, string> = {
  adjust_occurrence: 'Change how often it happens',
  adjust_detection: 'Change the chance of catching it',
  include: 'Only applies when this matches',
  exclude: 'Does not apply when this matches',
};

const DELTA_CHOICES = [-3, -2, -1, 1, 2, 3] as const;

interface DraftCondition {
  signal: RiskSignalKey;
  operator: RiskRuleOperator;
  /** Raw text, parsed on save against the signal's type. */
  valuesText: string;
}

interface DraftRule {
  conditions: DraftCondition[];
  effect: RiskRuleEffect;
  delta: number | null;
  rationale: string;
}

const EMPTY_DRAFT: DraftRule = {
  conditions: [],
  effect: 'adjust_occurrence',
  delta: 1,
  rationale: '',
};

function operatorsForSignal(signal: RiskSignalKey): readonly RiskRuleOperator[] {
  return RISK_SIGNALS[signal].valueType === 'number'
    ? RISK_RULE_OPERATORS
    : RISK_RULE_OPERATORS.filter((op) => op === 'is_any_of' || op === 'is_none_of');
}

function conditionValuesToJson(condition: DraftCondition): (string | number)[] {
  const parts = condition.valuesText
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');

  if (RISK_SIGNALS[condition.signal].valueType === 'number') {
    return parts.map((part) => {
      const value = Number(part);
      if (!Number.isFinite(value)) {
        throw new Error(`${RISK_SIGNALS[condition.signal].label} needs a number, not "${part}".`);
      }
      return value;
    });
  }
  return parts;
}

function describeCondition(condition: RiskRuleCondition): string {
  return `${RISK_SIGNALS[condition.signal].label} ${RISK_RULE_OPERATOR_LABELS[condition.operator]} ${condition.values.join(', ')}`;
}

export interface ProjectRiskRulesEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  targetKind: RiskRuleTargetKind;
  targetId: string;
  /** What the rules are attached to, shown so the author knows what they are editing. */
  targetLabel: string;
}

/**
 * Stage 2 authoring: the rules that make a template risk this user's risk.
 *
 * A rule reads signals the app already resolves, so the author picks from a closed list rather
 * than typing a field name. Severity is deliberately absent from the effects: the consequence
 * of a failure belongs to the requirement, not to the person doing the work.
 */
export const ProjectRiskRulesEditor: React.FC<ProjectRiskRulesEditorProps> = ({
  open,
  onOpenChange,
  projectId,
  targetKind,
  targetId,
  targetLabel,
}) => {
  const [rules, setRules] = useState<ProjectRiskRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftRule>(EMPTY_DRAFT);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await loadProjectRiskRules(projectId);
      setRules(all.filter((rule) => rule.targetKind === targetKind && rule.targetId === targetId));
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Could not load rules');
    } finally {
      setLoading(false);
    }
  }, [projectId, targetKind, targetId]);

  useEffect(() => {
    if (open) {
      setDraft(EMPTY_DRAFT);
      void load();
    }
  }, [open, load]);

  const signalsByGroup = useMemo(() => {
    const groups = new Map<string, RiskSignalKey[]>();
    for (const key of RISK_SIGNAL_KEYS) {
      const group = RISK_SIGNALS[key].group;
      const list = groups.get(group);
      if (list) list.push(key);
      else groups.set(group, [key]);
    }
    return groups;
  }, []);

  const adjusts = draft.effect === 'adjust_occurrence' || draft.effect === 'adjust_detection';

  const handleSave = async () => {
    if (draft.rationale.trim() === '') {
      toast.error('Write the sentence the user will read explaining why this applies to them.');
      return;
    }
    if (adjusts && (draft.delta === null || draft.delta === 0)) {
      toast.error('Pick how far this moves the score.');
      return;
    }

    let conditions: Json;
    try {
      conditions = draft.conditions.map((condition) => {
        const values = conditionValuesToJson(condition);
        if (values.length === 0) {
          throw new Error(`${RISK_SIGNALS[condition.signal].label} has no value to compare.`);
        }
        if (
          (condition.operator === 'at_least' || condition.operator === 'at_most') &&
          values.length !== 1
        ) {
          throw new Error(
            `${RISK_RULE_OPERATOR_LABELS[condition.operator]} takes one value, not ${values.length}.`
          );
        }
        return { signal: condition.signal, operator: condition.operator, values };
      }) as unknown as Json;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'A condition is incomplete');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('project_risk_rules').insert({
        project_id: projectId,
        target_kind: targetKind,
        target_id: targetId,
        conditions,
        effect: draft.effect,
        delta: adjusts ? draft.delta : null,
        rationale: draft.rationale.trim(),
        display_order: rules.length,
      });
      if (error) throw error;
      setDraft(EMPTY_DRAFT);
      await load();
      toast.success('Rule added');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Could not save the rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    const { error } = await supabase.from('project_risk_rules').delete().eq('id', ruleId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[92vw] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Personalization rules</DialogTitle>
          <p className="text-sm text-muted-foreground">{targetLabel}</p>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading rules...</p>
            ) : rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rules yet, so every user gets the template's own scores here.
              </p>
            ) : (
              rules.map((rule) => (
                <div key={rule.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {EFFECT_LABELS[rule.effect]}
                        </Badge>
                        {rule.delta !== null ? (
                          <span className="text-xs font-medium tabular-nums">
                            {rule.delta > 0 ? `+${rule.delta}` : rule.delta}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm">{rule.rationale}</p>
                      <ul className="mt-1 space-y-0.5">
                        {rule.conditions.length === 0 ? (
                          <li className="text-xs text-muted-foreground">Applies to every run.</li>
                        ) : (
                          rule.conditions.map((condition, index) => (
                            <li key={index} className="text-xs text-muted-foreground">
                              {describeCondition(condition)}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-destructive"
                      onClick={() => void handleDelete(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3 rounded-md border bg-muted/20 p-3">
            <p className="text-sm font-medium">Add a rule</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="rule-effect">What it does</Label>
                <Select
                  value={draft.effect}
                  onValueChange={(value) =>
                    setDraft({
                      ...draft,
                      effect: value as RiskRuleEffect,
                      delta:
                        value === 'adjust_occurrence' || value === 'adjust_detection'
                          ? (draft.delta ?? 1)
                          : null,
                    })
                  }
                >
                  <SelectTrigger id="rule-effect">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RISK_RULE_EFFECTS.map((effect) => (
                      <SelectItem key={effect} value={effect}>
                        {EFFECT_LABELS[effect]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {adjusts ? (
                <div>
                  <Label htmlFor="rule-delta">How far it moves</Label>
                  <Select
                    value={draft.delta === null ? '' : String(draft.delta)}
                    onValueChange={(value) => setDraft({ ...draft, delta: parseInt(value, 10) })}
                  >
                    <SelectTrigger id="rule-delta">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELTA_CHOICES.map((delta) => (
                        <SelectItem key={delta} value={String(delta)}>
                          {delta > 0 ? `+${delta}` : delta}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            <div>
              <Label htmlFor="rule-rationale">Why this applies to them</Label>
              <Textarea
                id="rule-rationale"
                value={draft.rationale}
                onChange={(event) => setDraft({ ...draft, rationale: event.target.value })}
                rows={2}
                placeholder="Shown to the user next to this risk."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conditions (all must match)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      conditions: [
                        ...draft.conditions,
                        {
                          signal: RISK_SIGNAL_KEYS[0],
                          operator: operatorsForSignal(RISK_SIGNAL_KEYS[0])[0],
                          valuesText: '',
                        },
                      ],
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Condition
                </Button>
              </div>

              {draft.conditions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  With no conditions the rule fires on every run of this template.
                </p>
              ) : null}

              {draft.conditions.map((condition, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                  <Select
                    value={condition.signal}
                    onValueChange={(value) => {
                      const signal = value as RiskSignalKey;
                      const next = [...draft.conditions];
                      next[index] = {
                        signal,
                        operator: operatorsForSignal(signal)[0],
                        valuesText: '',
                      };
                      setDraft({ ...draft, conditions: next });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(signalsByGroup.entries()).map(([group, keys]) => (
                        <React.Fragment key={group}>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {group}
                          </div>
                          {keys.map((key) => (
                            <SelectItem key={key} value={key}>
                              {RISK_SIGNALS[key].label}
                            </SelectItem>
                          ))}
                        </React.Fragment>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={condition.operator}
                    onValueChange={(value) => {
                      const next = [...draft.conditions];
                      next[index] = { ...condition, operator: value as RiskRuleOperator };
                      setDraft({ ...draft, conditions: next });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operatorsForSignal(condition.signal).map((operator) => (
                        <SelectItem key={operator} value={operator}>
                          {RISK_RULE_OPERATOR_LABELS[operator]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    value={condition.valuesText}
                    onChange={(event) => {
                      const next = [...draft.conditions];
                      next[index] = { ...condition, valuesText: event.target.value };
                      setDraft({ ...draft, conditions: next });
                    }}
                    placeholder={
                      RISK_SIGNALS[condition.signal].valueType === 'number' ? '3' : 'newbie, confident'
                    }
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        conditions: draft.conditions.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {draft.conditions.map((condition, index) => (
                <p key={`hint-${index}`} className="text-xs text-muted-foreground">
                  {RISK_SIGNALS[condition.signal].description}
                </p>
              ))}
            </div>

            <div className="flex justify-end">
              <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
                {saving ? 'Saving...' : 'Add rule'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
