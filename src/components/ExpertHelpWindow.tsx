import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  Video, 
  Calendar, 
  ArrowRight
} from 'lucide-react';

interface ExpertHelpWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpertHelpWindow: React.FC<ExpertHelpWindowProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mb-2">
            <Video className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">Expert Virtual Consults</DialogTitle>
          <p className="text-muted-foreground">
            Get personalized project guidance from certified DIY professionals
          </p>
        </DialogHeader>
        
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/5">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-lg flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Schedule Your Consultation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">$49</div>
              <div className="text-sm text-muted-foreground">per 30-60 min session</div>
            </div>
            
            <a 
              href="https://app.acuityscheduling.com/schedule.php?owner=36845722" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full"
            >
              <Button 
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <span className="flex items-center justify-center gap-2">
                  Schedule Now
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Button>
            </a>
            
            <p className="text-xs text-muted-foreground">
              Secure scheduling • Expert guidance • Satisfaction guaranteed
            </p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};