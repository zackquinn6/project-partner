import { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/useResponsive';

interface ShoppingListItem {
  id: string;
  material_name: string;
  quantity: number;
  task_id: string;
  task_title: string;
  task_status: string;
  shopped: boolean;
}

type SortField = 'material_name' | 'task_title';
type SortDirection = 'asc' | 'desc';

export function ShoppingListManager() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('material_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    if (user) {
      void fetchItems();
    }
  }, [user]);

  const fetchItems = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: shoppingData, error } = await supabase
        .from('task_shopping_list')
        .select('id, material_name, quantity, task_id, shopped')
        .eq('user_id', user.id);

      if (error) throw error;

      if (shoppingData && shoppingData.length > 0) {
        const taskIds = [...new Set(shoppingData.map((item) => item.task_id))];
        const { data: tasksData } = await supabase
          .from('home_tasks')
          .select('id, title, status')
          .in('id', taskIds);

        const taskMap = new Map(tasksData?.map((task) => [task.id, task]) || []);

        const enrichedItems: ShoppingListItem[] = shoppingData
          .map((item) => {
            const task = taskMap.get(item.task_id);
            return {
              id: item.id,
              material_name: item.material_name,
              quantity: item.quantity,
              task_id: item.task_id,
              task_title: task?.title || 'Unknown Task',
              task_status: task?.status || 'open',
              shopped: Boolean(item.shopped),
            };
          })
          .filter((item) => item.task_status !== 'closed');

        setItems(enrichedItems);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Error fetching shopping list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShopped = async (item: ShoppingListItem) => {
    const next = !item.shopped;
    const { error } = await supabase.from('task_shopping_list').update({ shopped: next }).eq('id', item.id);

    if (error) {
      console.error('Error updating shopped:', error);
      return;
    }
    setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, shopped: next } : row)));
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
    if (sortField !== field) {
      return <ChevronDown className="h-3 w-3 text-white opacity-30" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 text-white" />
    ) : (
      <ChevronDown className="h-3 w-3 text-white" />
    );
  };

  const colCount = isMobile ? 3 : 4;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground md:text-[18px]">Loading materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-2 md:space-y-3">
      <div className="border-x-0 flex-1 overflow-hidden rounded-none border border-border/60 md:rounded-lg md:border-x">
        <div className="h-full max-h-[min(600px,70vh)] overflow-auto md:max-h-none">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-sky-600/80 text-white [&_th]:px-2 [&_th]:py-2 [&_th]:md:px-4 [&_th]:md:py-3">
              <TableRow className="border-sky-500/50">
                <TableHead className="w-14 text-xs text-white">
                  <span className="sr-only">Shopped</span>
                </TableHead>
                <TableHead className="min-w-0 text-xs text-white md:min-w-[200px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('material_name')}
                    className="h-6 px-1 text-xs font-medium text-white hover:bg-white/20 hover:text-white md:px-2"
                  >
                    Material <SortIcon field="material_name" />
                  </Button>
                </TableHead>
                <TableHead className="w-20 text-xs font-medium text-white md:w-24">Qty</TableHead>
                {!isMobile && (
                  <TableHead className="min-w-0 text-xs text-white md:min-w-[200px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('task_title')}
                      className="h-6 px-1 text-xs font-medium text-white hover:bg-white/20 hover:text-white md:px-2"
                    >
                      Task <SortIcon field="task_title" />
                    </Button>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="[&_td]:px-2 [&_td]:py-2 [&_td]:md:px-4 [&_td]:md:py-3">
              {sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colCount}
                    className="py-6 text-center text-sm text-muted-foreground md:py-8 md:text-[18px]"
                  >
                    No materials in shopping list. Add materials to tasks to see them here.
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item) => (
                  <TableRow key={item.id} className={item.shopped ? 'opacity-60' : ''}>
                    <TableCell className="w-14 p-1 align-middle">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleToggleShopped(item)}
                        className="h-10 w-10 min-h-10 min-w-10 rounded-md border-2 p-0 text-base font-medium hover:bg-primary/10 md:h-12 md:w-12 md:min-h-12 md:min-w-12 md:text-lg"
                        title={item.shopped ? 'Mark as not shopped' : 'Mark as shopped'}
                        aria-pressed={item.shopped}
                        aria-label={item.shopped ? 'Shopped' : 'Not shopped yet'}
                      >
                        {item.shopped ? '✓' : '○'}
                      </Button>
                    </TableCell>
                    <TableCell className="min-w-0">
                      <span
                        className={`text-sm font-medium leading-tight md:text-[18px] ${
                          item.shopped ? 'text-muted-foreground line-through' : ''
                        }`}
                      >
                        {item.material_name}
                      </span>
                    </TableCell>
                    <TableCell
                      className={`text-center text-sm md:text-[18px] ${item.shopped ? 'text-muted-foreground' : ''}`}
                    >
                      {item.quantity || 1}
                    </TableCell>
                    {!isMobile && (
                      <TableCell
                        className={`text-sm md:text-[18px] ${item.shopped ? 'text-muted-foreground line-through' : ''}`}
                      >
                        {item.task_title}
                      </TableCell>
                    )}
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
