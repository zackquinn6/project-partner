import { useState, useEffect } from 'react';
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
export default function Auth() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Update form when URL changes
  useEffect(() => {
    const mode = searchParams.get('mode');
    setIsSignUp(mode === 'signup');
  }, [location.search]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      // Check if there's a return parameter
      const returnPath = searchParams.get('return');
      if (returnPath === 'projects') {
        navigate('/projects');
      } else {
        navigate('/');
      }
    }
  }, [user, loading, navigate, searchParams]);
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
      try {
        await supabase.from('user_sessions').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          user_agent: navigator.userAgent
        });
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
    
    // Transfer guest data if converting from guest
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
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin" className="h-12 text-base font-medium">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="h-12 text-base font-medium">Sign Up</TabsTrigger>
            </TabsList>
            
            <div className="mt-6">
              <TabsContent value="signin" className="mt-0">
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
                <Button type="submit" className="w-full mb-8" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0">
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
                <Button type="submit" className="w-full mb-8" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up
                </Button>
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
            
            <Button type="button" variant="secondary" className="w-full mt-3 mb-4" onClick={handleGuestSignIn} disabled={isLoading}>
              <User className="mr-2 h-4 w-4" />
              Continue as Guest
            </Button>
            
            {guestData.projectRuns.length > 0 && (
              <div className="mt-2 text-xs text-center text-muted-foreground">
                You have {guestData.projectRuns.length} project(s) saved as a guest. Sign up to keep them permanently.
              </div>
            )}
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

          {/* Key Characteristics Section */}
          
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
    </div>;
}