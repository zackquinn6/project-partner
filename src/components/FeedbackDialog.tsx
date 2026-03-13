import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Send, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeInput, generateCSRFToken, setCSRFToken, getCSRFToken } from '@/utils/inputSanitization';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');

  // Generate CSRF token when dialog opens
  React.useEffect(() => {
    if (open) {
      const token = generateCSRFToken();
      setCsrfToken(token);
      setCSRFToken(token);
    }
  }, [open]);

  const categories = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'improvement', label: 'Improvement Suggestion' },
    { value: 'usability', label: 'Usability Issue' },
    { value: 'content', label: 'Content Feedback' },
    { value: 'general', label: 'General Feedback' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitize inputs
    const sanitizedMessage = sanitizeInput(message.trim());
    const sanitizedCategory = sanitizeInput(category);
    
    if (!sanitizedCategory || !sanitizedMessage) {
      console.error('Please fill in all required fields');
      return;
    }

    if (!user?.email) {
      console.error('Please sign in to submit feedback');
      return;
    }

    // Validate CSRF token
    const storedToken = getCSRFToken();
    if (!storedToken || storedToken !== csrfToken) {
      console.error('Security validation failed. Please try again.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get user profile for name
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, nickname')
        .eq('user_id', user.id)
        .single();
      
      const userName = profile?.display_name || profile?.nickname || user.email.split('@')[0];
      const categoryLabel = categories.find(c => c.value === sanitizedCategory)?.label || sanitizedCategory;
      
      // Save feedback to database
      const { error: dbError } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          user_email: user.email,
          user_name: sanitizeInput(userName),
          category: categoryLabel,
          message: sanitizedMessage,
          status: 'open'
        });

      if (dbError) throw dbError;

      // Also send email notification (optional - can fail silently)
      try {
        await supabase.functions.invoke('send-feedback', {
          body: {
            userEmail: user.email,
            userName: sanitizeInput(userName),
            category: categoryLabel,
            message: sanitizedMessage,
            currentUrl: window.location.href,
            csrfToken
          }
        });
      } catch (emailError) {
        console.log('Email notification failed (non-critical):', emailError);
      }

      setCategory('');
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Share Your Feedback
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="What type of feedback?" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Your Feedback *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think! Your feedback helps us make the app better for everyone."
              className="min-h-[100px] resize-none"
              required
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Star className="w-4 h-4 mt-0.5 text-primary" />
              <div>
                <p className="font-medium text-foreground mb-1">We value your input!</p>
                <p>Your feedback helps us prioritize improvements and build features that matter most to DIY enthusiasts like you.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !category || !message.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                "Sending..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Feedback
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}