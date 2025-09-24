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
}

export const MaintenanceHistoryTab: React.FC<MaintenanceHistoryTabProps> = ({ selectedHomeId }) => {
  console.log('📊 MaintenanceHistoryTab render - checking spacing');
  const { user } = useAuth();
  const [completions, setCompletions] = useState<MaintenanceCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');

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
    <div className="flex-1 flex flex-col h-full">
      {/* Filters - matching Active tab spacing */}
      <div className="flex flex-col sm:flex-row gap-2 py-3 shrink-0">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent className="mt-1">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {categoryLabels[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="mt-1">
            <SelectItem value="date-desc">Date (Newest First)</SelectItem>
            <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
            <SelectItem value="category">Category</SelectItem>
            <SelectItem value="title">Task Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Completion History - matching Active tab content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 pb-3">
        {loading ? (
          <div className="text-center py-8">Loading completion history...</div>
        ) : filteredCompletions.length === 0 ? (
          <Card>
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
          <div className="space-y-2">
            {filteredCompletions.map(completion => (
              <Card key={completion.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{completion.task.title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {categoryLabels[completion.task.category]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(completion.completed_at), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      {completion.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{completion.notes}</p>
                      )}
                    </div>
                    {completion.photo_url && (
                      <div className="ml-4">
                        <img 
                          src={completion.photo_url} 
                          alt="Completion photo"
                          className="w-16 h-16 rounded-lg object-cover border"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};