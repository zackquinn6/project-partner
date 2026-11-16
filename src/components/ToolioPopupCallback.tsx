import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/** postMessage type from the Toolio OAuth popup back to the opener. */
export const TOOLIO_OAUTH_MESSAGE = 'pp_toolio_oauth' as const;

type ToolioOauthMessage =
  | { type: typeof TOOLIO_OAUTH_MESSAGE; status: 'done' }
  | { type: typeof TOOLIO_OAUTH_MESSAGE; status: 'error'; error: string };

/**
 * Runs inside the Toolio OAuth popup after Supabase redirects back to /auth?toolio_popup=1.
 * Exchanges the code (detectSessionInUrl), tells the opener, then closes.
 */
export function ToolioPopupCallback() {
  const [error, setError] = useState<string | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    const finish = (message: ToolioOauthMessage) => {
      if (finished.current) return;
      finished.current = true;
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(message, window.location.origin);
      }
      window.close();
    };

    const returned = new URLSearchParams(`${window.location.search.slice(1)}&${window.location.hash.slice(1)}`);
    const oauthError = returned.get('error_description') ?? returned.get('error');
    if (oauthError) {
      setError(oauthError);
      finish({ type: TOOLIO_OAUTH_MESSAGE, status: 'error', error: oauthError });
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        finish({ type: TOOLIO_OAUTH_MESSAGE, status: 'done' });
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        finish({ type: TOOLIO_OAUTH_MESSAGE, status: 'done' });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">Completing Toolio sign-in</p>
        </>
      )}
    </div>
  );
}
