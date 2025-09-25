import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  Video, 
  Calendar, 
  Clock, 
  Star, 
  CheckCircle, 
  Users,
  Shield,
  Headphones,
  ArrowRight
} from 'lucide-react';

interface HelpPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpPopup: React.FC<HelpPopupProps> = ({ isOpen, onClose }) => {
  const features = [
    {
      icon: Video,
      title: "HD Video Calls",
      description: "Face-to-face consultations with certified DIY experts"
    },
    {
      icon: Calendar,
      title: "Flexible Scheduling",
      description: "Book appointments that fit your schedule"
    },
    {
      icon: Clock,
      title: "30-60 Min Sessions",
      description: "Comprehensive reviews of your project needs"
    },
    {
      icon: Shield,
      title: "Satisfaction Guaranteed",
      description: "100% money-back guarantee on all consultations"
    }
  ];

  const benefits = [
    "Get expert project assessment and planning",
    "Receive personalized tool and material recommendations", 
    "Avoid costly mistakes with professional guidance",
    "Learn time-saving techniques from the pros"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mb-2">
            <Video className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Expert Virtual Consults
          </DialogTitle>
          <p className="text-muted-foreground text-lg">
            Connect with certified DIY professionals for personalized project guidance
          </p>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">4.9★</div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">24hr</div>
              <div className="text-sm text-muted-foreground">Avg Response</div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Benefits */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                What You'll Get
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/5">
            <CardContent className="p-6 text-center">
              <div className="space-y-2 mb-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Limited Time Offer
                </Badge>
                <div className="text-3xl font-bold">$49</div>
                <div className="text-sm text-muted-foreground">
                  <span className="line-through">$99</span> per consultation
                </div>
              </div>
              
              <Button 
                asChild 
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <a 
                  href="https://app.acuityscheduling.com/schedule.php?owner=36845722" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  Schedule Your Consultation
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
              
              <p className="text-xs text-muted-foreground mt-3">
                No commitment required • Cancel anytime • Secure payment
              </p>
            </CardContent>
          </Card>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Secure & Private
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              Certified Experts
            </div>
            <div className="flex items-center gap-1">
              <Headphones className="w-3 h-3" />
              24/7 Support
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};