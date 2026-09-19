import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Home, Plus, Minus, DollarSign, Calendar, Ruler } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ensureDefaultHomeForUser } from '@/utils/ensureDefaultHome';
import { toast } from 'sonner';
import { HomeManager } from '../HomeManager';
import { useProjectData } from '@/contexts/ProjectDataContext';
import { reportUserFacingError } from '@/utils/errorReporting';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  QUALITY_GOAL_OPTIONS,
  DEFAULT_QUALITY_GOAL,
  parseQualityGoalColumn,
  isQualityGoal,
  type QualityGoal,
} from '@/utils/qualityGoal';
import {
  loadProjectQualityLevelBundles,
  levelForGoal,
} from '@/utils/projectQualityLevels';
import {
  instructionLevelFromProfileSkill,
  type InstructionLevelPreference,
} from '@/utils/instructionLevelFromProfile';

const DEFAULT_INSTRUCTION_LEVEL: InstructionLevelPreference = 'intermediate';

function parseInstructionLevelPreference(
  raw: unknown,
): InstructionLevelPreference | undefined {
  if (raw === 'beginner' || raw === 'intermediate' || raw === 'advanced') {
    return raw;
  }
  return undefined;
}

interface ProjectProfileStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  checkedOutputs?: Set<string>;
  onOutputToggle?: (outputId: string) => void;
}

interface Home {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  home_type?: string;
  build_year?: string;
  is_primary: boolean;
}

/** Return YYYY-MM-DD for the Sunday of the week containing the given date string. */
function getSundayOfWeek(dateStr: string): string {
  if (!dateStr?.trim()) return dateStr;
  const d = new Date(dateStr + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
}

/** Add n weeks to the given date string; result is the Sunday of that week (YYYY-MM-DD). */
function addWeeks(dateStr: string, n: number): string {
  if (!dateStr?.trim()) return dateStr;
  const sunday = new Date(getSundayOfWeek(dateStr) + 'T12:00:00');
  sunday.setDate(sunday.getDate() + n * 7);
  return sunday.toISOString().split('T')[0];
}

/** Add n days to the given date string (YYYY-MM-DD). */
function addDays(dateStr: string, n: number): string {
  if (!dateStr?.trim()) return dateStr;
  const d = new Date(dateStr + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function parseMoneyish(s: string | null | undefined): number | undefined {
  if (s == null || typeof s !== 'string') return undefined;
  const t = s.trim();
  if (!t) return undefined;
  const n = parseFloat(t.replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(n)) return undefined;
  return n;
}

/** Parse mid-point hours from strings like "40-60 hours" or "48 hrs". */
function parseHoursFromEstimate(raw: string | null | undefined): number | null {
  if (raw == null || typeof raw !== 'string') return null;
  const nums = [...raw.matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => parseFloat(m[1]));
  if (nums.length === 0) return null;
  if (nums.length === 1) return nums[0];
  return (nums[0] + nums[1]) / 2;
}

/** DIY weekend sessions ≈ 8 hours each. */
function sizeAwareWeekendNote(
  size: number,
  typicalSize: number,
  estimatedTotalTime: string | null | undefined
): string | null {
  const hoursAtTypical = parseHoursFromEstimate(estimatedTotalTime);
  if (hoursAtTypical == null || !(typicalSize > 0) || !(size > 0)) return null;
  const scaledHours = hoursAtTypical * (size / typicalSize);
  const weekends = Math.max(1, Math.round(scaledHours / 8));
  return `At this size, plan on ~${weekends} weekend${weekends === 1 ? '' : 's'}`;
}

/** Budget for a typical-sized project from template fields (DB-backed). */
function deriveTypicalBudgetString(
  budgetPerTypicalSize: string | null | undefined,
  budgetPerUnit: string | null | undefined,
  typicalProjectSize: number | null | undefined
): string {
  const fromTypical = parseMoneyish(budgetPerTypicalSize);
  if (fromTypical !== undefined) return String(Math.round(fromTypical));
  if (typicalProjectSize != null && typicalProjectSize > 0) {
    const unit = parseMoneyish(budgetPerUnit);
    if (unit !== undefined) return String(Math.round(unit * typicalProjectSize));
  }
  return '';
}

function getScalingUnitShortLabel(
  scalingUnit: string,
  itemType: string | null | undefined,
  templateProject: { item_type?: string; itemType?: string } | null | undefined
): string {
  const normalizedScalingUnit = scalingUnit?.toLowerCase().trim() || '';
  if (normalizedScalingUnit === 'per square feet' || normalizedScalingUnit === 'per square foot') return 'sq ft';
  if (normalizedScalingUnit === 'per 10x10 room') return 'rooms';
  if (normalizedScalingUnit === 'per linear feet' || normalizedScalingUnit === 'per linear foot') return 'linear ft';
  if (normalizedScalingUnit === 'per cubic yard') return 'cu yd';
  if (normalizedScalingUnit === 'per item') {
    const currentItemType = itemType || templateProject?.item_type || templateProject?.itemType;
    if (currentItemType && typeof currentItemType === 'string' && currentItemType.trim().length > 0) {
      return currentItemType.trim().toLowerCase();
    }
    return 'per item';
  }
  return scalingUnit || '';
}

export const ProjectProfileStep: React.FC<ProjectProfileStepProps> = ({ onComplete, isCompleted, checkedOutputs = new Set(), onOutputToggle }) => {
  const { currentProjectRun, updateProjectRun } = useProject();
  const { projects } = useProjectData();
  const { user } = useAuth();
  const [homes, setHomes] = useState<Home[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string>('');
  const [projectForm, setProjectForm] = useState({
    customProjectName: '',
    initialSizing: '',
    initialTimeline: '',
    initialBudget: '',
    initialQualityGoal: DEFAULT_QUALITY_GOAL,
    instructionLevelPreference: DEFAULT_INSTRUCTION_LEVEL as InstructionLevelPreference,
  });
  const [loading, setLoading] = useState(true);
  const [showHomeManager, setShowHomeManager] = useState(false);
  
  // Get template project to access scaling unit and item type
  const templateProject = currentProjectRun?.projectId
    ? projects.find(p => p.id === currentProjectRun.projectId)
    : null;
  
  // Fetch scaling_unit and item_type directly from database since they may not be in the transformed Project interface
  const [scalingUnit, setScalingUnit] = useState<string>('per item');
  const [itemType, setItemType] = useState<string | null>(null);
  const [templateTypicalProjectSize, setTemplateTypicalProjectSize] = useState<number | null>(null);
  const [templateBudgetPerUnit, setTemplateBudgetPerUnit] = useState<string | null>(null);
  const [templateBudgetPerTypicalSize, setTemplateBudgetPerTypicalSize] = useState<string | null>(null);
  const [templateEstimatedTotalTime, setTemplateEstimatedTotalTime] = useState<string | null>(null);
  const [templateEconomicsLoaded, setTemplateEconomicsLoaded] = useState(false);
  const [kickoffSummaries, setKickoffSummaries] = useState<
    Partial<Record<QualityGoal, string>>
  >({});

  useEffect(() => {
    const hostProjectId = currentProjectRun?.projectId;
    const projectRunId = currentProjectRun?.id;
    if (!hostProjectId && !projectRunId) {
      setKickoffSummaries({});
      return;
    }

    let cancelled = false;
    void loadProjectQualityLevelBundles(hostProjectId ? [hostProjectId] : [], {
      projectRunId,
    })
      .then((bundles) => {
        if (cancelled) return;
        const hostBundle =
          bundles.find((b) => b.projectId === hostProjectId) ?? bundles[0];
        if (!hostBundle) {
          setKickoffSummaries({});
          return;
        }
        const next: Partial<Record<QualityGoal, string>> = {};
        for (const option of QUALITY_GOAL_OPTIONS) {
          const level = levelForGoal(hostBundle, option.value);
          if (level?.kickoff_summary) {
            next[option.value] = level.kickoff_summary;
          }
        }
        setKickoffSummaries(next);
      })
      .catch((error) => {
        console.error('Failed to load kickoff quality summaries:', error);
        if (!cancelled) setKickoffSummaries({});
      });

    return () => {
      cancelled = true;
    };
  }, [currentProjectRun?.projectId, currentProjectRun?.id]);

  useEffect(() => {
    const fetchScalingUnitAndItemType = async () => {
      setTemplateEconomicsLoaded(false);
      const catalogProjectId = templateProject?.id || currentProjectRun?.projectId;

      const applyTemplateFallback = () => {
        const fallbackScalingUnit =
          templateProject?.scalingUnit || (currentProjectRun as any)?.scalingUnit || 'per item';
        const fallbackItemType =
          (templateProject as any)?.itemType || (templateProject as any)?.item_type || null;
        setScalingUnit(fallbackScalingUnit);
        setItemType(fallbackItemType);
        const tps = templateProject?.typicalProjectSize;
        setTemplateTypicalProjectSize(typeof tps === 'number' && tps > 0 ? tps : null);
        setTemplateBudgetPerUnit(null);
        setTemplateBudgetPerTypicalSize(null);
        setTemplateEstimatedTotalTime(
          typeof templateProject?.estimatedTotalTime === 'string'
            ? templateProject.estimatedTotalTime
            : null
        );
      };

      try {
        if (catalogProjectId) {
          try {
            const { data, error } = await supabase
              .from('projects')
              .select(
                'scaling_unit, item_type, typical_project_size, budget_per_unit, budget_per_typical_size, estimated_total_time'
              )
              .eq('id', catalogProjectId)
              .single();

            if (!error && data) {
              const fetchedScalingUnit =
                data.scaling_unit ||
                templateProject?.scalingUnit ||
                (currentProjectRun as any)?.scalingUnit ||
                'per item';
              const fetchedItemType = data.item_type || (data as any).itemType || null;
              setScalingUnit(fetchedScalingUnit);
              setItemType(fetchedItemType);
              const tps = data.typical_project_size;
              setTemplateTypicalProjectSize(typeof tps === 'number' && tps > 0 ? tps : null);
              setTemplateBudgetPerUnit(
                typeof data.budget_per_unit === 'string' ? data.budget_per_unit : null
              );
              setTemplateBudgetPerTypicalSize(
                typeof data.budget_per_typical_size === 'string'
                  ? data.budget_per_typical_size
                  : null
              );
              setTemplateEstimatedTotalTime(
                typeof data.estimated_total_time === 'string' && data.estimated_total_time.trim()
                  ? data.estimated_total_time.trim()
                  : typeof templateProject?.estimatedTotalTime === 'string'
                    ? templateProject.estimatedTotalTime
                    : null
              );
            } else {
              if (error) console.error('❌ Error fetching scaling_unit and item_type:', error);
              applyTemplateFallback();
            }
          } catch (error) {
            console.error('❌ Exception fetching scaling_unit and item_type:', error);
            applyTemplateFallback();
          }
        } else {
          const fallbackScalingUnit = (currentProjectRun as any)?.scalingUnit || 'per item';
          const fallbackItemType =
            (currentProjectRun as any)?.itemType || (currentProjectRun as any)?.item_type || null;
          setScalingUnit(fallbackScalingUnit);
          setItemType(fallbackItemType);
          setTemplateTypicalProjectSize(null);
          setTemplateBudgetPerUnit(null);
          setTemplateBudgetPerTypicalSize(null);
          setTemplateEstimatedTotalTime(null);
        }
      } finally {
        setTemplateEconomicsLoaded(true);
      }
    };

    if (currentProjectRun?.projectId || templateProject?.id) {
      void fetchScalingUnitAndItemType();
    } else {
      const fallbackScalingUnit = (currentProjectRun as any)?.scalingUnit || 'per item';
      const fallbackItemType =
        (currentProjectRun as any)?.itemType || (currentProjectRun as any)?.item_type || null;
      setScalingUnit(fallbackScalingUnit);
      setItemType(fallbackItemType);
      setTemplateTypicalProjectSize(null);
      setTemplateBudgetPerUnit(null);
      setTemplateBudgetPerTypicalSize(null);
      setTemplateEstimatedTotalTime(null);
      setTemplateEconomicsLoaded(true);
    }
  }, [templateProject?.id, currentProjectRun?.projectId, currentProjectRun, projects]);

  useEffect(() => {
    if (user) {
      fetchHomes();
    }

    if (currentProjectRun) {
      const todayStr = new Date().toISOString().split('T')[0];
      const defaultDateString = addDays(todayStr, 30);

      const runSizing = String((currentProjectRun as any).initial_sizing ?? '').trim();
      const runBudget = String((currentProjectRun as any).initial_budget ?? '').trim();
      const runTimeline = (currentProjectRun as any).initial_timeline;
      const runQualityGoal = parseQualityGoalColumn(
        (currentProjectRun as any).initial_quality_goal
      );
      const runInstructionLevel = parseInstructionLevelPreference(
        (currentProjectRun as any).instruction_level_preference,
      );

      const typicalSizing =
        templateEconomicsLoaded &&
        !runSizing &&
        templateTypicalProjectSize != null &&
        templateTypicalProjectSize > 0
          ? String(templateTypicalProjectSize)
          : '';

      const typicalBudget =
        templateEconomicsLoaded && !runBudget
          ? deriveTypicalBudgetString(
              templateBudgetPerTypicalSize,
              templateBudgetPerUnit,
              templateTypicalProjectSize
            )
          : '';

      const applyForm = (instructionLevel: InstructionLevelPreference) => {
        setProjectForm({
          customProjectName: currentProjectRun.customProjectName || currentProjectRun.name || '',
          initialSizing: runSizing || typicalSizing,
          initialTimeline: runTimeline || defaultDateString,
          initialBudget: runBudget || typicalBudget,
          initialQualityGoal: runQualityGoal ?? DEFAULT_QUALITY_GOAL,
          instructionLevelPreference: instructionLevel,
        });
      };

      if (runInstructionLevel) {
        applyForm(runInstructionLevel);
      } else if (user?.id) {
        void supabase
          .from('user_profiles')
          .select('skill_level')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            applyForm(
              instructionLevelFromProfileSkill(data?.skill_level) ??
                DEFAULT_INSTRUCTION_LEVEL,
            );
          });
      } else {
        applyForm(DEFAULT_INSTRUCTION_LEVEL);
      }

      if (currentProjectRun.home_id) {
        setSelectedHomeId(currentProjectRun.home_id);
      }
    }
  }, [
    user,
    currentProjectRun,
    templateEconomicsLoaded,
    templateTypicalProjectSize,
    templateBudgetPerUnit,
    templateBudgetPerTypicalSize,
  ]);

  const applyTypicalProjectGoals = useCallback(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const timeline = addDays(todayStr, 30);
    const sizing =
      templateTypicalProjectSize != null && templateTypicalProjectSize > 0
        ? String(templateTypicalProjectSize)
        : '';
    const budget = deriveTypicalBudgetString(
      templateBudgetPerTypicalSize,
      templateBudgetPerUnit,
      templateTypicalProjectSize
    );
    setProjectForm((prev) => ({
      ...prev,
      initialTimeline: timeline,
      initialSizing: sizing,
      initialBudget: budget,
    }));
  }, [
    templateTypicalProjectSize,
    templateBudgetPerTypicalSize,
    templateBudgetPerUnit,
  ]);

  const fetchHomes = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: homesData, error } = await supabase
        .from('homes')
        .select('id, user_id, name, notes, is_primary, photos, created_at, updated_at, ZIP_code')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      const homeIds = (homesData || []).map((h) => h.id);
      const { data: detailsData } = homeIds.length
        ? await supabase.from('home_details').select('home_id, address, city, state, home_type, build_year').in('home_id', homeIds)
        : { data: [] };
      const detailsByHomeId = new Map((detailsData || []).map((d) => [d.home_id, d]));
      const merged = (homesData || []).map((h) => {
        const d = detailsByHomeId.get(h.id);
        return { ...h, address: d?.address, city: d?.city, state: d?.state, home_type: d?.home_type, build_year: d?.build_year };
      });
      setHomes(merged);
      if (!selectedHomeId) {
        const primaryHome = merged?.find(home => home.is_primary);
        if (primaryHome) {
          setSelectedHomeId(primaryHome.id);
        }
      }
    } catch (error) {
      await reportUserFacingError({
        source: 'kickoff',
        operation: 'load_homes_for_project_profile',
        userId: user.id,
        projectRunId: currentProjectRun?.id,
        error,
        userMessage: 'Failed to load homes.',
        notificationTitle: 'Kickoff homes load failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!currentProjectRun) return;
    
    // REQUIREMENT 4: Only require home selection if user has multiple homes
    if (homes.length > 1 && !selectedHomeId) {
      toast.error('Please select a home for this project');
      return;
    }

    if (!projectForm.customProjectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      // Prepare values for saving
      const budgetValue = projectForm.initialBudget?.trim() || '';
      const finalBudgetValue = budgetValue === '' ? null : budgetValue;
      const sizingValue = projectForm.initialSizing?.trim() || '';
      const finalSizingValue = sizingValue === '' ? null : sizingValue;
      
      // REQUIREMENT 1 & 3: Every account has at least one home; use selection or first loaded row, else load from DB
      if (user) {
        await ensureDefaultHomeForUser(user.id);
      }
      let homeId = selectedHomeId || homes[0]?.id || null;
      if (!homeId && user) {
        const { data: row, error: pickHomeError } = await supabase
          .from('homes')
          .select('id')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (pickHomeError) {
          console.error('Error resolving home:', pickHomeError);
          toast.error('Failed to load your home');
          return;
        }
        homeId = row?.id ?? null;
        if (homeId) {
          setSelectedHomeId(homeId);
          await fetchHomes();
        }
      }

      // REQUIREMENT 3: Don't proceed without a home
      if (!homeId) {
        toast.error('A home is required to start a project. Please create a home first.');
        return;
      }

      // Update project run in database with new fields
      // First update: fields that don't trigger space_sizing creation
      // STEP 1: Update home_id first (must be set before creating spaces)
      if (homeId !== currentProjectRun.home_id) {
        const { error: homeError } = await supabase
          .from('project_runs')
          .update({ home_id: homeId, updated_at: new Date().toISOString() })
          .eq('id', currentProjectRun.id);
        
        if (homeError) throw homeError;
      }

      // STEP 2: Ensure "Room 1" space exists BEFORE saving any initial_sizing data
      // CRITICAL: Room 1 MUST exist before we can save initial_sizing to project_runs
      // because there may be a database trigger that requires a space_id
      const { data: existingSpaces, error: spacesCheckError } = await supabase
        .from('project_run_spaces')
        .select('id, space_name')
        .eq('project_run_id', currentProjectRun.id);

      if (spacesCheckError) {
        console.error('Error checking spaces:', spacesCheckError);
        throw spacesCheckError;
      }

      let room1SpaceId: string | null = null;
      const room1Exists = existingSpaces?.some(space => space.space_name === 'Room 1');

      if (!room1Exists) {
        // REQUIREMENT 5: Create "Room 1" space
        const { data: newSpace, error: spaceCreateError } = await supabase
          .from('project_run_spaces')
          .insert({
            project_run_id: currentProjectRun.id,
            space_name: 'Room 1',
            space_type: 'general',
            is_from_home: false
          })
          .select('id')
          .single();

        if (spaceCreateError) {
          console.error('Error creating Room 1 space:', spaceCreateError);
          throw spaceCreateError;
        }

        room1SpaceId = newSpace.id;
      } else {
        // Find existing Room 1 space
        room1SpaceId = existingSpaces?.find(space => space.space_name === 'Room 1')?.id || null;
      }

      // REQUIREMENT 3: Validate Room 1 exists before proceeding
      if (!room1SpaceId) {
        toast.error('Failed to create Room 1 space. Please try again.');
        return;
      }

      // STEP 3A: First save sizing to space-specific tables
      // CRITICAL: This MUST happen BEFORE saving to project_runs
      // The database trigger on project_runs.initial_sizing requires space records to exist first
      if (finalSizingValue && room1SpaceId) {
        const parsedSizing = parseFloat(finalSizingValue);
        if (!isNaN(parsedSizing) && parsedSizing > 0) {
          const projectScaleUnit = scalingUnit || 'per item';
          
          // Update Room 1 space with sizing (scale_value, scale_unit, sizing_by_unit)
          const { data: room1Row } = await supabase
            .from('project_run_spaces')
            .select('sizing_by_unit')
            .eq('id', room1SpaceId)
            .single();
          const current = (room1Row?.sizing_by_unit as Record<string, number>) || {};
          const sizingByUnit = { ...current, [projectScaleUnit]: parsedSizing };

          const { error: spaceUpdateError } = await supabase
            .from('project_run_spaces')
            .update({
              scale_value: parsedSizing,
              scale_unit: projectScaleUnit,
              sizing_by_unit: sizingByUnit,
              updated_at: new Date().toISOString()
            })
            .eq('id', room1SpaceId);

          if (spaceUpdateError) {
            console.error('❌ Error updating Room 1 sizing:', spaceUpdateError);
            throw spaceUpdateError;
          }
        }
      }
      
      // STEP 3B: NOW save ALL fields to project_runs (including initial_sizing)
      // CRITICAL: Space tables are saved first, so the database trigger can find them
      const mainUpdateData: any = {
        custom_project_name: projectForm.customProjectName.trim(),
        initial_timeline: projectForm.initialTimeline || null,
        initial_budget: finalBudgetValue,
        initial_sizing: finalSizingValue,  // NOW safe to save because space records exist
        initial_quality_goal: projectForm.initialQualityGoal,
        instruction_level_preference: projectForm.instructionLevelPreference,
        updated_at: new Date().toISOString()
      };
      
      const { error: mainError, data: mainUpdateResult } = await supabase
        .from('project_runs')
        .update(mainUpdateData)
        .eq('id', currentProjectRun.id)
        .select('id, initial_budget, custom_project_name, initial_timeline, initial_sizing, initial_quality_goal, instruction_level_preference');

      if (mainError) {
        console.error('❌ ProjectProfileStep: Error saving to project_runs:', mainError);
        throw mainError;
      }

      // CRITICAL: Final verification - fetch the saved values from database
      const { data: verificationData, error: verificationError } = await supabase
        .from('project_runs')
        .select('initial_budget, initial_timeline, initial_sizing, initial_quality_goal, instruction_level_preference')
        .eq('id', currentProjectRun.id)
        .single();
      
      if (!verificationError && verificationData) {
        
        // Check for mismatches
        if (verificationData.initial_budget !== finalBudgetValue) {
          console.error('❌ initial_budget mismatch:', { expected: finalBudgetValue, actual: verificationData.initial_budget });
        }
        // Normalize timeline comparison: database returns ISO timestamp, form has date string
        const expectedTimeline = projectForm.initialTimeline || null;
        const actualTimeline = verificationData.initial_timeline;
        
        // Normalize both values for comparison
        // Extract date part from ISO timestamp if present (handles '2025-12-24T00:00:00+00:00' -> '2025-12-24')
        const normalizeDate = (dateValue: string | Date | null | undefined): string | null => {
          if (!dateValue) return null;
          
          // Handle Date objects
          if (dateValue instanceof Date) {
            const year = dateValue.getFullYear();
            const month = String(dateValue.getMonth() + 1).padStart(2, '0');
            const day = String(dateValue.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          
          // Handle string values
          const dateStr = typeof dateValue === 'string' ? dateValue : String(dateValue);
          
          // Handle ISO timestamp format: extract just the date part before 'T'
          if (dateStr.includes('T')) {
            return dateStr.split('T')[0].trim();
          }
          
          // Handle date strings with timezone offset (e.g., '2025-12-24+00:00')
          if (dateStr.includes('+') && !dateStr.includes('T')) {
            return dateStr.split('+')[0].trim();
          }
          
          // Already a date string, just trim it
          return dateStr.trim();
        };
        
        const normalizedExpected = normalizeDate(expectedTimeline);
        const normalizedActual = normalizeDate(actualTimeline);
        
        // Compare normalized values
        if (normalizedActual !== normalizedExpected) {
          console.error('initial_timeline mismatch:', { 
            expected: expectedTimeline, 
            actual: actualTimeline, 
            normalizedExpected,
            normalizedActual,
            types: {
              expectedType: typeof expectedTimeline,
              actualType: typeof actualTimeline
            }
          });
        }
        if (verificationData.initial_sizing !== finalSizingValue) {
          console.error('❌ initial_sizing mismatch:', { expected: finalSizingValue, actual: verificationData.initial_sizing });
        }
        if (verificationData.initial_quality_goal !== projectForm.initialQualityGoal) {
          console.error('❌ initial_quality_goal mismatch:', {
            expected: projectForm.initialQualityGoal,
            actual: verificationData.initial_quality_goal,
          });
        }
        if (
          verificationData.instruction_level_preference !==
          projectForm.instructionLevelPreference
        ) {
          console.error('❌ instruction_level_preference mismatch:', {
            expected: projectForm.instructionLevelPreference,
            actual: verificationData.instruction_level_preference,
          });
        }
      } else if (verificationError) {
        console.error('❌ ProjectProfileStep: Error verifying saved values:', verificationError);
      }

      // STEP 4: Update context so other components can read these values
      const contextUpdatedRun = {
        ...currentProjectRun,
        customProjectName: projectForm.customProjectName.trim(),
        home_id: homeId,
        initial_budget: finalBudgetValue,
        initial_timeline: projectForm.initialTimeline || null,
        initial_sizing: finalSizingValue,
        initial_quality_goal: projectForm.initialQualityGoal,
        instruction_level_preference: projectForm.instructionLevelPreference,
        updatedAt: new Date()
      };
      
      // Update context (this won't trigger another database save since we already saved above)
      await updateProjectRun(contextUpdatedRun);
            
      // CRITICAL: Don't call onComplete() here - let the parent component (KickoffWorkflow) handle step completion
      // This prevents double-calling handleStepComplete and ensures proper sequencing
      // The parent will call handleStepComplete after this save completes
    } catch (error) {
      await reportUserFacingError({
        source: 'kickoff',
        operation: 'save_project_profile',
        userId: user?.id,
        projectRunId: currentProjectRun.id,
        stepId: 'kickoff-step-3',
        error,
        userMessage: 'Failed to save project profile.',
        notificationTitle: 'Kickoff project profile save failed',
      });
      throw error; // Re-throw so KickoffWorkflow knows the save failed
    }
  }, [currentProjectRun, selectedHomeId, projectForm, homes, updateProjectRun, onComplete, user, scalingUnit, fetchHomes]);

  // Expose handleSave via window for parent component
  useEffect(() => {
    (window as any).__projectProfileStepSave = handleSave;
    return () => {
      delete (window as any).__projectProfileStepSave;
    };
  }, [handleSave]);

  const handleHomeManagerClose = (open: boolean) => {
    if (!open) {
      setShowHomeManager(false);
      // Debounce the homes refresh to prevent rapid re-renders
      setTimeout(() => {
        if (user) {
          fetchHomes();
        }
      }, 100);
    }
  };

  if (!currentProjectRun) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>No project selected</p>
        </CardContent>
      </Card>
    );
  }

  const scalingLabel = getScalingUnitShortLabel(scalingUnit, itemType, templateProject as any);
  const selectedHome = homes.find((h) => h.id === selectedHomeId) ?? homes[0] ?? null;

  const timelineRelativeLabel = (() => {
    if (!projectForm.initialTimeline?.trim()) return null;
    const target = new Date(projectForm.initialTimeline + 'T12:00:00');
    if (Number.isNaN(target.getTime())) return null;
    const today = new Date();
    const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
    const diffDays = Math.round((target.getTime() - todayNoon.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1) return `In ~${diffDays} days`;
    if (diffDays === -1) return 'Yesterday';
    return `${Math.abs(diffDays)} days ago`;
  })();

  const sizeWeekendNote = useMemo(() => {
    const size = parseFloat(projectForm.initialSizing);
    if (!Number.isFinite(size) || size <= 0) return null;
    const typical =
      templateTypicalProjectSize ??
      (typeof templateProject?.typicalProjectSize === 'number'
        ? templateProject.typicalProjectSize
        : null);
    if (typical == null || !(typical > 0)) return null;
    const estimate =
      templateEstimatedTotalTime ??
      (typeof templateProject?.estimatedTotalTime === 'string'
        ? templateProject.estimatedTotalTime
        : null);
    return sizeAwareWeekendNote(size, typical, estimate);
  }, [
    projectForm.initialSizing,
    templateTypicalProjectSize,
    templateEstimatedTotalTime,
    templateProject?.typicalProjectSize,
    templateProject?.estimatedTotalTime,
  ]);

  return (
    <>
      <Card>
        <CardHeader className="p-2 sm:p-3">
          <CardTitle className="font-display text-xl font-semibold leading-tight">
            Goals
            {isCompleted ? (
              <Badge variant="secondary" className="ml-2 align-middle text-xs">
                Complete
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-2 sm:p-3">
          <div className="grid gap-3 rounded-lg border bg-muted/20 px-3 py-3 sm:grid-cols-2">
            <div className="min-w-0">
              <Label htmlFor="goals-project-name" className="mb-1.5 block text-sm font-medium">
                Project name
              </Label>
              <Input
                id="goals-project-name"
                value={projectForm.customProjectName}
                onChange={(e) =>
                  setProjectForm((prev) => ({
                    ...prev,
                    customProjectName: e.target.value,
                  }))
                }
                placeholder="Enter your project name"
                className="h-10"
              />
            </div>

            <div className="min-w-0">
              <Label className="mb-1.5 block text-sm font-medium">Home</Label>
              <div className="flex gap-2">
                {homes.length > 1 ? (
                  <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select a home" />
                    </SelectTrigger>
                    <SelectContent>
                      {homes.map((home) => (
                        <SelectItem key={home.id} value={home.id}>
                          {home.name}
                          {home.is_primary ? ' (primary)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex h-10 min-w-0 flex-1 items-center rounded-md border bg-background px-3 text-sm">
                    <span className="truncate">
                      {selectedHome?.name ?? (loading ? 'Loading…' : 'No home yet')}
                    </span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0 gap-1.5 px-3"
                  onClick={() => setShowHomeManager(true)}
                >
                  {homes.length === 0 ? (
                    <>
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add home</span>
                    </>
                  ) : (
                    <>
                      <Home className="h-4 w-4" />
                      <span className="hidden sm:inline">{homes.length > 1 ? 'Manage' : 'Change'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-foreground">Targets</h3>
              <p className="text-xs text-muted-foreground">You can refine these later</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => applyTypicalProjectGoals()}
            >
              Use typical for this project
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">Size</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">How much work?</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="Decrease by 1"
                  onClick={() => {
                    const n = Math.max(0, (parseFloat(projectForm.initialSizing) || 0) - 1);
                    setProjectForm((prev) => ({ ...prev, initialSizing: String(n) }));
                  }}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={projectForm.initialSizing}
                  onChange={(e) => {
                    setProjectForm((prev) => ({ ...prev, initialSizing: e.target.value }));
                  }}
                  placeholder="0"
                  className="h-10 min-w-0 flex-1 text-center"
                  step="1"
                  min="0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="Increase by 1"
                  onClick={() => {
                    const n = (parseFloat(projectForm.initialSizing) || 0) + 1;
                    setProjectForm((prev) => ({ ...prev, initialSizing: String(n) }));
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {scalingLabel ? (
                <p className="text-center text-xs text-muted-foreground">{scalingLabel}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">Target date</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">When done?</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="Move back one week"
                  onClick={() => {
                    const base = projectForm.initialTimeline || new Date().toISOString().split('T')[0];
                    const next = addWeeks(base, -1);
                    setProjectForm((prev) => ({ ...prev, initialTimeline: next }));
                  }}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="date"
                  value={projectForm.initialTimeline}
                  onChange={(e) => {
                    setProjectForm((prev) => ({ ...prev, initialTimeline: e.target.value }));
                  }}
                  className="h-10 min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="Move forward one week"
                  onClick={() => {
                    const base = projectForm.initialTimeline || new Date().toISOString().split('T')[0];
                    const next = addWeeks(base, 1);
                    setProjectForm((prev) => ({ ...prev, initialTimeline: next }));
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {timelineRelativeLabel ? (
                <p className="text-xs text-muted-foreground">{timelineRelativeLabel}</p>
              ) : null}
              {sizeWeekendNote ? (
                <p className="text-xs text-muted-foreground">{sizeWeekendNote}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">Budget</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Spend up to?</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="Decrease by $100"
                  onClick={() => {
                    const n = Math.max(
                      0,
                      (parseFloat(projectForm.initialBudget.replace(/[^0-9.-]/g, '')) || 0) - 100
                    );
                    setProjectForm((prev) => ({ ...prev, initialBudget: String(n) }));
                  }}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    value={projectForm.initialBudget}
                    onChange={(e) => {
                      setProjectForm((prev) => ({ ...prev, initialBudget: e.target.value }));
                    }}
                    placeholder="0"
                    className="h-10 pl-7 text-center"
                    type="number"
                    step="1"
                    min="0"
                    max="999999"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="Increase by $100"
                  onClick={() => {
                    const n =
                      (parseFloat(projectForm.initialBudget.replace(/[^0-9.-]/g, '')) || 0) + 100;
                    setProjectForm((prev) => ({ ...prev, initialBudget: String(n) }));
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border bg-card p-3">
            <p className="text-sm font-medium leading-none">Quality goal</p>
            <RadioGroup
              value={projectForm.initialQualityGoal}
              onValueChange={(value) => {
                if (!isQualityGoal(value)) return;
                setProjectForm((prev) => ({
                  ...prev,
                  initialQualityGoal: value,
                }));
              }}
              className="grid grid-cols-3 gap-2"
            >
              {QUALITY_GOAL_OPTIONS.map((option) => (
                <Label
                  key={option.value}
                  htmlFor={`kickoff-quality-${option.value}`}
                  className={cn(
                    'flex cursor-pointer items-center justify-center gap-2 rounded-md border px-2 py-2 text-sm font-medium transition-colors',
                    projectForm.initialQualityGoal === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                  )}
                >
                  <RadioGroupItem
                    value={option.value}
                    id={`kickoff-quality-${option.value}`}
                    className="sr-only"
                  />
                  {option.label}
                </Label>
              ))}
            </RadioGroup>
            {QUALITY_GOAL_OPTIONS.some((option) => kickoffSummaries[option.value]) ? (
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {QUALITY_GOAL_OPTIONS.map((option) => {
                  const summary = kickoffSummaries[option.value];
                  if (!summary) return null;
                  return (
                    <li
                      key={option.value}
                      className={cn(
                        'leading-snug',
                        projectForm.initialQualityGoal === option.value &&
                          'font-medium text-foreground',
                      )}
                    >
                      <span className="font-medium">{option.label}: </span>
                      {summary}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <HomeManager
        open={showHomeManager}
        onOpenChange={handleHomeManagerClose}
      />
    </>
  );
};