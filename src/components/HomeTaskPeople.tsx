import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface Person {
  id: string;
  name: string;
  available_hours: number;
  available_days: string[];
  consecutive_days: number;
  diy_level: 'beginner' | 'intermediate' | 'pro';
  hourly_rate: number;
}

interface HomeTaskPeopleProps {
  userId: string;
  homeId: string | null;
  onPeopleChange?: () => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function HomeTaskPeople({ userId, homeId, onPeopleChange }: HomeTaskPeopleProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [newPerson, setNewPerson] = useState({
    name: '',
    available_hours: 8,
    available_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    consecutive_days: 5,
    diy_level: 'intermediate' as 'beginner' | 'intermediate' | 'pro',
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

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        Manage team members available for this project
      </div>

      {/* Add new person form */}
      <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
        <div className="grid grid-cols-3 gap-2">
          <Input
            placeholder="Name"
            value={newPerson.name}
            onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
            className="text-xs h-8"
          />
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              max="24"
              value={newPerson.available_hours}
              onChange={(e) => setNewPerson({ ...newPerson, available_hours: parseInt(e.target.value) })}
              className="text-xs h-8 w-20"
              placeholder="Hrs"
            />
            <span className="text-xs self-center">hrs/day</span>
          </div>
          <div className="flex gap-1">
            <span className="text-xs self-center">$</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={newPerson.hourly_rate}
              onChange={(e) => setNewPerson({ ...newPerson, hourly_rate: parseFloat(e.target.value) || 0 })}
              className="text-xs h-8"
              placeholder="Rate"
            />
            <span className="text-xs self-center">/hr</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select 
            value={newPerson.diy_level} 
            onValueChange={(val) => setNewPerson({ ...newPerson, diy_level: val as any })}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              min="1"
              max="7"
              value={newPerson.consecutive_days}
              onChange={(e) => setNewPerson({ ...newPerson, consecutive_days: parseInt(e.target.value) })}
              className="text-xs h-8 w-16"
            />
            <span className="text-xs">consec. days</span>
          </div>
        </div>

        <div>
          <div className="text-xs font-medium mb-2">Available Days:</div>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(day => (
              <label key={day} className="flex items-center gap-1 cursor-pointer">
                <Checkbox
                  checked={newPerson.available_days.includes(day)}
                  onCheckedChange={() => toggleDay(day)}
                  className="h-3 w-3"
                />
                <span className="text-xs capitalize">{day.slice(0, 3)}</span>
              </label>
            ))}
          </div>
        </div>

        <Button onClick={handleAddPerson} size="sm" className="h-8 w-full">
          <Plus className="h-3 w-3 mr-1" />
          Add Team Member
        </Button>
      </div>

      {/* People list */}
      <div className="space-y-2">
        {people.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No team members yet. Add people to enable scheduling.
          </p>
        ) : (
          people.map((person) => (
            <div key={person.id} className="border rounded-lg p-3 space-y-2 text-xs">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold">{person.name}</div>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {person.available_hours}h/day
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {person.diy_level}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {person.consecutive_days} consec days
                    </Badge>
                    {person.hourly_rate > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        ${person.hourly_rate}/hr
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Available: {person.available_days.map(d => d.slice(0, 3)).join(', ')}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePerson(person.id)}
                  className="h-6 w-6 p-0 text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}