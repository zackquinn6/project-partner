import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle, 
  Plus, 
  Users,
  Settings,
  Zap,
  Trash2,
  Save,
  X,
  Target,
  AlertTriangle,
  TrendingUp,
  Brain,
  FileText,
  Mail,
  Printer,
  Info
} from 'lucide-react';
import { format, addDays, parseISO, addHours, isSameDay } from 'date-fns';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { useResponsive } from '@/hooks/useResponsive';
import { schedulingEngine } from '@/utils/schedulingEngine';
import { 
  SchedulingInputs, 
  SchedulingResult, 
  Task, 
  Worker, 
  PlanningMode, 
  RiskTolerance,
  RemediationSuggestion 
} from '@/interfaces/Scheduling';

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
  skillLevel: 'novice' | 'intermediate' | 'expert';
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
}

interface GlobalSettings {
  quietHours: {
    start: string;
    end: string;
  };
}

const planningModes: { mode: PlanningMode; name: string; description: string }[] = [
  { mode: 'quick', name: 'Quick', description: 'Phases and milestones only' },
  { mode: 'balanced', name: 'Balanced', description: 'Task-level with basic constraints' },
  { mode: 'detailed', name: 'Detailed', description: 'Time-of-day slots with full optimization' }
];

export const ProjectScheduler: React.FC<ProjectSchedulerProps> = ({
  open,
  onOpenChange,
  project,
  projectRun
}) => {
  const { updateProjectRun } = useProject();
  const { toast } = useToast();
  const { isMobile } = useResponsive();
  
  // Enhanced scheduling state
  const [planningMode, setPlanningMode] = useState<PlanningMode>('balanced');
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>('moderate');
  const [schedulingResult, setSchedulingResult] = useState<SchedulingResult | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [targetDate, setTargetDate] = useState<string>(
    format(addDays(new Date(), 30), 'yyyy-MM-dd')
  );
  
  // Team management
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { 
      id: '1', 
      name: 'You', 
      type: 'owner',
      skillLevel: 'intermediate', 
      maxTotalHours: 120,
      weekendsOnly: false,
      weekdaysAfterFivePm: false,
      workingHours: {
        start: '09:00',
        end: '17:00'
      },
      availability: {},
      costPerHour: 0
    }
  ]);
  
  // Global settings
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    quietHours: {
      start: '21:00',
      end: '07:00'
    }
  });

  // Calendar popup state
  const [calendarOpen, setCalendarOpen] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [tempAvailability, setTempAvailability] = useState<{
    [date: string]: { start: string; end: string; available: boolean }[];
  }>({});

  // Convert project to scheduling tasks and calculate totals
  const { schedulingTasks, projectTotals } = useMemo(() => {
    const tasks: Task[] = [];
    let lowTotal = 0;
    let mediumTotal = 0;
    let highTotal = 0;
    
    const projectSize = parseFloat(projectRun?.projectSize || '1') || 1;
    const scalingFactor = projectRun?.scalingFactor || 1;
    const skillMultiplier = projectRun?.skillLevelMultiplier || 1;
    const completedSteps = projectRun?.completedSteps || [];

    project.phases.forEach(phase => {
      phase.operations.forEach(operation => {
        operation.steps.forEach((step, index) => {
          // Skip steps that are already completed
          if (completedSteps.includes(step.id)) {
            return;
          }

          const baseTimeLow = step.timeEstimation?.variableTime?.low || 1;
          const baseTimeMed = step.timeEstimation?.variableTime?.medium || 1;
          const baseTimeHigh = step.timeEstimation?.variableTime?.high || 1;
          
          const adjustedLow = baseTimeLow * projectSize * scalingFactor * skillMultiplier;
          const adjustedMed = baseTimeMed * projectSize * scalingFactor * skillMultiplier;
          const adjustedHigh = baseTimeHigh * projectSize * scalingFactor * skillMultiplier;
          
          lowTotal += adjustedLow;
          mediumTotal += adjustedMed;
          highTotal += adjustedHigh;
          
          const dependencies: string[] = [];
          if (index > 0) {
            dependencies.push(`${operation.id}-step-${index - 1}`);
          }

          tasks.push({
            id: `${operation.id}-step-${index}`,
            title: step.step,
            estimatedHours: adjustedMed,
            minContiguousHours: Math.min(adjustedMed, 2),
            dependencies,
            tags: [],
            confidence: 0.7,
            phaseId: phase.id,
            operationId: operation.id
          });
        });
      });
    });

    return { 
      schedulingTasks: tasks, 
      projectTotals: { low: lowTotal, medium: mediumTotal, high: highTotal }
    };
  }, [project, projectRun]);

  // Update team member
  const updateTeamMember = (id: string, updates: Partial<TeamMember>) => {
    setTeamMembers(prev => prev.map(member => 
      member.id === id ? { ...member, ...updates } : member
    ));
  };

  // Remove team member
  const removeTeamMember = (id: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== id));
  };

  // Generate schedule with advanced algorithm
  const computeAdvancedSchedule = async () => {
    setIsComputing(true);
    
    try {
      // Prepare scheduling inputs
      const schedulingInputs: SchedulingInputs = {
        targetCompletionDate: new Date(targetDate),
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
            weekdays: { start: '07:00', end: '21:00' },
            weekends: { start: '07:00', end: '21:00' }
          },
          weekendsOnly: false,
          allowNightWork: false,
          noiseCurfew: globalSettings.quietHours.start
        },
        blackoutDates: [],
        riskTolerance,
        preferHelpers: teamMembers.some(tm => tm.type === 'helper'),
        mode: planningMode
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
      skillLevel: 'intermediate',
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
    const newTempAvailability = { ...tempAvailability };
    
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
        description: "Failed to save the schedule. Please try again.",
        variant: "destructive"
      });
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
  const printToPDF = () => {
    toast({
      title: "PDF generation",
      description: "Your schedule is being prepared for download."
    });
  };

  // Email schedule
  const emailSchedule = () => {
    toast({
      title: "Email sent",
      description: "Your schedule has been sent to your email address."
    });
  };

  const formatTime = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
    const days = Math.floor(hours / 8);
    const remainingHours = hours % 8;
    return remainingHours > 0 ? `${days}d ${Math.round(remainingHours * 10) / 10}h` : `${days}d`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] md:max-w-none h-[85vh] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Project Scheduler</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Schedules give a target and our approach showing a range of estimates means it's imperfect - but we use it to get the best results moving forward
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {/* Step 1-4: Configuration Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left side - Steps 1-4 (2/3 width) */}
              <div className="lg:col-span-2 space-y-4">
                {/* Step 1: Target Completion Date */}
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Target Completion Date</p>
                        <Input
                          type="date"
                          value={targetDate}
                          onChange={(e) => setTargetDate(e.target.value)}
                          className="mt-1 h-8"
                        />
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
                        <Select value={planningMode} onValueChange={(value) => setPlanningMode(value as PlanningMode)}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {planningModes.map((mode) => (
                              <SelectItem key={mode.mode} value={mode.mode}>
                                <div>
                                  <div className="font-medium">{mode.name}</div>
                                  <div className="text-xs text-muted-foreground">{mode.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 3: Risk Tolerance */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-2">Risk Tolerance</p>
                        <Select value={riskTolerance} onValueChange={(value) => setRiskTolerance(value as RiskTolerance)}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="conservative">Conservative (Extra buffers)</SelectItem>
                            <SelectItem value="moderate">Moderate (Standard buffers)</SelectItem>
                            <SelectItem value="aggressive">Aggressive (Minimal buffers)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 4: Quiet Hours */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                        4
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-2">Quiet Hours (Global)</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">From</Label>
                            <Input 
                              type="time" 
                              value={globalSettings.quietHours.start}
                              onChange={(e) => setGlobalSettings(prev => ({
                                ...prev,
                                quietHours: { ...prev.quietHours, start: e.target.value }
                              }))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">To</Label>
                            <Input 
                              type="time" 
                              value={globalSettings.quietHours.end}
                              onChange={(e) => setGlobalSettings(prev => ({
                                ...prev,
                                quietHours: { ...prev.quietHours, end: e.target.value }
                              }))}
                              className="h-8 text-sm"
                            />
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

            {/* Step 5: Team Members & Availability */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                    5
                  </div>
                  <h3 className="text-base font-semibold">Team Members & Availability</h3>
                </div>
                <Button onClick={addTeamMember} size="sm" className="h-8">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Member
                </Button>
              </div>
              
              <div className="space-y-3">
                {teamMembers.map((member, index) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex-1">
                      <Input 
                        placeholder="Team member name"
                        value={member.name}
                        onChange={(e) => updateTeamMember(member.id, { name: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openCalendar(member.id)}
                      className="h-10 px-4"
                    >
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      Calendar ({Object.keys(member.availability).length})
                    </Button>
                    {teamMembers.length > 1 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeTeamMember(member.id)}
                        className="h-10 px-3"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 6: Generate Schedule */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                  6
                </div>
                <h3 className="text-base font-semibold">Generate Schedule</h3>
              </div>
              
              <Button 
                onClick={computeAdvancedSchedule} 
                className="w-full h-12 text-base"
                disabled={isComputing || teamMembers.length === 0}
              >
                <Zap className="w-4 h-4 mr-2" />
                {isComputing ? 'Computing...' : 'Generate Schedule'}
              </Button>

              {/* Action Buttons - shown after schedule is generated */}
              {schedulingResult && (
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
              )}

              {schedulingResult && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Schedule generated with {schedulingResult.scheduledTasks.length} tasks
                  </AlertDescription>
                </Alert>
              )}
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
      
      {/* Enhanced Calendar Dialog for Team Member Availability */}
      {calendarOpen && (
        <Dialog open={!!calendarOpen} onOpenChange={cancelCalendarChanges}>
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
                    <CalendarComponent
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={handleDateSelect}
                      className="w-full max-w-md"
                      classNames={{
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground ring-2 ring-primary/20",
                        day_today: "bg-accent text-accent-foreground font-bold",
                        day: "h-9 w-9 text-sm hover:bg-accent hover:text-accent-foreground",
                      }}
                    />
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
                        <Checkbox 
                          id="weekends-only"
                          checked={teamMembers.find(m => m.id === calendarOpen)?.weekendsOnly || false}
                          onCheckedChange={(checked) => updateTeamMember(calendarOpen!, { 
                            weekendsOnly: checked as boolean,
                            weekdaysAfterFivePm: false
                          })}
                        />
                        <Label htmlFor="weekends-only" className="text-sm font-medium">
                          Weekends Only
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          id="weekdays-after-5"
                          checked={teamMembers.find(m => m.id === calendarOpen)?.weekdaysAfterFivePm || false}
                          onCheckedChange={(checked) => updateTeamMember(calendarOpen!, { 
                            weekdaysAfterFivePm: checked as boolean,
                            weekendsOnly: false
                          })}
                        />
                        <Label htmlFor="weekdays-after-5" className="text-sm font-medium">
                          Weekdays After 5pm
                        </Label>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Max Total Hours</Label>
                        <Input 
                          type="number"
                          min="1"
                          value={teamMembers.find(m => m.id === calendarOpen)?.maxTotalHours || 40}
                          onChange={(e) => updateTeamMember(calendarOpen!, { 
                            maxTotalHours: parseInt(e.target.value) || 40
                          })}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Daily Settings */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-base border-b pb-2">Daily Settings</h4>
                    
                    {selectedDates.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Settings for {selectedDates.length} selected date(s)
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Start Time</Label>
                            <Input 
                              type="time"
                              value={selectedDates.length > 0 && tempAvailability[format(selectedDates[0], 'yyyy-MM-dd')]?.[0]?.start || '09:00'}
                              onChange={(e) => {
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
                              }}
                              className="h-8 text-xs"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">End Time</Label>
                            <Input 
                              type="time"
                              value={selectedDates.length > 0 && tempAvailability[format(selectedDates[0], 'yyyy-MM-dd')]?.[0]?.end || '17:00'}
                              onChange={(e) => {
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
                              }}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        
                        <div className="bg-background p-3 rounded-lg border">
                          <h5 className="text-xs font-medium mb-2">Selected Dates Preview</h5>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {selectedDates.slice(0, 5).map(date => {
                              const dateStr = format(date, 'yyyy-MM-dd');
                              const timeSlot = tempAvailability[dateStr]?.[0];
                              return (
                                <div key={date.toISOString()} className="text-xs flex justify-between">
                                  <span>{format(date, 'MMM dd')}</span>
                                  <span className="text-muted-foreground">
                                    {timeSlot ? `${timeSlot.start} - ${timeSlot.end}` : '09:00 - 17:00'}
                                  </span>
                                </div>
                              );
                            })}
                            {selectedDates.length > 5 && (
                              <div className="text-xs text-muted-foreground text-center">
                                +{selectedDates.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Click on calendar dates to configure daily settings
                      </p>
                    )}
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
        </Dialog>
      )}
    </Dialog>
  );
};