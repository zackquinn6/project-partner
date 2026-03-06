import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useLiabilityAcceptance() {
  const { user } = useAuth();
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!user?.id) {
      setAccepted(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('liability_agreements')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.error('Error checking liability acceptance:', error);
      setAccepted(false);
    } else {
      setAccepted(!!data);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    check();
  }, [check]);

  return { accepted: accepted === true, loading, refetch: check };
}
