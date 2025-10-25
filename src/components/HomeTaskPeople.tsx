import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CalendarIcon, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Person {
  id: string;
  name: string;
  available_hours: number;
  available_days: string[];
  consecutive_days: number;
  diy_level: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  hourly_rate: number;
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
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingDates, setEditingDates] = useState<Date[]>([]);
  const [newPerson, setNewPerson] = useState({
    name: '',
    available_hours: 8,
    available_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    consecutive_days: 5,
    diy_level: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'professional',
    hourly_rate: 0
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
      toast.error('Name is required');
      return;
    }

    if (newPerson.available_days.length === 0) {
      toast.error('Select at least one available day');
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
      toast.error('Failed to add person');
      return;
    }

    toast.success('Person added');
    setNewPerson({
      name: '',
      available_hours: 8,
      available_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      consecutive_days: 5,
      diy_level: 'intermediate',
      hourly_rate: 0
    });
    fetchPeople();
    onPeopleChange?.();
  };

  const handleDeletePerson = async (personId: string) => {
    const { error } = await supabase
      .from('home_task_people')
      .delete()
      .eq('id', personId);

    if (error) {
      toast.error('Failed to delete person');
      return;
    }

    toast.success('Person removed');
    fetchPeople();
    onPeopleChange?.();
  };

  const toggleDay = (day: string) => {
    setNewPerson(prev => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter(d => d !== day)
        : [...prev.available_days, day]
    }));
  };

  const handleEditDates = (person: Person) => {
    setEditingPersonId(person.id);
    const dates = (person.not_available_dates || []).map(d => new Date(d));
    setEditingDates(dates);
  };

  const handleSaveDates = async (personId: string) => {
    const dateStrings = editingDates.map(d => d.toISOString().split('T')[0]);
    
    const { error } = await supabase
      .from('home_task_people')
      .update({ not_available_dates: dateStrings })
      .eq('id', personId);

    if (error) {
      toast.error('Failed to update dates');
      return;
    }

    toast.success('Unavailable dates updated');
    setEditingPersonId(null);
    fetchPeople();
    onPeopleChange?.();
  };

  const handleCancelEdit = () => {
    setEditingPersonId(null);
    setEditingDates([]);
  };

  return (
    <div className="space-y-3">
      <div className="text-[10px] md:text-xs text-muted-foreground">
        Manage team members available for this project
      </div>

      {/* Add new person form */}
      <div className="border rounded-lg p-2 md:p-3 space-y-2 bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,auto] gap-2">
          <Input
            placeholder="Name"
            value={newPerson.name}
            onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
            className="text-[10px] md:text-xs h-7"
          />
          <div className="flex gap-1 items-center">
            <Input
              type="number"
              min="1"
              max="24"
              value={newPerson.available_hours}
              onChange={(e) => setNewPerson({ ...newPerson, available_hours: parseInt(e.target.value) })}
              className="text-[10px] md:text-xs h-7 w-12"
              placeholder="Hrs"
            />
            <span className="text-[10px] md:text-xs whitespace-nowrap">hrs/day</span>
          </div>
          <div className="flex gap-1 items-center">
            <span className="text-[10px] md:text-xs">$</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={newPerson.hourly_rate}
              onChange={(e) => setNewPerson({ ...newPerson, hourly_rate: parseFloat(e.target.value) || 0 })}
              className="text-[10px] md:text-xs h-7 w-12"
              placeholder="Rate"
            />
            <span className="text-[10px] md:text-xs">/hr</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Select 
            value={newPerson.diy_level} 
            onValueChange={(val) => setNewPerson({ ...newPerson, diy_level: val as any })}
          >
            <SelectTrigger className="text-[10px] md:text-xs h-7">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              min="1"
              max="7"
              value={newPerson.consecutive_days}
              onChange={(e) => setNewPerson({ ...newPerson, consecutive_days: parseInt(e.target.value) })}
              className="text-[10px] md:text-xs h-7 w-14"
            />
            <span className="text-[10px] md:text-xs">consec. days</span>
          </div>
        </div>

        <div>
          <div className="text-[10px] md:text-xs font-medium mb-1.5">Available Days:</div>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map(day => (
              <label key={day} className="flex items-center gap-0.5 cursor-pointer">
                <Checkbox
                  checked={newPerson.available_days.includes(day)}
                  onCheckedChange={() => toggleDay(day)}
                  className="h-2.5 w-2.5 md:h-3 md:w-3"
                />
                <span className="text-[10px] md:text-xs capitalize">{day.slice(0, 3)}</span>
              </label>
            ))}
          </div>
        </div>

        <Button onClick={handleAddPerson} size="sm" className="h-7 w-full text-[10px] md:text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Add Team Member
        </Button>
      </div>

      {/* People list */}
      <div className="space-y-2">
        {people.length === 0 ? (
          <p className="text-[10px] md:text-xs text-muted-foreground text-center py-3">
            No team members yet. Add people to enable scheduling.
          </p>
        ) : (
          people.map((person) => (
            <div key={person.id} className="border rounded-lg p-2 md:p-3 space-y-1.5 text-[10px] md:text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{person.name}</div>
                  <div className="flex flex-wrap gap-1 md:gap-1.5 mt-1">
                    <Badge variant="outline" className="text-[9px] md:text-[10px] px-1 md:px-1.5 py-0">
                      {person.available_hours}h/day
                    </Badge>
                    <Badge variant="outline" className="text-[9px] md:text-[10px] px-1 md:px-1.5 py-0">
                      {person.diy_level}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] md:text-[10px] px-1 md:px-1.5 py-0">
                      {person.consecutive_days} consec
                    </Badge>
                    {person.hourly_rate > 0 && (
                      <Badge variant="secondary" className="text-[9px] md:text-[10px] px-1 md:px-1.5 py-0">
                        ${person.hourly_rate.toString().replace(/^0+/, '')}/hr
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-[9px] md:text-[10px] text-muted-foreground">
                    {person.available_days.map(d => d.slice(0, 3)).join(', ')}
                  </div>
                  
                  {/* Not Available Dates */}
                  <div className="mt-2 pt-1.5 border-t">
                    {editingPersonId === person.id ? (
                      <div className="space-y-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-6 text-[10px] justify-start"
                            >
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {editingDates.length > 0 ? `${editingDates.length} dates selected` : 'Select dates'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="multiple"
                              selected={editingDates}
                              onSelect={(dates) => setEditingDates(dates || [])}
                              initialFocus
                              className="rounded-md border"
                            />
                          </PopoverContent>
                        </Popover>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveDates(person.id)}
                            className="flex-1 h-6 text-[10px]"
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditDates(person)}
                        className="h-6 w-full text-[10px] justify-start px-2"
                      >
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        Not Available: {person.not_available_dates?.length || 0} dates
                      </Button>
                    )}
                  </div>
                </div>
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
          ))
        )}
      </div>
    </div>
  );
}