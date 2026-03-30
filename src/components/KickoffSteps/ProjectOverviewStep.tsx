import React, { useState, useEffect, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle,
  CircleCheckBig,
  Edit3,
  Save,
  X,
  Target,
  XCircle,
  AlertTriangle,
  Eye,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Ban,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProject } from '@/contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalPublicSettings } from '@/hooks/useGlobalPublicSettings';
import { RiskManagementWindow } from '@/components/RiskManagementWindow';
import {
  computeProjectMatchExplanation,
  physicalCapabilityToEffortSegment,
  projectSkillLevelToIndex,
  userSkillLevelToIndex,
  type MatchAxisSentiment,
  type ProjectMatchRecommendationTier,
} from '@/utils/projectMatchRecommendation';

function MatchReasonRow({ axis, text }: { axis: MatchAxisSentiment | null; text: string }) {
  const icon =
    axis === 'positive' ? (
      <CheckCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500"
        aria-hidden
      />
    ) : axis === 'negative' ? (
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-500" aria-hidden />
    ) : (
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500"
        aria-hidden
      />
    );
  const label =
    axis === 'positive'
      ? 'Positive signal'
      : axis === 'negative'
        ? 'Needs attention'
        : axis === 'neutral'
          ? 'Mixed or matched signal'
          : 'Incomplete comparison';
  return (
    <li className="flex gap-2">
      <span className="inline-flex shrink-0" title={label}>
        {icon}
      </span>
      <span className="min-w-0 leading-snug">{text}</span>
    </li>
  );
}

export type { ProjectMatchRecommendationTier } from '@/utils/projectMatchRecommendation';

const MATCH_TIER_COPY: Record<
  ProjectMatchRecommendationTier,
  {
    title: string;
    subtitle: string;
    Icon: LucideIcon;
    cardClass: string;
    iconWrapClass: string;
    titleClass: string;
    subtitleClass: string;
  }
> = {
  not_yet: {
    title: 'Not Yet',
    subtitle: 'Skill or effort signals suggest waiting or more preparation.',
    Icon: Ban,
    cardClass:
      'border-red-200 bg-red-50/60 dark:bg-red-950/25 dark:border-red-900/60',
    iconWrapClass: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
    titleClass: 'text-red-900 dark:text-red-100',
    subtitleClass: 'text-red-800/80 dark:text-red-200/80',
  },
  proceed_mindfully: {
    title: 'Proceed Mindfully',
    subtitle: 'Mixed signals—move forward with clear eyes on risk and scope.',
    Icon: AlertTriangle,
    cardClass:
      'border-amber-200 bg-amber-50/60 dark:bg-amber-950/25 dark:border-amber-900/60',
    iconWrapClass:
      'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    titleClass: 'text-amber-950 dark:text-amber-100',
    subtitleClass: 'text-amber-900/85 dark:text-amber-200/85',
  },
  ready_to_start: {
    title: 'Ready to Start',
    subtitle: 'Skill and effort alignment supports starting this project.',
    Icon: CircleCheckBig,
    cardClass:
      'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/25 dark:border-emerald-900/60',
    iconWrapClass:
      'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    titleClass: 'text-emerald-950 dark:text-emerald-100',
    subtitleClass: 'text-emerald-900/85 dark:text-emerald-200/85',
  },
};

interface ProjectOverviewStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  checkedOutputs?: Set<string>;
  onOutputToggle?: (outputId: string) => void;
  /** `kickoff`: recommendation block + nested "Project details" accordion. `workflow`: details fields only (single accordion lives on the workflow overview page). */
  mode?: 'kickoff' | 'workflow';
}
export const ProjectOverviewStep: React.FC<ProjectOverviewStepProps> = ({
  onComplete,
  isCompleted,
  checkedOutputs = new Set(),
  onOutputToggle,
  mode = 'kickoff',
}) => {
  const {
    currentProjectRun,
    updateProjectRun,
    currentProject,
    deleteProjectRun,
    projects
  } = useProject();
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const { projectCatalogEnabled } = useGlobalPublicSettings();
  const templateProject = currentProject || projects.find(project => project.id === currentProjectRun?.projectId) || null;
  const runDescription = currentProjectRun?.description?.trim();
  const templateDescription = templateProject?.description?.trim();
  const resolvedProjectDescription = runDescription && runDescription.length > 0
    ? runDescription
    : (templateDescription || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: currentProjectRun?.name || '',
    description: resolvedProjectDescription
  });
  const [userProfile, setUserProfile] = useState<{
    skill_level?: string;
    physical_capability?: string;
  } | null>(null);
  const [riskManagementOpen, setRiskManagementOpen] = useState(false);

  // General DIY skill + physical capability from user_profiles.skill_level / physical_capability
  // (Profile manager, DIY survey, onboarding — same fields the recommendation logic uses).
  useEffect(() => {
    if (!user?.id) {
      setUserProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('skill_level, physical_capability')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.error('Error loading user profile:', error);
          return;
        }
        setUserProfile(data || null);
      } catch (error) {
        if (!cancelled) console.error('Error loading user profile:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
 
  // Fetch from database as backup if templateProject doesn't have the fields
  const [fetchedProjectInfo, setFetchedProjectInfo] = useState<{
    skillLevel?: string | null;
    effortLevel?: string | null;
    projectChallenges?: string | null;
    estimatedTime?: string | null;
    estimatedTotalTime?: string | null;
    typicalProjectSize?: number | null;
    scalingUnit?: string | null;
    itemType?: string | null;
    budgetPerUnit?: string | null;
    budgetPerTypicalSize?: string | null;
  } | null>(null);
  
  // Handle both camelCase (from transformed Project interface) and snake_case (from raw database)
  // estimated_total_time is the "Total time for typical project size" field from project info editor
  // Check for both null/undefined and empty string, and handle string trimming
  // Priority: templateProject (transformed) > fetchedProjectInfo (from DB) > currentProjectRun
  const rawEstimatedTotalTime = templateProject?.estimatedTotalTime ?? fetchedProjectInfo?.estimatedTotalTime ?? (templateProject as any)?.estimated_total_time ?? (currentProjectRun as any)?.estimatedTotalTime;
  const displayEstimatedTotalTime = rawEstimatedTotalTime && typeof rawEstimatedTotalTime === 'string' 
    ? (rawEstimatedTotalTime.trim() || null)
    : (rawEstimatedTotalTime || null);
  const rawTypicalProjectSize = templateProject?.typicalProjectSize ?? fetchedProjectInfo?.typicalProjectSize ?? (templateProject as any)?.typical_project_size ?? (currentProjectRun as any)?.typicalProjectSize;
  const displayTypicalProjectSize = rawTypicalProjectSize != null ? rawTypicalProjectSize : null;

  useEffect(() => {
    const fetchProjectInfo = async () => {
      if (templateProject && templateProject.id) {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('skill_level, effort_level, project_challenges, estimated_time, estimated_total_time, typical_project_size, scaling_unit, item_type, budget_per_unit, budget_per_typical_size')
            .eq('id', templateProject.id)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching project info:', error);
            return;
          }
          
          if (data) {
            setFetchedProjectInfo({
              skillLevel: data.skill_level,
              effortLevel: data.effort_level,
              projectChallenges: data.project_challenges,
              estimatedTime: data.estimated_time,
              estimatedTotalTime: data.estimated_total_time,
              typicalProjectSize: data.typical_project_size,
              scalingUnit: data.scaling_unit,
              itemType: data.item_type,
              budgetPerUnit: data.budget_per_unit,
              budgetPerTypicalSize: data.budget_per_typical_size
            });
          }
        } catch (error) {
          console.error('Error fetching project info:', error);
        }
      }
    };
    
    fetchProjectInfo();
  }, [templateProject?.id]);

  // Use templateProject fields first (already transformed), then fetched info, then currentProjectRun
  const displayScalingUnit = templateProject?.scalingUnit ?? fetchedProjectInfo?.scalingUnit ?? (currentProjectRun as any)?.scalingUnit;
  const displayProjectChallenges = templateProject?.projectChallenges ?? fetchedProjectInfo?.projectChallenges ?? (currentProjectRun as any)?.projectChallenges;
  const displaySkillLevel = templateProject?.skillLevel ?? fetchedProjectInfo?.skillLevel ?? (currentProjectRun as any)?.skillLevel;
  const displayEstimatedTime = templateProject?.estimatedTime ?? fetchedProjectInfo?.estimatedTime ?? (currentProjectRun as any)?.estimatedTime;
  const displayEffortLevel = templateProject?.effortLevel ?? fetchedProjectInfo?.effortLevel ?? (currentProjectRun as any)?.effortLevel;

  const matchExplanation = useMemo(
    () =>
      mode === 'kickoff' && currentProjectRun
        ? computeProjectMatchExplanation({
            projectSkillLevel: displaySkillLevel,
            userSkillLevel: userProfile?.skill_level,
            projectEffortLevel: displayEffortLevel,
            userPhysicalCapability: userProfile?.physical_capability,
            projectChallengesText: displayProjectChallenges,
          })
        : null,
    [
      mode,
      currentProjectRun?.id,
      displaySkillLevel,
      userProfile?.skill_level,
      displayEffortLevel,
      userProfile?.physical_capability,
      displayProjectChallenges,
    ]
  );

  // Budget fields - handle both camelCase and snake_case
  const rawBudgetPerUnit = (templateProject as any)?.budgetPerUnit ?? (templateProject as any)?.budget_perUnit ?? fetchedProjectInfo?.budgetPerUnit ?? (currentProjectRun as any)?.budgetPerUnit ?? (currentProjectRun as any)?.budget_perUnit;
  const displayBudgetPerUnit = rawBudgetPerUnit && typeof rawBudgetPerUnit === 'string' 
    ? (rawBudgetPerUnit.trim() || null)
    : (rawBudgetPerUnit || null);
  
  const rawBudgetPerTypicalSize = (templateProject as any)?.budgetPerTypicalSize ?? (templateProject as any)?.budget_perTypicalsize ?? fetchedProjectInfo?.budgetPerTypicalSize ?? (currentProjectRun as any)?.budgetPerTypicalSize ?? (currentProjectRun as any)?.budget_perTypicalsize;
  const displayBudgetPerTypicalSize = rawBudgetPerTypicalSize && typeof rawBudgetPerTypicalSize === 'string' 
    ? (rawBudgetPerTypicalSize.trim() || null)
    : (rawBudgetPerTypicalSize || null);
  
  // Debug logging to help diagnose missing fields
  useEffect(() => {
    console.log('📊 ProjectOverviewStep - Display Values:', {
      hasTemplateProject: !!templateProject,
      templateProjectId: templateProject?.id,
      templateProjectName: templateProject?.name,
      displaySkillLevel,
      templateSkillLevel: templateProject?.skillLevel,
      displayEffortLevel,
      templateEffortLevel: templateProject?.effortLevel,
      displayProjectChallenges,
      templateProjectChallenges: templateProject?.projectChallenges,
      // All 4 estimated time fields
      displayEstimatedTime, // Field 1: Estimated time per unit
      displayScalingUnit, // Field 2: Unit (scaling unit)
      displayEstimatedTotalTime, // Field 3: Total time per typical size
      displayTypicalProjectSize, // Field 4: Typical project size (number of units)
      templateEstimatedTime: templateProject?.estimatedTime,
      templateEstimatedTotalTime: templateProject?.estimatedTotalTime,
      templateTypicalProjectSize: templateProject?.typicalProjectSize,
      templateScalingUnit: templateProject?.scalingUnit,
      fetchedProjectInfo,
      currentProjectRunEstimatedTime: (currentProjectRun as any)?.estimatedTime
    });
  }, [templateProject, displaySkillLevel, displayEffortLevel, displayProjectChallenges, displayEstimatedTime, displayScalingUnit, displayEstimatedTotalTime, displayTypicalProjectSize, fetchedProjectInfo, currentProjectRun]);

  // Helper function to get position index for slider (0, 1, or 2)
  const getLevelPosition = (level: string | null | undefined, levels: string[]): number => {
    if (!level) return -1;
    const normalized = level.toLowerCase();
    const index = levels.findIndex(l => l.toLowerCase() === normalized);
    return index >= 0 ? index : -1;
  };

  // Helper function to render 3-step slider
  /** Map profile physical_capability to 0–2 for the Low/Medium/High track (same scale as recommendation logic). */
  const getPhysicalCapabilitySegmentIndex = (cap: string | null | undefined): number =>
    physicalCapabilityToEffortSegment(cap) ?? -1;

  const renderLevelSlider = (
    currentLevel: string | null | undefined,
    levels: string[],
    labels: string[],
    userLevel?: string | null,
    comparison?: { type: string; message: string } | null,
    /** When set (0–2), positions the “Your level” arrow on that segment (e.g. physical_capability vs Low/Medium/High). */
    userLevelSegmentOverride?: number | null
  ) => {
    const rawProjectPos = getLevelPosition(currentLevel, levels);
    const position =
      rawProjectPos >= 0
        ? rawProjectPos
        : (() => {
            const pi = projectSkillLevelToIndex(currentLevel);
            if (pi === null) return -1;
            const maxSeg = Math.max(0, levels.length - 1);
            return Math.min(pi, maxSeg);
          })();
    const hasValue = position >= 0;

    // Map position to center of section: 0 -> 16.66%, 1 -> 50%, 2 -> 83.33%
    const getArrowPosition = (pos: number): number => {
      if (pos === 0) return 16.66; // Center of first section (0-33.33%)
      if (pos === 1) return 50;    // Center of middle section (33.33-66.66%)
      if (pos === 2) return 83.33; // Center of third section (66.66-100%)
      return 50; // Default to middle
    };

    // Use the same canonical scale as computeProjectMatchExplanation / userSkillLevelToIndex so
    // profile values (newbie | confident | hero from survey, Beginner | … from onboarding) align
    // with the three-track UI (clamp professional → advanced segment).
    const userLevelIndex =
      userLevelSegmentOverride !== undefined && userLevelSegmentOverride !== null && userLevelSegmentOverride >= 0
        ? userLevelSegmentOverride
        : userLevel
          ? (() => {
              const idx = userSkillLevelToIndex(userLevel);
              if (idx === null) return -1;
              const maxSeg = Math.max(0, levels.length - 1);
              return Math.min(idx, maxSeg);
            })()
          : -1;

    return (
      <div className="mt-2 relative pt-1 pb-1 min-h-[52px]">
        {/* Slider track with colored sections */}
        <div className="relative h-6 rounded-full flex items-center overflow-hidden">
          {/* Color blocks background - green, blue, black */}
          <div className="absolute inset-0 flex">
            <div className="w-1/3 bg-green-500"></div>
            <div className="w-1/3 bg-blue-500"></div>
            <div className="w-1/3 bg-black"></div>
          </div>
          {/* Three segments with labels */}
          {levels.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-full flex items-center justify-center border-r last:border-r-0 border-border/50 relative z-10"
            >
              <span className="text-[9px] text-white font-medium px-0.5 text-center drop-shadow-sm leading-tight">
                {labels[index]}
              </span>
            </div>
          ))}
        </div>
        
        {/* Arrow indicators for project and user levels */}
        {hasValue && (
          <div>
            {/* This project: arrow above label, arrow nearly touching the bar */}
            <div
              className="absolute top-7 left-0 flex flex-col items-center justify-center gap-0 transition-all duration-200 z-10 -mt-px pointer-events-none"
              style={{
                left: `${getArrowPosition(position)}%`,
                transform: 'translateX(-50%)'
              }}
            >
              <ArrowUp className="w-3.5 h-3.5 text-foreground drop-shadow-sm shrink-0" />
              <span className="text-[9px] text-muted-foreground whitespace-nowrap leading-tight">
                This project
              </span>
            </div>

            {/* Your level: label above arrow, arrow tight to bar */}
            {userLevelIndex >= 0 && (
              <div
                className="absolute bottom-full left-0 flex flex-col items-center justify-center gap-0 transition-all duration-200 z-10 mb-px pointer-events-none"
                style={{
                  left: `${getArrowPosition(userLevelIndex)}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                <span className="text-[9px] text-muted-foreground whitespace-nowrap leading-tight">
                  Your level
                </span>
                <ArrowDown className="w-3.5 h-3.5 text-foreground drop-shadow-sm shrink-0" />
              </div>
            )}
          </div>
        )}
        
        {!hasValue && (
          <p className="text-xs text-muted-foreground mt-1 text-center">Not specified</p>
        )}
        {/* Mismatch / caution only (no green "your level matches" row) */}
        {userLevel && comparison && comparison.type !== 'success' && (
          <div className="mt-2 flex items-center gap-1.5">
            {comparison.type === 'error' && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
            {comparison.type === 'warning' && <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
            <span className={`text-xs ${comparison.type === 'error' ? 'text-red-600' : 'text-yellow-600'}`}>
              {comparison.message}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Helper function to get skill level comparison
  const getSkillLevelComparison = () => {
    const projectIndex = projectSkillLevelToIndex(displaySkillLevel);
    const userIndex = userSkillLevelToIndex(userProfile?.skill_level);
    if (projectIndex === null || userIndex === null) return null;
    if (userIndex >= projectIndex) {
      return {
        type: 'success',
        message: 'Your skill level matches or exceeds the project requirements.'
      };
    }
    if (projectIndex === 1 && userIndex === 0) {
      return {
        type: 'warning',
        message:
          'This project requires intermediate skills, but your skill level is beginner. Consider getting help or additional guidance.'
      };
    }
    if (projectIndex >= 2 && userIndex < projectIndex) {
      return {
        type: 'error',
        message:
          'This project requires advanced skills, but your skill level is below this. This project may be too challenging without significant experience or professional help.'
      };
    }
    return null;
  };

  // Helper function to get effort level comparison
  // Note: Using physical_capability as a proxy for effort level since user profile doesn't have effort_level
  const getEffortLevelComparison = () => {
    const projectEffort = (displayEffortLevel || '').toLowerCase();
    if (!projectEffort) return null;

    const effortLevels = ['low', 'medium', 'high'];
    const projectIndex = effortLevels.indexOf(projectEffort);
    const userSeg = physicalCapabilityToEffortSegment(userProfile?.physical_capability);
    if (projectIndex === -1 || userSeg === null) return null;
    const userIndex = userSeg;

    // Adjust comparison logic based on effort vs capability mapping
    if (userIndex >= projectIndex) {
      return {
        type: 'success',
        message: 'Your physical capability matches or exceeds the project effort requirements.'
      };
    } else if (projectEffort === 'medium' && userIndex < 1) {
      return {
        type: 'warning',
        message: 'This project requires medium effort, but your physical capability may be limited. Consider the physical demands before proceeding.'
      };
    } else if (projectEffort === 'high' && userIndex < 2) {
      return {
        type: 'error',
        message: 'This project requires high effort, but your physical capability may not be sufficient. This project may be too physically demanding.'
      };
    }
    return null;
  };

  // Helper function to parse categories (handles JSON strings and removes {} and "")
  const parseCategories = (categories: any): string[] => {
    if (!categories) return [];

    // If it's already an array, return unique values
    if (Array.isArray(categories)) {
      return Array.from(new Set(categories.filter(Boolean)));
    }

    // If it's a string, try to parse as JSON first
    if (typeof categories === 'string') {
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(categories);
        if (Array.isArray(parsed)) {
          return Array.from(new Set(parsed.filter(Boolean)));
        }
        // If parsed but not array, return as single item
        return [String(parsed)].filter(Boolean);
      } catch {
        // Not JSON, treat as comma-separated string
        const split = categories.split(',').map((c: string) => c.trim()).filter(Boolean);
        // Remove any JSON-like artifacts (quotes, braces)
        const cleaned = split.map(cat => cat.replace(/["']/g, '').replace(/^\{|\}$/g, '').trim()).filter(Boolean);
        return Array.from(new Set(cleaned));
      }
    }

    // For any other type, convert to string and clean
    const str = String(categories);
    const cleaned = str.replace(/["']/g, '').replace(/^\{|\}$/g, '').trim();
    return cleaned ? [cleaned] : [];
  };

  // CRITICAL FIX: Delete project instead of just marking cancelled
  // This ensures cancelled projects don't appear in stats or get reopened
  const handleCancelProject = async () => {
    if (!currentProjectRun) return;
    try {
      // Delete the project run entirely from database
      deleteProjectRun(currentProjectRun.id);
      toast.success('Project removed');
      if (projectCatalogEnabled) {
        navigate('/projects');
      } else {
        navigate('/', { state: { view: 'user' } });
      }
    } catch (error) {
      console.error('Error removing project:', error);
      toast.error('Failed to remove project');
    }
  };
  const handleSave = async () => {
    if (!currentProjectRun) return;
    await updateProjectRun({
      ...currentProjectRun,
      name: editForm.name,
      description: editForm.description,
      updatedAt: new Date()
    });
    setIsEditing(false);
  };
  const handleCancel = () => {
    setEditForm({
      name: currentProjectRun?.name || '',
      description: resolvedProjectDescription
    });
    setIsEditing(false);
  };
  if (!currentProjectRun) {
    return <div>No project selected</div>;
  }
  const skillComparison = getSkillLevelComparison();
  const effortComparison = getEffortLevelComparison();
  const categories = parseCategories(currentProjectRun?.category || templateProject?.category);
  
  // Format scaling unit, using item_type if scaling unit is "per item"
  // Priority: templateProject > fetchedProjectInfo > currentProjectRun
  const itemType = (templateProject as any)?.item_type ?? (templateProject as any)?.itemType ?? fetchedProjectInfo?.itemType ?? (currentProjectRun as any)?.itemType;

  const formattedScalingUnit = displayScalingUnit ? (() => {
    const scalingUnitToUse = displayScalingUnit;
    const normalizedScalingUnit = scalingUnitToUse.toLowerCase().trim();
    
    // If scaling unit is "per item" and we have an item_type, use the item_type
    if (normalizedScalingUnit === 'per item') {
      if (itemType && typeof itemType === 'string' && itemType.trim().length > 0) {
        const displayValue = itemType.trim().toLowerCase();
        return displayValue;
      }
      return 'item';
    }
    
    // Remove "per " prefix if present, return lowercase unit
    return normalizedScalingUnit.startsWith('per ') ? normalizedScalingUnit.replace('per ', '') : normalizedScalingUnit;
  })() : null;

  const projectDetailsFields = (
    <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <Label className="text-xs">Description</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{resolvedProjectDescription || 'No description provided'}</p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <div className="flex items-center gap-1">
                  <Label className="text-xs">Project Challenges</Label>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="p-0 border-0 bg-transparent cursor-help hover:opacity-70 transition-opacity focus:outline-none" aria-label="What are project challenges?">
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs z-50" side="top">
                        <p className="text-sm">Known difficulties or risks for this project — for example, access, materials, or skill demands. Use these to plan ahead.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRiskManagementOpen(true)}
                  className="h-6 px-2 text-[10px] bg-muted/50 hover:bg-muted border-muted"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  See All Potential Challenges
                </Button>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-line mt-0.5">
                {displayProjectChallenges || 'None specified'}
              </p>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t">
            <div className="mb-2">
              <Label className="text-xs">Category</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {categories.length > 0 ? categories.map((cat, idx) => <Badge key={idx} variant="outline" className="text-xs">
                      {cat}
                    </Badge>) : <Badge variant="outline" className="text-xs">Not specified</Badge>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Left Column */}
              <div>
                <div className="flex items-center gap-1 mb-0">
                  <Label className="text-xs">Project Skill Level</Label>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="p-0 border-0 bg-transparent cursor-help hover:opacity-70 transition-opacity focus:outline-none">
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm z-50" side="top">
                        <p className="text-sm">
                          <strong>Skill level</strong> — technical expertise required:
                        </p>
                        <ul className="text-xs mt-1 space-y-0.5 list-disc pl-4">
                          <li><strong>Beginner:</strong> Basic tools, follow-along (e.g. assemble furniture, paint a wall)</li>
                          <li><strong>Intermediate:</strong> Some experience (e.g. install trim, replace a fixture)</li>
                          <li><strong>Advanced:</strong> Trade-level (e.g. electrical, plumbing, complex layout)</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {renderLevelSlider(displaySkillLevel, ['Beginner', 'Intermediate', 'Advanced'], ['Beginner', 'Intermediate', 'Advanced'], userProfile?.skill_level, skillComparison)}
              </div>

              {/* Right Column */}
              <div>
                <Label className="text-xs">Estimated Budget</Label>
                <div className="mt-1 space-y-1">
                  {/* Line 1: Budget per unit + unit */}
                  {displayBudgetPerUnit && formattedScalingUnit ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {displayBudgetPerUnit.startsWith('$') ? displayBudgetPerUnit : `$${displayBudgetPerUnit}`}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">per</span>
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {formattedScalingUnit}
                      </Badge>
                    </div>
                  ) : null}
                  
                  {/* Line 2: Budget per typical project size */}
                  {displayBudgetPerTypicalSize && displayTypicalProjectSize && formattedScalingUnit ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {displayBudgetPerTypicalSize.startsWith('$') ? displayBudgetPerTypicalSize : `$${displayBudgetPerTypicalSize}`}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">per</span>
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {displayTypicalProjectSize} {formattedScalingUnit}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">typical project size</span>
                    </div>
                  ) : null}
                  
                  {!displayBudgetPerUnit && !displayBudgetPerTypicalSize && (
                    <span className="text-xs sm:text-sm text-muted-foreground">Not specified</span>
                  )}
                </div>
              </div>

              {/* Left Column - Second Row */}
              <div>
                <div className="flex items-center gap-1 mb-0">
                  <Label className="text-xs">Project Effort Level</Label>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="p-0 border-0 bg-transparent cursor-help hover:opacity-70 transition-opacity focus:outline-none">
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm z-50" side="top">
                        <p className="text-sm">
                          <strong>Effort level</strong> — physical intensity and duration:
                        </p>
                        <ul className="text-xs mt-1 space-y-0.5 list-disc pl-4">
                          <li><strong>Low:</strong> Light effort (e.g. painting a room for a few hours)</li>
                          <li><strong>Medium:</strong> Moderate lifting and duration (e.g. carrying loads, demo for several hours)</li>
                          <li><strong>High:</strong> Heavy or sustained effort (e.g. heavy materials, mixing and moving loads for extended periods)</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {renderLevelSlider(
                  displayEffortLevel,
                  ['Low', 'Medium', 'High'],
                  ['Low', 'Medium', 'High'],
                  userProfile?.physical_capability,
                  effortComparison,
                  getPhysicalCapabilitySegmentIndex(userProfile?.physical_capability)
                )}
              </div>

              {/* Right Column - Second Row */}
              <div>
                <Label className="text-xs">Estimated Time</Label>
                <div className="mt-1 space-y-1">
                  {/* Line 1: Estimated time per unit + unit */}
                  {displayEstimatedTime && formattedScalingUnit ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {displayEstimatedTime}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">per</span>
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {formattedScalingUnit}
                      </Badge>
                    </div>
                  ) : null}
                  
                  {/* Line 2: Total time + typical project size */}
                  {displayEstimatedTotalTime && displayTypicalProjectSize && formattedScalingUnit ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {displayEstimatedTotalTime}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">per</span>
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {displayTypicalProjectSize} {formattedScalingUnit}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">typical project size</span>
                    </div>
                  ) : null}
                  
                  {!displayEstimatedTime && !displayEstimatedTotalTime && (
                    <span className="text-xs sm:text-sm text-muted-foreground">Not specified</span>
                  )}
                </div>
              </div>
            </div>
          </div>
    </>
  );

  if (mode === 'workflow') {
    return (
      <div className="space-y-3">
        {projectDetailsFields}
        {templateProject && (
          <RiskManagementWindow
            open={riskManagementOpen}
            onOpenChange={setRiskManagementOpen}
            projectId={templateProject.id}
            mode="template"
            readOnly={true}
          />
        )}
      </div>
    );
  }

  if (!matchExplanation) {
    return <div>No project selected</div>;
  }

  const tierVisual = MATCH_TIER_COPY[matchExplanation.tier];
  const TierIcon = tierVisual.Icon;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-2 sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              Project Match: {currentProjectRun.name}
              {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-2 sm:space-y-3 sm:p-3">
          <div className="space-y-0.5">
            <Label className="text-[10px] sm:text-xs">Description</Label>
            <p className="text-xs text-muted-foreground leading-snug whitespace-pre-line sm:text-sm">
              {resolvedProjectDescription || 'No description provided'}
            </p>
          </div>

          <section className="space-y-2 sm:space-y-3" aria-label="Project fit recommendation">
            <h2 className="text-center text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Recommendation
            </h2>
            <div className="flex w-full justify-center">
              <div
                className={`flex w-full max-w-md flex-col items-center gap-2 rounded-lg border-2 px-3 py-3 text-center shadow-sm sm:gap-2.5 sm:rounded-xl sm:px-4 sm:py-4 ${tierVisual.cardClass}`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full sm:h-12 sm:w-12 ${tierVisual.iconWrapClass}`}
                  aria-hidden
                >
                  <TierIcon className="h-6 w-6 stroke-[2.5] sm:h-7 sm:w-7" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className={`text-sm font-semibold leading-snug sm:text-base ${tierVisual.titleClass}`}>
                    {tierVisual.title}
                  </p>
                  <p className={`text-[11px] leading-snug sm:text-xs ${tierVisual.subtitleClass}`}>
                    {tierVisual.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/20 px-2.5 py-2 text-left sm:space-y-2.5 sm:px-3 sm:py-3">
              <h3 className="text-xs font-semibold text-foreground sm:text-sm">Summary</h3>
              <p className="text-xs leading-snug text-foreground sm:text-sm sm:leading-relaxed">{matchExplanation.summary}</p>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
                  Project challenges
                </p>
                <p className="text-xs leading-snug text-muted-foreground whitespace-pre-line sm:text-sm sm:leading-relaxed">
                  {matchExplanation.challengesParagraph}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
                  Why this recommendation
                </p>
                <ul className="list-none space-y-1.5 pl-0 text-xs text-muted-foreground sm:space-y-2 sm:text-sm">
                  <MatchReasonRow axis={matchExplanation.skillAxis} text={matchExplanation.reasonSkill} />
                  <MatchReasonRow axis={matchExplanation.effortAxis} text={matchExplanation.reasonEffort} />
                </ul>
              </div>
            </div>
          </section>

          <Accordion type="single" collapsible className="w-full rounded-lg border bg-muted/20 px-1.5 sm:px-2">
            <AccordionItem value="project-details" className="border-none">
              <AccordionTrigger className="py-2 text-xs font-semibold hover:no-underline sm:py-2.5 sm:text-sm">
                More Project Details
              </AccordionTrigger>
              <AccordionContent className="pb-2 pt-0 sm:pb-3">{projectDetailsFields}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {templateProject && (
        <RiskManagementWindow
          open={riskManagementOpen}
          onOpenChange={setRiskManagementOpen}
          projectId={templateProject.id}
          mode="template"
          readOnly={true}
        />
      )}
    </div>
  );
};