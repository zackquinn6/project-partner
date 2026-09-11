import React from 'react';
import { ScrollableDialog } from './ScrollableDialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Calendar, 
  ArrowRight,
} from 'lucide-react';
import toolioLogo from '@/assets/toolio-logo.png';
import { useMembership } from '@/contexts/MembershipContext';
import { PlanningToolContextBanner } from '@/components/PlanningWizardSteps/PlanningToolContextBanner';
import { useProject } from '@/contexts/ProjectContext';

interface ExpertHelpWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestUpgrade?: () => void;
  /** Optional AI chat handoff context for the pro session */
  escalateContext?: {
    threadId?: string | null;
    stepTitle?: string | null;
    recentMessages?: Array<{ role: string; content: string }>;
  } | null;
}

export const ExpertHelpWindow: React.FC<ExpertHelpWindowProps> = ({
  isOpen,
  onClose,
  onRequestUpgrade,
  escalateContext,
}) => {
  const { hasProjectsTier, loading } = useMembership();
  const { currentProjectRun } = useProject();
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
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="Video Chat With a Pro"
        description="Premium escalate — book a human expert when AI help is not enough"
        planningToolHeader
        className="relative z-[61] h-[100dvh] max-h-[100dvh] w-full max-w-full md:h-[90vh] md:max-h-[90vh] md:w-[90vw] md:max-w-[min(90vw,calc(100vw-2rem))]"
      >
      <div className="relative space-y-6">
        <PlanningToolContextBanner projectRun={currentProjectRun} flush />
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-center">
          <Badge variant="secondary" className="text-xs font-semibold">
            Premium escalate
          </Badge>
          <p className="mt-1 text-xs text-muted-foreground">
            Live pro video when AI help is not enough
          </p>
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
            {escalateContext?.stepTitle || (escalateContext?.recentMessages?.length ?? 0) > 0 ? (
              <div className="mt-4 text-left max-w-md mx-auto rounded-lg border bg-muted/40 p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">Hand-off context for your pro</p>
                {escalateContext?.stepTitle ? (
                  <p className="text-xs text-muted-foreground">Step: {escalateContext.stepTitle}</p>
                ) : null}
                {escalateContext?.threadId ? (
                  <p className="text-xs text-muted-foreground break-all">Thread: {escalateContext.threadId}</p>
                ) : null}
                {(escalateContext?.recentMessages || []).slice(-4).map((m, i) => (
                  <p key={i} className="text-xs text-muted-foreground line-clamp-3">
                    <span className="font-medium">{m.role}:</span> {m.content}
                  </p>
                ))}
                <p className="text-[10px] text-muted-foreground">
                  Paste or summarize this when you book so the expert has your AI thread context.
                </p>
              </div>
            ) : null}
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
