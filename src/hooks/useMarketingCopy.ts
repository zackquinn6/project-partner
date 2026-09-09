import { useEffect, useMemo } from 'react';
import { useGlobalPublicSettings } from '@/hooks/useGlobalPublicSettings';
import {
  applyMarketingDocumentMeta,
  getMarketingCopy,
  type MarketingCopy,
} from '@/data/marketingCopy';

export function useMarketingCopy(): MarketingCopy & { tileFocusMode: boolean; loading: boolean } {
  const { tileFocusMode, loading } = useGlobalPublicSettings();
  const copy = useMemo(() => getMarketingCopy(tileFocusMode), [tileFocusMode]);

  useEffect(() => {
    if (loading) return;
    applyMarketingDocumentMeta(copy);
  }, [copy, loading]);

  return { ...copy, tileFocusMode, loading };
}
