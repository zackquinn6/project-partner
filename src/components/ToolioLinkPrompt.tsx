import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalPublicSettings } from '@/hooks/useGlobalPublicSettings';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ToolioAccountStatus = { linked: boolean; toolio_account: boolean; email?: string };

const dismissKey = (userId: string) => `pp_toolio_link_dismissed:${userId}`;

/**
 * After a sign-in that did not use Toolio (email, Google), offers to link a Toolio account with the
 * same confirmed email. Linking signs in through Toolio, which attaches it to this same account.
 */
export function ToolioLinkPrompt() {
  const { user, signInWithToolio } = useAuth();
  const { toolioSignInEnabled } = useGlobalPublicSettings();
  const location = useLocation();
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? null;
  const alreadyLinked = ((user?.app_metadata?.providers ?? []) as string[]).includes('custom:toolio');

  useEffect(() => {
    setEmail(null);
    if (!userId || !toolioSignInEnabled || alreadyLinked || localStorage.getItem(dismissKey(userId))) return;
    let cancelled = false;
    void supabase.functions
      .invoke<ToolioAccountStatus>('toolio-account', { body: { action: 'status' } })
      .then(({ data, error: invokeError }) => {
        if (cancelled) return;
        if (invokeError || !data) {
          console.error('toolio-account status failed:', invokeError?.message);
          return;
        }
        if (!data.linked && data.toolio_account && data.email) setEmail(data.email);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, toolioSignInEnabled, alreadyLinked]);

  const notNow = () => {
    if (userId) localStorage.setItem(dismissKey(userId), new Date().toISOString());
    setEmail(null);
  };

  const link = async () => {
    setBusy(true);
    setError(null);
    const { error: toolioError } = await signInWithToolio(`${window.location.origin}${location.pathname}${location.search}`);
    if (toolioError) {
      setError(toolioError.message);
      setBusy(false);
    }
  };

  return (
    <Dialog open={email != null} onOpenChange={(open) => !open && notNow()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link your Toolio account</DialogTitle>
          <DialogDescription>
            You have a Toolio account with {email}. Link it to sign in to Project Partner with Toolio. Your Project Partner
            projects stay as they are.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={notNow} disabled={busy}>
            Not now
          </Button>
          <Button onClick={() => void link()} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Link accounts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
