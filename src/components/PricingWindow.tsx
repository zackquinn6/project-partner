import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Phone, MessageCircle } from 'lucide-react';

interface PricingWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PricingWindow = ({ open, onOpenChange }: PricingWindowProps) => {
  const plans = [
    {
      name: "Free",
      price: "Free",
      period: "",
      description: "Essential DIY tools and project management features",
      popular: false,
      features: [
        "Project management dashboard",
        "Home maintenance tracking",
        "Step-by-step instructions",
        "Basic project tracking",
        "Continuous improvement tips",
        "Tool and material lists",
        "Project completion certificates",
        "Basic workflow guidance",
        "Community access",
        "Mobile-friendly interface"
      ]
    },
    {
      name: "Project Planning",
      price: "$29",
      period: "/project",
      altPrice: "$99/year unlimited projects",
      description: "Advanced planning and detailed project guidance",
      popular: false,
      features: [
        "Everything in Free tier",
        "Detailed project customization",
        "Advanced scheduling tools",
        "Weather-based planning",
        "Risk assessment",
        "Budget optimization"
      ]
    },
    {
      name: "Road Block Resolutions",
      price: "$49",
      period: "/project",
      altPrice: "$149/year unlimited projects", 
      description: "Expert help when you encounter challenges",
      popular: true,
      features: [
        "Everything in Project Planning",
        "Priority chat support",
        "Problem diagnosis assistance",
        "Alternative solution recommendations",
        "24/7 expert guidance access",
        "Video troubleshooting sessions"
      ]
    },
    {
      name: "End-to-End Coaching",
      price: "$149",
      period: "/project",
      altPrice: "$399/year unlimited projects",
      description: "Complete project coaching from start to finish",
      popular: false,
      features: [
        "Everything in Road Block Resolutions",
        "Personal project coach assignment",
        "Weekly progress check-ins",
        "Unlimited video consultations",
        "Quality assurance reviews",
        "Post-project follow-up support"
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center mb-2">
            Choose Your Plan
          </DialogTitle>
          <p className="text-muted-foreground text-center">
            Get the right level of support for your DIY project success
          </p>
        </DialogHeader>
        
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative ${plan.popular ? 'border-primary ring-2 ring-primary/20' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <div className="mt-2">
                  <div className="text-3xl font-bold text-primary">{plan.price}</div>
                  {plan.period && (
                    <div className="text-sm text-muted-foreground">{plan.period}</div>
                  )}
                  {plan.altPrice && (
                    <div className="text-sm text-muted-foreground mt-1">
                      or {plan.altPrice}
                    </div>
                  )}
                </div>
                <CardDescription className="mt-3">{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="w-4 h-4 text-primary mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                 <Button 
                   className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                   variant={plan.popular ? 'default' : 'outline'}
                 >
                   {plan.name === 'Free' ? 'Get Started Free' : 
                    plan.name === 'End-to-End Coaching' ? (
                      <>
                        <Phone className="w-4 h-4 mr-2" />
                        Book Full Coaching
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Choose Plan
                      </>
                    )}
                 </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-6 pt-6 border-t">
          <p className="text-sm text-muted-foreground">
            All plans include access to our project catalog and basic planning tools.
            <br />
            Upgrade or downgrade anytime to match your project needs.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};