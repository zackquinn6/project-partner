import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Camera, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export interface MaintenancePhotoItem {
  id: string;
  task_id: string;
  completed_at: string;
  notes: string | null;
  photo_url: string;
  task: { title: string; category: string };
}

interface MaintenancePhotosWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Shows only photos uploaded during maintenance task completions.
 * Data from maintenance_completions (user-scoped via RLS). Photos stored in project-photos bucket under maintenance-photos/.
 */
export function MaintenancePhotosWindow({ open, onOpenChange }: MaintenancePhotosWindowProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<MaintenancePhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<MaintenancePhotoItem | null>(null);

  useEffect(() => {
    if (open && user) fetchPhotos();
  }, [open, user]);

  const fetchPhotos = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('maintenance_completions')
        .select(`
          id,
          task_id,
          completed_at,
          notes,
          photo_url,
          user_maintenance_tasks!inner ( title, category )
        `)
        .eq('user_id', user.id)
        .not('photo_url', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      const list = (data || []).map((row: any) => {
        const taskRow = Array.isArray(row.user_maintenance_tasks) ? row.user_maintenance_tasks[0] : row.user_maintenance_tasks;
        return {
          id: row.id,
          task_id: row.task_id,
          completed_at: row.completed_at,
          notes: row.notes ?? null,
          photo_url: row.photo_url,
          task: {
            title: taskRow?.title ?? '',
            category: taskRow?.category ?? '',
          },
        };
      });
      setItems(list);
    } catch (e) {
      console.error('Error fetching maintenance photos:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Maintenance Photos
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-7 px-2 text-xs">
                Close
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                    <Camera className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No maintenance photos yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    When you mark a task complete and add a photo, it will show up here. Great for before-and-after and records.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow w-[75px]"
                    onClick={() => setSelected(item)}
                  >
                    <CardContent className="p-1">
                      <div className="aspect-square bg-muted rounded overflow-hidden mb-1">
                        <img
                          src={item.photo_url}
                          alt={item.task.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-[9px] text-muted-foreground truncate text-center" title={item.task.title}>
                        {item.task.title}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>{selected.task.title}</DialogTitle>
            </DialogHeader>
            <div className="flex gap-4">
              <div className="flex-1">
                <img
                  src={selected.photo_url}
                  alt={selected.task.title}
                  className="w-full rounded-lg"
                />
              </div>
              <div className="w-64 space-y-4 flex flex-col">
                <div>
                  <Label className="text-sm font-medium">Task</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selected.task.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Completed</Label>
                  <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(selected.completed_at), 'PPp')}
                  </div>
                </div>
                {selected.notes && (
                  <div>
                    <Label className="text-sm font-medium">Notes</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selected.notes}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-auto"
                  onClick={() => window.open(selected.photo_url, '_blank')}
                >
                  Open in new tab
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
