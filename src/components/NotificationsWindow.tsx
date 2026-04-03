import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, AppNotification } from '@/hooks/useNotifications';
import { CheckCheck, Bell, AlertCircle, TriangleAlert, Trash2 } from 'lucide-react';
import { getNotificationSupportCode } from '@/utils/errorReporting';

export function NotificationsWindow({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { fetchAll, markAsRead, markAllAsRead, deleteNotification, unreadCount } = useNotifications();
  const [all, setAll] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!open) return;
    setPage(0);
    setAll([]);
    setHasMore(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data, hasMore: more } = await fetchAll(0);
      setAll(data);
      setHasMore(more);
      setLoading(false);
    };
    load();
  }, [open, fetchAll]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    const { data, hasMore: more } = await fetchAll(nextPage);
    setAll(prev => [...prev, ...data]);
    setHasMore(more);
    setPage(nextPage);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </DialogTitle>
        </DialogHeader>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start gap-2"
            onClick={() => markAllAsRead()}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
        <ScrollArea className="flex-1 min-h-[200px] -mx-6 px-6">
          {all.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground py-6 text-center">No notifications yet.</p>
          )}
          <ul className="space-y-2">
            {all.map((n) => (
              <li
                key={n.id}
                className={`rounded-lg border p-3 text-sm ${n.read_at ? 'opacity-80 bg-muted/50' : 'bg-background'}`}
              >
                <div className="flex items-start gap-2">
                  {n.type === 'runtime_error' ? (
                    <TriangleAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  ) : n.type === 'issue_reported' ? (
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <Bell className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{n.title}</p>
                    {n.body && <p className="text-muted-foreground mt-0.5">{n.body}</p>}
                    {getNotificationSupportCode(n.metadata) && (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        Error code: {getNotificationSupportCode(n.metadata)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      {!n.read_at && (
                        <Button
                          variant="link"
                          className="h-auto p-0 text-xs"
                          onClick={() => markAsRead(n.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                      <Button
                        variant="link"
                        className="h-auto p-0 text-xs text-destructive gap-1"
                        onClick={async () => {
                          await deleteNotification(n.id);
                          setAll((prev) => prev.filter((x) => x.id !== n.id));
                        }}
                      >
                        <Trash2 className="h-3 w-3 shrink-0" aria-hidden />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {hasMore && all.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load more'}
            </Button>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
