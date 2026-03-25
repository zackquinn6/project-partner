import { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ShoppingListItem {
  id: string;
  material_name: string;
  quantity: number;
  task_id: string;
  task_title: string;
  task_status: string;
}

type SortField = 'material_name' | 'task_title';
type SortDirection = 'asc' | 'desc';

export function ShoppingListManager() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('material_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
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
        .select('id, material_name, quantity, task_id')
        .eq('user_id', user.id);

      if (error) throw error;

      // Fetch task details for each item and exclude materials from closed tasks.
      if (shoppingData && shoppingData.length > 0) {
        const taskIds = [...new Set(shoppingData.map(item => item.task_id))];
        const { data: tasksData } = await supabase
          .from('home_tasks')
          .select('id, title, status')
          .in('id', taskIds);

        const taskMap = new Map(tasksData?.map(task => [task.id, task]) || []);

        const enrichedItems: ShoppingListItem[] = shoppingData
          .map(item => {
            const task = taskMap.get(item.task_id);
            return {
              ...item,
              task_title: task?.title || 'Unknown Task',
              task_status: task?.status || 'open'
            };
          })
          .filter(item => item.task_status !== 'closed');

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const aVal = a[sortField].toLowerCase();
      const bVal = b[sortField].toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [items, sortField, sortDirection]);

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

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
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
                <TableHead className="w-20 text-xs font-medium">Qty</TableHead>
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
                  <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                    No materials in shopping list. Add materials to tasks to see them here.
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="text-xs font-medium">{item.material_name}</span>
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      {item.quantity || 1}
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