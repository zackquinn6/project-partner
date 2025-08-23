import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, ExternalLink, Plus, Settings, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useToast } from '@/components/ui/use-toast';

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  status: string;
}

interface CalendarIntegrationProps {
  projectRun: ProjectRun;
  onEventCreated: (event: GoogleCalendarEvent) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GoogleCalendarIntegration: React.FC<CalendarIntegrationProps> = ({
  projectRun,
  onEventCreated,
  open,
  onOpenChange
}) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  // Mock Google Calendar API integration
  // In production, this would use the actual Google Calendar API
  const connectToGoogleCalendar = async () => {
    setLoading(true);
    try {
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsConnected(true);
      toast({
        title: "Google Calendar Connected",
        description: "Successfully connected to your Google Calendar account.",
      });
      
      // Load existing events
      await loadCalendarEvents();
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to Google Calendar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarEvents = async () => {
    try {
      // Mock calendar events related to the project
      const mockEvents: GoogleCalendarEvent[] = [
        {
          id: '1',
          summary: `${projectRun.name} - Planning Phase`,
          description: 'Project planning and preparation',
          start: {
            dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            timeZone: 'America/New_York'
          },
          end: {
            dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
            timeZone: 'America/New_York'
          },
          status: 'confirmed'
        }
      ];
      
      setEvents(mockEvents);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    }
  };

  const createCalendarEvent = async (eventData: {
    title: string;
    description: string;
    startDate: string;
    startTime: string;
    duration: number;
  }) => {
    try {
      setLoading(true);
      
      const startDateTime = new Date(`${eventData.startDate}T${eventData.startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + eventData.duration * 60 * 60 * 1000);
      
      const newEvent: GoogleCalendarEvent = {
        id: Date.now().toString(),
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/New_York'
        },
        status: 'confirmed'
      };
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setEvents(prev => [...prev, newEvent]);
      onEventCreated(newEvent);
      setShowCreateEvent(false);
      
      toast({
        title: "Event Created",
        description: `"${eventData.title}" has been added to your Google Calendar.`,
      });
      
    } catch (error) {
      toast({
        title: "Failed to Create Event",
        description: "Unable to create calendar event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const suggestProjectSchedule = () => {
    const suggestions = [];
    
    // Generate schedule suggestions based on project phases
    projectRun.phases.forEach((phase, phaseIndex) => {
      const startDate = new Date(projectRun.startDate);
      startDate.setDate(startDate.getDate() + phaseIndex * 7); // Space phases a week apart
      
      phase.operations.forEach((operation, opIndex) => {
        const operationDate = new Date(startDate);
        operationDate.setDate(operationDate.getDate() + opIndex * 2); // Space operations 2 days apart
        
        suggestions.push({
          title: `${projectRun.name} - ${phase.name}: ${operation.name}`,
          description: `${operation.description}\n\nSteps: ${operation.steps.map(s => s.step).join(', ')}`,
          startDate: operationDate.toISOString().split('T')[0],
          startTime: '09:00',
          duration: Math.max(2, operation.steps.length * 0.5) // Estimate duration based on steps
        });
      });
    });
    
    return suggestions.slice(0, 5); // Limit to first 5 suggestions
  };

  const CreateEventDialog = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [duration, setDuration] = useState(2);

    return (
      <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Calendar Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="eventTitle">Event Title</Label>
              <Input
                id="eventTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter event title"
              />
            </div>
            <div>
              <Label htmlFor="eventDescription">Description</Label>
              <Input
                id="eventDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter event description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventDate">Date</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="eventTime">Start Time</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="eventDuration">Duration (hours)</Label>
              <Input
                id="eventDuration"
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value))}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => createCalendarEvent({ title, description, startDate, startTime, duration })}
                disabled={!title || loading}
                className="flex-1"
              >
                Create Event
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateEvent(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Google Calendar Integration
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 p-6">
            {!isConnected ? (
              <Card>
                <CardHeader>
                  <CardTitle>Connect to Google Calendar</CardTitle>
                  <CardDescription>
                    Sync your project schedule with Google Calendar for better planning and reminders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Automatically schedule project phases and milestones
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Set reminders for important project deadlines
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Share project timeline with team members
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Block time slots for focused project work
                      </li>
                    </ul>
                    <Button 
                      onClick={connectToGoogleCalendar}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Connect Google Calendar
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Successfully connected to Google Calendar. You can now create and manage project events.
                  </AlertDescription>
                </Alert>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setShowCreateEvent(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Event
                      </Button>
                      <Button variant="outline" onClick={loadCalendarEvents}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync Calendar
                      </Button>
                      <Button variant="outline">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Suggested Schedule */}
                <Card>
                  <CardHeader>
                    <CardTitle>Suggested Project Schedule</CardTitle>
                    <CardDescription>
                      Based on your project phases and estimated timing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {suggestProjectSchedule().map((suggestion, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{suggestion.title}</h4>
                            <p className="text-sm text-muted-foreground">{suggestion.description.split('\n')[0]}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(suggestion.startDate).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {suggestion.startTime} ({suggestion.duration}h)
                              </span>
                            </div>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => {
                              setShowCreateEvent(true);
                              // Pre-populate form with suggestion data
                            }}
                          >
                            Add to Calendar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Existing Events */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project Events</CardTitle>
                    <CardDescription>
                      Events related to this project in your Google Calendar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {events.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No project events found. Create some events to get started!
                        </div>
                      ) : (
                        events.map((event) => (
                          <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">{event.summary}</h4>
                              {event.description && (
                                <p className="text-sm text-muted-foreground">{event.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(event.start.dateTime).toLocaleDateString()} at{' '}
                                  {new Date(event.start.dateTime).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                                <Badge variant="secondary">{event.status}</Badge>
                              </div>
                            </div>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateEventDialog />
    </>
  );
};
