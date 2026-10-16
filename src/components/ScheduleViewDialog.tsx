import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, List, Sheet as SheetIcon } from 'lucide-react';
import { ScheduleOutputView } from './Scheduler/ScheduleOutputView';
import { ScheduleCalendarContent } from './ScheduleCalendarContent';
import { ScheduleSheet } from '@/components/spreadsheet/ScheduleSheet';
import { PlanSheet } from '@/components/spreadsheet/PlanSheet';
import type { Phase } from '@/interfaces/Project';
import { SchedulingResult, Task } from '@/interfaces/Scheduling';
import { PlanningMode } from '@/interfaces/Scheduling';

interface TeamMember {
  id: string;
  name: string;
}

export type ScheduleViewTab = 'list' | 'calendar' | 'sheet';
export type SheetMode = 'schedule' | 'plan';

interface ScheduleViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedulingResult: SchedulingResult | null;
  planningMode: PlanningMode;
  schedulingTasks: Task[];
  teamMembers: TeamMember[];
  phases: Phase[];
  onScheduleChange?: (next: {
    schedulingResult: SchedulingResult;
    schedulingTasks: Task[];
  }) => void;
  onPhasesChange?: (phases: Phase[]) => void;
  allowStandardPlanEdits?: boolean;
  initialTab?: ScheduleViewTab;
  exportBasename?: string;
}

export const ScheduleViewDialog: React.FC<ScheduleViewDialogProps> = ({
  open,
  onOpenChange,
  schedulingResult,
  planningMode,
  schedulingTasks,
  teamMembers,
  phases,
  onScheduleChange,
  onPhasesChange,
  allowStandardPlanEdits = false,
  initialTab = 'list',
  exportBasename = 'schedule',
}) => {
  const [activeTab, setActiveTab] = useState<ScheduleViewTab>(initialTab);
  const [sheetMode, setSheetMode] = useState<SheetMode>('schedule');

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  if (!schedulingResult && activeTab !== 'sheet') {
    return null;
  }

  const showScheduleSheet = Boolean(schedulingResult && onScheduleChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-screen max-h-full w-full max-w-full flex-col overflow-hidden p-0 md:h-[95vh] md:max-w-[95vw] md:rounded-lg [&>button]:hidden">
        <DialogHeader className="flex-shrink-0 border-b bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-bold md:text-xl">Project Schedule</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-7 flex-shrink-0 px-2 text-[9px] md:text-xs"
            >
              Close
            </Button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as ScheduleViewTab)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-shrink-0 border-b px-4 pt-4 md:px-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="list" className="flex items-center gap-2" disabled={!schedulingResult}>
                  <List className="h-4 w-4" />
                  <span>List</span>
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex items-center gap-2" disabled={!schedulingResult}>
                  <CalendarIcon className="h-4 w-4" />
                  <span>Calendar</span>
                </TabsTrigger>
                <TabsTrigger value="sheet" className="flex items-center gap-2">
                  <SheetIcon className="h-4 w-4" />
                  <span>Sheet</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
              {schedulingResult && (
                <>
                  <TabsContent value="list" className="mt-0 h-full">
                    <ScheduleOutputView
                      schedulingResult={schedulingResult}
                      planningMode={planningMode}
                      schedulingTasks={schedulingTasks}
                      teamMembers={teamMembers}
                    />
                  </TabsContent>

                  <TabsContent value="calendar" className="mt-0 h-full">
                    <ScheduleCalendarContent
                      scheduledTasks={schedulingResult.scheduledTasks}
                      tasks={schedulingTasks}
                      workers={teamMembers.map((tm) => ({
                        id: tm.id,
                        name: tm.name,
                        type: 'owner' as const,
                        skillLevel: 'Intermediate' as const,
                        effortLevel: 'Medium' as const,
                        maxTotalHours: 40,
                        weekendsOnly: false,
                        weekdaysAfterFivePm: false,
                        workingHours: {
                          start: '09:00',
                          end: '17:00',
                        },
                        availability: [],
                      })) as any}
                    />
                  </TabsContent>
                </>
              )}

              <TabsContent value="sheet" className="mt-0 flex h-full min-h-[50vh] flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={sheetMode === 'schedule' ? 'default' : 'outline'}
                    onClick={() => setSheetMode('schedule')}
                    disabled={!showScheduleSheet}
                  >
                    Schedule
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={sheetMode === 'plan' ? 'default' : 'outline'}
                    onClick={() => setSheetMode('plan')}
                    disabled={!onPhasesChange}
                  >
                    Plan
                  </Button>
                </div>

                {sheetMode === 'schedule' && schedulingResult && onScheduleChange ? (
                  <ScheduleSheet
                    schedulingResult={schedulingResult}
                    schedulingTasks={schedulingTasks}
                    teamMembers={teamMembers}
                    phases={phases}
                    onChange={onScheduleChange}
                    exportBasename={exportBasename}
                  />
                ) : null}

                {sheetMode === 'plan' && onPhasesChange ? (
                  <PlanSheet
                    phases={phases}
                    onPhasesChange={onPhasesChange}
                    allowStandardEdits={allowStandardPlanEdits}
                    exportBasename={`${exportBasename}-plan`}
                  />
                ) : null}

                {sheetMode === 'schedule' && !showScheduleSheet ? (
                  <p className="text-sm text-muted-foreground">
                    Generate a schedule to edit it as a sheet.
                  </p>
                ) : null}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
