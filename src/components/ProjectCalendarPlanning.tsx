import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarIcon, Clock, CheckCircle, Plus, AlertTriangle } from 'lucide-react';
import { format, addDays, parseISO, isSameDay, startOfDay } from 'date-fns';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/components/ui/use-toast';

interface ProjectCalendarPlanningProps {
  project: Project;
  projectRun: ProjectRun;
  scenario: 'low' | 'medium' | 'high';
  onComplete: () => void;
  isCompleted: boolean;
}

interface PhaseScheduleItem {
  phaseId: string;
  phaseName: string;
  workTime: number; // hours
  lagTime: number; // hours
  totalTime: number;
  stepCount: number;
}

interface ScheduledSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  phaseId?: string;
  operationId?: string;
  sessionType: 'work' | 'wait' | 'planning';
  estimatedHours: number;
  notes?: string;
}

export const ProjectCalendarPlanning: React.FC<ProjectCalendarPlanningProps> = ({
  project,
  projectRun,
  scenario,
  onComplete,
  isCompleted
}) => {
  const { updateProjectRun } = useProject();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableHoursPerDay, setAvailableHoursPerDay] = useState(projectRun.availableHoursPerDay || 4);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState(projectRun.workingDaysPerWeek || 2);
  const [startDate, setStartDate] = useState<Date>(projectRun.startDate ? new Date(projectRun.startDate) : new Date());
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string>('');

  // Calculate phase time estimates based on scenario
  const phaseEstimates = useMemo(() => {
    const phases: PhaseScheduleItem[] = [];

    project.phases.forEach(phase => {
      let phaseWorkTime = 0;
      let phaseLagTime = 0;
      let stepCount = 0;

      phase.operations.forEach(operation => {
        operation.steps.forEach(step => {
          stepCount++;
          
          const workTime = step.timeEstimation?.variableTime?.[scenario] || 0;
          const lagTime = step.timeEstimation?.lagTime?.[scenario] || 0;

          // Apply scaling factors
          const projectSize = parseFloat(projectRun.projectSize || '1') || 1;
          const scalingFactor = projectRun.scalingFactor || 1;
          const skillMultiplier = projectRun.skillLevelMultiplier || 1;

          const scaledWorkTime = workTime * projectSize * scalingFactor * skillMultiplier;
          
          phaseWorkTime += scaledWorkTime;
          phaseLagTime += lagTime;
        });
      });

      phases.push({
        phaseId: phase.id || phase.name,
        phaseName: phase.name,
        workTime: phaseWorkTime,
        lagTime: phaseLagTime,
        totalTime: phaseWorkTime + phaseLagTime,
        stepCount
      });
    });

    return phases;
  }, [project, projectRun, scenario]);

  const totalProjectTime = useMemo(() => {
    return phaseEstimates.reduce((total, phase) => total + phase.totalTime, 0);
  }, [phaseEstimates]);

  const estimatedCalendarDays = useMemo(() => {
    const totalWorkHours = phaseEstimates.reduce((total, phase) => total + phase.workTime, 0);
    return Math.ceil(totalWorkHours / (availableHoursPerDay * workingDaysPerWeek));
  }, [phaseEstimates, availableHoursPerDay, workingDaysPerWeek]);

  // Load existing calendar integration if available
  useEffect(() => {
    if (projectRun.calendar_integration?.scheduledDays) {
      const sessions: ScheduledSession[] = [];
      Object.entries(projectRun.calendar_integration.scheduledDays).forEach(([date, dayData]) => {
        dayData.timeSlots.forEach((slot, index) => {
          sessions.push({
            id: `${date}-${index}`,
            date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            phaseId: slot.phaseId,
            operationId: slot.operationId,
            sessionType: 'work',
            estimatedHours: calculateHours(slot.startTime, slot.endTime)
          });
        });
      });
      setScheduledSessions(sessions);
    }
  }, [projectRun]);

  const calculateHours = (startTime: string, endTime: string): number => {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  };

  const formatTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`;
    } else if (hours < 24) {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  };

  const getScenarioColor = (scenario: string) => {
    switch (scenario) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const addWorkSession = () => {
    if (!selectedDate || !selectedPhase) return;

    const newSession: ScheduledSession = {
      id: `${format(selectedDate, 'yyyy-MM-dd')}-${Date.now()}`,
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: `${9 + availableHoursPerDay}:00`.padStart(5, '0'),
      phaseId: selectedPhase,
      sessionType: 'work',
      estimatedHours: availableHoursPerDay
    };

    setScheduledSessions(prev => [...prev, newSession]);
  };

  const removeSession = (sessionId: string) => {
    setScheduledSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  const saveCalendarPlan = async () => {
    try {
      // Convert sessions to calendar integration format
      const scheduledDays: Record<string, any> = {};
      
      scheduledSessions.forEach(session => {
        if (!scheduledDays[session.date]) {
          scheduledDays[session.date] = {
            date: session.date,
            timeSlots: []
          };
        }
        
        scheduledDays[session.date].timeSlots.push({
          startTime: session.startTime,
          endTime: session.endTime,
          phaseId: session.phaseId,
          operationId: session.operationId
        });
      });

      const updatedProjectRun = {
        ...projectRun,
        availableHoursPerDay,
        workingDaysPerWeek,
        calendar_integration: {
          scheduledDays,
          preferences: {
            preferredStartTime: '09:00',
            maxHoursPerDay: availableHoursPerDay,
            preferredDays: [1, 2, 3, 4, 5]
          }
        }
      };

      await updateProjectRun(updatedProjectRun);
      onComplete();
      
      toast({
        title: "Calendar Plan Saved",
        description: "Your project schedule has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save calendar plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateAutomaticSchedule = () => {
    const sessions: ScheduledSession[] = [];
    let currentDate = new Date(startDate);
    let dayCount = 0;

    phaseEstimates.forEach(phase => {
      let remainingWorkHours = phase.workTime;
      
      while (remainingWorkHours > 0) {
        // Skip to next working day if needed
        while (dayCount % 7 >= workingDaysPerWeek) {
          currentDate = addDays(currentDate, 1);
          dayCount++;
        }

        const hoursForThisSession = Math.min(remainingWorkHours, availableHoursPerDay);
        const endHour = 9 + hoursForThisSession;

        sessions.push({
          id: `auto-${format(currentDate, 'yyyy-MM-dd')}-${sessions.length}`,
          date: format(currentDate, 'yyyy-MM-dd'),
          startTime: '09:00',
          endTime: `${Math.floor(endHour)}:${((endHour % 1) * 60).toString().padStart(2, '0')}`,
          phaseId: phase.phaseId,
          sessionType: 'work',
          estimatedHours: hoursForThisSession,
          notes: `Auto-scheduled: ${phase.phaseName}`
        });

        remainingWorkHours -= hoursForThisSession;
        currentDate = addDays(currentDate, 1);
        dayCount++;
      }

      // Add lag time if needed
      if (phase.lagTime > 0) {
        currentDate = addDays(currentDate, Math.ceil(phase.lagTime / 24));
      }
    });

    setScheduledSessions(sessions);
  };

  const getDateSessions = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return scheduledSessions.filter(session => session.date === dateStr);
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Project Calendar Planning
            <Badge className={getScenarioColor(scenario)}>
              {scenario === 'low' ? 'Best Case' : scenario === 'medium' ? 'Typical' : 'Worst Case'}
            </Badge>
            {isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Planning Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Work Time</p>
              <p className="font-semibold text-blue-600">
                {formatTime(phaseEstimates.reduce((total, phase) => total + phase.workTime, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Wait Time</p>
              <p className="font-semibold text-yellow-600">
                {formatTime(phaseEstimates.reduce((total, phase) => total + phase.lagTime, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Calendar Weeks</p>
              <p className="font-semibold">{estimatedCalendarDays}w</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Sessions</p>
              <p className="font-semibold">{scheduledSessions.length}</p>
            </div>
          </div>

          {/* Planning Controls */}
          <div className="grid md:grid-cols-3 gap-4 p-4 border rounded-lg">
            <div>
              <Label htmlFor="hoursPerDay">Hours Per Day</Label>
              <Input
                id="hoursPerDay"
                type="number"
                min="1"
                max="12"
                value={availableHoursPerDay}
                onChange={(e) => setAvailableHoursPerDay(parseInt(e.target.value) || 4)}
              />
            </div>
            <div>
              <Label htmlFor="daysPerWeek">Days Per Week</Label>
              <Input
                id="daysPerWeek"
                type="number"
                min="1"
                max="7"
                value={workingDaysPerWeek}
                onChange={(e) => setWorkingDaysPerWeek(parseInt(e.target.value) || 2)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={generateAutomaticSchedule}
                className="w-full"
                variant="outline"
              >
                Auto-Schedule
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar View */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    scheduled: (date) => getDateSessions(date).length > 0,
                    workDay: (date) => getDateSessions(date).some(s => s.sessionType === 'work')
                  }}
                  modifiersStyles={{
                    scheduled: { 
                      backgroundColor: 'hsl(var(--primary))', 
                      color: 'hsl(var(--primary-foreground))',
                      borderRadius: '6px'
                    },
                    workDay: { 
                      backgroundColor: 'hsl(var(--primary))', 
                      color: 'hsl(var(--primary-foreground))',
                      fontWeight: 'bold'
                    }
                  }}
                  className="rounded-md border pointer-events-auto"
                />
              </CardContent>
            </Card>

            {/* Schedule Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Schedule for {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select Date'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      {phaseEstimates.map(phase => (
                        <SelectItem key={phase.phaseId} value={phase.phaseId}>
                          {phase.phaseName} ({formatTime(phase.workTime)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={addWorkSession}
                    disabled={!selectedDate || !selectedPhase}
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedDate && getDateSessions(selectedDate).map(session => {
                    const phase = phaseEstimates.find(p => p.phaseId === session.phaseId);
                    return (
                      <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{phase?.phaseName}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.startTime} - {session.endTime} ({formatTime(session.estimatedHours)})
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSession(session.id)}
                        >
                          ×
                        </Button>
                      </div>
                    );
                  })}
                  
                  {selectedDate && getDateSessions(selectedDate).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No sessions scheduled for this date
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Phase Schedule Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Phase Schedule Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {phaseEstimates.map(phase => {
                  const phaseSessions = scheduledSessions.filter(s => s.phaseId === phase.phaseId);
                  const scheduledHours = phaseSessions.reduce((total, s) => total + s.estimatedHours, 0);
                  const isComplete = scheduledHours >= phase.workTime;
                  
                  return (
                    <div key={phase.phaseId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium flex items-center gap-2">
                          {phase.phaseName}
                          {isComplete && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(scheduledHours)} / {formatTime(phase.workTime)} scheduled
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold">{phaseSessions.length} sessions</p>
                        <p className="text-sm text-muted-foreground">
                          {phase.stepCount} steps
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Planning Recommendations */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Planning Tips
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>• Schedule prep tasks during shorter time slots</p>
              <p>• Reserve longer sessions for major construction work</p>
              <p>• Plan material delivery 1-2 days before you need them</p>
              <p>• Leave buffer time between phases for unexpected delays</p>
              <p>• Consider weather conditions for outdoor work</p>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button onClick={saveCalendarPlan} className="flex-1">
              Save Calendar Plan
            </Button>
            {isCompleted && (
              <Badge variant="secondary" className="px-4 py-2">
                Planning Complete
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};