import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TaskShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

interface ShoppingListItem {
  id: string;
  material_name: string;
  quantity: number;
}

export function TaskShoppingListDialog({ 
  open, 
  onOpenChange, 
  taskId,
  taskTitle 
}: TaskShoppingListDialogProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newMaterial, setNewMaterial] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && taskId) {
      fetchItems();
    }
  }, [open, taskId]);

  const fetchItems = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_shopping_list')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching shopping list:', error);
      toast.error('Failed to load shopping list');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async () => {
    if (!user || !newMaterial.trim()) return;

    try {
      const { error } = await supabase
        .from('task_shopping_list')
        .insert({
          user_id: user.id,
          task_id: taskId,
          material_name: newMaterial.trim(),
          quantity: 1,
        });

      if (error) throw error;
      
      setNewMaterial('');
      fetchItems();
          } catch (error) {
      console.error('Error adding material:', error);
      toast.error('Failed to add material');
    }
  };

  const handleRemoveMaterial = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('task_shopping_list')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      
      fetchItems();
          } catch (error) {
      console.error('Error removing material:', error);
      toast.error('Failed to remove material');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Materials for: {taskTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new material */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter material name..."
              value={newMaterial}
              onChange={(e) => setNewMaterial(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMaterial()}
            />
            <Button onClick={handleAddMaterial} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Materials list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                Loading materials...
              </div>
            ) : items.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                No materials added yet
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <span className="text-sm">
                    {item.material_name}
                    {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMaterial(item.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}