import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSecureInput } from '@/hooks/useSecureInput';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ArrowLeft, AlertCircle, User } from 'lucide-react';
import { useGuest } from '@/contexts/GuestContext';

const ONBOARDING_STORAGE_KEY = 'project_partner_onboarding';

/** Persist onboarding (name, DIY level, project focus) to the user's profile. Call after signup when user is in session. */
async function saveOnboardingToProfile(
  userId: string,
  name: string,
  diyLevel: string,
  pmFocus?: 'schedule' | 'quality' | 'savings' | 'all_three' | null
): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: userId,
    full_name: name,
    nickname: name,
    skill_level: diyLevel,
    updated_at: new Date().toISOString(),
  };
  if (pmFocus) row.project_focus = pmFocus;
  const { error } = await supabase.from('user_profiles').upsert(row, { onConflict: 'user_id' });
  if (error) {
    console.error('Failed to save onboarding to profile:', error);
  }
}

export default function Auth() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [defaultLanding, setDefaultLanding] = useState<'projects' | 'workspace'>('projects');
  const [projectCatalogEnabled, setProjectCatalogEnabled] = useState(true);
  const [landingLoaded, setLandingLoaded] = useState(false);
  const {
    user,
    signIn,
    signUp,
    signInWithGoogle,
    continueAsGuest,
    loading
  } = useAuth();
  const { validateAndSanitize, startFormTracking, trackFormSubmission, commonRules } = useSecureInput();
  const { guestData, transferGuestDataToUser } = useGuest();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showGoogleErrorDialog, setShowGoogleErrorDialog] = useState(false);
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // When user becomes available, persist any pending onboarding (e.g. after email confirmation)
  const flushPendingOnboarding = useCallback(async (userEmail: string, userId: string) => {
    try {
      const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!raw) return;
      const pending = JSON.parse(raw) as {
        email: string;
        name: string;
        diyLevel: string;
        pmFocus?: 'schedule' | 'quality' | 'savings' | 'all_three' | null;
      };
      if (pending.email !== userEmail.toLowerCase()) return;
      await saveOnboardingToProfile(userId, pending.name, pending.diyLevel, pending.pmFocus ?? null);
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Update form when URL changes
  useEffect(() => {
    const mode = searchParams.get('mode');
    setIsSignUp(mode === 'signup');
  }, [location.search]);

  // Load default landing view and global catalog availability (same source as admin toggles)
  useEffect(() => {
    const loadLanding = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['default_landing_view', 'project_catalog_enabled']);

        if (error) {
          console.error('Error loading post-auth routing settings:', error);
        } else {
          for (const row of data ?? []) {
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
        }
      } catch (err) {
        console.error('Unexpected error loading post-auth routing settings:', err);
      } finally {
        setLandingLoaded(true);
      }
    };

    loadLanding();
  }, []);

  // When user is present, save any pending onboarding then redirect
  useEffect(() => {
    if (!user || loading || !landingLoaded) return;
    flushPendingOnboarding(user.email ?? '', user.id).then(() => {
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
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setValidationErrors({});
    
    // Start form tracking
    startFormTracking();
    
    // Validate and sanitize inputs
    const validation = validateAndSanitize({ email, password }, {
      email: commonRules.email,
      password: { required: true, minLength: 1, maxLength: 128 }
    });
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setIsLoading(false);
      return;
    }
    
    // Track form submission timing
    trackFormSubmission('signin');
    
    const { error } = await signIn(validation.sanitizedData.email, password);
    if (error) {
      setError(error.message);

      // Log failed login attempt
      try {
        await supabase.rpc('log_failed_login', {
          user_email: validation.sanitizedData.email,
          ip_addr: null,
          user_agent_string: navigator.userAgent
        });
      } catch (logError) {
        console.error('Failed to log failed login attempt:', logError);
      }
    } else {
      // Create user session on successful login
      const { data: { user: signedInUser } } = await supabase.auth.getUser();
      try {
        if (signedInUser) {
          const { error: sessionErr } = await supabase.from('user_sessions').insert({
            user_id: signedInUser.id,
            user_agent: navigator.userAgent
          });
          if (sessionErr && sessionErr.code !== 'PGRST204' && sessionErr.code !== '42P01') {
            console.error('Failed to create session log:', sessionErr);
          }
          // If they came from get-started with onboarding in state, persist to profile
          const onboarding = (location.state as {
            onboarding?: { name: string; diyLevel: string; pmFocus?: 'schedule' | 'quality' | 'savings' | 'all_three' | null };
          })?.onboarding;
          if (onboarding?.name?.trim() && onboarding?.diyLevel) {
            await saveOnboardingToProfile(
              signedInUser.id,
              onboarding.name.trim(),
              onboarding.diyLevel,
              onboarding.pmFocus ?? null
            );
          }
        }
      } catch (sessionError) {
        console.error('Failed to create session log:', sessionError);
      }
    }
    setIsLoading(false);
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    setValidationErrors({});
    
    // Start form tracking
    startFormTracking();
    
    // Validate and sanitize inputs
    const validation = validateAndSanitize({ email, password, confirmPassword }, {
      email: commonRules.email,
      password: commonRules.password,
      confirmPassword: { required: true, minLength: 8, maxLength: 128 }
    });
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setIsLoading(false);
      return;
    }
    
    // Check password match
    if (password !== confirmPassword) {
      setValidationErrors({ confirmPassword: 'Passwords do not match' });
      setIsLoading(false);
      return;
    }
    
    // Track form submission timing
    trackFormSubmission('signup');
    
    const onboarding = (location.state as {
      onboarding?: { name: string; diyLevel: string; pmFocus?: 'schedule' | 'quality' | 'savings' | 'all_three' | null };
    })?.onboarding;
    const dataToTransfer = guestData.projectRuns.length > 0 ? guestData : undefined;

    const { error } = await signUp(validation.sanitizedData.email, password, dataToTransfer);
    if (error) {
      setError(error.message);
    } else {
      if (dataToTransfer) {
        await transferGuestDataToUser('converting');
        setMessage('Account created! Your guest data has been saved.');
      } else {
        setMessage('Check your email for a confirmation link');
      }
      // Persist onboarding name (→ full_name + nickname), DIY level, and project focus to profile once user is in session
      if (onboarding?.name?.trim() && onboarding?.diyLevel) {
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          await saveOnboardingToProfile(
            newUser.id,
            onboarding.name.trim(),
            onboarding.diyLevel,
            onboarding.pmFocus ?? null
          );
        } else {
          localStorage.setItem(
            ONBOARDING_STORAGE_KEY,
            JSON.stringify({
              email: validation.sanitizedData.email.toLowerCase(),
              name: onboarding.name.trim(),
              diyLevel: onboarding.diyLevel,
              pmFocus: onboarding.pmFocus ?? null,
            })
          );
        }
      }
    }
    setIsLoading(false);
  };
  const handleGoogleSignIn = async () => {
    // Google provider is not configured, show error dialog
    setShowGoogleErrorDialog(true);
  };

  const handleGuestSignIn = () => {
    continueAsGuest();
    // Always navigate to home for guest users
    navigate('/');
  };

  const handleForgotPassword = async () => {
    setForgotSubmitting(true);
    setForgotError(null);
    setForgotSent(false);

    const emailToUse = (forgotEmail || email).trim().toLowerCase();
    const validation = validateAndSanitize({ email: emailToUse }, { email: commonRules.email });
    if (!validation.isValid) {
      setForgotError(validation.errors.email || 'Enter a valid email.');
      setForgotSubmitting(false);
      return;
    }

    const explicitRedirect = import.meta.env.VITE_AUTH_EMAIL_REDIRECT_URL;
    const redirectUrl =
      typeof explicitRedirect === 'string' && explicitRedirect.trim() !== ''
        ? explicitRedirect.trim()
        : `${window.location.origin}/auth`;

    const { error } = await supabase.auth.resetPasswordForEmail(validation.sanitizedData.email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      setForgotError(error.message);
    } else {
      setForgotSent(true);
    }

    setForgotSubmitting(false);
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
            <img src="/lovable-uploads/1a837ddc-50ca-40f7-b975-0ad92fdf9882.png" alt="Project Partner Logo" className="h-12 w-auto" loading="lazy" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
          <CardDescription>
            {searchParams.get('return') === 'projects' ? "Sign in to start your selected project" : "Sign in to your account or create a new one"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={isSignUp ? "signup" : "signin"} onValueChange={value => {
          const newMode = value === 'signup' ? 'signup' : 'signin';
          setIsSignUp(value === 'signup');

          // Preserve return parameter when switching tabs
          const returnParam = searchParams.get('return');
          const returnQuery = returnParam ? `&return=${returnParam}` : '';
          navigate(`/auth?mode=${newMode}${returnQuery}`, {
            replace: true
          });
        }} className="w-full">
            <div className="pb-4">
              <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-muted rounded-lg">
                <TabsTrigger 
                  value="signin" 
                  className="h-12 text-base font-medium py-3 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="h-12 text-base font-medium py-3 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="pt-4">
              <TabsContent value="signin" className="mt-0 space-y-0">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input 
                      id="signin-email" 
                      type="email" 
                      placeholder="your@email.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      required 
                      className={validationErrors.email ? "border-destructive" : ""}
                    />
                    {validationErrors.email && (
                      <div className="flex items-center text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.email}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input 
                      id="signin-password" 
                      type="password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                      className={validationErrors.password ? "border-destructive" : ""}
                    />
                    {validationErrors.password && (
                      <div className="flex items-center text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.password}
                      </div>
                    )}
                  </div>
                  <div className="-mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 h-auto text-xs"
                      onClick={() => {
                        setForgotDialogOpen(true);
                        setForgotEmail(email);
                        setForgotError(null);
                        setForgotSent(false);
                      }}
                      disabled={isLoading}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <div className="pt-4">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0 space-y-0">
                <p className="text-sm text-muted-foreground mb-4">
                  Project Partner saves your plans and progress, so you can always pick up where you left off. Your login keeps everything secure and ready when you return.
                </p>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="your@email.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      required 
                      className={validationErrors.email ? "border-destructive" : ""}
                    />
                    {validationErrors.email && (
                      <div className="flex items-center text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.email}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input 
                      id="signup-password" 
                      type="password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                      className={validationErrors.password ? "border-destructive" : ""}
                    />
                    {validationErrors.password && (
                      <div className="flex items-center text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.password}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Password must contain at least 8 characters with uppercase, lowercase, and numbers
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      required 
                      className={validationErrors.confirmPassword ? "border-destructive" : ""}
                    />
                    {validationErrors.confirmPassword && (
                      <div className="flex items-center text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.confirmPassword}
                      </div>
                    )}
                  </div>
                  <div className="pt-4">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign Up
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </div>
          </Tabs>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full mt-4 mb-4" onClick={handleGoogleSignIn} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>}
              Continue with Google
            </Button>
          </div>

          {error && <Alert className="mt-4 border-destructive">
              <AlertDescription className="text-destructive">
                {error}
              </AlertDescription>
            </Alert>}

          {message && <Alert className="mt-4">
              <AlertDescription className="text-foreground">
                {message}
              </AlertDescription>
            </Alert>}

          {/* Critical Points section */}
          
        </CardContent>
      </Card>
      
      {/* Back to Home Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="absolute top-4 left-4 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>

      {/* Google Error Dialog */}
      <Dialog open={showGoogleErrorDialog} onOpenChange={setShowGoogleErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Google Login Unavailable</DialogTitle>
            <DialogDescription>
              Google login not available right now. Try creating an account directly instead.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowGoogleErrorDialog(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotDialogOpen} onOpenChange={setForgotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter your account email and we’ll send a password reset link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>
            {forgotError && (
              <Alert className="border-destructive">
                <AlertDescription className="text-destructive">
                  {forgotError}
                </AlertDescription>
              </Alert>
            )}
            {forgotSent && (
              <Alert>
                <AlertDescription>
                  If an account exists for that email, a reset link has been sent.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotDialogOpen(false)}
                disabled={forgotSubmitting}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleForgotPassword}
                disabled={forgotSubmitting}
              >
                {forgotSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}