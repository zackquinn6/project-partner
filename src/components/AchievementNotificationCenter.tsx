import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { achievementDefinitionById } from '@/constants/achievementDefinitions';
import {
  Medal,
  Trophy,
  Home,
  Paintbrush,
  Droplet,
  Zap,
  Calendar,
  TrendingUp,
  Star,
  Award,
  Grid3x3,
  Repeat,
  Layers,
  Camera,
  ClipboardList,
  Hammer,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AchievementsFullDialog } from '@/components/AchievementsFullDialog';
import { cn } from '@/lib/utils';

const RECENT_ACHIEVEMENTS_SHOWN = 5;

const iconMap: Record<string, LucideIcon> = {
  Trophy,
  Home,
  Paintbrush,
  Droplet,
  Zap,
  Calendar,
  TrendingUp,
  Star,
  Award,
  Medal,
  Grid3x3,
  Repeat,
  Layers,
  Camera,
  ClipboardList,
  Hammer,
};

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

      const unlockRows = (rows || [])
        .filter(
          (r: { achievement_id?: string | null; type?: string | null }) =>
            Boolean(r.achievement_id) && (r.type ?? 'unlock') !== 'xp'
        )
        .slice(0, 10);

      if (!unlockRows.length) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const list = unlockRows.map(
        (row: { id: string; achievement_id: string; is_read: boolean; created_at: string }) => {
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
        }
      );
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
            {unreadCount > 0 ? (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center px-1 text-[10px]"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(100vw-1.25rem,20rem)] overflow-hidden rounded-2xl p-0 shadow-lg sm:w-80"
          align="end"
          sideOffset={8}
        >
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <h3 className="text-sm font-semibold tracking-tight">Achievements</h3>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 px-2 text-xs text-muted-foreground"
              >
                Mark read
              </Button>
            ) : null}
          </div>

          <ScrollArea className="max-h-[min(55vh,22rem)]">
            {loading ? (
              <div className="space-y-2 p-4" aria-busy="true">
                <div className="h-12 animate-pulse rounded-xl bg-muted" />
                <div className="h-12 animate-pulse rounded-xl bg-muted" />
                <div className="h-12 animate-pulse rounded-xl bg-muted" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                  <Medal className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">None yet</p>
                <p className="mt-1 max-w-[14rem] text-xs text-muted-foreground">
                  Finish a project to earn your first badge.
                </p>
              </div>
            ) : (
              <div className="p-2">
                {recentNotifications.map((notification) => {
                  const IconComponent =
                    iconMap[notification.achievement?.icon ?? ''] || Trophy;
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors',
                        !notification.is_read ? 'bg-primary/[0.06]' : 'hover:bg-muted/70'
                      )}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-snug">
                            {notification.achievement?.name ?? 'Achievement'}
                          </p>
                          {!notification.is_read ? (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          ) : null}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {notification.achievement?.description ?? ''}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground/80">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-3">
            <Button
              type="button"
              variant="default"
              className="h-9 w-full rounded-xl"
              size="sm"
              onClick={openFullAchievements}
            >
              View all
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <AchievementsFullDialog
        open={fullAchievementsOpen}
        onOpenChange={setFullAchievementsOpen}
      />
    </>
  );
}
