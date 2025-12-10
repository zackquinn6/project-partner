import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { X, Calendar as CalendarIcon, List } from 'lucide-react';
import { ScheduleOutputView } from './Scheduler/ScheduleOutputView';
import { ScheduleCalendarContent } from './ScheduleCalendarContent';
import { SchedulingResult, Task } from '@/interfaces/Scheduling';
import { PlanningMode } from '@/interfaces/Scheduling';

interface TeamMember {
  id: string;
  name: string;
}

interface ScheduleViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedulingResult: SchedulingResult | null;
  planningMode: PlanningMode;
  schedulingTasks: Task[];
  teamMembers: TeamMember[];
}

export const ScheduleViewDialog: React.FC<ScheduleViewDialogProps> = ({
  open,
  onOpenChange,
  schedulingResult,
  planningMode,
  schedulingTasks,
  teamMembers
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [calendarViewOpen, setCalendarViewOpen] = useState(false);

  if (!schedulingResult) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[95vw] md:h-[95vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="px-4 md:px-6 py-4 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg md:text-xl font-bold">Project Schedule</DialogTitle>
                <DialogDescription className="text-sm md:text-base mt-1">
                  View your generated schedule in list or calendar format
                </DialogDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onOpenChange(false)} 
                className="h-7 px-2 text-[9px] md:text-xs flex-shrink-0"
              >
                Close
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'calendar')} className="flex-1 flex flex-col min-h-0">
              <div className="px-4 md:px-6 pt-4 border-b flex-shrink-0">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <List className="w-4 h-4" />
                    <span>Schedule List</span>
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Calendar View</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4">
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
                    workers={teamMembers.map(tm => ({
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
                        end: '17:00'
                      },
                      availability: []
                    }))}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

