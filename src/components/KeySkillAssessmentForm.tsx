import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ASSUMED_LOW_PROFICIENCY } from '@/utils/skillAssumptions';

export type KeySkillAssessmentRow = {
  skillId: string;
  name: string;
  description: string | null;
  proficiency: number;
  experienceHours: number;
  requiredForKickoff: boolean;
};

interface KeySkillAssessmentFormProps {
  userId: string;
  /** When set, only template key skills. When omitted, all active catalog skills. */
  templateProjectId?: string | null;
  description?: string;
  onSaved?: () => void;
  showSaveButton?: boolean;
}

export async function loadKeySkillAssessmentRows(
  userId: string,
  templateProjectId?: string | null
): Promise<KeySkillAssessmentRow[]> {
  let skillIds: { skill_id: string; required_for_kickoff: boolean }[] = [];

  if (templateProjectId) {
    const { data, error } = await supabase
      .from('project_key_skills')
      .select('skill_id, required_for_kickoff, display_order')
      .eq('project_id', templateProjectId)
      .order('display_order', { ascending: true });
    if (error) throw new Error(error.message);
    skillIds = (data ?? []).map((r) => ({
      skill_id: r.skill_id,
      required_for_kickoff: r.required_for_kickoff,
    }));
  }

  const { data: defs, error: defsErr } = await supabase
    .from('skill_definitions')
    .select('id, name, description, display_order, is_active')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (defsErr) throw new Error(defsErr.message);

  const filtered =
    skillIds.length > 0
      ? (defs ?? []).filter((d) => skillIds.some((s) => s.skill_id === d.id))
      : defs ?? [];

  const { data: ratings } = await supabase
    .from('user_skill_ratings')
    .select('skill_id, proficiency')
    .eq('user_id', userId);
  const { data: experience } = await supabase
    .from('user_skill_experience')
    .select('skill_id, experience_seconds')
    .eq('user_id', userId);

  const ratingMap = new Map((ratings ?? []).map((r) => [r.skill_id, r.proficiency]));
  const expMap = new Map(
    (experience ?? []).map((r) => [r.skill_id, (Number(r.experience_seconds) || 0) / 3600])
  );
  const requiredMap = new Map(skillIds.map((s) => [s.skill_id, s.required_for_kickoff]));

  return filtered.map((d) => ({
    skillId: d.id,
    name: d.name,
    description: d.description,
    proficiency: ratingMap.get(d.id) ?? ASSUMED_LOW_PROFICIENCY,
    experienceHours: expMap.get(d.id) ?? 0,
    requiredForKickoff: requiredMap.get(d.id) ?? false,
  }));
}

export async function saveKeySkillAssessmentRows(
  userId: string,
  rows: KeySkillAssessmentRow[]
): Promise<void> {
  const now = new Date().toISOString();
  for (const row of rows) {
    const { data: existing } = await supabase
      .from('user_skill_ratings')
      .select('id')
      .eq('user_id', userId)
      .eq('skill_id', row.skillId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('user_skill_ratings')
        .update({
          proficiency: row.proficiency,
          source: 'assessment',
          assumed_low: false,
          updated_at: now,
        })
        .eq('id', existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('user_skill_ratings').insert({
        user_id: userId,
        skill_id: row.skillId,
        proficiency: row.proficiency,
        source: 'assessment',
        assumed_low: false,
        updated_at: now,
      });
      if (error) throw new Error(error.message);
    }
  }
}

export function KeySkillAssessmentForm({
  userId,
  templateProjectId,
  description = 'Rate proficiency 0-100 for each skill. Experience hours come from completed work.',
  onSaved,
  showSaveButton = true,
}: KeySkillAssessmentFormProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<KeySkillAssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const loaded = await loadKeySkillAssessmentRows(userId, templateProjectId);
        if (!cancelled) setRows(loaded);
      } catch (e) {
        toast({
          title: 'Could not load skills',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, templateProjectId, toast]);

  const setProficiency = (skillId: string, value: number) => {
    setRows((prev) =>
      prev.map((row) => (row.skillId === skillId ? { ...row, proficiency: value } : row))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveKeySkillAssessmentRows(userId, rows);
      toast({ title: 'Skills saved' });
      onSaved?.();
    } catch (e) {
      toast({
        title: 'Could not save skills',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading skill assessment…</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No key skills are attached to this project yet. Unrated skills are treated as low proficiency
        for risk until authors attach skills and you rate them.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="space-y-3">
        {rows.map((row) => (
          <Card key={row.skillId}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <Label className="font-semibold text-sm">{row.name}</Label>
                <span className="text-sm tabular-nums text-muted-foreground">{row.proficiency}</span>
              </div>
              {row.description && (
                <p className="text-xs text-muted-foreground">{row.description}</p>
              )}
              <Slider
                value={[row.proficiency]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => setProficiency(row.skillId, v[0])}
              />
              <p className="text-xs text-muted-foreground">
                Experience: {row.experienceHours.toFixed(1)} h
                {row.requiredForKickoff ? ' · Required for this project' : ''}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      {showSaveButton && (
        <Button type="button" onClick={() => void handleSave()} disabled={saving} className="w-full">
          {saving ? 'Saving…' : 'Save skill ratings'}
        </Button>
      )}
    </div>
  );
}

/** Imperative save of current in-memory rows (for kickoff parent that owns state). */
export { saveKeySkillAssessmentRows as persistKeySkillRows };
