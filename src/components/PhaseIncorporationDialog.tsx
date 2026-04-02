import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Phase } from '@/interfaces/Project';

/** Radix Select: keep `value` always a string (no undefined ↔ string flip). */
const INCORPORATE_PHASE_UNSET = '__pp_incorporate_phase_unset__';

function coerceRpcPhaseArray(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object' && raw !== null && Array.isArray((raw as { phases?: unknown }).phases)) {
    return (raw as { phases: unknown[] }).phases;
  }
  return [];
}

function filterValidNamedPhases(phases: unknown[]): Phase[] {
  return phases.filter((phase): phase is Phase => {
    if (!phase || typeof phase !== 'object') return false;
    const p = phase as Phase;
    if (!p.name || p.name.trim() === '' || p.name === 'New Phase') return false;
    return true;
  });
}

function normName(s: string): string {
  return s.trim().toLowerCase();
}

/** Minimal phase for preview when workflow JSON does not list this `project_phases` row (id/name mismatch). */
function syntheticPhaseFromRow(row: { id: string; name: string }): Phase {
  return {
    id: row.id,
    name: row.name,
    description: '',
    operations: [],
  };
}

/**
 * One picker row per incorporable `project_phases` row. Match workflow JSON for rich preview when possible;
 * otherwise still list the phase using DB id/name (operations load from source on incorporate).
 */
function buildIncorporateOptions(
  phases: Phase[],
  rows: { id: string; name: string }[] | null
): { dbPhaseId: string; phase: Phase }[] {
  if (rows === null) {
    return phases.map((p) => ({ dbPhaseId: p.id, phase: p }));
  }
  const out: { dbPhaseId: string; phase: Phase }[] = [];
  for (const row of rows) {
    const byId = phases.find((p) => p.id === row.id);
    if (byId) {
      out.push({ dbPhaseId: row.id, phase: byId });
      continue;
    }
    const exact = phases.filter((p) => p.name === row.name);
    if (exact.length === 1) {
      out.push({ dbPhaseId: row.id, phase: exact[0] });
      continue;
    }
    const trimmed = phases.filter((p) => p.name.trim() === row.name.trim());
    if (trimmed.length === 1) {
      out.push({ dbPhaseId: row.id, phase: trimmed[0] });
      continue;
    }
    const ci = phases.filter((p) => normName(p.name) === normName(row.name));
    if (ci.length === 1) {
      out.push({ dbPhaseId: row.id, phase: ci[0] });
      continue;
    }
    out.push({ dbPhaseId: row.id, phase: syntheticPhaseFromRow(row) });
  }
  return out;
}

function jsonIncorporableHeuristic(phase: Phase): boolean {
  if (!phase?.name || phase.name === 'New Phase' || phase.name.trim() === '') return false;
  const isStd =
    phase.isStandard === true || (phase as { is_standard?: boolean }).is_standard === true;
  const isLnk =
    phase.isLinked === true || (phase as { is_linked?: boolean }).is_linked === true;
  return !isStd || isLnk;
}

interface PhaseIncorporationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIncorporatePhase: (
    phase: Phase & {
      sourceProjectId: string;
      sourceProjectName: string;
      incorporatedRevision: number;
    }
  ) => boolean | Promise<boolean>;
}

interface PublishedProject {
  id: string;
  name: string;
  description: string | null;
  phases: Phase[];
  revision_number: number;
  parent_project_id: string | null;
  updated_at: string;
  category?: string[];
  is_standard?: boolean | null;
  /**
   * Rows from `project_phases` that may be incorporated (`is_standard` not true, or `is_linked` true).
   * null = could not load from DB (fall back to JSON flags only).
   */
  incorporablePhaseRows: { id: string; name: string }[] | null;
}

export const PhaseIncorporationDialog: React.FC<PhaseIncorporationDialogProps> = ({
  open,
  onOpenChange,
  onIncorporatePhase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<PublishedProject[]>([]);
  const [allProjects, setAllProjects] = useState<PublishedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<PublishedProject | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      void loadAllProjects();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = allProjects.filter(
        (project) =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setProjects(filtered);
    } else {
      setProjects(allProjects);
    }
  }, [searchQuery, allProjects]);

  const loadAllProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, phases, revision_number, parent_project_id, updated_at, category, is_standard')
        .eq('publish_status', 'published')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const projectRows = data ?? [];
      type ProjectRow = (typeof projectRows)[number];

      const latestPublishedProjects = Array.from(
        projectRows
          .filter((project) => project.name.toLowerCase() !== 'manual project template')
          .filter((project) => project.is_standard !== true)
          .reduce((map, project) => {
            const familyId = project.parent_project_id ?? project.id;
            const existing = map.get(familyId);

            if (!existing) {
              map.set(familyId, project);
              return map;
            }

            const currentRevision = project.revision_number ?? 0;
            const existingRevision = existing.revision_number ?? 0;
            const currentUpdatedAt = new Date(project.updated_at).getTime();
            const existingUpdatedAt = new Date(existing.updated_at).getTime();

            if (
              currentRevision > existingRevision ||
              (currentRevision === existingRevision && currentUpdatedAt > existingUpdatedAt)
            ) {
              map.set(familyId, project);
            }

            return map;
          }, new Map<string, ProjectRow>())
          .values()
      );

      const projectIds = latestPublishedProjects.map((p) => p.id);
      let incorporableByProject: Map<string, { id: string; name: string }[]> | null = null;
      if (projectIds.length > 0) {
        const { data: phaseRows, error: phaseRowsError } = await supabase
          .from('project_phases')
          .select('id, name, project_id, is_standard, is_linked')
          .in('project_id', projectIds);

        if (!phaseRowsError && phaseRows) {
          incorporableByProject = new Map();
          for (const row of phaseRows) {
            const isFoundationStandard = row.is_standard === true && row.is_linked !== true;
            if (isFoundationStandard) continue;
            const list = incorporableByProject.get(row.project_id) ?? [];
            list.push({ id: row.id, name: row.name });
            incorporableByProject.set(row.project_id, list);
          }
        }
      }

      const processedProjects: PublishedProject[] = await Promise.all(
        latestPublishedProjects.map(async (project) => {
          let phases: Phase[] = [];
          try {
            const { data: rebuiltPhases, error: rebuildError } = await supabase.rpc(
              'rebuild_phases_json_from_project_phases',
              { p_project_id: project.id }
            );

            let rawList: unknown[] = [];
            if (!rebuildError && rebuiltPhases != null) {
              rawList = coerceRpcPhaseArray(rebuiltPhases);
            }
            if (rawList.length === 0) {
              const stored = typeof project.phases === 'string' ? JSON.parse(project.phases) : project.phases;
              rawList = Array.isArray(stored) ? stored : [];
            }
            if (rawList.length === 0) {
              const { data: wf, error: wfError } = await (supabase.rpc as any)(
                'get_project_workflow_with_standards',
                { p_project_id: project.id }
              );
              if (!wfError && wf != null) {
                rawList = coerceRpcPhaseArray(wf);
              }
            }

            phases = filterValidNamedPhases(rawList);
          } catch (err) {
            console.error('Error parsing phases for project:', project.id, err);
            phases = [];
          }

          const incorporablePhaseRows =
            incorporableByProject === null ? null : (incorporableByProject.get(project.id) ?? []);

          return {
            ...project,
            phases,
            incorporablePhaseRows,
          };
        })
      );

      setAllProjects(processedProjects);
      setProjects(processedProjects);
    } catch (err) {
      console.error('Error loading projects:', err);
      toast({
        title: 'Load Failed',
        description: 'Failed to load projects. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    setSelectedProject(project || null);
    setSelectedPhase(null);
  };

  const handlePhaseSelect = (dbPhaseId: string) => {
    const opts = selectedProject
      ? buildIncorporateOptions(selectedProject.phases, selectedProject.incorporablePhaseRows)
      : [];
    const hit = opts.find((o) => o.dbPhaseId === dbPhaseId);
    if (!hit) {
      setSelectedPhase(null);
      return;
    }
    setSelectedPhase({ ...hit.phase, id: hit.dbPhaseId });
  };

  const handleIncorporate = async () => {
    if (!selectedProject || !selectedPhase) {
      toast({
        title: 'Selection Required',
        description: 'Please select both a project and a phase to incorporate.',
        variant: 'destructive',
      });
      return;
    }
    const incorporatedPhase = {
      ...selectedPhase,
      sourceProjectId: selectedProject.id,
      sourceProjectName: selectedProject.name,
      incorporatedRevision: selectedProject.revision_number,
      isLinked: true,
    };
    const ok = await onIncorporatePhase(incorporatedPhase);
    if (ok) {
      setSelectedPhase(null);
    }
  };

  const incorporateOptions = selectedProject
    ? buildIncorporateOptions(selectedProject.phases, selectedProject.incorporablePhaseRows)
    : [];

  const availableOptions =
    selectedProject?.incorporablePhaseRows === null
      ? incorporateOptions.filter(({ phase }) => jsonIncorporableHeuristic(phase))
      : incorporateOptions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(100dvh,100vh)] w-full max-w-[min(98vw,70rem)] flex-col gap-4 overflow-y-auto md:!max-w-[min(98vw,70rem)]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Incorporate Phase from Another Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Projects</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                placeholder="Filter projects by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading projects...</div>
          ) : projects.length > 0 ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Project ({projects.length} available)</label>
              <div className="max-h-80 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow
                        key={project.id}
                        className={`cursor-pointer ${selectedProject?.id === project.id ? 'bg-primary/10' : ''}`}
                        onClick={() => handleProjectSelect(project.id)}
                      >
                        <TableCell className="font-medium">{project.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No published projects found.</div>
          )}

          {selectedProject && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Phase</label>
              {availableOptions.length > 0 ? (
                <Select
                  value={selectedPhase?.id ?? INCORPORATE_PHASE_UNSET}
                  onValueChange={(v) => {
                    if (v === INCORPORATE_PHASE_UNSET) {
                      setSelectedPhase(null);
                      return;
                    }
                    handlePhaseSelect(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a phase to incorporate..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={INCORPORATE_PHASE_UNSET} className="text-muted-foreground">
                      Choose a phase to incorporate…
                    </SelectItem>
                    {availableOptions.map(({ dbPhaseId, phase }) => {
                      const phaseName = phase?.name || 'Unnamed Phase';
                      return (
                        <SelectItem key={dbPhaseId} value={dbPhaseId}>
                          <div className="flex w-full items-center justify-between">
                            <span>{phaseName}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {phase.operations?.length || 0} operations
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <p className="py-2 text-sm text-muted-foreground">No phases to incorporate for this project.</p>
              )}
            </div>
          )}

          {selectedPhase && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Phase Preview</label>
              <Card>
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{selectedPhase.name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/project/${selectedProject?.id}`, '_blank')}
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        View Source
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedPhase.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{selectedPhase.operations?.length || 0} operations</span>
                      <span>
                        {selectedPhase.operations?.reduce((total, op) => total + (op.steps?.length || 0), 0) ||
                          0}{' '}
                        steps
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleIncorporate()}
              disabled={!selectedProject || !selectedPhase}
            >
              Add to Project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
