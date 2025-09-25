import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { 
  HelpCircle, 
  MessageCircle, 
  BookOpen, 
  Users,
  ArrowRight
} from 'lucide-react';

interface HelpPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpPopup: React.FC<HelpPopupProps> = ({ isOpen, onClose }) => {
  const helpOptions = [
    {
      icon: MessageCircle,
      title: "Send Feedback",
      description: "Report issues or suggest improvements",
      action: () => {
        window.dispatchEvent(new CustomEvent('show-feedback-dialog'));
        onClose();
      }
    },
    {
      icon: BookOpen,
      title: "Documentation",
      description: "Learn how to use the platform effectively",
      action: () => {
        window.dispatchEvent(new CustomEvent('show-documentation'));
        onClose();
      }
    },
    {
      icon: Users,
      title: "Community",
      description: "Connect with other DIY enthusiasts",
      action: () => {
        window.dispatchEvent(new CustomEvent('show-community'));
        onClose();
      }
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mb-2">
            <HelpCircle className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">How can we help?</DialogTitle>
          <p className="text-muted-foreground">
            Choose from the options below to get the assistance you need
          </p>
        </DialogHeader>
        
        <div className="space-y-3">
          {helpOptions.map((option, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={option.action}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <option.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{option.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};