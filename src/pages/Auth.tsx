import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import { ProjectPartnerLogo } from '@/components/ProjectPartnerLogo';

const ONBOARDING_STORAGE_KEY = 'project_partner_onboarding';

type PmFocus = 'schedule' | 'quality' | 'savings' | 'all_three' | null;

/** Persist onboarding (name, DIY level, project focus) to the user's profile. Call when the user is in session. */
async function saveOnboardingToProfile(
  userId: string,
  name: string,
  diyLevel: string,
  pmFocus?: PmFocus
): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: userId,
    full_name: name,
    nickname: name,
    skill_level: diyLevel,
    updated_at: new Date().toISOString(),
  };
  if (pmFocus) row.project_focus = pmFocus;
  const { error } = await (supabase.from('user_profiles') as any).upsert(row, { onConflict: 'user_id' });
  if (error) {
    console.error('Failed to save onboarding to profile:', error);
  }
}

export default function Auth() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [defaultLanding, setDefaultLanding] = useState<'projects' | 'workspace'>('projects');
  const [projectCatalogEnabled, setProjectCatalogEnabled] = useState(true);
  const [landingLoaded, setLandingLoaded] = useState(false);
  const { user, signInWithToolio, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When user becomes available, persist any pending onboarding saved before the Toolio redirect
  const flushPendingOnboarding = useCallback(async (userEmail: string, userId: string, viaToolio: boolean) => {
    try {
      const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!raw) return;
      const pending = JSON.parse(raw) as {
        email?: string;
        viaToolio?: boolean;
        name: string;
        diyLevel: string;
        pmFocus?: PmFocus;
      };
      // Older email sign-ups stored the email; a Toolio sign-in stores viaToolio because the email is unknown until return.
      const matches = pending.viaToolio ? viaToolio : pending.email === userEmail.toLowerCase();
      if (!matches) return;
      await saveOnboardingToProfile(userId, pending.name, pending.diyLevel, pending.pmFocus ?? null);
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Prefer admin landing settings, but never block post-login redirect on a failed/hanging fetch.
  useEffect(() => {
    if (!user) {
      setLandingLoaded(true);
      return;
    }

    let cancelled = false;
    const SETTINGS_TIMEOUT_MS = 2000;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), SETTINGS_TIMEOUT_MS);

    const loadLanding = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['default_landing_view', 'project_catalog_enabled'])
          .abortSignal(controller.signal);

        if (cancelled || error || !data) {
          return;
        }

        for (const row of data) {
          if (row.setting_key === 'default_landing_view') {
            const value = (row.setting_value as { mode?: 'projects' | 'workspace' } | null)?.mode;
            if (value === 'projects' || value === 'workspace') {
              setDefaultLanding(value);
            }
          }
          if (row.setting_key === 'project_catalog_enabled') {
            const enabled = (row.setting_value as { enabled?: boolean } | null)?.enabled;
            if (typeof enabled === 'boolean') {
              setProjectCatalogEnabled(enabled);
            }
          }
        }
      } catch {
        // Network/CORS/timeout: keep existing landing defaults.
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) {
          setLandingLoaded(true);
        }
      }
    };

    void loadLanding();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
      setLandingLoaded(true);
    };
  }, [user]);

  // When user is present, save any pending onboarding then redirect
  useEffect(() => {
    if (!user || loading || !landingLoaded) return;
    const viaToolio = ((user.app_metadata?.providers ?? []) as string[]).includes('custom:toolio');
    flushPendingOnboarding(user.email ?? '', user.id, viaToolio).then(() => {
      const returnPath = searchParams.get('return');
      if (returnPath === 'projects') {
        if (projectCatalogEnabled) {
          navigate('/projects');
        } else {
          navigate('/');
        }
        return;
      }

      if (defaultLanding === 'workspace') {
        navigate('/');
        return;
      }

      if (defaultLanding === 'projects' && projectCatalogEnabled) {
        navigate('/projects');
        return;
      }

      navigate('/');
    });
  }, [user, loading, landingLoaded, defaultLanding, projectCatalogEnabled, navigate, searchParams, flushPendingOnboarding]);

  const handleToolioSignIn = async () => {
    setIsLoading(true);
    setError(null);
    // Onboarding answers live in router state, which the Toolio redirect drops.
    const onboarding = (location.state as {
      onboarding?: { name: string; diyLevel: string; pmFocus?: PmFocus };
    })?.onboarding;
    if (onboarding?.name?.trim() && onboarding?.diyLevel) {
      localStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({
          viaToolio: true,
          name: onboarding.name.trim(),
          diyLevel: onboarding.diyLevel,
          pmFocus: onboarding.pmFocus ?? null,
        })
      );
    }
    // Back to this page so onboarding is saved and the landing settings route the user.
    const { error: toolioError } = await signInWithToolio(`${window.location.origin}/auth${location.search}`);
    if (toolioError) {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      setError(toolioError.message);
      setIsLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
  }
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <ProjectPartnerLogo className="h-12" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
          <CardDescription>
            {searchParams.get('return') === 'projects' ? "Sign in to start your selected project" : "Sign in to your account or create a new one"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" className="w-full" onClick={handleToolioSignIn} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue with Toolio
          </Button>

          {error && <Alert className="mt-4 border-destructive">
              <AlertDescription className="text-destructive">
                {error}
              </AlertDescription>
            </Alert>}
        </CardContent>
      </Card>

      {/* Back to Home Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="absolute top-4 left-4 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>
    </div>;
}
