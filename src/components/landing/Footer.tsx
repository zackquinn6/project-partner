import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook, Youtube } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface FooterProps {
  onPricingClick?: () => void;
}

export const Footer = ({ onPricingClick }: FooterProps) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const { toast } = useToast();

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Thanks for subscribing!",
      description: "You'll receive DIY tips weekly.",
    });
    setNewsletterEmail('');
  };

  return (
    <footer className="bg-primary text-primary-foreground py-12 border-t border-primary-foreground/10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Company */}
          <div>
            <h3 className="font-bold text-lg mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="hover:text-accent transition-colors text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-accent transition-colors text-sm">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/careers" className="hover:text-accent transition-colors text-sm">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/press" className="hover:text-accent transition-colors text-sm">
                  Press
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-bold text-lg mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/help" className="hover:text-accent transition-colors text-sm">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-accent transition-colors text-sm">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/community" className="hover:text-accent transition-colors text-sm">
                  Community
                </Link>
              </li>
              {onPricingClick && (
                <li>
                  <button
                    onClick={onPricingClick}
                    className="hover:text-accent transition-colors text-sm text-left"
                  >
                    Pricing
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-bold text-lg mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/projects" className="hover:text-accent transition-colors text-sm">
                  Project Templates
                </Link>
              </li>
              <li>
                <Link to="/guides" className="hover:text-accent transition-colors text-sm">
                  DIY Guides
                </Link>
              </li>
              <li>
                <Link to="/tools" className="hover:text-accent transition-colors text-sm">
                  Tool Library
                </Link>
              </li>
              <li>
                <Link to="/calculators" className="hover:text-accent transition-colors text-sm">
                  Calculators
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-bold text-lg mb-4">DIY Tips Weekly</h3>
            <p className="text-sm mb-4 opacity-80">
              Get expert tips delivered to your inbox
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <Input
                type="email"
                placeholder="Your email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                required
                className="flex-1 h-10 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
              />
              <Button
                type="submit"
                size="sm"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary-foreground/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/lovable-uploads/1a837ddc-50ca-40f7-b975-0ad92fdf9882.png"
              alt="Project Partner"
              className="h-8"
            />
            <span className="text-sm opacity-60">
              © 2024 Project Partner. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              to="/privacy"
              className="text-sm hover:text-accent transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-sm hover:text-accent transition-colors"
            >
              Terms of Service
            </Link>
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
