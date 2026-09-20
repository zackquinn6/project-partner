import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type ProfileVariation = {
  live_in_during_project: boolean | null;
  occupants_at_risk: boolean | null;
  temporary_kitchen_bath: boolean | null;
  dust_containment_planned: boolean | null;
  helper_count: number | null;
  work_solo: boolean | null;
  contingency_percent: number | null;
  finance_constraint: boolean | null;
};

type RunVariation = {
  concealed_conditions_likelihood: number | null;
  moisture_substrate_concern: boolean | null;
  access_constrained: boolean | null;
  permit_required: boolean | null;
  outdoor_season_conflict: boolean | null;
  inspection_lag_days: number | null;
  long_lead_item_count: number | null;
  material_readiness_ratio: number | null;
  trade_lead_time_days: number | null;
  ppe_ventilation_ready: boolean | null;
};

interface ProjectVariationRiskFieldsProps {
  userId: string;
  projectRunId: string;
  onSaved?: () => void;
}

function BoolField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <Checkbox
        id={id}
        checked={value === true}
        onCheckedChange={(checked) => onChange(checked === true)}
      />
      {label}
    </label>
  );
}

export function ProjectVariationRiskFields({
  userId,
  projectRunId,
  onSaved,
}: ProjectVariationRiskFieldsProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileVariation>({
    live_in_during_project: null,
    occupants_at_risk: null,
    temporary_kitchen_bath: null,
    dust_containment_planned: null,
    helper_count: null,
    work_solo: null,
    contingency_percent: null,
    finance_constraint: null,
  });
  const [run, setRun] = useState<RunVariation>({
    concealed_conditions_likelihood: null,
    moisture_substrate_concern: null,
    access_constrained: null,
    permit_required: null,
    outdoor_season_conflict: null,
    inspection_lag_days: null,
    long_lead_item_count: null,
    material_readiness_ratio: null,
    trade_lead_time_days: null,
    ppe_ventilation_ready: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [profileRes, runRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select(
            'live_in_during_project, occupants_at_risk, temporary_kitchen_bath, dust_containment_planned, helper_count, work_solo, contingency_percent, finance_constraint'
          )
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('project_runs')
          .select(
            'concealed_conditions_likelihood, moisture_substrate_concern, access_constrained, permit_required, outdoor_season_conflict, inspection_lag_days, long_lead_item_count, material_readiness_ratio, trade_lead_time_days, ppe_ventilation_ready'
          )
          .eq('id', projectRunId)
          .maybeSingle(),
      ]);
      if (profileRes.data) {
        setProfile({
          live_in_during_project: profileRes.data.live_in_during_project,
          occupants_at_risk: profileRes.data.occupants_at_risk,
          temporary_kitchen_bath: profileRes.data.temporary_kitchen_bath,
          dust_containment_planned: profileRes.data.dust_containment_planned,
          helper_count: profileRes.data.helper_count,
          work_solo: profileRes.data.work_solo,
          contingency_percent: profileRes.data.contingency_percent,
          finance_constraint: profileRes.data.finance_constraint,
        });
      }
      if (runRes.data) {
        setRun({
          concealed_conditions_likelihood: runRes.data.concealed_conditions_likelihood,
          moisture_substrate_concern: runRes.data.moisture_substrate_concern,
          access_constrained: runRes.data.access_constrained,
          permit_required: runRes.data.permit_required,
          outdoor_season_conflict: runRes.data.outdoor_season_conflict,
          inspection_lag_days: runRes.data.inspection_lag_days,
          long_lead_item_count: runRes.data.long_lead_item_count,
          material_readiness_ratio: runRes.data.material_readiness_ratio,
          trade_lead_time_days: runRes.data.trade_lead_time_days,
          ppe_ventilation_ready: runRes.data.ppe_ventilation_ready,
        });
      }
    })();
  }, [userId, projectRunId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: profileErr } = await supabase
        .from('user_profiles')
        .update({
          live_in_during_project: profile.live_in_during_project,
          occupants_at_risk: profile.occupants_at_risk,
          temporary_kitchen_bath: profile.temporary_kitchen_bath,
          dust_containment_planned: profile.dust_containment_planned,
          helper_count: profile.helper_count,
          work_solo: profile.work_solo,
          contingency_percent: profile.contingency_percent,
          finance_constraint: profile.finance_constraint,
        })
        .eq('user_id', userId);
      if (profileErr) throw new Error(profileErr.message);

      const { error: runErr } = await supabase
        .from('project_runs')
        .update({
          concealed_conditions_likelihood: run.concealed_conditions_likelihood,
          moisture_substrate_concern: run.moisture_substrate_concern,
          access_constrained: run.access_constrained,
          permit_required: run.permit_required,
          outdoor_season_conflict: run.outdoor_season_conflict,
          inspection_lag_days: run.inspection_lag_days,
          long_lead_item_count: run.long_lead_item_count,
          material_readiness_ratio: run.material_readiness_ratio,
          trade_lead_time_days: run.trade_lead_time_days,
          ppe_ventilation_ready: run.ppe_ventilation_ready,
        })
        .eq('id', projectRunId);
      if (runErr) throw new Error(runErr.message);

      toast({ title: 'Risk context saved' });
      onSaved?.();
    } catch (e) {
      toast({
        title: 'Could not save risk context',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Blank fields raise risk (conservative assumptions). Fill what you know.
      </p>

      <div className="space-y-2">
        <p className="text-sm font-medium">Living and household</p>
        <BoolField
          id="live-in"
          label="Living in the home during the project"
          value={profile.live_in_during_project}
          onChange={(v) => setProfile((p) => ({ ...p, live_in_during_project: v }))}
        />
        <BoolField
          id="occupants"
          label="Kids, pets, or respiratory sensitivity present"
          value={profile.occupants_at_risk}
          onChange={(v) => setProfile((p) => ({ ...p, occupants_at_risk: v }))}
        />
        <BoolField
          id="temp-kitchen"
          label="Relying on temporary kitchen or bath"
          value={profile.temporary_kitchen_bath}
          onChange={(v) => setProfile((p) => ({ ...p, temporary_kitchen_bath: v }))}
        />
        <BoolField
          id="dust"
          label="Dust containment planned"
          value={profile.dust_containment_planned}
          onChange={(v) => setProfile((p) => ({ ...p, dust_containment_planned: v }))}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Site and schedule</p>
        <Label htmlFor="concealed">Concealed conditions likelihood (0-10)</Label>
        <Input
          id="concealed"
          type="number"
          min={0}
          max={10}
          value={run.concealed_conditions_likelihood ?? ''}
          onChange={(e) =>
            setRun((r) => ({
              ...r,
              concealed_conditions_likelihood:
                e.target.value === '' ? null : Number(e.target.value),
            }))
          }
        />
        <BoolField
          id="moisture"
          label="Moisture or substrate concern"
          value={run.moisture_substrate_concern}
          onChange={(v) => setRun((r) => ({ ...r, moisture_substrate_concern: v }))}
        />
        <BoolField
          id="access"
          label="Access / parking / haul path constrained"
          value={run.access_constrained}
          onChange={(v) => setRun((r) => ({ ...r, access_constrained: v }))}
        />
        <BoolField
          id="permit"
          label="Permit required"
          value={run.permit_required}
          onChange={(v) => setRun((r) => ({ ...r, permit_required: v }))}
        />
        <BoolField
          id="season"
          label="Outdoor work conflicts with season"
          value={run.outdoor_season_conflict}
          onChange={(v) => setRun((r) => ({ ...r, outdoor_season_conflict: v }))}
        />
        <Label htmlFor="inspection">Inspection lag (days)</Label>
        <Input
          id="inspection"
          type="number"
          min={0}
          value={run.inspection_lag_days ?? ''}
          onChange={(e) =>
            setRun((r) => ({
              ...r,
              inspection_lag_days: e.target.value === '' ? null : Number(e.target.value),
            }))
          }
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Budget, supply, helpers</p>
        <Label htmlFor="contingency">Contingency %</Label>
        <Input
          id="contingency"
          type="number"
          min={0}
          max={100}
          value={profile.contingency_percent ?? ''}
          onChange={(e) =>
            setProfile((p) => ({
              ...p,
              contingency_percent: e.target.value === '' ? null : Number(e.target.value),
            }))
          }
        />
        <BoolField
          id="finance"
          label="Finance constrained"
          value={profile.finance_constraint}
          onChange={(v) => setProfile((p) => ({ ...p, finance_constraint: v }))}
        />
        <Label htmlFor="long-lead">Long-lead item count</Label>
        <Input
          id="long-lead"
          type="number"
          min={0}
          value={run.long_lead_item_count ?? ''}
          onChange={(e) =>
            setRun((r) => ({
              ...r,
              long_lead_item_count: e.target.value === '' ? null : Number(e.target.value),
            }))
          }
        />
        <Label htmlFor="materials">Material readiness (0-1)</Label>
        <Input
          id="materials"
          type="number"
          min={0}
          max={1}
          step={0.1}
          value={run.material_readiness_ratio ?? ''}
          onChange={(e) =>
            setRun((r) => ({
              ...r,
              material_readiness_ratio: e.target.value === '' ? null : Number(e.target.value),
            }))
          }
        />
        <Label htmlFor="helpers">Helper count</Label>
        <Input
          id="helpers"
          type="number"
          min={0}
          value={profile.helper_count ?? ''}
          onChange={(e) =>
            setProfile((p) => ({
              ...p,
              helper_count: e.target.value === '' ? null : Number(e.target.value),
            }))
          }
        />
        <BoolField
          id="solo"
          label="Working solo"
          value={profile.work_solo}
          onChange={(v) => setProfile((p) => ({ ...p, work_solo: v }))}
        />
        <Label htmlFor="trade">Trade lead time (days)</Label>
        <Input
          id="trade"
          type="number"
          min={0}
          value={run.trade_lead_time_days ?? ''}
          onChange={(e) =>
            setRun((r) => ({
              ...r,
              trade_lead_time_days: e.target.value === '' ? null : Number(e.target.value),
            }))
          }
        />
        <BoolField
          id="ppe"
          label="PPE and ventilation ready"
          value={run.ppe_ventilation_ready}
          onChange={(v) => setRun((r) => ({ ...r, ppe_ventilation_ready: v }))}
        />
      </div>

      <Button type="button" onClick={() => void handleSave()} disabled={saving} className="w-full">
        {saving ? 'Saving…' : 'Save risk context'}
      </Button>
    </div>
  );
}
