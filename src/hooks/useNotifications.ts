import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const PAGE_SIZE = 20;

export function useNotifications() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [list, setList] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchRecent = useCallback(async (limit = 10) => {
    if (!user?.id || roleLoading) return [];
    let query = supabase
      .from('notifications')
      .select('id, user_id, type, title, body, read_at, created_at, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    // Runtime/function failures are admin-facing only. In-app toasts cover the user.
    if (!isAdmin) {
      query = query.neq('type', 'runtime_error');
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
    return (data || []) as AppNotification[];
  }, [user?.id, isAdmin, roleLoading]);

  const fetchAll = useCallback(async (page = 0) => {
    if (!user?.id || roleLoading) return { data: [], hasMore: false };
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from('notifications')
      .select('id, user_id, type, title, body, read_at, created_at, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (!isAdmin) {
      query = query.neq('type', 'runtime_error');
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching notifications:', error);
      return { data: [], hasMore: false };
    }
    const items = (data || []) as AppNotification[];
    return { data: items, hasMore: items.length === PAGE_SIZE };
  }, [user?.id, isAdmin, roleLoading]);

  const refetch = useCallback(async () => {
    if (!user?.id) {
      setList([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    if (roleLoading) {
      setLoading(true);
      return;
    }
    setLoading(true);
    let unreadQuery = supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .is('read_at', null);
    if (!isAdmin) {
      unreadQuery = unreadQuery.neq('type', 'runtime_error');
    }
    const [recent, countResult] = await Promise.all([
      fetchRecent(10),
      unreadQuery,
    ]);
    if (countResult.error) {
      console.error('Error counting unread notifications:', countResult.error);
      setLoading(false);
      return;
    }
    if (countResult.count === null) {
      console.error('Missing unread notifications count');
      setLoading(false);
      return;
    }
    setList(recent);
    setUnreadCount(countResult.count);
    setLoading(false);
  }, [user?.id, fetchRecent, isAdmin, roleLoading]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const markAsRead = useCallback(async (id: string) => {
    if (!user?.id) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);
    setList(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  }, [user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);
    setList(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
  }, [user?.id]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('read_at');
    if (error) {
      console.error('Error deleting notification:', error);
      return;
    }
    const deleted = data?.[0] as { read_at: string | null } | undefined;
    if (deleted && deleted.read_at === null) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setList((prev) => prev.filter((n) => n.id !== id));
  }, [user?.id]);

  return {
    notifications: list,
    unreadCount,
    loading,
    refetch,
    fetchRecent,
    fetchAll,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
