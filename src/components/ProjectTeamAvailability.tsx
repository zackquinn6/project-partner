import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon, Edit2, Check, X, Clock, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

// Helper to parse YYYY-MM-DD strings without timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Helper to format Date to YYYY-MM-DD in local time
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

interface ProjectTeamAvailabilityProps {
  teamMembers: TeamMember[];
  onTeamMembersChange: (members: TeamMember[]) => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function ProjectTeamAvailability({ teamMembers, onTeamMembersChange }: ProjectTeamAvailabilityProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load team members from database on mount
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_team_members')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const loadedMembers: TeamMember[] = data.map(member => ({
            id: member.id,
            dbId: member.id,
            name: member.name,
            type: member.type as 'owner' | 'helper',
            skillLevel: member.skill_level as 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional',
            effortLevel: member.effort_level as 'Low' | 'Medium' | 'High',
            maxTotalHours: member.max_total_hours,
            weekendsOnly: member.weekends_only,
            weekdaysAfterFivePm: member.weekdays_after_five_pm,
            workingHours: {
              start: member.working_hours_start || '09:00',
              end: member.working_hours_end || '17:00'
            },
            availability: (member.availability_dates as any) || {},
            costPerHour: member.cost_per_hour || 0,
            email: member.email,
            phone: member.phone,
            notificationPreferences: (member.notification_preferences as any) || { email: false, sms: false }
          }));

          // Merge with existing team members (don't overwrite if already loaded)
          const existingIds = new Set(teamMembers.map(m => m.dbId).filter(Boolean));
          const newMembers = loadedMembers.filter(m => !existingIds.has(m.dbId));
          if (newMembers.length > 0) {
            onTeamMembersChange([...teamMembers, ...newMembers]);
          }
        }
      } catch (error: any) {
        console.error('Error loading team members:', error);
      }
    };

    loadTeamMembers();
  }, [user]); // Only load once when user is available
  const [newMember, setNewMember] = useState<Partial<TeamMember>>({
    name: '',
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
    costPerHour: 0
  });
  const [availabilityMode, setAvailabilityMode] = useState<'general' | 'specific'>('general');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [specificDates, setSpecificDates] = useState<Date[]>([]);
  const [notAvailableDates, setNotAvailableDates] = useState<Date[]>([]);

  const startEditing = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setEditingMember({ ...member });
    
    // Determine availability mode from existing data
    const hasSpecificDates = Object.keys(member.availability).length > 0;
    setAvailabilityMode(hasSpecificDates ? 'specific' : 'general');
    
    // Extract general availability patterns
    // For now, we'll use weekendsOnly and weekdaysAfterFivePm as indicators
    const days: string[] = [];
    if (!member.weekendsOnly) {
      days.push('monday', 'tuesday', 'wednesday', 'thursday', 'friday');
    }
    if (member.weekendsOnly || member.weekdaysAfterFivePm) {
      days.push('saturday', 'sunday');
    }
    setSelectedDays(days);
    
    // Extract specific dates from availability object
    const dates = Object.keys(member.availability)
      .filter(date => member.availability[date]?.some(slot => slot.available))
      .map(date => parseLocalDate(date));
    setSpecificDates(dates);
    
    // Extract not available dates (dates with no available slots or all unavailable)
    const notAvail = Object.keys(member.availability)
      .filter(date => !member.availability[date]?.some(slot => slot.available))
      .map(date => parseLocalDate(date));
    setNotAvailableDates(notAvail);
  };

  const cancelEditing = () => {
    setEditingMemberId(null);
    setEditingMember(null);
    setSelectedDays([]);
    setDateRange({});
    setSpecificDates([]);
    setNotAvailableDates([]);
  };

  const cancelAdding = () => {
    setShowAddForm(false);
    setNewMember({
      name: '',
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
      costPerHour: 0
    });
    setSelectedDays([]);
    setSpecificDates([]);
    setNotAvailableDates([]);
    setAvailabilityMode('general');
  };

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.name.trim()) {
      return; // Don't add if name is empty
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add team members",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const memberToAdd: TeamMember = {
      id: Date.now().toString(),
      name: newMember.name.trim(),
      type: newMember.type || 'helper',
      skillLevel: newMember.skillLevel || 'Intermediate',
      effortLevel: newMember.effortLevel || 'Medium',
      maxTotalHours: newMember.maxTotalHours || 80,
      weekendsOnly: newMember.weekendsOnly || false,
      weekdaysAfterFivePm: newMember.weekdaysAfterFivePm || false,
      workingHours: newMember.workingHours || { start: '09:00', end: '17:00' },
      availability: newMember.availability || {},
      costPerHour: newMember.costPerHour,
      email: newMember.email,
      phone: newMember.phone,
      notificationPreferences: newMember.notificationPreferences
    };

    // Apply availability settings
    if (availabilityMode === 'general') {
      memberToAdd.weekendsOnly = selectedDays.length > 0 && 
        selectedDays.every(d => d === 'saturday' || d === 'sunday');
      memberToAdd.weekdaysAfterFivePm = selectedDays.includes('monday') || 
        selectedDays.includes('tuesday') || 
        selectedDays.includes('wednesday') || 
        selectedDays.includes('thursday') || 
        selectedDays.includes('friday');
      memberToAdd.availability = {};
    } else {
      // Set specific dates availability
      const newAvailability: { [date: string]: { start: string; end: string; available: boolean }[] } = {};
      
      specificDates.forEach(date => {
        const dateStr = formatLocalDate(date);
        newAvailability[dateStr] = [{
          start: memberToAdd.workingHours.start,
          end: memberToAdd.workingHours.end,
          available: true
        }];
      });
      
      // Mark not available dates
      notAvailableDates.forEach(date => {
        const dateStr = formatLocalDate(date);
        newAvailability[dateStr] = [{
          start: memberToAdd.workingHours.start,
          end: memberToAdd.workingHours.end,
          available: false
        }];
      });
      
      memberToAdd.availability = newAvailability;
    }

    try {
      // Save to database
      const { data, error } = await supabase
        .from('user_team_members')
        .insert({
          user_id: user.id,
          name: memberToAdd.name,
          type: memberToAdd.type,
          skill_level: memberToAdd.skillLevel,
          effort_level: memberToAdd.effortLevel,
          max_total_hours: memberToAdd.maxTotalHours,
          weekends_only: memberToAdd.weekendsOnly,
          weekdays_after_five_pm: memberToAdd.weekdaysAfterFivePm,
          working_hours_start: memberToAdd.workingHours.start,
          working_hours_end: memberToAdd.workingHours.end,
          cost_per_hour: memberToAdd.costPerHour || 0,
          email: memberToAdd.email,
          phone: memberToAdd.phone,
          availability_mode: availabilityMode,
          availability_dates: memberToAdd.availability,
          notification_preferences: memberToAdd.notificationPreferences || { email: false, sms: false }
        })
        .select()
        .single();

      if (error) throw error;

      // Add database ID to member
      memberToAdd.dbId = data.id;

      onTeamMembersChange([...teamMembers, memberToAdd]);
      cancelAdding();
      
      toast({
        title: "Success",
        description: "Team member added and saved",
      });
    } catch (error: any) {
      console.error('Error saving team member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save team member",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    // If member has database ID, delete from database
    if (member.dbId && user) {
      setIsLoading(true);
      try {
        const { error } = await supabase
          .from('user_team_members')
          .delete()
          .eq('id', member.dbId)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Team member deleted",
        });
      } catch (error: any) {
        console.error('Error deleting team member:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to delete team member",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      } finally {
        setIsLoading(false);
      }
    }

    onTeamMembersChange(teamMembers.filter(m => m.id !== memberId));
  };

  const saveEditing = async () => {
    if (!editingMember || !user) return;

    setIsLoading(true);

    const updatedMember: TeamMember = { ...editingMember };

    // Update general availability settings
    if (availabilityMode === 'general') {
      updatedMember.weekendsOnly = selectedDays.length > 0 && 
        selectedDays.every(d => d === 'saturday' || d === 'sunday');
      updatedMember.weekdaysAfterFivePm = selectedDays.includes('monday') || 
        selectedDays.includes('tuesday') || 
        selectedDays.includes('wednesday') || 
        selectedDays.includes('thursday') || 
        selectedDays.includes('friday');
      
      // Clear specific availability if switching to general
      updatedMember.availability = {};
    } else {
      // Update specific dates availability
      const newAvailability: { [date: string]: { start: string; end: string; available: boolean }[] } = {};
      
      specificDates.forEach(date => {
        const dateStr = formatLocalDate(date);
        newAvailability[dateStr] = [{
          start: editingMember.workingHours.start,
          end: editingMember.workingHours.end,
          available: true
        }];
      });
      
      // Mark not available dates
      notAvailableDates.forEach(date => {
        const dateStr = formatLocalDate(date);
        newAvailability[dateStr] = [{
          start: editingMember.workingHours.start,
          end: editingMember.workingHours.end,
          available: false
        }];
      });
      
      updatedMember.availability = newAvailability;
    }

    try {
      // If member has database ID, update in database
      if (updatedMember.dbId) {
        const { error } = await supabase
          .from('user_team_members')
          .update({
            name: updatedMember.name,
            type: updatedMember.type,
            skill_level: updatedMember.skillLevel,
            effort_level: updatedMember.effortLevel,
            max_total_hours: updatedMember.maxTotalHours,
            weekends_only: updatedMember.weekendsOnly,
            weekdays_after_five_pm: updatedMember.weekdaysAfterFivePm,
            working_hours_start: updatedMember.workingHours.start,
            working_hours_end: updatedMember.workingHours.end,
            cost_per_hour: updatedMember.costPerHour || 0,
            email: updatedMember.email,
            phone: updatedMember.phone,
            availability_mode: availabilityMode,
            availability_dates: updatedMember.availability,
            notification_preferences: updatedMember.notificationPreferences || { email: false, sms: false }
          })
          .eq('id', updatedMember.dbId)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      const updatedMembers = teamMembers.map(m => 
        m.id === editingMember.id ? updatedMember : m
      );
      
      onTeamMembersChange(updatedMembers);
      cancelEditing();
      
      toast({
        title: "Success",
        description: "Team member updated",
      });
    } catch (error: any) {
      console.error('Error updating team member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update team member",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const getAvailabilityDisplay = (member: TeamMember) => {
    const parts: string[] = [];
    
    if (member.weekendsOnly) {
      parts.push('Weekends only');
    } else if (member.weekdaysAfterFivePm) {
      parts.push('Weekdays after 5 PM');
    } else {
      parts.push('Weekdays');
    }
    
    if (member.workingHours.start && member.workingHours.end) {
      parts.push(`${member.workingHours.start} - ${member.workingHours.end}`);
    }
    
    const specificDatesCount = Object.keys(member.availability).filter(
      date => member.availability[date]?.some(slot => slot.available)
    ).length;
    
    if (specificDatesCount > 0) {
      parts.push(`${specificDatesCount} specific date(s)`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'No availability set';
  };

  return (
    <div className="space-y-3">
      <div className="text-[10px] md:text-xs text-muted-foreground">
        Manage team member availability for scheduling
      </div>

      {/* Team Members List */}
      <div className="space-y-2">
        {teamMembers.length === 0 && !showAddForm ? (
          <p className="text-[10px] md:text-xs text-muted-foreground text-center py-3">
            No team members yet. Click "Add Team Member" below to get started.
          </p>
        ) : (
          teamMembers.map((member) => (
            <div key={member.id} className="border rounded-lg p-2 md:p-3 space-y-2 text-[10px] md:text-xs">
              {editingMemberId === member.id && editingMember ? (
                // Edit mode
                <div className="space-y-3">
                  {/* Basic Info */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={editingMember.name}
                      onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                      className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
                      placeholder="Name"
                    />
                    <Select 
                      value={editingMember.type} 
                      onValueChange={(val) => setEditingMember({ ...editingMember, type: val as 'owner' | 'helper' })}
                    >
                      <SelectTrigger className="text-[10px] md:text-xs h-7 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="helper">Helper</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={editingMember.skillLevel} 
                      onValueChange={(val) => setEditingMember({ ...editingMember, skillLevel: val as any })}
                    >
                      <SelectTrigger className="text-[10px] md:text-xs h-7 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={editingMember.effortLevel} 
                      onValueChange={(val) => setEditingMember({ ...editingMember, effortLevel: val as any })}
                    >
                      <SelectTrigger className="text-[10px] md:text-xs h-7 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contact Info */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="email"
                      value={editingMember.email || ''}
                      onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                      className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
                      placeholder="Email"
                    />
                    <Input
                      type="tel"
                      value={editingMember.phone || ''}
                      onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                      className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
                      placeholder="Phone"
                    />
                  </div>

                  {/* Working Hours */}
                  <div className="flex gap-2 items-center">
                    <Label className="text-[10px] md:text-xs w-20">Hours:</Label>
                    <Input
                      type="time"
                      value={editingMember.workingHours.start}
                      onChange={(e) => setEditingMember({ 
                        ...editingMember, 
                        workingHours: { ...editingMember.workingHours, start: e.target.value }
                      })}
                      className="text-[10px] md:text-xs h-7 w-24"
                    />
                    <span className="text-[10px] md:text-xs">to</span>
                    <Input
                      type="time"
                      value={editingMember.workingHours.end}
                      onChange={(e) => setEditingMember({ 
                        ...editingMember, 
                        workingHours: { ...editingMember.workingHours, end: e.target.value }
                      })}
                      className="text-[10px] md:text-xs h-7 w-24"
                    />
                  </div>

                  {/* Max Total Hours */}
                  <div className="flex gap-2 items-center">
                    <Label className="text-[10px] md:text-xs w-32">Max Total Hours:</Label>
                    <Input
                      type="number"
                      value={editingMember.maxTotalHours}
                      onChange={(e) => setEditingMember({ 
                        ...editingMember, 
                        maxTotalHours: parseInt(e.target.value) || 0
                      })}
                      className="text-[10px] md:text-xs h-7 w-24"
                      min="0"
                    />
                  </div>

                  {/* Cost Per Hour */}
                  <div className="flex gap-2 items-center">
                    <Label className="text-[10px] md:text-xs w-32">Cost/Hour ($):</Label>
                    <Input
                      type="number"
                      value={editingMember.costPerHour || 0}
                      onChange={(e) => setEditingMember({ 
                        ...editingMember, 
                        costPerHour: parseFloat(e.target.value) || 0
                      })}
                      className="text-[10px] md:text-xs h-7 w-24"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Availability Mode */}
                  <div>
                    <div className="text-[10px] md:text-xs font-medium mb-1.5">Availability Mode:</div>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <Checkbox
                          checked={availabilityMode === 'general'}
                          onCheckedChange={() => setAvailabilityMode('general')}
                          className="h-3 w-3"
                        />
                        <span className="text-[10px] md:text-xs">General (Days/Patterns)</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <Checkbox
                          checked={availabilityMode === 'specific'}
                          onCheckedChange={() => setAvailabilityMode('specific')}
                          className="h-3 w-3"
                        />
                        <span className="text-[10px] md:text-xs">Specific Dates</span>
                      </label>
                    </div>
                  </div>

                  {availabilityMode === 'general' ? (
                    <div className="space-y-2 border-t pt-2">
                      <div className="text-[10px] md:text-xs font-medium">Available Days</div>
                      <div className="flex flex-wrap gap-1.5">
                        {DAYS.map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={cn(
                              "px-2 py-1 rounded text-[9px] md:text-[10px] border transition-colors",
                              selectedDays.includes(day)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-accent"
                            )}
                          >
                            {day.slice(0, 3).toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 border-t pt-2">
                      <div className="text-[10px] md:text-xs font-medium">Specific Available Dates</div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-[10px] md:text-xs">
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            {specificDates.length > 0 ? `${specificDates.length} date(s)` : 'Select dates'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="multiple"
                            selected={specificDates}
                            onSelect={(dates) => setSpecificDates(dates || [])}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      
                      <div className="text-[10px] md:text-xs font-medium mt-3">Not Available Dates (Blackout)</div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-[10px] md:text-xs">
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            {notAvailableDates.length > 0 ? `${notAvailableDates.length} date(s)` : 'Select dates'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="multiple"
                            selected={notAvailableDates}
                            onSelect={(dates) => setNotAvailableDates(dates || [])}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button onClick={saveEditing} size="sm" className="h-7 text-[10px] md:text-xs flex-1">
                      <Check className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button onClick={cancelEditing} variant="outline" size="sm" className="h-7 text-[10px] md:text-xs flex-1">
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.name}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {member.type}
                      </Badge>
                      <Badge variant="secondary" className="text-[9px]">
                        {member.skillLevel}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">
                        {member.effortLevel} Effort
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => startEditing(member)}
                        size="sm"
                        variant="outline"
                        className="h-6 text-[9px] md:text-[10px]"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteMember(member.id)}
                        size="sm"
                        variant="outline"
                        className="h-6 text-[9px] md:text-[10px] text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-[9px] md:text-[10px] text-muted-foreground">
                    {getAvailabilityDisplay(member)}
                  </div>
                  
                  {member.workingHours.start && member.workingHours.end && (
                    <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {member.workingHours.start} - {member.workingHours.end}
                    </div>
                  )}
                  
                  {member.maxTotalHours > 0 && (
                    <div className="text-[9px] md:text-[10px] text-muted-foreground">
                      Max: {member.maxTotalHours} hours
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Add Team Member Button/Form */}
        {!showAddForm ? (
          <Button onClick={() => setShowAddForm(true)} size="sm" className="h-7 w-full text-[10px] md:text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Add Team Member
          </Button>
        ) : (
          <div className="border rounded-lg p-2 md:p-3 space-y-2 bg-muted/30">
            <div className="text-[10px] md:text-xs font-medium">New Team Member</div>
            
            {/* Basic Info */}
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Name"
                value={newMember.name || ''}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
              />
              <Select 
                value={newMember.type || 'helper'} 
                onValueChange={(val) => setNewMember({ ...newMember, type: val as 'owner' | 'helper' })}
              >
                <SelectTrigger className="text-[10px] md:text-xs h-7 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="helper">Helper</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={newMember.skillLevel || 'Intermediate'} 
                onValueChange={(val) => setNewMember({ ...newMember, skillLevel: val as any })}
              >
                <SelectTrigger className="text-[10px] md:text-xs h-7 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={newMember.effortLevel || 'Medium'} 
                onValueChange={(val) => setNewMember({ ...newMember, effortLevel: val as any })}
              >
                <SelectTrigger className="text-[10px] md:text-xs h-7 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contact Info */}
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="email"
                placeholder="Email"
                value={newMember.email || ''}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
              />
              <Input
                type="tel"
                placeholder="Phone"
                value={newMember.phone || ''}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
              />
            </div>

            {/* Working Hours */}
            <div className="flex gap-2 items-center">
              <Label className="text-[10px] md:text-xs w-20">Hours:</Label>
              <Input
                type="time"
                value={newMember.workingHours?.start || '09:00'}
                onChange={(e) => setNewMember({ 
                  ...newMember, 
                  workingHours: { ...(newMember.workingHours || { start: '09:00', end: '17:00' }), start: e.target.value }
                })}
                className="text-[10px] md:text-xs h-7 w-24"
              />
              <span className="text-[10px] md:text-xs">to</span>
              <Input
                type="time"
                value={newMember.workingHours?.end || '17:00'}
                onChange={(e) => setNewMember({ 
                  ...newMember, 
                  workingHours: { ...(newMember.workingHours || { start: '09:00', end: '17:00' }), end: e.target.value }
                })}
                className="text-[10px] md:text-xs h-7 w-24"
              />
            </div>

            {/* Max Total Hours */}
            <div className="flex gap-2 items-center">
              <Label className="text-[10px] md:text-xs w-32">Max Total Hours:</Label>
              <Input
                type="number"
                value={newMember.maxTotalHours || 80}
                onChange={(e) => setNewMember({ 
                  ...newMember, 
                  maxTotalHours: parseInt(e.target.value) || 80
                })}
                className="text-[10px] md:text-xs h-7 w-24"
                min="0"
              />
            </div>

            {/* Cost Per Hour */}
            <div className="flex gap-2 items-center">
              <Label className="text-[10px] md:text-xs w-32">Cost/Hour ($):</Label>
              <Input
                type="number"
                value={newMember.costPerHour || 0}
                onChange={(e) => setNewMember({ 
                  ...newMember, 
                  costPerHour: parseFloat(e.target.value) || 0
                })}
                className="text-[10px] md:text-xs h-7 w-24"
                min="0"
                step="0.01"
              />
            </div>

            {/* Availability Mode */}
            <div>
              <div className="text-[10px] md:text-xs font-medium mb-1.5">Availability Mode:</div>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 cursor-pointer">
                  <Checkbox
                    checked={availabilityMode === 'general'}
                    onCheckedChange={() => setAvailabilityMode('general')}
                    className="h-3 w-3"
                  />
                  <span className="text-[10px] md:text-xs">General (Days/Patterns)</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <Checkbox
                    checked={availabilityMode === 'specific'}
                    onCheckedChange={() => setAvailabilityMode('specific')}
                    className="h-3 w-3"
                  />
                  <span className="text-[10px] md:text-xs">Specific Dates</span>
                </label>
              </div>
            </div>

            {availabilityMode === 'general' ? (
              <div className="space-y-2 border-t pt-2">
                <div className="text-[10px] md:text-xs font-medium">Available Days</div>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={cn(
                        "px-2 py-1 rounded text-[9px] md:text-[10px] border transition-colors",
                        selectedDays.includes(day)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-accent"
                      )}
                    >
                      {day.slice(0, 3).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2 border-t pt-2">
                <div className="text-[10px] md:text-xs font-medium">Specific Available Dates</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] md:text-xs">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {specificDates.length > 0 ? `${specificDates.length} date(s)` : 'Select dates'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="multiple"
                      selected={specificDates}
                      onSelect={(dates) => setSpecificDates(dates || [])}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <div className="text-[10px] md:text-xs font-medium mt-3">Not Available Dates (Blackout)</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] md:text-xs">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {notAvailableDates.length > 0 ? `${notAvailableDates.length} date(s)` : 'Select dates'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="multiple"
                      selected={notAvailableDates}
                      onSelect={(dates) => setNotAvailableDates(dates || [])}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button onClick={handleAddMember} size="sm" className="h-7 text-[10px] md:text-xs flex-1" disabled={!newMember.name?.trim()}>
                <Check className="w-3 h-3 mr-1" />
                Add
              </Button>
              <Button onClick={cancelAdding} variant="outline" size="sm" className="h-7 text-[10px] md:text-xs flex-1">
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

