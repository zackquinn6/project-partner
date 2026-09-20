import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type SkillDefinition = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  display_order: number;
};

type ProjectOption = {
  id: string;
  name: string;
};

type ProjectKeySkillRow = {
  id: string;
  skill_id: string;
  display_order: number;
  required_for_kickoff: boolean;
};

interface ProjectSkillAssessmentsAdminProps {
  onClose?: () => void;
}

export function ProjectSkillAssessmentsAdmin({ onClose }: ProjectSkillAssessmentsAdminProps) {
  const { toast } = useToast();
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [attached, setAttached] = useState<ProjectKeySkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('custom');
  const [newSlug, setNewSlug] = useState('');

  const loadCatalog = useCallback(async () => {
    const { data, error } = await supabase
      .from('skill_definitions')
      .select('id, slug, name, description, category, is_active, display_order')
      .order('display_order', { ascending: true });
    if (error) {
      toast({ title: 'Could not load skills', description: error.message, variant: 'destructive' });
      return;
    }
    setSkills(data ?? []);
  }, [toast]);

  const loadProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('name', { ascending: true })
      .limit(500);
    if (error) {
      toast({ title: 'Could not load projects', description: error.message, variant: 'destructive' });
      return;
    }
    setProjects(data ?? []);
    if (!selectedProjectId && data && data.length > 0) {
      setSelectedProjectId(data[0].id);
    }
  }, [toast, selectedProjectId]);

  const loadAttached = useCallback(async (projectId: string) => {
    if (!projectId) {
      setAttached([]);
      return;
    }
    const { data, error } = await supabase
      .from('project_key_skills')
      .select('id, skill_id, display_order, required_for_kickoff')
      .eq('project_id', projectId)
      .order('display_order', { ascending: true });
    if (error) {
      toast({ title: 'Could not load project skills', description: error.message, variant: 'destructive' });
      return;
    }
    setAttached(data ?? []);
  }, [toast]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadCatalog(), loadProjects()]);
      setLoading(false);
    })();
  }, [loadCatalog, loadProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      void loadAttached(selectedProjectId);
    }
  }, [selectedProjectId, loadAttached]);

  const attachedIds = new Set(attached.map((row) => row.skill_id));

  const toggleSkillOnProject = async (skillId: string, enabled: boolean) => {
    if (!selectedProjectId) return;
    if (enabled) {
      const { error } = await supabase.from('project_key_skills').insert({
        project_id: selectedProjectId,
        skill_id: skillId,
        display_order: attached.length * 10,
        required_for_kickoff: true,
      });
      if (error) {
        toast({ title: 'Could not attach skill', description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      const row = attached.find((r) => r.skill_id === skillId);
      if (!row) return;
      const { error } = await supabase.from('project_key_skills').delete().eq('id', row.id);
      if (error) {
        toast({ title: 'Could not remove skill', description: error.message, variant: 'destructive' });
        return;
      }
    }
    await loadAttached(selectedProjectId);
  };

  const toggleRequired = async (row: ProjectKeySkillRow, required: boolean) => {
    const { error } = await supabase
      .from('project_key_skills')
      .update({ required_for_kickoff: required })
      .eq('id', row.id);
    if (error) {
      toast({ title: 'Could not update skill', description: error.message, variant: 'destructive' });
      return;
    }
    await loadAttached(selectedProjectId);
  };

  const addCustomSkill = async () => {
    const slug =
      newSlug.trim() ||
      newName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    if (!newName.trim() || !slug) {
      toast({ title: 'Name required', description: 'Enter a skill name.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('skill_definitions').insert({
      slug,
      name: newName.trim(),
      category: newCategory.trim() || 'custom',
      description: null,
      is_baseline: false,
      is_active: true,
      display_order: (skills[skills.length - 1]?.display_order ?? 0) + 10,
    });
    if (error) {
      toast({ title: 'Could not create skill', description: error.message, variant: 'destructive' });
      return;
    }
    setNewName('');
    setNewSlug('');
    await loadCatalog();
    toast({ title: 'Skill added' });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading skill catalog…</p>;
  }

  return (
    <div className="flex flex-col gap-4 max-h-[70vh]">
      <div className="space-y-2">
        <Label htmlFor="skill-project">Project template</Label>
        <select
          id="skill-project"
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Attach key skills this template needs. Users rate proficiency at profile and kickoff.
        </p>
      </div>

      <ScrollArea className="h-56 rounded-md border">
        <div className="p-3 space-y-2">
          {skills.map((skill) => {
            const row = attached.find((a) => a.skill_id === skill.id);
            const on = attachedIds.has(skill.id);
            return (
              <div key={skill.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <Checkbox
                  checked={on}
                  onCheckedChange={(checked) => void toggleSkillOnProject(skill.id, checked === true)}
                  id={`skill-${skill.id}`}
                />
                <div className="flex-1 min-w-0">
                  <Label htmlFor={`skill-${skill.id}`} className="font-medium text-sm">
                    {skill.name}
                  </Label>
                  <p className="text-xs text-muted-foreground">{skill.description}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary">{skill.category}</Badge>
                    {on && row && (
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Checkbox
                          checked={row.required_for_kickoff}
                          onCheckedChange={(checked) => void toggleRequired(row, checked === true)}
                        />
                        Required at kickoff
                      </label>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="space-y-2 border-t pt-3">
        <p className="text-sm font-medium">Add custom skill</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input placeholder="slug-optional" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
          <Input placeholder="Category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
        </div>
        <Button type="button" variant="secondary" onClick={() => void addCustomSkill()}>
          Add skill
        </Button>
      </div>

      {onClose && (
        <Button type="button" className="w-full" onClick={onClose}>
          Close
        </Button>
      )}
    </div>
  );
}
