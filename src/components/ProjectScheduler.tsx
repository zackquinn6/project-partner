import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SchedulerWizard } from './Scheduler/SchedulerWizard';
import { ScheduleOutputView } from './Scheduler/ScheduleOutputView';
import { SchedulePreset } from './Scheduler/QuickSchedulePresets';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Clock, CheckCircle, Plus, Users, Settings, Zap, Trash2, Save, X, Target, AlertTriangle, TrendingUp, Brain, FileText, Mail, Printer, Info, Layers } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, addDays, parseISO, addHours, isSameDay } from 'date-fns';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { useResponsive } from '@/hooks/useResponsive';
import { schedulingEngine } from '@/utils/schedulingEngine';
import { SchedulingInputs, SchedulingResult, Task, Worker, PlanningMode, ScheduleTempo, RemediationSuggestion } from '@/interfaces/Scheduling';
import { supabase } from '@/integrations/supabase/client';
import { PhaseAssignment } from '@/components/PhaseAssignment';
import { ProjectTeamAvailability } from '@/components/ProjectTeamAvailability';
import { ProjectContractors } from '@/components/ProjectContractors';
import { useAuth } from '@/contexts/AuthContext';
interface ProjectSchedulerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  projectRun: ProjectRun;
}
interface TeamMember {
  id: string;
  name: string;
  type: 'owner' | 'helper';
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional'; // Project skill levels
  effortLevel: 'Low' | 'Medium' | 'High'; // Effort level
  maxTotalHours: number;
  weekendsOnly: boolean;
  weekdaysAfterFivePm: boolean;
  workingHours: {
    start: string;
    end: string;
  };
  availability: {
    [date: string]: {
      start: string;
      end: string;
      available: boolean;
    }[];
  };
  costPerHour?: number;
  email?: string;
  phone?: string;
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
  };
  // Database fields
  dbId?: string; // ID from user_team_members table
}
interface GlobalSettings {
  quietHours: {
    start: string;
    end: string;
  };
}
const planningModes: {
  mode: PlanningMode;
  name: string;
  description: string;
}[] = [{
  mode: 'quick',
  name: 'Quick',
  description: 'Plan phases / major milestones'
}, {
  mode: 'standard',
  name: 'Standard',
  description: 'Plan daily tasks (recommended)'
}, {
  mode: 'detailed',
  name: 'Detailed',
  description: 'Plan hour-by-hour tasks for each team member'
}];
export const ProjectScheduler: React.FC<ProjectSchedulerProps> = ({
  open,
  onOpenChange,
  project,
  projectRun
}) => {
  const {
    updateProjectRun
  } = useProject();
  const {
    toast
  } = useToast();
  const {
    isMobile
  } = useResponsive();
  const { user } = useAuth();

  // Phase assignment dialog state
  const [showPhaseAssignment, setShowPhaseAssignment] = useState(false);
  // Team availability dialog state
  const [showTeamAvailability, setShowTeamAvailability] = useState(false);

  // Space priority state with sizing values
  const [spaces, setSpaces] = useState<Array<{ 
    id: string; 
    name: string; 
    priority: number | null;
    scaleValue?: number | null;
    scaleUnit?: string | null;
    sizingValues?: Record<string, number>;
  }>>([]);
  
  // Completion priority state
  const [completionPriority, setCompletionPriority] = useState<'agile' | 'waterfall'>(
    (projectRun?.completion_priority as 'agile' | 'waterfall') || 'agile'
  );

  // Enhanced scheduling state
  const [planningMode, setPlanningMode] = useState<PlanningMode>('standard');
  const [scheduleTempo, setScheduleTempo] = useState<ScheduleTempo>('steady');
  const [schedulingResult, setSchedulingResult] = useState<SchedulingResult | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  
  // Initialize target date from project kickoff goal, or default to 30 days
  // Use lazy initializer to avoid "Cannot access before initialization" error
  const [targetDate, setTargetDate] = useState<string>(() => {
    if (projectRun?.initial_timeline) {
      try {
        const goalDate = new Date(projectRun.initial_timeline);
        if (!isNaN(goalDate.getTime())) {
          return format(goalDate, 'yyyy-MM-dd');
        }
      } catch (e) {
        console.error('Error parsing initial_timeline:', e);
      }
    }
    return format(addDays(new Date(), 30), 'yyyy-MM-dd');
  });
  const [dropDeadDate, setDropDeadDate] = useState<string>(() => format(addDays(new Date(), 45), 'yyyy-MM-dd'));

  // Update target date when projectRun changes or dialog opens
  useEffect(() => {
    if (open && projectRun?.initial_timeline) {
      try {
        const goalDate = new Date(projectRun.initial_timeline);
        if (!isNaN(goalDate.getTime())) {
          const formattedDate = format(goalDate, 'yyyy-MM-dd');
          console.log('📅 ProjectScheduler: Setting target date from initial_timeline:', {
            initial_timeline: projectRun.initial_timeline,
            formattedDate,
            goalDate: goalDate.toISOString()
          });
          setTargetDate(formattedDate);
        }
      } catch (e) {
        console.error('Error parsing initial_timeline:', e);
      }
    }
  }, [open, projectRun?.initial_timeline]);

  // Team management
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([{
    id: '1',
    name: 'You',
    type: 'owner',
    skillLevel: 'Intermediate',
    effortLevel: 'Medium',
    maxTotalHours: 120,
    weekendsOnly: false,
    weekdaysAfterFivePm: false,
    workingHours: {
      start: '09:00',
      end: '17:00'
    },
    availability: {},
    costPerHour: 0,
    email: '',
    phone: '',
    notificationPreferences: {
      email: false,
      sms: false
    }
  }]);

  // Contractors dialog state
  const [showContractors, setShowContractors] = useState(false);

  // Global settings
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    quietHours: {
      start: '21:00',
      end: '07:00'
    }
  });

  // Load saved schedule data from database on mount
  useEffect(() => {
    if (!open || !projectRun?.schedule_events) return;
    const savedData = projectRun.schedule_events;
    if (savedData.teamMembers && Array.isArray(savedData.teamMembers) && savedData.teamMembers.length > 0) {
      const mergedTeamMembers = savedData.teamMembers.map((member: any) => ({
        id: member.id || '1',
        name: member.name || 'You',
        type: (member.type || 'helper') as 'owner' | 'helper',
        skillLevel: (member.skillLevel || 'intermediate') as 'novice' | 'intermediate' | 'expert',
        maxTotalHours: member.maxTotalHours || 40,
        weekendsOnly: member.weekendsOnly || false,
        weekdaysAfterFivePm: member.weekdaysAfterFivePm || false,
        workingHours: member.workingHours || {
          start: '09:00',
          end: '17:00'
        },
        availability: member.availability || {},
        costPerHour: member.costPerHour || 0,
        email: member.email || '',
        phone: member.phone || '',
        notificationPreferences: member.notificationPreferences || {
          email: false,
          sms: false
        }
      })) as TeamMember[];
      setTeamMembers(mergedTeamMembers);
    }
    if (savedData.globalSettings?.quietHours) {
      setGlobalSettings({
        quietHours: savedData.globalSettings.quietHours
      });
    }
    // Load completion priority from project run
    if (projectRun?.completion_priority) {
      setCompletionPriority(projectRun.completion_priority as 'agile' | 'waterfall');
    }
  }, [open, projectRun]);

  // Calendar popup state
  const [calendarOpen, setCalendarOpen] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [tempAvailability, setTempAvailability] = useState<{
    [date: string]: {
      start: string;
      end: string;
      available: boolean;
    }[];
  }>({});

  // Load spaces with priority and sizing values when scheduler opens
  useEffect(() => {
    if (!open || !projectRun?.id) return;

    const loadSpaces = async () => {
      try {
        // Load spaces
        const { data: spacesData, error: spacesError } = await supabase
          .from('project_run_spaces')
          .select('id, space_name, priority, scale_value, scale_unit')
          .eq('project_run_id', projectRun.id)
          .order('priority', { ascending: true, nullsLast: true });

        if (spacesError) throw spacesError;

        // Load sizing values from relational table
        const spaceIds = (spacesData || []).map(s => s.id);
        const { data: sizingData, error: sizingError } = await supabase
          .from('project_run_space_sizing')
          .select('space_id, scaling_unit, size_value')
          .in('space_id', spaceIds);

        if (sizingError) throw sizingError;

        // Build sizing map from relational data
        const sizingMap = new Map<string, Record<string, number>>();
        (sizingData || []).forEach(sizing => {
          if (!sizingMap.has(sizing.space_id)) {
            sizingMap.set(sizing.space_id, {});
          }
          sizingMap.get(sizing.space_id)![sizing.scaling_unit] = sizing.size_value;
        });

        // Also include legacy scale_value/scale_unit for backward compatibility
        setSpaces((spacesData || []).map(space => {
          const relationalSizing = sizingMap.get(space.id) || {};
          // Merge with legacy columns if relational data is empty
          if (Object.keys(relationalSizing).length === 0 && space.scale_value && space.scale_unit) {
            relationalSizing[space.scale_unit] = space.scale_value;
          }
          return {
            id: space.id,
            name: space.space_name,
            priority: space.priority,
            scaleValue: space.scale_value,
            scaleUnit: space.scale_unit,
            sizingValues: relationalSizing
          };
        }));
      } catch (error) {
        console.error('Error loading spaces for scheduler:', error);
        setSpaces([]);
      }
    };

    loadSpaces();
  }, [open, projectRun?.id]);

  // Convert project to scheduling tasks and calculate totals
  // Tasks are sorted by space priority when multiple spaces exist
  // Uses estimated times from customized project workflow (applicable phases only)
  const {
    schedulingTasks,
    projectTotals
  } = useMemo(() => {
    const tasks: Task[] = [];
    let lowTotal = 0;
    let mediumTotal = 0;
    let highTotal = 0;
    const projectSize = parseFloat(projectRun?.projectSize || '1') || 1;
    const scalingFactor = projectRun?.scalingFactor || 1;
    const skillMultiplier = projectRun?.skillLevelMultiplier || 1;
    const completedSteps = projectRun?.completedSteps || [];
    
    // Create a map of space priority for quick lookup
    const spacePriorityMap = new Map<string, number>();
    const spaceSizingMap = new Map<string, Record<string, number>>();
    spaces.forEach(space => {
      spacePriorityMap.set(space.id, space.priority || 999);
      // Merge sizing_values JSONB with scale_value/scale_unit for backward compatibility
      const sizingMap: Record<string, number> = { ...(space.sizingValues || {}) };
      if (space.scaleValue !== null && space.scaleValue !== undefined && space.scaleUnit) {
        // Normalize scaleUnit to include "per " prefix if not present (to match database format)
        const normalizedUnit = space.scaleUnit.startsWith('per ') ? space.scaleUnit : `per ${space.scaleUnit}`;
        sizingMap[normalizedUnit] = space.scaleValue;
        // Also store without "per " for backward compatibility
        sizingMap[space.scaleUnit] = space.scaleValue;
      }
      spaceSizingMap.set(space.id, sizingMap);
    });

    // Determine scaling unit for phase (incorporates phases may have different scaling units)
    const getPhaseScalingUnit = (phase: typeof project.phases[0]): string => {
      if (phase.isLinked && phase.sourceScalingUnit) {
        // For incorporated phases, use their source scaling unit
        return phase.sourceScalingUnit.replace('per ', ''); // Convert "per square foot" to "square foot"
      }
      // For main project phases, use project scaling unit
      return project.scalingUnit?.replace('per ', '') || 'square foot';
    };

    project.phases.forEach(phase => {
      const phaseScalingUnit = getPhaseScalingUnit(phase);
      const isIncorporatedPhase = phase.isLinked || false;

      phase.operations.forEach(operation => {
        operation.steps.forEach((step, index) => {
          // Skip steps that are already completed
          if (completedSteps.includes(step.id)) {
            return;
          }

          const baseTimeLow = step.timeEstimation?.variableTime?.low || 0;
          const baseTimeMed = step.timeEstimation?.variableTime?.medium || 0;
          const baseTimeHigh = step.timeEstimation?.variableTime?.high || 0;
          
          // Determine if step scales or is fixed
          const isFixedStep = step.stepType === 'prime' || step.stepType === 'quality_control_non_scaled' || !step.stepType;
          
          // Get worker requirements for this step
          const workersNeeded = step.workersNeeded ?? 0;

          // If there are multiple spaces, create tasks per space
          if (spaces.length > 1) {
            spaces.forEach(space => {
              const spacePriority = space.priority || 999;
              const spaceSizing = spaceSizingMap.get(space.id) || {};
              
              // Calculate time estimates for this space
              let adjustedLow = baseTimeLow;
              let adjustedMed = baseTimeMed;
              let adjustedHigh = baseTimeHigh;
              
              if (!isFixedStep) {
                // For scaled steps, multiply by space size for the phase's scaling unit
                // Try both "per square foot" and "square foot" formats for compatibility
                const spaceSize = spaceSizing[phaseScalingUnit] || 
                                 spaceSizing[`per ${phaseScalingUnit}`] || 
                                 spaceSizing[phaseScalingUnit.replace(/^per /, '')] || 0;
                adjustedLow = baseTimeLow * spaceSize * scalingFactor * skillMultiplier;
                adjustedMed = baseTimeMed * spaceSize * scalingFactor * skillMultiplier;
                adjustedHigh = baseTimeHigh * spaceSize * scalingFactor * skillMultiplier;
              } else {
                // For fixed steps, apply multipliers but don't scale by space size
                adjustedLow = baseTimeLow * scalingFactor * skillMultiplier;
                adjustedMed = baseTimeMed * scalingFactor * skillMultiplier;
                adjustedHigh = baseTimeHigh * scalingFactor * skillMultiplier;
              }
              
              // Only add to totals once per step (not per space) for fixed steps
              if (isFixedStep && spacePriority === Math.min(...spaces.map(s => s.priority || 999))) {
                lowTotal += adjustedLow;
                mediumTotal += adjustedMed;
                highTotal += adjustedHigh;
              } else if (!isFixedStep) {
                // For scaled steps, add time for each space
                lowTotal += adjustedLow;
                mediumTotal += adjustedMed;
                highTotal += adjustedHigh;
              }
              
              const dependencies: string[] = [];
              const currentSpaceIndex = spaces.findIndex(s => s.id === space.id);
              
              if (completionPriority === 'agile') {
                // Single-piece flow: Complete all phases of a space before moving to next space
                // Step N depends on Step N-1 in the same space
                if (index > 0) {
                  dependencies.push(`${operation.id}-step-${index - 1}-space-${space.id}`);
                } else if (index === 0 && currentSpaceIndex > 0) {
                  // First step of a space depends on the last step of the previous space
                  // Find the last step in the previous space for this operation
                  const prevSpace = spaces[currentSpaceIndex - 1];
                  const prevSpaceSteps = operation.steps || [];
                  if (prevSpaceSteps.length > 0) {
                    const lastStepIndex = prevSpaceSteps.length - 1;
                    dependencies.push(`${operation.id}-step-${lastStepIndex}-space-${prevSpace.id}`);
                  }
                }
              } else {
                // Batch flow: Complete each phase across all spaces before moving to next phase
                // Step N of space M depends on Step N of space M-1 (same step in previous space)
                if (currentSpaceIndex > 0) {
                  const prevSpace = spaces[currentSpaceIndex - 1];
                  dependencies.push(`${operation.id}-step-${index}-space-${prevSpace.id}`);
                } else if (currentSpaceIndex === 0 && index > 0) {
                  // Step N of first space depends on Step N-1 of the LAST space
                  // This ensures all spaces have completed step N-1 before starting step N in space 1
                  const lastSpace = spaces[spaces.length - 1];
                  dependencies.push(`${operation.id}-step-${index - 1}-space-${lastSpace.id}`);
                }
              }
              
              // Select time estimate based on schedule tempo
              // fast_track uses low (10th percentile), steady uses medium (50th percentile), extended uses high (90th percentile)
              const selectedTimeEstimate = scheduleTempo === 'fast_track' ? adjustedLow :
                                          scheduleTempo === 'extended' ? adjustedHigh :
                                          adjustedMed;
              
              tasks.push({
                id: `${operation.id}-step-${index}-space-${space.id}`,
                title: `${step.step} - ${space.name}`,
                estimatedHours: selectedTimeEstimate,
                minContiguousHours: Math.min(adjustedMed, 2),
                dependencies,
                tags: [`space:${space.id}`, `priority:${spacePriority}`, `phase:${phase.id}`, `workers:${workersNeeded}`],
                confidence: 0.7,
                phaseId: phase.id,
                operationId: operation.id,
                stepId: step.id,
                // Add metadata for scheduling algorithm
                metadata: { 
                  spaceId: space.id, 
                  spacePriority,
                  workersNeeded,
                  isFixedStep,
                  phaseScalingUnit,
                  isIncorporatedPhase
                }
              } as Task & { 
                metadata?: { 
                  spaceId: string; 
                  spacePriority: number;
                  workersNeeded: number;
                  isFixedStep: boolean;
                  phaseScalingUnit: string;
                  isIncorporatedPhase: boolean;
                };
                stepId?: string;
              });
            });
          } else {
            // Single space or no spaces - use total project size or default
            // Try both "per square foot" and "square foot" formats for compatibility
            const spaceSizing = spaces.length === 1 ? (spaceSizingMap.get(spaces[0].id) || {}) : {};
            const defaultSize = spaces.length === 1 ? 
              (spaceSizing[phaseScalingUnit] || 
               spaceSizing[`per ${phaseScalingUnit}`] || 
               spaceSizing[phaseScalingUnit.replace(/^per /, '')] || 
               projectSize) : projectSize;
            
            let adjustedLow = baseTimeLow;
            let adjustedMed = baseTimeMed;
            let adjustedHigh = baseTimeHigh;
            
            if (!isFixedStep) {
              adjustedLow = baseTimeLow * defaultSize * scalingFactor * skillMultiplier;
              adjustedMed = baseTimeMed * defaultSize * scalingFactor * skillMultiplier;
              adjustedHigh = baseTimeHigh * defaultSize * scalingFactor * skillMultiplier;
            } else {
              adjustedLow = baseTimeLow * scalingFactor * skillMultiplier;
              adjustedMed = baseTimeMed * scalingFactor * skillMultiplier;
              adjustedHigh = baseTimeHigh * scalingFactor * skillMultiplier;
            }
            
            lowTotal += adjustedLow;
            mediumTotal += adjustedMed;
            highTotal += adjustedHigh;
            
            const dependencies: string[] = [];
            if (index > 0) {
              dependencies.push(`${operation.id}-step-${index - 1}`);
            }
            
            // Select time estimate based on schedule tempo
            // fast_track uses low (10th percentile), steady uses medium (50th percentile), extended uses high (90th percentile)
            const selectedTimeEstimate = scheduleTempo === 'fast_track' ? adjustedLow :
                                        scheduleTempo === 'extended' ? adjustedHigh :
                                        adjustedMed;
            
            tasks.push({
              id: `${operation.id}-step-${index}`,
              title: step.step,
              estimatedHours: selectedTimeEstimate,
              minContiguousHours: Math.min(adjustedMed, 2),
              dependencies,
              tags: [`phase:${phase.id}`, `workers:${workersNeeded}`],
              confidence: 0.7,
              phaseId: phase.id,
              operationId: operation.id,
              stepId: step.id,
              metadata: {
                workersNeeded,
                isFixedStep,
                phaseScalingUnit,
                isIncorporatedPhase
              }
            } as Task & {
              metadata?: {
                workersNeeded: number;
                isFixedStep: boolean;
                phaseScalingUnit: string;
                isIncorporatedPhase: boolean;
              };
              stepId?: string;
            });
          }
        });
      });
    });

    // Sort tasks by space priority (lower number = higher priority)
    // Tasks without space metadata come last
    const sortedTasks = tasks.sort((a, b) => {
      const aMetadata = (a as any).metadata;
      const bMetadata = (b as any).metadata;
      
      if (aMetadata && bMetadata) {
        return aMetadata.spacePriority - bMetadata.spacePriority;
      }
      if (aMetadata) return -1; // Tasks with space priority come first
      if (bMetadata) return 1;
      return 0; // Both without metadata maintain original order
    });

    return {
      schedulingTasks: sortedTasks,
      projectTotals: {
        low: lowTotal,
        medium: mediumTotal,
        high: highTotal
      }
    };
  }, [project, projectRun, spaces, completionPriority, scheduleTempo]);

  // Update team member
  const updateTeamMember = (id: string, updates: Partial<TeamMember>) => {
    setTeamMembers(prev => prev.map(member => member.id === id ? {
      ...member,
      ...updates
    } : member));
  };

  // Remove team member
  const removeTeamMember = (id: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== id));
  };

  // Generate schedule with advanced algorithm
  const computeAdvancedSchedule = async () => {
    setIsComputing(true);
    try {
      // Prepare scheduling inputs with completion priority
      const schedulingInputs: SchedulingInputs = {
        targetCompletionDate: new Date(targetDate),
        dropDeadDate: new Date(dropDeadDate),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        tasks: schedulingTasks,
        workers: teamMembers.map(tm => ({
          ...tm,
          availability: [{
            start: new Date(),
            end: addDays(new Date(), 90),
            workerId: tm.id,
            isAvailable: true
          }]
        })),
        siteConstraints: {
          allowedWorkHours: {
            weekdays: {
              start: '07:00',
              end: '21:00'
            },
            weekends: {
              start: '07:00',
              end: '21:00'
            }
          },
          weekendsOnly: false,
          allowNightWork: false,
          noiseCurfew: globalSettings.quietHours.start
        },
        blackoutDates: [],
        scheduleTempo,
        preferHelpers: teamMembers.some(tm => tm.type === 'helper'),
        mode: planningMode,
        completionPriority: completionPriority as 'agile' | 'waterfall'
      };

      // Compute schedule
      const result = schedulingEngine.computeSchedule(schedulingInputs);
      setSchedulingResult(result);
      toast({
        title: "Schedule computed",
        description: `Generated ${planningMode} schedule with ${result.scheduledTasks.length} tasks.`
      });
    } catch (error) {
      toast({
        title: "Scheduling failed",
        description: "Failed to compute schedule. Please check your inputs.",
        variant: "destructive"
      });
    } finally {
      setIsComputing(false);
    }
  };

  // Add team member
  const addTeamMember = () => {
    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: 'New Team Member',
      type: 'helper',
      skillLevel: 'Intermediate',
      effortLevel: 'Medium',
      maxTotalHours: 80,
      weekendsOnly: false,
      weekdaysAfterFivePm: false,
      workingHours: {
        start: '09:00',
        end: '17:00'
      },
      availability: {},
      costPerHour: 25
    };
    setTeamMembers([...teamMembers, newMember]);
  };

  // Apply preset
  const applyPreset = (preset: SchedulePreset) => {
    if (teamMembers.length > 0) {
      const firstMemberId = teamMembers[0].id;
      updateTeamMember(firstMemberId, {
        weekendsOnly: preset.settings.weekendsOnly,
        weekdaysAfterFivePm: preset.settings.weekdaysAfterFivePm,
        workingHours: preset.settings.workingHours
      });
      toast({
        title: "Preset applied",
        description: `Applied "${preset.name}" schedule settings`
      });
    } else {
      toast({
        title: "No team member",
        description: "Please add a team member first",
        variant: "destructive"
      });
    }
  };

  // Apply remediation suggestion
  const applyRemediation = async (remediation: RemediationSuggestion) => {
    if (remediation.preview) {
      setSchedulingResult(remediation.preview);
      toast({
        title: "Remediation applied",
        description: remediation.description
      });
    }
  };

  // Open calendar for team member
  const openCalendar = (memberId: string) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (member) {
      // Load existing availability dates
      const existingDates = Object.keys(member.availability).map(dateStr => new Date(dateStr));
      setSelectedDates(existingDates);
      setTempAvailability(member.availability);
      setCalendarOpen(memberId);
    }
  };

  // Handle date selection in calendar
  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) {
      setSelectedDates([]);
      setTempAvailability({});
      return;
    }
    setSelectedDates(dates);

    // Update temp availability for new dates
    const newTempAvailability = {
      ...tempAvailability
    };

    // Remove dates that are no longer selected
    Object.keys(tempAvailability).forEach(dateStr => {
      const dateExists = dates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
      if (!dateExists) {
        delete newTempAvailability[dateStr];
      }
    });

    // Add new dates with default availability
    dates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      if (!newTempAvailability[dateStr]) {
        newTempAvailability[dateStr] = [{
          start: '09:00',
          end: '17:00',
          available: true
        }];
      }
    });
    setTempAvailability(newTempAvailability);
  };

  // Save calendar changes
  const saveCalendarChanges = () => {
    if (!calendarOpen) return;
    updateTeamMember(calendarOpen, {
      availability: tempAvailability
    });
    toast({
      title: "Availability updated",
      description: `Updated availability for ${selectedDates.length} dates`
    });
    setCalendarOpen(null);
    setSelectedDates([]);
    setTempAvailability({});
  };

  // Cancel calendar changes
  const cancelCalendarChanges = () => {
    setCalendarOpen(null);
    setSelectedDates([]);
    setTempAvailability({});
  };

  // Save schedule to project run
  const saveSchedule = async () => {
    if (!schedulingResult) return;
    try {
      const updatedProjectRun = {
        ...projectRun,
        completion_priority: completionPriority,
        schedule_events: {
          events: schedulingResult.scheduledTasks.map(task => ({
            id: task.taskId,
            date: format(task.startTime, 'yyyy-MM-dd'),
            phaseId: schedulingTasks.find(t => t.id === task.taskId)?.phaseId || '',
            operationId: schedulingTasks.find(t => t.id === task.taskId)?.operationId || '',
            duration: Math.round((task.endTime.getTime() - task.startTime.getTime()) / 60000),
            notes: schedulingTasks.find(t => t.id === task.taskId)?.title || '',
            assignedTo: (task as any).assignedTo || ''
          })),
          teamMembers: teamMembers,
          globalSettings: globalSettings
        },
        calendar_integration: {
          scheduledDays: schedulingResult.scheduledTasks.reduce((acc, task) => {
            const dateKey = format(task.startTime, 'yyyy-MM-dd');
            if (!acc[dateKey]) {
              acc[dateKey] = {
                date: dateKey,
                timeSlots: []
              };
            }
            acc[dateKey].timeSlots.push({
              startTime: format(task.startTime, 'HH:mm'),
              endTime: format(task.endTime, 'HH:mm'),
              phaseId: schedulingTasks.find(t => t.id === task.taskId)?.phaseId,
              operationId: schedulingTasks.find(t => t.id === task.taskId)?.operationId
            });
            return acc;
          }, {} as Record<string, any>),
          preferences: {
            preferredStartTime: '09:00',
            maxHoursPerDay: 8,
            preferredDays: [1, 2, 3, 4, 5, 6, 0]
          }
        }
      };
      await updateProjectRun(updatedProjectRun);
      schedulingEngine.commitSchedule(schedulingResult);
      toast({
        title: "Schedule saved",
        description: "Your optimized schedule has been saved successfully."
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error saving schedule",
        description: "There was a problem saving your schedule. Please try again.",
        variant: "destructive"
      });
      console.error('Error saving schedule:', error);
    }
  };

  // Save draft
  const saveDraft = () => {
    toast({
      title: "Draft saved",
      description: "Your scheduling configuration has been saved as a draft."
    });
  };

  // Print to PDF
  const printToPDF = async () => {
    if (!schedulingResult) return;
    try {
      const {
        default: html2canvas
      } = await import('html2canvas');
      const {
        default: jsPDF
      } = await import('jspdf');

      // Create a temporary container with the schedule content
      const printContent = document.createElement('div');
      printContent.style.padding = '20px';
      printContent.style.backgroundColor = 'white';
      printContent.style.position = 'absolute';
      printContent.style.left = '-9999px';
      printContent.innerHTML = `
        <div style="font-family: Arial, sans-serif;">
          <h1 style="margin-bottom: 20px; color: #333;">${project?.name || 'Project'} - Schedule</h1>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                <th style="text-align: left; padding: 8px; border: 1px solid #e5e7eb;">Task</th>
                <th style="text-align: left; padding: 8px; border: 1px solid #e5e7eb;">Worker</th>
                <th style="text-align: left; padding: 8px; border: 1px solid #e5e7eb;">Start</th>
                <th style="text-align: left; padding: 8px; border: 1px solid #e5e7eb; color: #15803d;">Target Complete</th>
                <th style="text-align: left; padding: 8px; border: 1px solid #e5e7eb; color: #b91c1c;">Latest Complete</th>
                <th style="text-align: left; padding: 8px; border: 1px solid #e5e7eb;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${schedulingResult.scheduledTasks.filter(st => st.status === 'confirmed').sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map(scheduledTask => {
        const task = schedulingTasks.find(t => t.id === scheduledTask.taskId);
        const worker = teamMembers.find(w => w.id === scheduledTask.workerId);
        return `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 8px; border: 1px solid #e5e7eb;">${task?.title || 'Unknown'}</td>
                      <td style="padding: 8px; border: 1px solid #e5e7eb;">${worker?.name || 'Unknown'}</td>
                      <td style="padding: 8px; border: 1px solid #e5e7eb;">${format(scheduledTask.startTime, 'MMM dd, h:mm a')}</td>
                      <td style="padding: 8px; border: 1px solid #e5e7eb; color: #15803d; font-weight: 500;">${format(scheduledTask.targetCompletionDate, 'MMM dd, h:mm a')}</td>
                      <td style="padding: 8px; border: 1px solid #e5e7eb; color: #b91c1c; font-weight: 500;">${format(scheduledTask.latestCompletionDate, 'MMM dd, h:mm a')}</td>
                      <td style="padding: 8px; border: 1px solid #e5e7eb;">${scheduledTask.status}</td>
                    </tr>
                  `;
      }).join('')}
            </tbody>
          </table>
        </div>
      `;
      document.body.appendChild(printContent);
      const canvas = await html2canvas(printContent, {
        scale: 2,
        backgroundColor: '#ffffff'
      });
      document.body.removeChild(printContent);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = canvas.height * pdfWidth / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${project?.name || 'project'}-schedule.pdf`);
      toast({
        title: "PDF downloaded",
        description: "Your schedule has been downloaded successfully."
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "PDF generation failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Email schedule
  const emailSchedule = async () => {
    if (!schedulingResult) {
      toast({
        title: "No schedule",
        description: "Please generate a schedule first.",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        supabase
      } = await import('@/integrations/supabase/client');

      // Send notifications to team members who opted in
      for (const member of teamMembers) {
        if (!member.notificationPreferences?.email || !member.email) continue;

        // Get tasks assigned to this member
        const assignedTasks = schedulingResult.scheduledTasks.filter(st => st.workerId === member.id && st.status === 'confirmed').map(st => {
          const task = schedulingTasks.find(t => t.id === st.taskId);
          return {
            title: task?.title || 'Unknown Task',
            startTime: format(st.startTime, 'PPp'),
            endTime: format(st.endTime, 'PPp'),
            targetCompletion: format(st.targetCompletionDate, 'PPp'),
            latestCompletion: format(st.latestCompletionDate, 'PPp'),
            estimatedHours: task?.estimatedHours || 0
          };
        });
        if (assignedTasks.length === 0) continue;

        // Call edge function to send email
        // Convert to format expected by send-schedule-notification edge function
        const scheduleForEmail = assignedTasks.map((task) => ({
          taskTitle: project.name,
          subtaskTitle: task.title,
          personName: member.name,
          scheduledDate: new Date(task.startTime).toISOString(),
          scheduledHours: task.estimatedHours
        }));

        await supabase.functions.invoke('send-schedule-notification', {
          body: {
            schedule: scheduleForEmail,
            startDate: new Date(targetDate).toISOString(),
            userEmail: member.email,
            people: [{ name: member.name, id: member.id }]
          }
        });
      }
      toast({
        title: "Notifications sent",
        description: "Schedule notifications have been sent to team members."
      });
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast({
        title: "Error sending notifications",
        description: "Failed to send schedule notifications. Please try again.",
        variant: "destructive"
      });
    }
  };
  const formatTime = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
    const days = Math.floor(hours / 8);
    const remainingHours = hours % 8;
    return remainingHours > 0 ? `${days}d ${Math.round(remainingHours * 10) / 10}h` : `${days}d`;
  };
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] md:max-w-none h-[85vh] p-0 gap-0 [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Project Scheduler</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Schedules give the best opportunity to execute the project as intended
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>

        {/* Project Goal Completion Date Header */}
        {projectRun?.initial_timeline && (
          <div className="px-4 pt-4 pb-2">
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Project Goal Completion Date</div>
                <div className="text-lg font-bold text-primary">
                  {format(new Date(projectRun.initial_timeline), 'MMMM dd, yyyy')}
                </div>
              </div>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {/* Assign Phases, Team Availability, and Contractors Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPhaseAssignment(true)}
                className="flex-1"
              >
                <Layers className="w-4 h-4 mr-2" />
                Assign Phases
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTeamAvailability(true)}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                Team Availability
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContractors(true)}
                className="flex-1"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Contractors
              </Button>
            </div>

            {/* New Wizard Interface */}
            <SchedulerWizard targetDate={targetDate} setTargetDate={setTargetDate} dropDeadDate={dropDeadDate} setDropDeadDate={setDropDeadDate} planningMode={planningMode} setPlanningMode={setPlanningMode} scheduleTempo={scheduleTempo} setScheduleTempo={setScheduleTempo} completionPriority={completionPriority} setCompletionPriority={setCompletionPriority} onPresetApply={applyPreset} teamMembers={teamMembers} addTeamMember={addTeamMember} removeTeamMember={removeTeamMember} updateTeamMember={updateTeamMember} openCalendar={openCalendar} onGenerateSchedule={computeAdvancedSchedule} isComputing={isComputing} />

            {/* Results */}
            {schedulingResult && <>
                <ScheduleOutputView schedulingResult={schedulingResult} planningMode={planningMode} schedulingTasks={schedulingTasks} teamMembers={teamMembers} />

                {/* Action Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button variant="outline" onClick={saveDraft} className="h-10">
                    <FileText className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button onClick={saveSchedule} className="h-10">
                    <Save className="w-4 h-4 mr-2" />
                    Save & Commit
                  </Button>
                  <Button variant="outline" onClick={printToPDF} className="h-10">
                    <Printer className="w-4 h-4 mr-2" />
                    Print to PDF
                  </Button>
                  <Button variant="outline" onClick={emailSchedule} className="h-10">
                    <Mail className="w-4 h-4 mr-2" />
                    Email Me
                  </Button>
                </div>
              </>}

            {/* Old Configuration Section - REMOVED */}
            <div className="hidden grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left side - Steps 1-4 (2/3 width) */}
              <div className="lg:col-span-2 space-y-4">
                {/* Step 1: Target & Drop-Dead Dates */}
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                        1
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Target Completion Date
                          </Label>
                          <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="mt-1 h-8" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-destructive" />
                            Latest Date
                          </Label>
                          <Input type="date" value={dropDeadDate} onChange={e => setDropDeadDate(e.target.value)} className="mt-1 h-8" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Target is your goal; latest is the absolute latest acceptable date
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2: Planning Mode */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-2">Planning Mode</p>
                        <Select value={planningMode} onValueChange={value => setPlanningMode(value as PlanningMode)}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {planningModes.map(mode => <SelectItem key={mode.mode} value={mode.mode}>
                                <div>
                                  <div className="font-medium">{mode.name}</div>
                                  <div className="text-xs text-muted-foreground">{mode.description}</div>
                                </div>
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 3: Schedule Tempo */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-2">Schedule Tempo</p>
                        <Select value={scheduleTempo} onValueChange={value => setScheduleTempo(value as ScheduleTempo)}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fast_track">Fast-Track (Tight timeline)</SelectItem>
                            <SelectItem value="steady">Steady Pace (Balanced buffers)</SelectItem>
                            <SelectItem value="extended">Extended (Extra breathing room)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 4: Schedule Optimization Method */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                        4
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-2">Schedule Optimization Method</p>
                        <div className="space-y-3">
                          <div className="flex items-start space-x-2">
                            <input
                              type="radio"
                              id="priority-agile"
                              name="completion-priority"
                              value="agile"
                              checked={completionPriority === 'agile'}
                              onChange={(e) => setCompletionPriority(e.target.value as 'agile' | 'waterfall')}
                              className="h-4 w-4 mt-0.5"
                            />
                            <Label htmlFor="priority-agile" className="text-sm font-normal cursor-pointer">
                              <span className="font-medium">Single-piece flow</span> - Fastest first room ready — you'll see progress right away.
                              <p className="text-xs text-muted-foreground mt-1">Complete all phases of a space before moving to the next space</p>
                            </Label>
                          </div>
                          <div className="flex items-start space-x-2">
                            <input
                              type="radio"
                              id="priority-waterfall"
                              name="completion-priority"
                              value="waterfall"
                              checked={completionPriority === 'waterfall'}
                              onChange={(e) => setCompletionPriority(e.target.value as 'agile' | 'waterfall')}
                              className="h-4 w-4 mt-0.5"
                            />
                            <Label htmlFor="priority-waterfall" className="text-sm font-normal cursor-pointer">
                              <span className="font-medium">Batch flow</span> - Most efficient overall — but you won't see a finished room until the end.
                              <p className="text-xs text-muted-foreground mt-1">Complete each phase across all spaces before moving to the next phase</p>
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 5: Quiet Hours */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                        5
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-2">Quiet Hours (Global)</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">From</Label>
                            <Input type="time" value={globalSettings.quietHours.start} onChange={e => setGlobalSettings(prev => ({
                            ...prev,
                            quietHours: {
                              ...prev.quietHours,
                              start: e.target.value
                            }
                          }))} className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">To</Label>
                            <Input type="time" value={globalSettings.quietHours.end} onChange={e => setGlobalSettings(prev => ({
                            ...prev,
                            quietHours: {
                              ...prev.quietHours,
                              end: e.target.value
                            }
                          }))} className="h-8 text-sm" />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          No work allowed during quiet hours
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right side - Project Time Estimates (1/3 width) */}
              <div className="lg:col-span-1">
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Project Time Estimates
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">Time Estimate Ranges:</p>
                              <p>• <strong>Medium</strong> = Expected / average time</p>
                              <p>• <strong>Low</strong> = 10th percentile (best case)</p>
                              <p>• <strong>High</strong> = 90th percentile (worst case)</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 border border-green-200">
                        <span className="text-green-700 font-medium text-sm">Low</span>
                        <span className="font-mono text-green-800 font-semibold">{formatTime(projectTotals.low)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                        <span className="text-yellow-700 font-medium text-sm">Medium</span>
                        <span className="font-mono text-yellow-800 font-semibold">{formatTime(projectTotals.medium)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 border border-red-200">
                        <span className="text-red-700 font-medium text-sm">High</span>
                        <span className="font-mono text-red-800 font-semibold">{formatTime(projectTotals.high)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Raw project time (before scheduling)
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Step 5: Generate Schedule */}
            <div className="space-y-4">
              
              
              

              {/* Action Buttons - shown after schedule is generated */}
              {schedulingResult && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button variant="outline" onClick={saveDraft} className="h-10">
                    <FileText className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button onClick={saveSchedule} className="h-10">
                    <Save className="w-4 h-4 mr-2" />
                    Save & Commit
                  </Button>
                  <Button variant="outline" onClick={printToPDF} className="h-10">
                    <Printer className="w-4 h-4 mr-2" />
                    Print to PDF
                  </Button>
                  <Button variant="outline" onClick={emailSchedule} className="h-10">
                    <Mail className="w-4 h-4 mr-2" />
                    Email Me
                  </Button>
                </div>}

              {schedulingResult && <>
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Schedule generated with {schedulingResult.scheduledTasks.length} tasks
                    </AlertDescription>
                  </Alert>

                  {/* Enhanced Schedule Output View */}
                  <ScheduleOutputView schedulingResult={schedulingResult} planningMode={planningMode} schedulingTasks={schedulingTasks} teamMembers={teamMembers} />
                </>}
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
      
      {/* Enhanced Calendar Dialog for Team Member Availability */}
      {calendarOpen && <Dialog open={!!calendarOpen} onOpenChange={cancelCalendarChanges}>
          <DialogContent className="max-w-[95vw] md:max-w-[1000px] max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                {teamMembers.find(m => m.id === calendarOpen)?.name} - Availability Settings
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex flex-col md:flex-row flex-1 min-h-0">
              {/* Left Side - Calendar View */}
              <div className="flex-1 p-6 border-r">
                <div className="h-full flex flex-col">
                  <h3 className="font-semibold text-lg mb-4">Select Available Dates</h3>
                  <div className="flex-1 flex justify-center">
                    <CalendarComponent mode="multiple" selected={selectedDates} onSelect={handleDateSelect} className="w-full max-w-md" classNames={{
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground ring-2 ring-primary/20",
                  day_today: "bg-accent text-accent-foreground font-bold",
                  day: "h-9 w-9 text-sm hover:bg-accent hover:text-accent-foreground"
                }} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Click dates to toggle availability. Highlighted dates show custom availability.
                  </p>
                </div>
              </div>
              
              {/* Right Side - Settings Panel */}
              <div className="w-full md:w-80 p-6 bg-muted/20">
                <div className="space-y-6">
                  {/* Global Settings */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-base border-b pb-2">Global Settings</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox id="weekends-only" checked={teamMembers.find(m => m.id === calendarOpen)?.weekendsOnly || false} onCheckedChange={checked => updateTeamMember(calendarOpen!, {
                      weekendsOnly: checked as boolean,
                      weekdaysAfterFivePm: false
                    })} />
                        <Label htmlFor="weekends-only" className="text-sm font-medium">
                          Weekends Only
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Checkbox id="weekdays-after-5" checked={teamMembers.find(m => m.id === calendarOpen)?.weekdaysAfterFivePm || false} onCheckedChange={checked => updateTeamMember(calendarOpen!, {
                      weekdaysAfterFivePm: checked as boolean,
                      weekendsOnly: false
                    })} />
                        <Label htmlFor="weekdays-after-5" className="text-sm font-medium">
                          Weekdays After 5pm
                        </Label>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Max Total Hours</Label>
                        <Input type="number" min="1" value={teamMembers.find(m => m.id === calendarOpen)?.maxTotalHours || 40} onChange={e => updateTeamMember(calendarOpen!, {
                      maxTotalHours: parseInt(e.target.value) || 40
                    })} className="h-9" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Daily Settings */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-base border-b pb-2">Daily Settings</h4>
                    
                    {selectedDates.length > 0 ? <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Settings for {selectedDates.length} selected date(s)
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Start Time</Label>
                            <Input type="time" value={selectedDates.length > 0 && tempAvailability[format(selectedDates[0], 'yyyy-MM-dd')]?.[0]?.start || '09:00'} onChange={e => {
                        const newValue = e.target.value;
                        selectedDates.forEach(date => {
                          const dateStr = format(date, 'yyyy-MM-dd');
                          setTempAvailability(prev => ({
                            ...prev,
                            [dateStr]: [{
                              start: newValue,
                              end: prev[dateStr]?.[0]?.end || '17:00',
                              available: true
                            }]
                          }));
                        });
                      }} className="h-8 text-xs" />
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">End Time</Label>
                            <Input type="time" value={selectedDates.length > 0 && tempAvailability[format(selectedDates[0], 'yyyy-MM-dd')]?.[0]?.end || '17:00'} onChange={e => {
                        const newValue = e.target.value;
                        selectedDates.forEach(date => {
                          const dateStr = format(date, 'yyyy-MM-dd');
                          setTempAvailability(prev => ({
                            ...prev,
                            [dateStr]: [{
                              start: prev[dateStr]?.[0]?.start || '09:00',
                              end: newValue,
                              available: true
                            }]
                          }));
                        });
                      }} className="h-8 text-xs" />
                          </div>
                        </div>
                        
                        <div className="bg-background p-3 rounded-lg border">
                          <h5 className="text-xs font-medium mb-2">Selected Dates Preview</h5>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {selectedDates.slice(0, 5).map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const timeSlot = tempAvailability[dateStr]?.[0];
                        return <div key={date.toISOString()} className="text-xs flex justify-between">
                                  <span>{format(date, 'MMM dd')}</span>
                                  <span className="text-muted-foreground">
                                    {timeSlot ? `${timeSlot.start} - ${timeSlot.end}` : '09:00 - 17:00'}
                                  </span>
                                </div>;
                      })}
                            {selectedDates.length > 5 && <div className="text-xs text-muted-foreground text-center">
                                +{selectedDates.length - 5} more
                              </div>}
                          </div>
                        </div>
                      </div> : <p className="text-sm text-muted-foreground">
                        Click on calendar dates to configure daily settings
                      </p>}
                  </div>
                  
                  {/* Summary */}
                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                    <h5 className="text-sm font-medium text-primary mb-1">Summary</h5>
                    <p className="text-xs text-primary/80">
                      {selectedDates.length} custom dates configured
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-between items-center p-6 pt-0 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedDates.length} dates with custom availability
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={cancelCalendarChanges}>
                  Cancel
                </Button>
                <Button onClick={saveCalendarChanges} className="min-w-[120px]">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>}

    {/* Phase Assignment Dialog */}
    <Dialog open={showPhaseAssignment} onOpenChange={setShowPhaseAssignment}>
      <DialogContent className="w-[90vw] max-w-[90vw] md:max-w-6xl h-[85vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Assign Phases to Team Members</DialogTitle>
        </DialogHeader>
        <div className="p-4 flex-1 overflow-auto">
          {user && projectRun?.id && (
            <PhaseAssignment
              projectRunId={projectRun.id}
              phases={project.phases}
              teamMembers={teamMembers}
              userId={user.id}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Team Availability Dialog */}
    <Dialog open={showTeamAvailability} onOpenChange={setShowTeamAvailability}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl font-bold">Team Availability</DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowTeamAvailability(false)} 
              className="h-7 px-2 text-[9px] md:text-xs"
            >
              Close
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
          <ProjectTeamAvailability
            teamMembers={teamMembers}
            onTeamMembersChange={setTeamMembers}
          />
        </div>
      </DialogContent>
    </Dialog>

    {/* Contractors Dialog */}
    <Dialog open={showContractors} onOpenChange={setShowContractors}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl font-bold">Contractors</DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowContractors(false)} 
              className="h-7 px-2 text-[9px] md:text-xs"
            >
              Close
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
          {projectRun?.id && (
            <ProjectContractors
              projectRunId={projectRun.id}
              phases={project.phases}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};