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

interface ExpertHelpWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpertHelpWindow: React.FC<ExpertHelpWindowProps> = ({ isOpen, onClose }) => {
  return (
    <ScrollableDialog
      open={isOpen}
      onOpenChange={onClose}
      title="Video Chat With a Pro"
      description="Get a human expert to guide you through your next project"
      className="w-[90vw] max-w-md h-auto max-h-[90vh]"
    >
      <div className="relative space-y-6">
        {/* Coming Soon Banner */}
        <div className="relative z-10 -mx-4 -mt-4 mb-4">
          <div className="bg-gradient-to-r from-primary/90 to-primary/70 backdrop-blur-sm border-b border-primary/30">
            <div className="flex items-center justify-center gap-2 py-3 px-4">
              <Sparkles className="w-4 h-4 text-primary-foreground animate-pulse" />
              <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 text-xs font-semibold">
                Coming Soon
              </Badge>
            </div>
          </div>
        </div>

        {/* Blurred Background Content */}
        <div className="relative">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md rounded-lg -z-10"></div>
          <div className="relative space-y-6 opacity-60 pointer-events-none">
            <div className="text-center">
              <img 
                src={toolioLogo} 
                alt="Toolio Logo" 
                className="mx-auto w-48 h-auto mb-4"
              />
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
                  <div className="text-sm text-muted-foreground">Your choice of 20 or 40min calls to kickstart your project or solve a problem mid-project</div>
                </div>
                
                <a 
                  href="https://app.acuityscheduling.com/schedule.php?owner=36845722" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button 
                    size="lg"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled
                  >
                    <span className="flex items-center justify-center gap-2">
                      Learn More
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                </a>
                
                <p className="text-xs text-muted-foreground">
                  Expert guidance • Satisfaction guaranteed
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ScrollableDialog>
  );
};