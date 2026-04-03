import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Clock, Calendar as CalendarIcon, Settings, Plus, Edit2, Trash2 } from 'lucide-react';
import { UserCalendar, TimeSlot } from '@/interfaces/AdvancedFeatures';
import { useToast } from '@/components/ui/use-toast';
import { format, parseISO, addDays, startOfWeek, endOfWeek } from 'date-fns';

interface CalendarSchedulerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const daysOfWeek = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const CalendarScheduler: React.FC<CalendarSchedulerProps> = ({
  open,
  onOpenChange,
  userId
}) => {
  const { toast } = useToast();
  const [calendar, setCalendar] = useState<UserCalendar>({
    id: '',
    userId,
    availableDays: {},
    recurringSchedule: {},
    blackoutDates: [],
    preferences: {
      preferredStartTime: '09:00',
      maxHoursPerDay: 4,
      preferredDays: [1, 2, 3, 4, 5], // Monday-Friday
      breakDuration: 15,
    }
  });
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showTimeSlotEditor, setShowTimeSlotEditor] = useState(false);
  const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);
  const [currentView, setCurrentView] = useState<'calendar' | 'recurring' | 'preferences'>('calendar');

  // Load user calendar on mount
  useEffect(() => {
    loadUserCalendar();
  }, [userId]);

  const loadUserCalendar = async () => {
    // TODO: Load from Supabase
    // For now, use default structure
  };

  const saveCalendar = async () => {
    // TODO: Save to Supabase
      };

  const addTimeSlot = (date: string, timeSlot: TimeSlot) => {
    setCalendar(prev => ({
      ...prev,
      availableDays: {
        ...prev.availableDays,
        [date]: {
          ...prev.availableDays[date],
          available: true,
          timeSlots: [...(prev.availableDays[date]?.timeSlots || []), timeSlot]
        }
      }
    }));
  };

  const removeTimeSlot = (date: string, index: number) => {
    setCalendar(prev => ({
      ...prev,
      availableDays: {
        ...prev.availableDays,
        [date]: {
          ...prev.availableDays[date],
          timeSlots: prev.availableDays[date]?.timeSlots.filter((_, i) => i !== index) || []
        }
      }
    }));
  };

  const addRecurringSchedule = (dayOfWeek: number, timeSlot: TimeSlot) => {
    setCalendar(prev => ({
      ...prev,
      recurringSchedule: {
        ...prev.recurringSchedule,
        [dayOfWeek]: [...(prev.recurringSchedule[dayOfWeek] || []), timeSlot]
      }
    }));
  };

  const getProjectScheduleSuggestion = () => {
    const totalAvailableHours = Object.values(calendar.availableDays).reduce((total, day) => {
      return total + (day.timeSlots?.reduce((dayTotal, slot) => {
        const start = new Date(`1970-01-01T${slot.startTime}`);
        const end = new Date(`1970-01-01T${slot.endTime}`);
        return dayTotal + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0) || 0);
    }, 0);

    return {
      totalHours: totalAvailableHours,
      estimatedProjectCapacity: Math.floor(totalAvailableHours / 4), // Assuming 4 hour average projects
      nextAvailableDate: findNextAvailableDate(),
      recommendedSchedule: generateRecommendedSchedule()
    };
  };

  const findNextAvailableDate = (): string => {
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = addDays(today, i);
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const dayOfWeek = checkDate.getDay();
      
      if (calendar.availableDays[dateStr]?.available || 
          calendar.recurringSchedule[dayOfWeek]?.length > 0) {
        return dateStr;
      }
    }
    return format(today, 'yyyy-MM-dd');
  };

  const generateRecommendedSchedule = () => {
    return [
      "Schedule prep tasks on weekdays when you have 1-2 hour slots",
      "Reserve longer weekend sessions for major construction work",
      "Plan material delivery 1 day before you need them",
      "Leave buffer time between phases for unexpected delays"
    ];
  };

  const TimeSlotEditor = () => (
    <Dialog open={showTimeSlotEditor} onOpenChange={setShowTimeSlotEditor}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingTimeSlot ? 'Edit Time Slot' : 'Add Time Slot'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                defaultValue={editingTimeSlot?.startTime || '09:00'}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                defaultValue={editingTimeSlot?.endTime || '13:00'}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="slotType">Type</Label>
            <Select defaultValue={editingTimeSlot?.type || 'work'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work">Work Time</SelectItem>
                <SelectItem value="break">Break</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                // TODO: Save time slot
                setShowTimeSlotEditor(false);
                setEditingTimeSlot(null);
              }}
              className="flex-1"
            >
              Save
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowTimeSlotEditor(false);
                setEditingTimeSlot(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const CalendarView = () => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => 
                calendar.blackoutDates.includes(format(date, 'yyyy-MM-dd'))
              }
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
            </CardTitle>
            <CardDescription>
              Manage your availability for this date
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDate && (
              <>
                <Button 
                  onClick={() => setShowTimeSlotEditor(true)}
                  className="w-full"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Slot
                </Button>
                
                <div className="space-y-2">
                  {calendar.availableDays[format(selectedDate, 'yyyy-MM-dd')]?.timeSlots?.map((slot, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{slot.startTime} - {slot.endTime}</span>
                        <Badge variant={slot.type === 'work' ? 'default' : 'secondary'}>
                          {slot.type}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingTimeSlot(slot);
                            setShowTimeSlotEditor(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeTimeSlot(format(selectedDate, 'yyyy-MM-dd'), index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      No time slots scheduled for this date
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Scheduling Insights</CardTitle>
          <CardDescription>
            Based on your availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const suggestion = getProjectScheduleSuggestion();
            return (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Capacity Analysis</h4>
                  <ul className="space-y-1 text-sm">
                    <li>Total available hours: <strong>{suggestion.totalHours.toFixed(1)}</strong></li>
                    <li>Project capacity: <strong>{suggestion.estimatedProjectCapacity} projects/month</strong></li>
                    <li>Next available: <strong>{format(parseISO(suggestion.nextAvailableDate), 'MMM d')}</strong></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Recommendations</h4>
                  <ul className="space-y-1 text-sm">
                    {suggestion.recommendedSchedule.map((rec, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-primary">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Project Calendar & Scheduling
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex gap-2">
              <Button
                variant={currentView === 'calendar' ? 'default' : 'outline'}
                onClick={() => setCurrentView('calendar')}
                size="sm"
              >
                Calendar
              </Button>
              <Button
                variant={currentView === 'recurring' ? 'default' : 'outline'}
                onClick={() => setCurrentView('recurring')}
                size="sm"
              >
                Recurring Schedule
              </Button>
              <Button
                variant={currentView === 'preferences' ? 'default' : 'outline'}
                onClick={() => setCurrentView('preferences')}
                size="sm"
              >
                Preferences
              </Button>
            </div>

            {currentView === 'calendar' && <CalendarView />}
            
            {currentView === 'recurring' && (
              <Card>
                <CardHeader>
                  <CardTitle>Recurring Weekly Schedule</CardTitle>
                  <CardDescription>
                    Set up your typical weekly availability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {daysOfWeek.map(day => (
                      <div key={day.value} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="font-semibold">{day.label}</Label>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              // TODO: Add recurring time slot
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {calendar.recurringSchedule[day.value]?.map((slot, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span>{slot.startTime} - {slot.endTime}</span>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )) || (
                            <div className="text-sm text-muted-foreground">No recurring schedule</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {currentView === 'preferences' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Calendar Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="preferredStartTime">Preferred Start Time</Label>
                      <Input
                        id="preferredStartTime"
                        type="time"
                        value={calendar.preferences.preferredStartTime}
                        onChange={(e) => setCalendar(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            preferredStartTime: e.target.value
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxHours">Max Hours Per Day</Label>
                      <Input
                        id="maxHours"
                        type="number"
                        min="1"
                        max="12"
                        value={calendar.preferences.maxHoursPerDay}
                        onChange={(e) => setCalendar(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            maxHoursPerDay: parseInt(e.target.value)
                          }
                        }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Preferred Work Days</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {daysOfWeek.map(day => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Switch
                            id={`day-${day.value}`}
                            checked={calendar.preferences.preferredDays.includes(day.value)}
                            onCheckedChange={(checked) => {
                              setCalendar(prev => ({
                                ...prev,
                                preferences: {
                                  ...prev.preferences,
                                  preferredDays: checked
                                    ? [...prev.preferences.preferredDays, day.value]
                                    : prev.preferences.preferredDays.filter(d => d !== day.value)
                                }
                              }));
                            }}
                          />
                          <Label htmlFor={`day-${day.value}`} className="text-sm">
                            {day.label.slice(0, 3)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button onClick={saveCalendar} className="w-full">
                    Save Preferences
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <TimeSlotEditor />
    </>
  );
};