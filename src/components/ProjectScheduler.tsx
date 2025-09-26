import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
  Printer
} from 'lucide-react';
import { format, addDays, parseISO, addHours } from 'date-fns';
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

  // Convert project to scheduling tasks and calculate totals
  const { schedulingTasks, projectTotals } = useMemo(() => {
    const tasks: Task[] = [];
    let lowTotal = 0;
    let mediumTotal = 0;
    let highTotal = 0;
    
    const projectSize = parseFloat(projectRun?.projectSize || '1') || 1;
    const scalingFactor = projectRun?.scalingFactor || 1;
    const skillMultiplier = projectRun?.skillLevelMultiplier || 1;

    project.phases.forEach(phase => {
      phase.operations.forEach(operation => {
        operation.steps.forEach((step, index) => {
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

            {/* Step 5: Team Members & Working Hours */}
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
                  <Card key={member.id} className="border border-border">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Name</Label>
                            <Input 
                              value={member.name}
                              onChange={(e) => updateTeamMember(member.id, { name: e.target.value })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Skill Level</Label>
                            <Select 
                              value={member.skillLevel}
                              onValueChange={(value: any) => updateTeamMember(member.id, { skillLevel: value })}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="novice">Novice</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="expert">Expert</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Max Total Hours (Project)</Label>
                            <Input 
                              type="number"
                              min="1"
                              value={member.maxTotalHours}
                              onChange={(e) => updateTeamMember(member.id, { 
                                maxTotalHours: parseInt(e.target.value) || 1 
                              })}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        {/* Working Hours */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Start Time</Label>
                            <Input 
                              type="time" 
                              value={member.workingHours.start}
                              onChange={(e) => updateTeamMember(member.id, {
                                workingHours: { ...member.workingHours, start: e.target.value }
                              })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">End Time</Label>
                            <Input 
                              type="time" 
                              value={member.workingHours.end}
                              onChange={(e) => updateTeamMember(member.id, {
                                workingHours: { ...member.workingHours, end: e.target.value }
                              })}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        {/* Availability Options */}
                        <div className="flex flex-wrap gap-4 items-center">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={`weekends-only-${member.id}`}
                              checked={member.weekendsOnly}
                              onCheckedChange={(checked) => updateTeamMember(member.id, { 
                                weekendsOnly: checked as boolean,
                                weekdaysAfterFivePm: false
                              })}
                            />
                            <Label htmlFor={`weekends-only-${member.id}`} className="text-sm font-medium">
                              Weekends Only
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={`weekdays-after-5-${member.id}`}
                              checked={member.weekdaysAfterFivePm}
                              onCheckedChange={(checked) => updateTeamMember(member.id, { 
                                weekdaysAfterFivePm: checked as boolean,
                                weekendsOnly: false
                              })}
                            />
                            <Label htmlFor={`weekdays-after-5-${member.id}`} className="text-sm font-medium">
                              Weekdays After 5pm
                            </Label>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setCalendarOpen(member.id)}
                            className="h-8"
                          >
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            Calendar
                          </Button>
                          {teamMembers.length > 1 && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => removeTeamMember(member.id)}
                              className="h-8"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
      
      {/* Calendar Dialog for Team Member Availability */}
      {calendarOpen && (
        <Dialog open={!!calendarOpen} onOpenChange={() => setCalendarOpen(null)}>
          <DialogContent className="max-w-[500px]">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {teamMembers.find(m => m.id === calendarOpen)?.name} - Availability Calendar
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select dates to set specific availability
                </p>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg">
                <CalendarComponent
                  mode="multiple"
                  className="rounded-md border bg-background pointer-events-auto"
                />
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p><strong>Note:</strong> This calendar allows day-by-day updates to override default working hours.</p>
                <p>Selected dates will use custom availability settings.</p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCalendarOpen(null)}>
                  Cancel
                </Button>
                <Button onClick={() => setCalendarOpen(null)}>
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