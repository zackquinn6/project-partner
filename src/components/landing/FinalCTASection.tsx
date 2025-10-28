import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export const FinalCTASection = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/auth?mode=signup&email=${encodeURIComponent(email)}`);
  };

  return (
    <section className="section-spacing relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 animate-float">
          <div className="w-32 h-32 bg-primary-foreground rounded-full" />
        </div>
        <div className="absolute bottom-20 right-20 animate-float-delayed">
          <div className="w-24 h-24 bg-primary-foreground rounded-full" />
        </div>
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
          Ready for better projects?
        </h2>

        {/* Email capture form */}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 h-14 text-lg bg-background text-foreground border-background"
            />
            <Button
              type="submit"
              size="lg"
              className="h-14 px-8 bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
            >
              Start Free Trial
            </Button>
          </div>
        </form>

        <p className="text-sm opacity-70 mb-8">
          ✓ No credit card required • ✓ Cancel anytime • ✓ 7-day free trial
        </p>

        {/* Trust badges */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <div className="flex items-center gap-2 opacity-80">
            <Shield className="h-5 w-5" />
            <span className="text-sm">Secure & Private</span>
          </div>
          <div className="flex items-center gap-2 opacity-80">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm">Money-Back Guarantee</span>
          </div>
        </div>
      </div>
    </section>
  );
};
