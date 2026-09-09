import React from 'react';
import { ScrollableDialog } from './ScrollableDialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Calendar, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import toolioLogo from '@/assets/toolio-logo.png';
import { useMembership } from '@/contexts/MembershipContext';

interface ExpertHelpWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestUpgrade?: () => void;
}

export const ExpertHelpWindow: React.FC<ExpertHelpWindowProps> = ({
  isOpen,
  onClose,
  onRequestUpgrade,
}) => {
  const { hasProjectsTier, loading } = useMembership();
  const canEscalate = !loading && hasProjectsTier;

  return (
    <div className={`fixed inset-0 z-[60] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {isOpen && (
        <div
          className="absolute inset-0 bg-background/60 backdrop-blur-md"
          onClick={onClose}
        />
      )}
      <ScrollableDialog
        open={isOpen}
        onOpenChange={onClose}
        title="Video Chat With a Pro"
        description="Premium escalate — book a human expert when AI help is not enough"
        planningToolHeader
        className="relative z-[61] h-[100dvh] max-h-[100dvh] w-full max-w-full md:h-[90vh] md:max-h-[90vh] md:w-[90vw] md:max-w-[min(90vw,calc(100vw-2rem))]"
      >
      <div className="relative space-y-6">
        <div className="relative z-10 -mx-4 -mt-4 mb-4">
          <div className="bg-gradient-to-r from-primary/90 to-primary/70 backdrop-blur-sm border-b border-primary/30">
            <div className="flex items-center justify-center gap-2 py-3 px-4">
              <Sparkles className="w-4 h-4 text-primary-foreground animate-pulse" />
              <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 text-xs font-semibold">
                Premium escalate
              </Badge>
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <div className="text-center">
            <img 
              src={toolioLogo} 
              alt="Toolio Logo" 
              className="mx-auto w-48 h-auto mb-4"
            />
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              In-step AI help is the default for Project Partner. Use this when you want a live video session with a pro — included with the Projects plan.
            </p>
          </div>
          
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/5">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-lg flex items-center justify-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Schedule Your Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  20 or 40 minute calls to unblock a mid-project problem with a human expert.
                </div>
              </div>
              
              {canEscalate ? (
                <a 
                  href="https://app.acuityscheduling.com/schedule.php?owner=36845722" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button 
                    size="lg"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Book a pro
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                </a>
              ) : (
                <Button 
                  size="lg"
                  className="w-full"
                  disabled={loading}
                  onClick={() => {
                    onRequestUpgrade?.();
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    Upgrade to Projects to book
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Button>
              )}
              
              <p className="text-xs text-muted-foreground">
                Projects plan • Human guidance when you need it
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollableDialog>
    </div>
  );
};
