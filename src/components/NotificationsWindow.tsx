import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNotifications, AppNotification } from '@/hooks/useNotifications';
import { CheckCheck, Bell, AlertCircle, TriangleAlert, Trash2, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNotificationSupportCode } from '@/utils/errorReporting';

function NotificationTypeIcon({ type }: { type: AppNotification['type'] }) {
  if (type === 'runtime_error') {
    return <TriangleAlert className="h-4 w-4 text-destructive-soft shrink-0" />;
  }
  if (type === 'issue_reported') {
    return <AlertCircle className="h-4 w-4 text-warning-soft shrink-0" />;
  }
  return <Bell className="h-4 w-4 text-primary shrink-0" />;
}

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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!open) return;
    setPage(0);
    setAll([]);
    setHasMore(true);
    setExpandedIds(new Set());
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

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[210] flex h-[85vh] max-h-[85vh] w-[50vw] max-w-[50vw] flex-col overflow-hidden"
        overlayClassName="z-[200]"
      >
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </DialogTitle>
        </DialogHeader>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 self-start gap-2"
            onClick={() => markAllAsRead()}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto -mx-4 px-4 md:-mx-6 md:px-6">
          {all.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground py-6 text-center">No notifications yet.</p>
          )}
          <ul className="space-y-2 pb-2">
            {all.map((n) => {
              const expanded = expandedIds.has(n.id);
              const supportCode = getNotificationSupportCode(n.metadata);
              return (
                <li
                  key={n.id}
                  className={cn(
                    'rounded-lg border text-sm',
                    n.read_at ? 'opacity-80 bg-muted/50' : 'bg-background'
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 px-3 text-left',
                      expanded ? 'pt-3 pb-2' : 'h-12'
                    )}
                    aria-expanded={expanded}
                    onClick={() => toggleExpanded(n.id)}
                  >
                    <NotificationTypeIcon type={n.type} />
                    <span
                      className={cn(
                        'min-w-0 flex-1 font-medium',
                        !expanded && 'truncate'
                      )}
                    >
                      {n.title}
                    </span>
                    {!expanded && (
                      <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                        expanded && 'rotate-180'
                      )}
                      aria-hidden
                    />
                  </button>
                  {expanded && (
                    <div className="space-y-2 px-3 pb-3 pl-9">
                      {n.body && (
                        <p className="text-muted-foreground whitespace-pre-wrap break-words">
                          {n.body}
                        </p>
                      )}
                      {supportCode && (
                        <p className="text-xs font-medium text-destructive-soft">
                          Error code: {supportCode}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
                            setExpandedIds((prev) => {
                              const next = new Set(prev);
                              next.delete(n.id);
                              return next;
                            });
                          }}
                        >
                          <Trash2 className="h-3 w-3 shrink-0" aria-hidden />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {hasMore && all.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 mb-2"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load more'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
