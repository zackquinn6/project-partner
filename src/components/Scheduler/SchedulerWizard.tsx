import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { QuickSchedulePresets, SchedulePreset } from './QuickSchedulePresets';
import { 
  Target, 
  AlertTriangle, 
  Calendar, 
  Clock,
  ChevronDown,
  ChevronRight,
  Settings,
  Zap,
  Plus,
  Trash2,
  Users,
  Brain,
  Info,
  Loader2,
  Shield
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, addDays } from 'date-fns';
import { PlanningMode, ScheduleTempo } from '@/interfaces/Scheduling';

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
  email?: string;
  phone?: string;
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
  };
}

interface SchedulerWizardProps {
  targetDate: string;
  setTargetDate: (date: string) => void;
  dropDeadDate: string;
  setDropDeadDate: (date: string) => void;
  planningMode: PlanningMode;
  setPlanningMode: (mode: PlanningMode) => void;
  scheduleTempo: ScheduleTempo;
  setScheduleTempo: (tempo: ScheduleTempo) => void;
  scheduleOptimizationMethod: 'single-piece-flow' | 'batch-flow';
  setScheduleOptimizationMethod: (method: 'single-piece-flow' | 'batch-flow') => void;
  onPresetApply: (preset: SchedulePreset) => void;
  teamMembers: TeamMember[];
  addTeamMember: () => void;
  removeTeamMember: (id: string) => void;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => void;
  openCalendar: (memberId: string) => void;
  onGenerateSchedule: () => void;
  isComputing: boolean;
  onApplyOptimization?: () => void;
  onAssignWork?: () => void;
  onOpenRiskManager?: () => void;
  riskTolerance?: 'low' | 'medium' | 'high';
  setRiskTolerance?: (tolerance: 'low' | 'medium' | 'high') => void;
  riskAdjustedDate?: Date | null;
}

export const SchedulerWizard: React.FC<SchedulerWizardProps> = ({
  targetDate,
  setTargetDate,
  dropDeadDate,
  setDropDeadDate,
  planningMode,
  setPlanningMode,
  scheduleTempo,
  setScheduleTempo,
  scheduleOptimizationMethod,
  setScheduleOptimizationMethod,
  onPresetApply,
  teamMembers,
  addTeamMember,
  removeTeamMember,
  updateTeamMember,
  openCalendar,
  onGenerateSchedule,
  isComputing,
  onApplyOptimization,
  onAssignWork,
  onOpenRiskManager,
  riskTolerance = 'medium',
  setRiskTolerance,
  riskAdjustedDate
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showIndividualAvailability, setShowIndividualAvailability] = useState(false);
  const [noWorkOnHolidays, setNoWorkOnHolidays] = useState(false);
  
  // Check if availability has been selected (either quick preset or individual)
  const hasAvailabilitySelected = teamMembers.some(member => 
    Object.keys(member.availability).length > 0 || 
    member.weekendsOnly || 
    member.weekdaysAfterFivePm
  );
  
  // Handler for customize availability button
  const handleCustomizeAvailability = () => {
    setShowAdvanced(true);
    // Scroll to team members section after a brief delay to allow expansion
    setTimeout(() => {
      const teamMembersSection = document.querySelector('[data-team-members-section]');
      if (teamMembersSection) {
        teamMembersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="space-y-4">
      {/* Step 1: Target Dates */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                1
              </div>
              <span>Target dates</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Target Completion
                </Label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1 h-9"
                />
                <p className="text-xs text-muted-foreground mt-1">Your goal date</p>
              </div>
              
              <div>
                <Label className="text-xs font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-destructive" />
                  Latest Acceptable Date
                </Label>
                <Input
                  type="date"
                  value={dropDeadDate}
                  onChange={(e) => setDropDeadDate(e.target.value)}
                  className="mt-1 h-9"
                />
                <p className="text-xs text-muted-foreground mt-1">Absolute deadline</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Availability */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                2
              </div>
              <span>Availability</span>
            </h3>
            
            {/* Quick Availability Presets */}
            <QuickSchedulePresets onPresetSelect={onPresetApply} teamMembers={teamMembers} />
            
            {/* No work on national holidays checkbox */}
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="no-holidays"
                checked={noWorkOnHolidays}
                onCheckedChange={(checked) => setNoWorkOnHolidays(checked as boolean)}
              />
              <Label htmlFor="no-holidays" className="text-xs cursor-pointer">
                No work on national holidays
              </Label>
            </div>
            
            {/* Customize Availability Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCustomizeAvailability}
              className="w-full h-9 text-xs mt-3"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Customize availability
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Tempo */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                3
              </div>
              <span>Tempo</span>
            </h3>
            
            <Label className="text-xs font-medium mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Schedule Tempo
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={scheduleTempo === 'fast_track' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScheduleTempo('fast_track')}
                className="h-auto flex flex-col items-start justify-start gap-1 p-3"
              >
                <div className="flex items-center gap-1.5 w-full">
                  <Zap className={`w-3.5 h-3.5 flex-shrink-0 ${scheduleTempo === 'fast_track' ? 'text-white' : ''}`} />
                  <span className={`text-xs font-medium ${scheduleTempo === 'fast_track' ? 'text-white' : ''}`}>Fast-track</span>
                </div>
                <span className={`text-[10px] text-left leading-tight ${scheduleTempo === 'fast_track' ? 'text-white/90' : 'text-muted-foreground'}`}>
                  Top 10% speed; best for skilled teams.
                </span>
              </Button>
              <Button
                variant={scheduleTempo === 'steady' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScheduleTempo('steady')}
                className="h-auto flex flex-col items-start justify-start gap-1 p-3"
              >
                <div className="flex items-center gap-1.5 w-full">
                  <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${scheduleTempo === 'steady' ? 'text-white' : ''}`} />
                  <span className={`text-xs font-medium ${scheduleTempo === 'steady' ? 'text-white' : ''}`}>Steady</span>
                </div>
                <span className={`text-[10px] text-left leading-tight ${scheduleTempo === 'steady' ? 'text-white/90' : 'text-muted-foreground'}`}>
                  Standard pace; balanced, not rushed.
                </span>
              </Button>
              <Button
                variant={scheduleTempo === 'extended' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScheduleTempo('extended')}
                className="h-auto flex flex-col items-start justify-start gap-1 p-3"
              >
                <div className="flex items-center gap-1.5 w-full">
                  <Settings className={`w-3.5 h-3.5 flex-shrink-0 ${scheduleTempo === 'extended' ? 'text-white' : ''}`} />
                  <span className={`text-xs font-medium ${scheduleTempo === 'extended' ? 'text-white' : ''}`}>Extended</span>
                </div>
                <span className={`text-[10px] text-left leading-tight ${scheduleTempo === 'extended' ? 'text-white/90' : 'text-muted-foreground'}`}>
                  Longest timelines; ideal for beginners or low‑urgency projects.
                </span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings (Collapsible) */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <Card>
          <CardContent className="p-4 pb-2">
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between p-0 h-auto mb-2"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Advanced Options</span>
                </div>
                {showAdvanced ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <p className="text-xs text-muted-foreground">
              Use this section to define specific schedule detail and work assignments.
            </p>
          </CardContent>
          
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4">
              <div className="space-y-4 pt-3 border-t">
                {/* Advanced Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {onAssignWork && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAssignWork}
                      className="h-9 text-xs"
                    >
                      <Users className="w-3.5 h-3.5 mr-1.5" />
                      Assign Work
                    </Button>
                  )}
                  {onOpenRiskManager && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenRiskManager}
                      className="h-9 text-xs"
                    >
                      <Shield className="w-3.5 h-3.5 mr-1.5" />
                      Risk Manager
                    </Button>
                  )}
                </div>
                
                {/* Risk Tolerance Setting */}
                {setRiskTolerance && (
                  <div className="pt-3 border-t">
                    <Label className="text-xs font-medium mb-2 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      Risk Tolerance
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={riskTolerance === 'low' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRiskTolerance('low')}
                        className="h-auto flex flex-col items-center justify-center gap-1 p-3"
                      >
                        <span className={`text-xs font-medium ${riskTolerance === 'low' ? 'text-white' : ''}`}>Low</span>
                        <span className={`text-[10px] text-center leading-tight ${riskTolerance === 'low' ? 'text-white/90' : 'text-muted-foreground'}`}>
                          Certainty required
                        </span>
                      </Button>
                      <Button
                        variant={riskTolerance === 'medium' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRiskTolerance('medium')}
                        className="h-auto flex flex-col items-center justify-center gap-1 p-3"
                      >
                        <span className={`text-xs font-medium ${riskTolerance === 'medium' ? 'text-white' : ''}`}>Medium</span>
                        <span className={`text-[10px] text-center leading-tight ${riskTolerance === 'medium' ? 'text-white/90' : 'text-muted-foreground'}`}>
                          Balanced approach
                        </span>
                      </Button>
                      <Button
                        variant={riskTolerance === 'high' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRiskTolerance('high')}
                        className="h-auto flex flex-col items-center justify-center gap-1 p-3"
                      >
                        <span className={`text-xs font-medium ${riskTolerance === 'high' ? 'text-white' : ''}`}>High</span>
                        <span className={`text-[10px] text-center leading-tight ${riskTolerance === 'high' ? 'text-white/90' : 'text-muted-foreground'}`}>
                          Optimistic planning
                        </span>
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Risk tolerance affects which risks are factored into the schedule timeline
                    </p>
                    {riskAdjustedDate && (
                      <div className="mt-2 p-2 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="text-xs text-muted-foreground">Risk-adjusted target date:</div>
                        <div className="text-sm font-bold text-primary">
                          {format(riskAdjustedDate, 'MMMM dd, yyyy')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div>
                  <Label className="text-xs font-medium mb-2">Planning Detail Level</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={planningMode === 'quick' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPlanningMode('quick')}
                      className="h-10 flex items-center justify-start gap-2 px-3"
                    >
                      <Brain className="w-3.5 h-3.5 flex-shrink-0" />
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-medium">Quick</span>
                        <span className="text-[10px] text-muted-foreground">Phases / milestones</span>
                      </div>
                    </Button>
                    <Button
                      variant={planningMode === 'standard' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPlanningMode('standard')}
                      className="h-10 flex items-center justify-start gap-2 px-3"
                    >
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-medium">Standard</span>
                        <span className="text-[10px] text-muted-foreground">Daily tasks</span>
                      </div>
                    </Button>
                    <Button
                      variant={planningMode === 'detailed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPlanningMode('detailed')}
                      className="h-10 flex items-center justify-start gap-2 px-3"
                    >
                      <Settings className="w-3.5 h-3.5 flex-shrink-0" />
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-medium">Detailed</span>
                        <span className="text-[10px] text-muted-foreground">Hour-by-hour</span>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Schedule Optimization Method */}
                <div className="pt-3 border-t">
                  <Label className="text-xs font-medium mb-2 flex items-center gap-1">
                    <Brain className="w-3.5 h-3.5" />
                    Schedule Optimization Method
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2 p-2 rounded-lg border hover:bg-accent/50 cursor-pointer" onClick={() => setScheduleOptimizationMethod('single-piece-flow')}>
                      <input
                        type="radio"
                        id="priority-single-piece-flow"
                        name="schedule-optimization-method"
                        value="single-piece-flow"
                        checked={scheduleOptimizationMethod === 'single-piece-flow'}
                        onChange={(e) => setScheduleOptimizationMethod(e.target.value as 'single-piece-flow' | 'batch-flow')}
                        className="h-4 w-4 mt-0.5"
                      />
                      <Label htmlFor="priority-single-piece-flow" className="text-xs font-normal cursor-pointer flex-1">
                        <span className="font-medium">Single-piece flow</span> - Fastest first room ready — you'll see progress right away.
                        <p className="text-[10px] text-muted-foreground mt-0.5">Complete all phases of a space before moving to the next space</p>
                        <p className="text-[9px] text-muted-foreground mt-1 font-medium">Delivers first finished room 60–80% faster</p>
                      </Label>
                    </div>
                    <div className="flex items-start space-x-2 p-2 rounded-lg border hover:bg-accent/50 cursor-pointer" onClick={() => setScheduleOptimizationMethod('batch-flow')}>
                      <input
                        type="radio"
                        id="priority-batch-flow"
                        name="schedule-optimization-method"
                        value="batch-flow"
                        checked={scheduleOptimizationMethod === 'batch-flow'}
                        onChange={(e) => setScheduleOptimizationMethod(e.target.value as 'single-piece-flow' | 'batch-flow')}
                        className="h-4 w-4 mt-0.5"
                      />
                      <Label htmlFor="priority-batch-flow" className="text-xs font-normal cursor-pointer flex-1">
                        <span className="font-medium">Batch flow</span> - Most efficient overall — but you won't see a finished room until the end.
                        <p className="text-[10px] text-muted-foreground mt-0.5">Complete each phase across all spaces before moving to the next phase</p>
                        <p className="text-[9px] text-muted-foreground mt-1 font-medium">Reduces total project duration by 15–25%</p>
                      </Label>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2 italic">
                    The trade-off is between visible progress early (single-piece) and overall efficiency (batch).
                  </p>
                  {onApplyOptimization && (
                    <Button
                      onClick={onApplyOptimization}
                      size="sm"
                      className="w-full mt-3 h-8 text-xs"
                      variant="outline"
                    >
                      Apply
                    </Button>
                  )}
                </div>
                
                {/* Team Members Section */}
                <div className="space-y-3 pt-3 border-t" data-team-members-section>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Team Members & Availability
                    </Label>
                    <Button onClick={addTeamMember} size="sm" variant="outline" className="h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" />
                      Add Member
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-2">
                          <Input 
                            placeholder="Name"
                            value={member.name}
                            onChange={(e) => updateTeamMember(member.id, { name: e.target.value })}
                            className="h-8 text-xs"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openCalendar(member.id)}
                            className="h-8 text-xs px-3 whitespace-nowrap"
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            Set Availability
                          </Button>
                          {teamMembers.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeTeamMember(member.id)}
                              className="h-8 px-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Generate Schedule Button - Always visible but disabled until requirements met */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Generate Schedule</h3>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full p-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1"
                      aria-label="Scheduling algorithm info"
                    >
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md text-xs">
                    <div className="space-y-2">
                      <p className="font-semibold">Scheduling Algorithm</p>
                      <p>The scheduler uses your settings to create an optimized schedule:</p>
                      <div className="space-y-1.5 mt-2">
                        <p><strong>Estimated Times:</strong></p>
                        <p className="ml-2">Uses time estimates from your customized project workflow (only applicable phases that you've included). Each step's low/medium/high time estimates are selected based on Schedule Tempo.</p>
                        <p className="mt-2"><strong>Schedule Tempo:</strong></p>
                        <ul className="list-disc list-inside space-y-0.5 ml-2">
                          <li><strong>Fast-track:</strong> Uses low end of time estimates (10th percentile) - best for skilled teams</li>
                          <li><strong>Steady:</strong> Uses medium time estimates (50th percentile) - balanced, not rushed</li>
                          <li><strong>Extended:</strong> Uses high end of time estimates (90th percentile) - ideal for beginners or low-urgency projects</li>
                        </ul>
                        <p className="mt-2"><strong>Team Member Availability:</strong></p>
                        <p className="ml-2">Schedules tasks based on each team member's availability calendar. The algorithm matches tasks to available time slots, respecting working hours, blackout dates, and site constraints.</p>
                        <p className="mt-2"><strong>Schedule Optimization Method:</strong></p>
                        <ul className="list-disc list-inside space-y-0.5 ml-2">
                          <li><strong>Single-piece flow:</strong> Fastest first room ready — you'll see progress right away. Completes all phases of a space before moving to the next space.</li>
                          <li><strong>Batch flow:</strong> Most efficient overall — but you won't see a finished room until the end. Completes each phase across all spaces before moving to the next phase.</li>
                        </ul>
                        <p className="mt-2"><strong>Planning Detail Level:</strong></p>
                        <ul className="list-disc list-inside space-y-0.5 ml-2">
                          <li><strong>Quick:</strong> Plans phases and major milestones</li>
                          <li><strong>Standard:</strong> Plans daily tasks (recommended)</li>
                          <li><strong>Detailed:</strong> Plans hour-by-hour tasks for each team member</li>
                        </ul>
                        <p className="mt-2"><strong>Resource Allocation:</strong></p>
                        <p className="ml-2">Allocates workers based on step requirements (workers needed per step). Steps with 0 workers still require duration but workers can be assigned elsewhere.</p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {!hasAvailabilitySelected && (
            <p className="text-xs text-muted-foreground">
              Select an availability option above to enable schedule generation
            </p>
          )}
          
          <Button 
            onClick={onGenerateSchedule} 
            className="w-full h-9 text-sm"
            disabled={isComputing || teamMembers.length === 0 || !targetDate || !hasAvailabilitySelected}
          >
            {isComputing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Computing...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Generate Schedule
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
