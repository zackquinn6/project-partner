import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';

export const PreSignInNavigation = () => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    console.log('Sign In clicked');
    navigate('/auth');
  };

  const handleSignUp = () => {
    console.log('Sign Up clicked');
    navigate('/auth?mode=signup');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center">
          <img 
            src="/lovable-uploads/1a837ddc-50ca-40f7-b975-0ad92fdf9882.png" 
            alt="Project Partner Logo" 
            className="h-10 w-auto"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-foreground hover:bg-muted"
            onClick={handleSignIn}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
          <Button 
            variant="default"
            size="sm"
            onClick={handleSignUp}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Sign Up
          </Button>
        </div>
      </div>
    </nav>
  );
};