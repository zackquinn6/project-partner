import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PricingSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Be in control of your projects for just $24.99/yr.
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start with free tools, upgrade when you're ready to tackle bigger projects
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Free Tier</CardTitle>
              <CardDescription className="text-lg">
                Great for general tasks and home maintenance
              </CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Home Maintenance Tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Task Manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>My Tools Library</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
                Get Started Free
              </Button>
            </CardContent>
          </Card>

          {/* Annual Membership */}
          <Card className="border-2 border-primary relative">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="h-6 w-6 text-primary" />
                Annual Member
              </CardTitle>
              <CardDescription className="text-lg">
                Full access to project workflows and catalog
              </CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold">$25</span>
                <span className="text-muted-foreground">/year</span>
                <p className="text-sm text-muted-foreground mt-2">Just $2.08/month</p>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span><strong>Everything in Free</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Step-by-Step Project Workflows</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Aggregated Content From DIY / Building Leaders</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Project Personalization</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Project Scheduling & Budgeting</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Project Shopping List</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>DIY Achievement Tracking</span>
                </li>
              </ul>
              <Button className="w-full" onClick={() => navigate('/auth')}>
                Start Free Trial
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                No credit card required for trial. Cancel anytime.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground">
            Questions about pricing? <a href="mailto:support@toolio.com" className="text-primary hover:underline">Contact us</a>
          </p>
        </div>
      </div>
    </section>
  );
};
