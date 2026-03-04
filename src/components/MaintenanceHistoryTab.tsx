import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Trash2, Pencil } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MaintenanceCompletion {
  id: string;
  task_id: string;
  completed_at: string;
  notes?: string;
  photo_url?: string;
  task: {
    title: string;
    category: string;
  };
}

interface MaintenanceHistoryTabProps {
  selectedHomeId: string;
  sortBy: string;
  categoryFilter: string;
  onRefresh?: () => void;
}

export const MaintenanceHistoryTab: React.FC<MaintenanceHistoryTabProps> = ({ selectedHomeId, sortBy, categoryFilter, onRefresh }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [completions, setCompletions] = useState<MaintenanceCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedHomeId && user) {
      fetchCompletions();
    }
  }, [selectedHomeId, user]);

  const fetchCompletions = async () => {
    if (!user || !selectedHomeId) return;

    setLoading(true);
    try {
      // Get completions for tasks associated with the selected home
      const { data, error } = await supabase
        .from('maintenance_completions')
        .select(`
          id,
          task_id,
          completed_at,
          notes,
          photo_url,
          user_maintenance_tasks!inner (
            title,
            category,
            home_id
          )
        `)
        .eq('user_id', user.id)
        .eq('user_maintenance_tasks.home_id', selectedHomeId)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Transform the data structure
      const transformedData = data?.map(completion => ({
        id: completion.id,
        task_id: completion.task_id,
        completed_at: completion.completed_at,
        notes: completion.notes,
        photo_url: completion.photo_url,
        task: {
          title: completion.user_maintenance_tasks.title,
          category: completion.user_maintenance_tasks.category
        }
      })) || [];

      setCompletions(transformedData);
    } catch (error) {
      console.error('Error fetching completion history:', error);
    } finally {
      setLoading(false);
    }
  };

  const recomputeTaskFromCompletions = async (taskId: string) => {
    if (!user) return;
    const { data: task } = await supabase
      .from('user_maintenance_tasks')
      .select('frequency_days')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();
    if (!task?.frequency_days) return;
    const { data: remaining } = await supabase
      .from('maintenance_completions')
      .select('completed_at')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(1);
    const lastCompleted = remaining?.[0]?.completed_at ?? null;
    const nextDue = lastCompleted
      ? addDays(new Date(lastCompleted), task.frequency_days).toISOString()
      : addDays(new Date(), task.frequency_days).toISOString();
    await supabase
      .from('user_maintenance_tasks')
      .update({ last_completed: lastCompleted, next_due: nextDue, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('user_id', user.id);
  };

  const handleDelete = async (completion: MaintenanceCompletion) => {
    if (!user) return;
    setDeletingId(completion.id);
    try {
      const { error } = await supabase
        .from('maintenance_completions')
        .delete()
        .eq('id', completion.id)
        .eq('user_id', user.id);
      if (error) throw error;
      await recomputeTaskFromCompletions(completion.task_id);
      setCompletions(prev => prev.filter(c => c.id !== completion.id));
      onRefresh?.();
      toast({ title: 'Deleted', description: 'Completion record removed.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Could not delete completion', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditDate = async (completion: MaintenanceCompletion, newDate: Date) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('maintenance_completions')
        .update({ completed_at: newDate.toISOString() })
        .eq('id', completion.id)
        .eq('user_id', user.id);
      if (error) throw error;
      await recomputeTaskFromCompletions(completion.task_id);
      setCompletions(prev =>
        prev.map(c => (c.id === completion.id ? { ...c, completed_at: newDate.toISOString() } : c))
      );
      setEditingId(null);
      setEditDate(null);
      onRefresh?.();
      toast({ title: 'Updated', description: 'Completion date updated.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Could not update date', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getFilteredAndSortedCompletions = () => {
    let filtered = completions;

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(completion => completion.task.category === categoryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
        case 'date-desc':
          return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
        case 'category':
          return a.task.category.localeCompare(b.task.category);
        case 'title':
          return a.task.title.localeCompare(b.task.title);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const categories = ['appliances', 'hvac', 'safety', 'plumbing', 'exterior', 'general'];
  const categoryLabels: Record<string, string> = {
    appliances: 'Appliances',
    hvac: 'HVAC',
    safety: 'Safety',
    plumbing: 'Plumbing',
    exterior: 'Exterior',
    general: 'General'
  };

  const filteredCompletions = getFilteredAndSortedCompletions();

  if (loading) {
    return <div className="text-center py-8">Loading completion history...</div>;
  }

  if (filteredCompletions.length === 0) {
    return (
      <Card className="mx-1">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No completion history</h3>
            <p className="text-muted-foreground">
              Complete some maintenance tasks to see your history here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {filteredCompletions.map(completion => (
        <Card key={completion.id} className="hover:shadow-sm transition-shadow mx-1">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium text-sm">{completion.task.title}</h4>
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    {categoryLabels[completion.task.category] ?? completion.task.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <Popover
                    open={editingId === completion.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setEditingId(null);
                        setEditDate(null);
                      } else {
                        setEditingId(completion.id);
                        setEditDate(new Date(completion.completed_at));
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(completion.completed_at), 'MMM dd, yyyy')}
                        <Pencil className="h-3 w-3 ml-0.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="start">
                      <Calendar
                        mode="single"
                        selected={editDate ?? undefined}
                        onSelect={(d) => d && setEditDate(d)}
                        disabled={(d) => d > new Date()}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={saving || !editDate}
                          onClick={() => editDate && handleEditDate(completion, editDate)}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {completion.notes && (
                  <p className="text-xs text-muted-foreground mt-2">{completion.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {completion.photo_url && (
                  <img
                    src={completion.photo_url}
                    alt="Completion"
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover border"
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(completion)}
                  disabled={deletingId === completion.id}
                  title="Delete this record"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};