import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
}

export const MaintenanceHistoryTab: React.FC<MaintenanceHistoryTabProps> = ({ selectedHomeId, sortBy, categoryFilter }) => {
  console.log('📊 MaintenanceHistoryTab render - checking spacing');
  const { user } = useAuth();
  const [completions, setCompletions] = useState<MaintenanceCompletion[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex-1 overflow-y-auto space-y-2 pb-3 px-3 md:px-6">
      {loading ? (
        <div className="text-center py-8">Loading completion history...</div>
      ) : filteredCompletions.length === 0 ? (
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
      ) : (
        filteredCompletions.map(completion => (
          <Card key={completion.id} className="hover:shadow-sm transition-shadow mx-1">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-sm">{completion.task.title}</h4>
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      {categoryLabels[completion.task.category]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(completion.completed_at), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  {completion.notes && (
                    <p className="text-xs text-muted-foreground mt-2">{completion.notes}</p>
                  )}
                </div>
                {completion.photo_url && (
                  <div className="ml-4">
                    <img 
                      src={completion.photo_url} 
                      alt="Completion photo"
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover border"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )))}
    </div>
  );
};