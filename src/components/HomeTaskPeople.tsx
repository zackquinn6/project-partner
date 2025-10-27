import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CalendarIcon, Edit2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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

interface Person {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  available_hours: number;
  available_days: string[];
  consecutive_days: number;
  diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  hourly_rate: number;
  availability_mode: 'general' | 'specific';
  availability_start_date?: string;
  availability_end_date?: string;
  specific_dates?: string[];
  not_available_dates?: string[];
}

interface HomeTaskPeopleProps {
  userId: string;
  homeId: string | null;
  onPeopleChange?: () => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function HomeTaskPeople({ userId, homeId, onPeopleChange }: HomeTaskPeopleProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [newPerson, setNewPerson] = useState({
    name: '',
    email: '',
    phone: '',
    available_hours: 8,
    available_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    consecutive_days: 5,
    diy_level: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'pro',
    hourly_rate: 0,
    availability_mode: 'general' as 'general' | 'specific',
    not_available_dates: [] as string[],
    availability_start_date: undefined as string | undefined,
    availability_end_date: undefined as string | undefined,
    specific_dates: [] as string[]
  });

  useEffect(() => {
    fetchPeople();
  }, [userId, homeId]);

  const fetchPeople = async () => {
    let query = supabase
      .from('home_task_people')
      .select('*')
      .eq('user_id', userId);

    if (homeId) {
      query = query.eq('home_id', homeId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setPeople(data as Person[]);
    }
  };

  const handleAddPerson = async () => {
    if (!newPerson.name.trim()) {
      return;
    }

    if (newPerson.availability_mode === 'general' && newPerson.available_days.length === 0) {
      return;
    }

    const { error } = await supabase
      .from('home_task_people')
      .insert([{
        user_id: userId,
        home_id: homeId,
        ...newPerson
      }]);

    if (error) {
      return;
    }
    setNewPerson({
      name: '',
      email: '',
      phone: '',
      available_hours: 8,
      available_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      consecutive_days: 5,
      diy_level: 'intermediate',
      hourly_rate: 0,
      availability_mode: 'general',
      not_available_dates: [],
      availability_start_date: undefined,
      availability_end_date: undefined,
      specific_dates: []
    });
    setShowAddForm(false);
    fetchPeople();
    onPeopleChange?.();
  };

  const handleDeletePerson = async (personId: string) => {
    const { error } = await supabase
      .from('home_task_people')
      .delete()
      .eq('id', personId);

    if (error) {
      return;
    }

    fetchPeople();
    onPeopleChange?.();
  };

  const toggleDay = (day: string, isEditing: boolean = false) => {
    if (isEditing && editingPerson) {
      setEditingPerson({
        ...editingPerson,
        available_days: editingPerson.available_days.includes(day)
          ? editingPerson.available_days.filter(d => d !== day)
          : [...editingPerson.available_days, day]
      });
    } else {
      setNewPerson(prev => ({
        ...prev,
        available_days: prev.available_days.includes(day)
          ? prev.available_days.filter(d => d !== day)
          : [...prev.available_days, day]
      }));
    }
  };

  const handleEditPerson = (person: Person) => {
    setEditingPersonId(person.id);
    setEditingPerson({ ...person });
  };

  const handleSaveEdit = async () => {
    if (!editingPerson || !editingPersonId) {
      console.error('Save failed: Missing editing person or ID');
      return;
    }

    console.log('Saving person:', editingPerson);

    const { error } = await supabase
      .from('home_task_people')
      .update({
        name: editingPerson.name,
        email: editingPerson.email,
        phone: editingPerson.phone,
        available_hours: editingPerson.available_hours,
        available_days: editingPerson.available_days,
        consecutive_days: editingPerson.consecutive_days,
        diy_level: editingPerson.diy_level,
        hourly_rate: editingPerson.hourly_rate,
        availability_mode: editingPerson.availability_mode,
        availability_start_date: editingPerson.availability_start_date,
        availability_end_date: editingPerson.availability_end_date,
        specific_dates: editingPerson.specific_dates,
        not_available_dates: editingPerson.not_available_dates
      })
      .eq('id', editingPersonId);

    if (error) {
      console.error('Save error:', error);
      return;
    }

    console.log('Save successful');
    setEditingPersonId(null);
    setEditingPerson(null);
    fetchPeople();
    onPeopleChange?.();
  };

  const handleCancelEdit = () => {
    setEditingPersonId(null);
    setEditingPerson(null);
  };

  const getAvailabilityDisplay = (person: Person) => {
    if (person.availability_mode === 'general') {
      const parts = [];
      if (person.available_days.length > 0) {
        parts.push(person.available_days.map(d => d.slice(0, 3)).join(', '));
      }
      if (person.availability_start_date && person.availability_end_date) {
        parts.push(`${format(new Date(person.availability_start_date), 'MMM d')} - ${format(new Date(person.availability_end_date), 'MMM d')}`);
      }
      return parts.length > 0 ? parts.join(' • ') : 'General availability';
    } else {
      return person.specific_dates && person.specific_dates.length > 0 
        ? `${person.specific_dates.length} specific date(s)` 
        : 'No specific dates set';
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-[10px] md:text-xs text-muted-foreground">
        Manage team members available for this project
      </div>

      {/* Team Members List */}
      <div className="space-y-2">
        {people.length === 0 ? (
          <p className="text-[10px] md:text-xs text-muted-foreground text-center py-3">
            No team members yet. Add people to enable scheduling.
          </p>
        ) : (
          people.map((person) => (
            <div key={person.id} className="border rounded-lg p-2 md:p-3 space-y-2 text-[10px] md:text-xs">
              {editingPersonId === person.id && editingPerson ? (
                // Edit mode
                <div className="space-y-2">
                  {/* Basic Info */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={editingPerson.name}
                      onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                      className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
                      placeholder="Name"
                    />
                    <Select 
                      value={editingPerson.diy_level} 
                      onValueChange={(val) => setEditingPerson({ ...editingPerson, diy_level: val as any })}
                    >
                      <SelectTrigger className="text-[10px] md:text-xs h-7 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="pro">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contact Info */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="email"
                      value={editingPerson.email || ''}
                      onChange={(e) => setEditingPerson({ ...editingPerson, email: e.target.value })}
                      className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
                      placeholder="Email"
                    />
                    <Input
                      type="tel"
                      value={editingPerson.phone || ''}
                      onChange={(e) => setEditingPerson({ ...editingPerson, phone: e.target.value })}
                      className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
                      placeholder="Phone"
                    />
                  </div>

                  <div>
                    <div className="text-[10px] md:text-xs font-medium mb-1.5">Availability Mode:</div>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <Checkbox
                          checked={editingPerson.availability_mode === 'general'}
                          onCheckedChange={() => setEditingPerson({ ...editingPerson, availability_mode: 'general' })}
                          className="h-3 w-3"
                        />
                        <span className="text-[10px] md:text-xs">General (Days/Weeks)</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <Checkbox
                          checked={editingPerson.availability_mode === 'specific'}
                          onCheckedChange={() => setEditingPerson({ ...editingPerson, availability_mode: 'specific' })}
                          className="h-3 w-3"
                        />
                        <span className="text-[10px] md:text-xs">Specific Dates</span>
                      </label>
                    </div>
                  </div>

                  {editingPerson.availability_mode === 'general' ? (
                    <div className="space-y-2 border-t pt-2">
                      <div className="text-[10px] md:text-xs font-medium">General Availability</div>
                      
                      {/* Availability Numbers */}
                      <div className="flex gap-2">
                        <div className="w-16">
                          <label className="text-[10px] md:text-xs block mb-1">Hrs/Day</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editingPerson.available_hours ?? 8}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              if (val === '') {
                                setEditingPerson({ ...editingPerson, available_hours: 8 });
                              } else {
                                const num = parseFloat(val);
                                if (!isNaN(num)) {
                                  setEditingPerson({ ...editingPerson, available_hours: num });
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const num = parseFloat(e.target.value);
                              const clamped = isNaN(num) ? 8 : Math.max(1, Math.min(24, num));
                              setEditingPerson({ ...editingPerson, available_hours: clamped });
                            }}
                            className="w-full h-7 px-2 text-[10px] md:text-xs border rounded-md"
                          />
                        </div>
                        <div className="w-20">
                          <label className="text-[10px] md:text-xs block mb-1">$/Hr</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editingPerson.hourly_rate ?? 0}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              if (val === '') {
                                setEditingPerson({ ...editingPerson, hourly_rate: 0 });
                              } else {
                                const num = parseFloat(val);
                                if (!isNaN(num)) {
                                  setEditingPerson({ ...editingPerson, hourly_rate: num });
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const num = parseFloat(e.target.value);
                              const clamped = isNaN(num) ? 0 : Math.max(0, num);
                              setEditingPerson({ ...editingPerson, hourly_rate: clamped });
                            }}
                            className="w-full h-7 px-2 text-[10px] md:text-xs border rounded-md"
                          />
                        </div>
                        <div className="w-24">
                          <label className="text-[10px] md:text-xs block mb-1">Consec Days</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editingPerson.consecutive_days ?? 5}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              if (val === '') {
                                setEditingPerson({ ...editingPerson, consecutive_days: 5 });
                              } else {
                                const num = parseInt(val);
                                if (!isNaN(num)) {
                                  setEditingPerson({ ...editingPerson, consecutive_days: num });
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const num = parseInt(e.target.value);
                              const clamped = isNaN(num) ? 5 : Math.max(1, Math.min(7, num));
                              setEditingPerson({ ...editingPerson, consecutive_days: clamped });
                            }}
                            className="w-full h-7 px-2 text-[10px] md:text-xs border rounded-md"
                          />
                        </div>
                      </div>
                      
                      {/* Available Days */}
                      <div>
                        <div className="text-[10px] md:text-xs mb-1">Available Days:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {DAYS.map(day => (
                            <label key={day} className="flex items-center gap-0.5 cursor-pointer">
                              <Checkbox
                                checked={editingPerson.available_days.includes(day)}
                                onCheckedChange={() => toggleDay(day, true)}
                                className="h-2.5 w-2.5 md:h-3 md:w-3"
                              />
                              <span className="text-[10px] md:text-xs capitalize">{day.slice(0, 3)}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Start/Finish Availability */}
                      <div>
                        <div className="text-[10px] md:text-xs mb-1">Start / Finish Availability:</div>
                        <div className="flex gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1">
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                {editingPerson.availability_start_date 
                                  ? format(parseLocalDate(editingPerson.availability_start_date), 'MMM d') 
                                  : 'Start'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={editingPerson.availability_start_date ? parseLocalDate(editingPerson.availability_start_date) : undefined}
                                onSelect={(date) => setEditingPerson({ 
                                  ...editingPerson, 
                                  availability_start_date: date ? formatLocalDate(date) : undefined
                                })}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1">
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                {editingPerson.availability_end_date 
                                  ? format(parseLocalDate(editingPerson.availability_end_date), 'MMM d') 
                                  : 'End'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={editingPerson.availability_end_date ? parseLocalDate(editingPerson.availability_end_date) : undefined}
                                onSelect={(date) => setEditingPerson({ 
                                  ...editingPerson, 
                                  availability_end_date: date ? formatLocalDate(date) : undefined
                                })}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Unavailable Dates */}
                      <div>
                        <div className="text-[10px] md:text-xs mb-1">Unavailable Dates:</div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full h-6 text-[10px] justify-start">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {editingPerson.not_available_dates && editingPerson.not_available_dates.length > 0 
                                ? `${editingPerson.not_available_dates.length} date(s) selected` 
                                : 'Select unavailable dates'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="multiple"
                              selected={editingPerson.not_available_dates?.map(d => parseLocalDate(d)) || []}
                              onSelect={(dates) => setEditingPerson({ 
                                ...editingPerson, 
                                not_available_dates: dates?.map(d => formatLocalDate(d)) || [] 
                              })}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 border-t pt-2">
                      <div className="text-[10px] md:text-xs font-medium">Specific Availability</div>
                      
                      {/* Specific Dates Picker */}
                      <div>
                        <div className="text-[10px] md:text-xs mb-1">Available Dates:</div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full h-6 text-[10px] justify-start">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {editingPerson.specific_dates && editingPerson.specific_dates.length > 0 
                                ? `${editingPerson.specific_dates.length} date(s) selected` 
                                : 'Select specific dates'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="multiple"
                              selected={editingPerson.specific_dates?.map(d => parseLocalDate(d)) || []}
                              onSelect={(dates) => setEditingPerson({ 
                                ...editingPerson, 
                                specific_dates: dates?.map(d => formatLocalDate(d)) || [] 
                              })}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-1 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveEdit}
                      className="flex-1 h-6 text-[10px] bg-green-600 hover:bg-green-700 text-white border-green-600"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="flex-1 h-6 text-[10px]"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{person.name}</div>
                    <div className="flex flex-wrap gap-1 md:gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[9px] md:text-[10px] px-1 md:px-1.5 py-0">
                        {person.diy_level}
                      </Badge>
                      <Badge variant="secondary" className="text-[9px] md:text-[10px] px-1 md:px-1.5 py-0">
                        {person.availability_mode === 'general' ? 'General' : 'Specific Dates'}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[9px] md:text-[10px] text-muted-foreground">
                      {getAvailabilityDisplay(person)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPerson(person)}
                      className="h-5 w-5 md:h-6 md:w-6 p-0 flex-shrink-0"
                    >
                      <Edit2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePerson(person.id)}
                      className="h-5 w-5 md:h-6 md:w-6 p-0 text-destructive flex-shrink-0"
                    >
                      <Trash2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

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
              value={newPerson.name}
              onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
              className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
            />
            <Select 
              value={newPerson.diy_level} 
              onValueChange={(val) => setNewPerson({ ...newPerson, diy_level: val as any })}
            >
              <SelectTrigger className="text-[10px] md:text-xs h-7 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="pro">Professional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="email"
              placeholder="Email"
              value={newPerson.email}
              onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
              className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
            />
            <Input
              type="tel"
              placeholder="Phone"
              value={newPerson.phone}
              onChange={(e) => setNewPerson({ ...newPerson, phone: e.target.value })}
              className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
            />
          </div>

          <div>
            <div className="text-[10px] md:text-xs font-medium mb-1.5">Availability Mode:</div>
            <div className="flex gap-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <Checkbox
                  checked={newPerson.availability_mode === 'general'}
                  onCheckedChange={() => setNewPerson({ ...newPerson, availability_mode: 'general' })}
                  className="h-3 w-3"
                />
                <span className="text-[10px] md:text-xs">General (Days/Weeks)</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <Checkbox
                  checked={newPerson.availability_mode === 'specific'}
                  onCheckedChange={() => setNewPerson({ ...newPerson, availability_mode: 'specific' })}
                  className="h-3 w-3"
                />
                <span className="text-[10px] md:text-xs">Specific Dates</span>
              </label>
            </div>
          </div>

          {newPerson.availability_mode === 'general' ? (
            <div className="space-y-2">
              {/* Availability Numbers */}
              <div className="flex gap-2">
                <div className="w-16">
                  <label className="text-[10px] md:text-xs block mb-1">Hrs/Day</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newPerson.available_hours ?? 8}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      if (val === '') {
                        setNewPerson({ ...newPerson, available_hours: 8 });
                      } else {
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                          setNewPerson({ ...newPerson, available_hours: num });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const num = parseFloat(e.target.value);
                      const clamped = isNaN(num) ? 8 : Math.max(1, Math.min(24, num));
                      setNewPerson({ ...newPerson, available_hours: clamped });
                    }}
                    className="w-full h-7 px-2 text-[10px] md:text-xs border rounded-md"
                  />
                </div>
                <div className="w-20">
                  <label className="text-[10px] md:text-xs block mb-1">$/Hr</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newPerson.hourly_rate ?? 0}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      if (val === '') {
                        setNewPerson({ ...newPerson, hourly_rate: 0 });
                      } else {
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                          setNewPerson({ ...newPerson, hourly_rate: num });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const num = parseFloat(e.target.value);
                      const clamped = isNaN(num) ? 0 : Math.max(0, num);
                      setNewPerson({ ...newPerson, hourly_rate: clamped });
                    }}
                    className="w-full h-7 px-2 text-[10px] md:text-xs border rounded-md"
                  />
                </div>
                <div className="w-24">
                  <label className="text-[10px] md:text-xs block mb-1">Consec Days</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newPerson.consecutive_days ?? 5}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val === '') {
                        setNewPerson({ ...newPerson, consecutive_days: 5 });
                      } else {
                        const num = parseInt(val);
                        if (!isNaN(num)) {
                          setNewPerson({ ...newPerson, consecutive_days: num });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const num = parseInt(e.target.value);
                      const clamped = isNaN(num) ? 5 : Math.max(1, Math.min(7, num));
                      setNewPerson({ ...newPerson, consecutive_days: clamped });
                    }}
                    className="w-full h-7 px-2 text-[10px] md:text-xs border rounded-md"
                  />
                </div>
              </div>

              <div>
                <div className="text-[10px] md:text-xs mb-1">Available Days:</div>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(day => (
                    <label key={day} className="flex items-center gap-0.5 cursor-pointer">
                      <Checkbox
                        checked={newPerson.available_days.includes(day)}
                        onCheckedChange={() => toggleDay(day, false)}
                        className="h-2.5 w-2.5 md:h-3 md:w-3"
                      />
                      <span className="text-[10px] md:text-xs capitalize">{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] md:text-xs mb-1">Start / Finish Availability:</div>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {newPerson.availability_start_date 
                          ? format(parseLocalDate(newPerson.availability_start_date), 'MMM d') 
                          : 'Start'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newPerson.availability_start_date ? parseLocalDate(newPerson.availability_start_date) : undefined}
                        onSelect={(date) => setNewPerson({ 
                          ...newPerson, 
                          availability_start_date: date ? formatLocalDate(date) : undefined
                        })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {newPerson.availability_end_date 
                          ? format(parseLocalDate(newPerson.availability_end_date), 'MMM d') 
                          : 'End'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newPerson.availability_end_date ? parseLocalDate(newPerson.availability_end_date) : undefined}
                        onSelect={(date) => setNewPerson({ 
                          ...newPerson, 
                          availability_end_date: date ? formatLocalDate(date) : undefined
                        })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <div className="text-[10px] md:text-xs mb-1">Unavailable Dates:</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full h-6 text-[10px] justify-start">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {newPerson.not_available_dates.length > 0 
                        ? `${newPerson.not_available_dates.length} date(s) selected` 
                        : 'Select unavailable dates'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="multiple"
                      selected={newPerson.not_available_dates.map(d => parseLocalDate(d))}
                      onSelect={(dates) => setNewPerson({ 
                        ...newPerson, 
                        not_available_dates: dates?.map(d => formatLocalDate(d)) || [] 
                      })}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[10px] md:text-xs mb-1">Specific Available Dates:</div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full h-6 text-[10px] justify-start">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {newPerson.specific_dates.length > 0 
                      ? `${newPerson.specific_dates.length} date(s) selected` 
                      : 'Select specific dates'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="multiple"
                    selected={newPerson.specific_dates.map(d => parseLocalDate(d))}
                    onSelect={(dates) => setNewPerson({ 
                      ...newPerson, 
                      specific_dates: dates?.map(d => formatLocalDate(d)) || [] 
                    })}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="flex gap-1 pt-1">
            <Button onClick={handleAddPerson} size="sm" className="h-7 flex-1 text-[10px] md:text-xs">
              <Check className="h-3 w-3 mr-1" />
              Add
            </Button>
            <Button 
              onClick={() => setShowAddForm(false)} 
              variant="ghost" 
              size="sm" 
              className="h-7 flex-1 text-[10px] md:text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
