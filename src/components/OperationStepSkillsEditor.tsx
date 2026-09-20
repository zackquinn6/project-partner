import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type SkillOption = { id: string; name: string };

interface OperationStepSkillsEditorProps {
  operationStepId: string;
}

export function OperationStepSkillsEditor({ operationStepId }: OperationStepSkillsEditorProps) {
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<SkillOption[]>([]);
  const [linked, setLinked] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    const [{ data: skills }, { data: links }] = await Promise.all([
      supabase
        .from('skill_definitions')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('operation_step_skills')
        .select('skill_id')
        .eq('operation_step_id', operationStepId),
    ]);
    setCatalog((skills ?? []).map((s) => ({ id: s.id, name: s.name })));
    setLinked(new Set((links ?? []).map((l) => l.skill_id)));
  }, [operationStepId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggle = async (skillId: string, on: boolean) => {
    if (on) {
      const { error } = await supabase.from('operation_step_skills').insert({
        operation_step_id: operationStepId,
        skill_id: skillId,
        importance: 'primary',
      });
      if (error) {
        toast({ title: 'Could not link skill', description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('operation_step_skills')
        .delete()
        .eq('operation_step_id', operationStepId)
        .eq('skill_id', skillId);
      if (error) {
        toast({ title: 'Could not unlink skill', description: error.message, variant: 'destructive' });
        return;
      }
    }
    await reload();
  };

  if (!operationStepId) return null;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Key skills for this step</Label>
      <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border p-2">
        {catalog.map((skill) => (
          <label key={skill.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={linked.has(skill.id)}
              onCheckedChange={(checked) => void toggle(skill.id, checked === true)}
            />
            {skill.name}
          </label>
        ))}
      </div>
    </div>
  );
}
