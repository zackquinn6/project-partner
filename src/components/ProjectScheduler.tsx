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
  Target
} from 'lucide-react';
import { format, addDays, parseISO, addHours } from 'date-fns';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { useResponsive } from '@/hooks/useResponsive';

interface ProjectSchedulerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  projectRun: ProjectRun;
}

interface ScenarioEstimate {
  name: string;
  multiplier: number;
  description: string;
  color: string;
}

interface TeamMember {
  id: string;
  name: string;
  skillLevel: 'novice' | 'intermediate' | 'expert';
  hoursAvailable: number;
  startDate?: Date;
  endDate?: Date;
}

interface ScheduledSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  phaseId?: string;
  operationId?: string;
  teamMemberIds: string[];
  sessionType: 'work' | 'planning' | 'review';
  estimatedHours: number;
  notes?: string;
}

interface WorkingHours {
  start: string;
  end: string;
  daysOfWeek: number[];
  weekendsOnly: boolean;
  afterHoursOnly: boolean;
}

const scenarios: ScenarioEstimate[] = [
  { name: 'Best Case', multiplier: 0.8, description: 'Everything goes smoothly', color: 'text-green-600' },
  { name: 'Typical', multiplier: 1.0, description: 'Standard timeline with normal delays', color: 'text-blue-600' },
  { name: 'Worst Case', multiplier: 1.5, description: 'Includes potential setbacks', color: 'text-red-600' }
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
  
  const [selectedScenario, setSelectedScenario] = useState<string>('Typical');
  
  // Team management
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: '1', name: 'You', skillLevel: 'intermediate', hoursAvailable: 4 }
  ]);
  
  // Working hours
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    start: '09:00',
    end: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
    weekendsOnly: false,
    afterHoursOnly: false
  });
  
  // Quick presets
  const [quickPreset, setQuickPreset] = useState<string>('');
  
  // Sessions
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([]);

  // Calculate time estimates with scenarios
  const timeEstimates = useMemo(() => {
    const projectSize = parseFloat(projectRun?.projectSize || '1') || 1;
    const scalingFactor = projectRun?.scalingFactor || 1;
    const skillMultiplier = projectRun?.skillLevelMultiplier || 1;

    return scenarios.map(scenario => {
      let totalWorkTime = 0;
      let totalLagTime = 0;
      const phases: any[] = [];

      project.phases.forEach(phase => {
        let phaseWorkTime = 0;
        let phaseLagTime = 0;
        let stepCount = 0;

        phase.operations.forEach(operation => {
          operation.steps.forEach(step => {
            stepCount++;
            const baseWorkTime = step.timeEstimation?.variableTime?.medium || 1;
            const baseLagTime = step.timeEstimation?.lagTime?.medium || 0;

            const adjustedWorkTime = baseWorkTime * projectSize * scalingFactor * skillMultiplier * scenario.multiplier;
            const adjustedLagTime = baseLagTime * projectSize * scalingFactor * scenario.multiplier;

            phaseWorkTime += adjustedWorkTime;
            phaseLagTime += adjustedLagTime;
          });
        });

        phases.push({
          phaseId: phase.id,
          phaseName: phase.name,
          workTime: phaseWorkTime,
          lagTime: phaseLagTime,
          stepCount
        });

        totalWorkTime += phaseWorkTime;
        totalLagTime += phaseLagTime;
      });

      return {
        scenario: scenario.name,
        totalWorkTime,
        totalLagTime,
        totalTime: totalWorkTime + totalLagTime,
        phases,
        color: scenario.color,
        description: scenario.description
      };
    });
  }, [project, projectRun]);

  // Handle weekends only toggle
  const handleWeekendsOnly = (checked: boolean) => {
    setWorkingHours(prev => ({
      ...prev,
      weekendsOnly: checked,
      daysOfWeek: checked ? [0, 6] : [1, 2, 3, 4, 5],
      afterHoursOnly: checked ? false : prev.afterHoursOnly
    }));
  };

  // Handle after hours only toggle
  const handleAfterHoursOnly = (checked: boolean) => {
    setWorkingHours(prev => ({
      ...prev,
      afterHoursOnly: checked,
      start: checked ? '17:00' : '09:00',
      end: checked ? '22:00' : '17:00',
      weekendsOnly: checked ? false : prev.weekendsOnly
    }));
  };

  // Calculate target completion date
  const targetCompletionDate = useMemo(() => {
    const estimate = timeEstimates.find(e => e.scenario === selectedScenario);
    if (!estimate) return null;
    
    const workDays = Math.ceil(estimate.totalWorkTime / 8); // Assume 8 hours per work day
    const startDate = projectRun.startDate ? new Date(projectRun.startDate) : new Date();
    
    // Add business days
    let completionDate = new Date(startDate);
    let daysAdded = 0;
    
    while (daysAdded < workDays) {
      completionDate = addDays(completionDate, 1);
      // Skip weekends unless working weekends only
      if (workingHours.weekendsOnly) {
        if (completionDate.getDay() === 0 || completionDate.getDay() === 6) {
          daysAdded++;
        }
      } else {
        if (completionDate.getDay() !== 0 && completionDate.getDay() !== 6) {
          daysAdded++;
        }
      }
    }
    
    return completionDate;
  }, [timeEstimates, selectedScenario, projectRun.startDate, workingHours.weekendsOnly]);

  // Add team member
  const addTeamMember = () => {
    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: 'New Team Member',
      skillLevel: 'intermediate',
      hoursAvailable: 4
    };
    setTeamMembers([...teamMembers, newMember]);
  };

  // Generate automatic schedule
  const generateSchedule = () => {
    const estimate = timeEstimates.find(e => e.scenario === selectedScenario);
    if (!estimate) return;

    const sessions: ScheduledSession[] = [];
    let currentDate = new Date();
    
    // Find next available working day
    while (!workingHours.daysOfWeek.includes(currentDate.getDay())) {
      currentDate = addDays(currentDate, 1);
    }

    estimate.phases.forEach(phase => {
      let remainingHours = phase.workTime;
      
      while (remainingHours > 0) {
        const dailyCapacity = teamMembers.reduce((sum, member) => sum + member.hoursAvailable, 0);
        const sessionHours = Math.min(remainingHours, dailyCapacity);
        
        sessions.push({
          id: `session-${sessions.length}`,
          date: format(currentDate, 'yyyy-MM-dd'),
          startTime: workingHours.start,
          endTime: format(addHours(parseISO(`2000-01-01T${workingHours.start}`), sessionHours), 'HH:mm'),
          phaseId: phase.phaseId,
          teamMemberIds: teamMembers.map(m => m.id),
          sessionType: 'work',
          estimatedHours: sessionHours,
          notes: `${phase.phaseName} - ${Math.ceil(remainingHours)}h remaining`
        });

        remainingHours -= sessionHours;
        
        // Move to next working day
        do {
          currentDate = addDays(currentDate, 1);
        } while (!workingHours.daysOfWeek.includes(currentDate.getDay()));
      }
    });

    setScheduledSessions(sessions);
    toast({
      title: "Schedule generated",
      description: `Created ${sessions.length} work sessions for ${selectedScenario.toLowerCase()} scenario.`
    });
  };

  // Save schedule to project run
  const saveSchedule = async () => {
    try {
      const updatedProjectRun = {
        ...projectRun,
        calendar_integration: {
          scheduledDays: scheduledSessions.reduce((acc, session) => {
            if (!acc[session.date]) {
              acc[session.date] = {
                date: session.date,
                timeSlots: []
              };
            }
            acc[session.date].timeSlots.push({
              startTime: session.startTime,
              endTime: session.endTime,
              phaseId: session.phaseId,
              operationId: session.operationId
            });
            return acc;
          }, {} as Record<string, any>),
          preferences: {
            preferredStartTime: workingHours.start,
            maxHoursPerDay: teamMembers.reduce((sum, member) => sum + member.hoursAvailable, 0),
            preferredDays: workingHours.daysOfWeek
          }
        }
      };

      await updateProjectRun(updatedProjectRun);
      
      toast({
        title: "Schedule saved",
        description: "Your project schedule has been saved successfully."
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
              <p className="text-xs text-muted-foreground">{project.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {/* Target Completion Date */}
            {targetCompletionDate && (
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Target Completion Date</p>
                      <p className="text-lg font-semibold text-primary">
                        {format(targetCompletionDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Time Estimates Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="text-base font-semibold">Time Estimates & Scenarios</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {timeEstimates.map((estimate) => (
                  <Card 
                    key={estimate.scenario} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedScenario === estimate.scenario 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`} 
                    onClick={() => setSelectedScenario(estimate.scenario)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className={`text-sm font-medium ${estimate.color}`}>
                          {estimate.scenario}
                        </CardTitle>
                        {selectedScenario === estimate.scenario && (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{estimate.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs">Work:</span>
                        <Badge variant="secondary" className="text-xs h-5">{formatTime(estimate.totalWorkTime)}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs">Wait:</span>
                        <Badge variant="outline" className="text-xs h-5">{formatTime(estimate.totalLagTime)}</Badge>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center font-medium">
                        <span className="text-xs">Total:</span>
                        <Badge className="bg-primary text-xs h-5">{formatTime(estimate.totalTime)}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Working Hours Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-primary" />
                <h3 className="text-base font-semibold">Working Hours & Availability</h3>
              </div>
              
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="weekends-only"
                        checked={workingHours.weekendsOnly}
                        onCheckedChange={handleWeekendsOnly}
                      />
                      <Label htmlFor="weekends-only" className="text-sm font-medium">
                        Weekends Only
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="after-hours"
                        checked={workingHours.afterHoursOnly}
                        onCheckedChange={handleAfterHoursOnly}
                      />
                      <Label htmlFor="after-hours" className="text-sm font-medium">
                        After 5pm Only
                      </Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Start Time</Label>
                      <Input 
                        type="time" 
                        value={workingHours.start}
                        onChange={(e) => setWorkingHours({...workingHours, start: e.target.value})}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">End Time</Label>
                      <Input 
                        type="time" 
                        value={workingHours.end}
                        onChange={(e) => setWorkingHours({...workingHours, end: e.target.value})}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Team Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-semibold">Team Members</h3>
                </div>
                <Button onClick={addTeamMember} size="sm" className="h-8">
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
              
              <div className="space-y-2">
                {teamMembers.map((member, index) => (
                  <Card key={member.id} className="border border-border">
                    <CardContent className="p-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Name</Label>
                          <Input 
                            value={member.name}
                            onChange={(e) => {
                              const updated = [...teamMembers];
                              updated[index].name = e.target.value;
                              setTeamMembers(updated);
                            }}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Skill Level</Label>
                          <Select 
                            value={member.skillLevel}
                            onValueChange={(value: any) => {
                              const updated = [...teamMembers];
                              updated[index].skillLevel = value;
                              setTeamMembers(updated);
                            }}
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
                          <Label className="text-xs font-medium">Hours/Day</Label>
                          <Input 
                            type="number"
                            min="1"
                            max="12"
                            value={member.hoursAvailable}
                            onChange={(e) => {
                              const updated = [...teamMembers];
                              updated[index].hoursAvailable = parseInt(e.target.value) || 1;
                              setTeamMembers(updated);
                            }}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-end">
                          {teamMembers.length > 1 && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setTeamMembers(teamMembers.filter((_, i) => i !== index))}
                              className="h-8 w-8 p-0"
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

            {/* Schedule Generation Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <h3 className="text-base font-semibold">Generate Schedule</h3>
              </div>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">
                        Selected scenario: <strong>{selectedScenario}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {scheduledSessions.length > 0 
                          ? `${scheduledSessions.length} sessions scheduled`
                          : 'No schedule generated yet'
                        }
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {scheduledSessions.length > 0 && (
                        <Button 
                          variant="outline" 
                          onClick={() => setScheduledSessions([])}
                          className="h-8"
                        >
                          Clear
                        </Button>
                      )}
                      <Button 
                        onClick={generateSchedule} 
                        className="h-8"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Generate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Schedule Preview */}
            {scheduledSessions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-semibold">Schedule Preview</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {scheduledSessions.slice(0, 10).map((session) => (
                    <Card key={session.id} className="border border-border">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="text-xs h-5">{format(parseISO(session.date + 'T00:00:00'), 'MMM d')}</Badge>
                          <Badge className="bg-primary/10 text-primary text-xs h-5">
                            {session.startTime} - {session.endTime}
                          </Badge>
                        </div>
                        <p className="text-xs font-medium">{session.notes}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {session.estimatedHours}h session
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                  {scheduledSessions.length > 10 && (
                    <Card className="border-dashed">
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          +{scheduledSessions.length - 10} more sessions
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 p-4 border-t bg-muted/20">
          <div className="text-xs text-muted-foreground">
            {selectedScenario} scenario • {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8">
              Cancel
            </Button>
            <Button 
              onClick={saveSchedule} 
              disabled={scheduledSessions.length === 0}
              className="h-8"
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};