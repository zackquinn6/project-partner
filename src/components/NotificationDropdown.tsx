import React from 'react';
import { Bell, AlertCircle, CheckCheck, Settings2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationsWindow } from './NotificationsWindow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getNotificationSupportCode } from '@/utils/errorReporting';

export function NotificationDropdown() {
  const { notifications, unreadCount, loading, refetch, markAsRead } = useNotifications();
  const [windowOpen, setWindowOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu onOpenChange={(open) => open && refetch()}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0 relative" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[9999] w-[320px] p-0" sideOffset={5}>
          <div className="p-2 border-b flex items-center justify-between gap-2">
            <span className="font-semibold text-sm">Notifications</span>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 px-2"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-portfolio-reminders'));
                }}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Settings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setWindowOpen(true)}
              >
                View all
              </Button>
            </div>
          </div>
          <ScrollArea className="max-h-[280px]">
            {loading && notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">No notifications yet.</p>
            ) : (
              <ul className="p-1">
                {notifications.slice(0, 8).map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-md px-2 py-2 text-sm ${n.read_at ? 'opacity-80' : ''}`}
                  >
                    <div className="flex gap-2">
                      {n.type === 'runtime_error' ? (
                        <TriangleAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      ) : n.type === 'issue_reported' ? (
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <Bell className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-tight">{n.title}</p>
                        {n.body && (
                          <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        {getNotificationSupportCode(n.metadata) && (
                          <p className="mt-1 text-[10px] font-medium text-red-600">
                            Error code: {getNotificationSupportCode(n.metadata)}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleDateString()}
                        </p>
                        {!n.read_at && (
                          <Button
                            variant="link"
                            className="h-auto p-0 text-xs mt-0.5"
                            onClick={() => markAsRead(n.id)}
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
          {notifications.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2"
                onClick={() => setWindowOpen(true)}
              >
                <CheckCheck className="h-4 w-4" />
                View all notifications
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <NotificationsWindow open={windowOpen} onOpenChange={setWindowOpen} />
    </>
  );
}
