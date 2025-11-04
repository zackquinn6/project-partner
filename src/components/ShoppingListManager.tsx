import { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ShoppingListItem {
  id: string;
  material_name: string;
  completed: boolean;
  task_id: string;
  task_title: string;
}

type SortField = 'material_name' | 'task_title';
type SortDirection = 'asc' | 'desc';

export function ShoppingListManager() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('material_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user]);

  const fetchItems = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: shoppingData, error } = await supabase
        .from('task_shopping_list')
        .select(`
          id,
          material_name,
          completed,
          task_id
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Fetch task details for each item
      if (shoppingData && shoppingData.length > 0) {
        const taskIds = [...new Set(shoppingData.map(item => item.task_id))];
        const { data: tasksData } = await supabase
          .from('home_tasks')
          .select('id, title')
          .in('id', taskIds);

        const taskMap = new Map(tasksData?.map(task => [task.id, task.title]) || []);

        const enrichedItems: ShoppingListItem[] = shoppingData.map(item => ({
          ...item,
          task_title: taskMap.get(item.task_id) || 'Unknown Task'
        }));

        setItems(enrichedItems);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error fetching shopping list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (itemId: string, currentCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('task_shopping_list')
        .update({ completed: !currentCompleted })
        .eq('id', itemId);

      if (error) throw error;
      fetchItems();
    } catch (error) {
      console.error('Error updating shopping list item:', error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedItems = useMemo(() => {
    const filtered = showCompleted ? items : items.filter(item => !item.completed);
    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortField].toLowerCase();
      const bVal = b[sortField].toLowerCase();
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [items, sortField, sortDirection, showCompleted]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading materials...</p>
        </div>
      </div>
    );
  }

  const completedCount = items.filter(item => item.completed).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant={showCompleted ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCompleted(!showCompleted)}
          className="h-7 text-xs"
        >
          {showCompleted ? `Hide Done (${completedCount})` : `Show Done (${completedCount})`}
        </Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="min-w-[200px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('material_name')}
                    className="h-6 px-2 text-xs font-medium"
                  >
                    Material <SortIcon field="material_name" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[200px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('task_title')}
                    className="h-6 px-2 text-xs font-medium"
                  >
                    Task <SortIcon field="task_title" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground">
                    No materials in shopping list. Add materials to tasks to see them here.
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item) => (
                  <TableRow key={item.id} className={item.completed ? 'opacity-60' : ''}>
                    <TableCell className="w-8">
                      <button
                        onClick={() => handleToggleComplete(item.id, item.completed)}
                        className="text-xs font-medium hover:opacity-70 transition-opacity touch-target min-h-[44px] min-w-[44px] flex items-center justify-center -m-2"
                        title={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {item.completed ? '✓' : '○'}
                      </button>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium cursor-pointer ${
                          item.completed ? 'line-through text-muted-foreground' : ''
                        }`}
                        onClick={() => handleToggleComplete(item.id, item.completed)}
                      >
                        {item.completed ? '✓ ' : ''}{item.material_name}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.task_title}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}