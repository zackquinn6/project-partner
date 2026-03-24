import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeInput } from '@/utils/inputSanitization';
import { toast } from 'sonner';

const SUPPORT_PHONE_DISPLAY = '(617) 545-3367';
const SUPPORT_PHONE_TEL = '+16175453367';

interface ContactUsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactUsWindow({ open, onOpenChange }: ContactUsWindowProps) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setSubject('');
    setMessage('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSubject = sanitizeInput(subject.trim());
    const trimmedMessage = message.trim();
    if (!trimmedSubject || !trimmedMessage) {
      toast.error('Please enter a subject and message.');
      return;
    }
    if (!user?.email) {
      toast.error('Sign in to send a message.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-contact', {
        body: {
          userEmail: user.email,
          subject: trimmedSubject,
          message: trimmedMessage,
          currentUrl: window.location.href,
        },
      });

      if (error) throw error;
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        throw new Error(String((data as { error: string }).error));
      }

      toast.success('Your message was sent. We will get back to you soon.');
      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error('Contact form submit failed:', err);
      toast.error('Could not send your message. Please try again or call us.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contact Us
          </DialogTitle>
          <DialogDescription>
            Call or text us, or send a message using the form below. You must be signed in to email
            through the app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border bg-muted/40 p-4 text-sm">
          <p className="font-medium text-foreground">Phone</p>
          <div className="flex flex-wrap items-center gap-3">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <a
              href={`tel:${SUPPORT_PHONE_TEL}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {SUPPORT_PHONE_DISPLAY}
            </a>
            <span className="text-muted-foreground">·</span>
            <a
              href={`sms:${SUPPORT_PHONE_TEL}`}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Text
            </a>
          </div>
        </div>

        {!user?.email ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Sign in to use the contact form.</p>
            <Button type="button" variant="outline" className="w-full" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-muted-foreground">Sending as {user.email}</p>
            <div className="space-y-2">
              <Label htmlFor="contact-subject">Subject</Label>
              <Input
                id="contact-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={200}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px] resize-y"
                required
                maxLength={5000}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || !subject.trim() || !message.trim()}
              >
                {isSubmitting ? (
                  'Sending…'
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send message
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
