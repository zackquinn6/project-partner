import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { achievementDefinitionById } from '@/constants/achievementDefinitions';
import { Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AchievementsFullDialog } from '@/components/AchievementsFullDialog';

const RECENT_ACHIEVEMENTS_SHOWN = 5;

interface Notification {
  id: string;
  achievement_id: string;
  is_read: boolean;
  created_at: string;
  achievement?: {
    name: string;
    description: string;
    icon: string;
  } | null;
}

export function AchievementNotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [fullAchievementsOpen, setFullAchievementsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Set up real-time subscription on user_achievements (unlock rows)
      const channel = supabase
        .channel('user_achievements')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_achievements',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data: rows, error } = await supabase
        .from('user_achievements')
        .select('id, achievement_id, is_read, created_at, type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const unlockRows = (rows || []).filter(
        (r: { achievement_id?: string | null; type?: string | null }) =>
          Boolean(r.achievement_id) && (r.type ?? 'unlock') !== 'xp'
      ).slice(0, 10);

      if (!unlockRows.length) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const list = unlockRows.map((row: { id: string; achievement_id: string; is_read: boolean; created_at: string }) => {
        const def = achievementDefinitionById(row.achievement_id);
        return {
          id: row.id,
          achievement_id: row.achievement_id,
          is_read: row.is_read,
          created_at: row.created_at,
          achievement: def
            ? { name: def.name, description: def.description, icon: def.icon }
            : null,
        };
      });
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_achievements')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_achievements')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const recentNotifications = notifications.slice(0, RECENT_ACHIEVEMENTS_SHOWN);
  const hasMoreUnlocks = notifications.length > RECENT_ACHIEVEMENTS_SHOWN;

  const openFullAchievements = () => {
    setPopoverOpen(false);
    setFullAchievementsOpen(true);
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Achievements">
            <Medal className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,20rem)] p-0 sm:w-80" align="end">
          <div className="flex items-start justify-between gap-2 border-b px-3 py-3 sm:px-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-tight">Recent achievements</h3>
              <p className="text-xs text-muted-foreground">Latest unlocks</p>
            </div>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 shrink-0 text-xs"
              >
                Mark all read
              </Button>
            ) : null}
          </div>

          <ScrollArea className="max-h-[min(50vh,280px)]">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-muted-foreground">
                <Medal className="mx-auto mb-2 h-10 w-10 opacity-50" />
                <p className="text-sm">No achievements yet</p>
                <p className="mt-1 text-xs">Complete projects to unlock badges.</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    className={`cursor-pointer px-3 py-2.5 transition-colors sm:px-4 sm:py-3 ${
                      !notification.is_read ? 'bg-muted/50' : ''
                    } hover:bg-muted`}
                    onClick={() => markAsRead(notification.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <div className="rounded-lg bg-primary/10 p-1.5 sm:p-2">
                        <span className="text-xl sm:text-2xl">
                          {notification.achievement?.icon === 'Trophy' ? '🏆' : '⭐'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug">
                          {notification.achievement?.name ?? 'Achievement'}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {notification.achievement?.description ?? ''}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {!notification.is_read ? (
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-3 sm:p-4">
            {hasMoreUnlocks ? (
              <p className="mb-2 text-center text-[11px] text-muted-foreground">
                Showing {RECENT_ACHIEVEMENTS_SHOWN} most recent
              </p>
            ) : null}
            <Button type="button" variant="default" className="w-full" size="sm" onClick={openFullAchievements}>
              View all achievements
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <AchievementsFullDialog open={fullAchievementsOpen} onOpenChange={setFullAchievementsOpen} />
    </>
  );
}
