import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

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
        .select('id, achievement_id, is_read, created_at')
        .eq('user_id', user.id)
        .eq('type', 'unlock')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!rows?.length) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const achievementIds = [...new Set(rows.map((r: { achievement_id: string }) => r.achievement_id))];
      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('id, name, description, icon')
        .in('id', achievementIds);

      const achievementMap = new Map(
        (achievementsData || []).map((a: { id: string; name: string; description: string; icon: string | null }) => [a.id, a])
      );

      const list = rows.map((row: { id: string; achievement_id: string; is_read: boolean; created_at: string }) => ({
        id: row.id,
        achievement_id: row.achievement_id,
        is_read: row.is_read,
        created_at: row.created_at,
        achievement: achievementMap.get(row.achievement_id) ?? null
      }));
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
        .eq('type', 'unlock')
        .eq('is_read', false);

      if (error) throw error;

      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Medal className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Achievements</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Medal className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No achievements yet</p>
              <p className="text-xs mt-1">Complete projects to unlock badges!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-muted/50' : ''
                  } hover:bg-muted`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <span className="text-2xl">
                        {notification.achievement?.icon === 'Trophy' ? '🏆' : '⭐'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">
                        {notification.achievement?.name ?? 'Achievement'}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.achievement?.description ?? ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
