import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';
import jsPDF from 'jspdf';

const APP_LOGO_URL = '/lovable-uploads/1a837ddc-50ca-40f7-b975-0ad92fdf9882.png';
const POLICY_VERSION = '1.0';

const PLACEHOLDER_LIABILITY_POLICY = `
LIABILITY POLICY (Placeholder)

This is placeholder content for the Project Partner Liability Policy. It will be replaced with the full legal text.

1. Scope
Use of the Project Partner app and services is subject to this liability policy.

2. Assumption of Risk
You assume all risks associated with do-it-yourself projects, use of instructions, and reliance on app content. Project Partner provides informational guidance only and does not perform, supervise, or guarantee any work.

3. Limitation of Liability
To the maximum extent permitted by law, Project Partner's liability is limited. Project Partner is not liable for indirect, incidental, or consequential damages arising from your use of the app or services.

4. Professional Advice
Where applicable law requires licensed professionals (e.g. electrical, plumbing), you are responsible for obtaining such advice. The app does not replace professional judgment.

5. Acceptance
By accepting this policy you agree to the terms above and confirm you have read and understood them.
`.trim();

interface LiabilityAgreementDialogProps {
  open: boolean;
  onAccepted: () => void;
}

export function LiabilityAgreementDialog({ open, onAccepted }: LiabilityAgreementDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const loadName = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.display_name) setFullName(data.display_name);
    };
    loadName();
  }, [open, user?.id]);

  const imageToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        try {
          resolve(canvas.toDataURL('image/png'));
        } catch {
          reject(new Error('Failed to get image data'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load logo image'));
      img.src = url;
    });
  };

  const generatePdfBlob = async (): Promise<Blob> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.getPageWidth();
    const margin = 20;
    let y = margin;

    try {
      const logoData = await imageToBase64(APP_LOGO_URL);
      const logoH = 14;
      const logoW = 50;
      pdf.addImage(logoData, 'PNG', margin, y, logoW, logoH);
      y += logoH + 10;
    } catch {
      pdf.setFontSize(16);
      pdf.text('Project Partner', margin, y + 8);
      y += 18;
    }

    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, y, pageW - margin, y);
    y += 10;

    pdf.setFontSize(14);
    pdf.text('Liability Policy', margin, y);
    y += 10;

    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(PLACEHOLDER_LIABILITY_POLICY, pageW - 2 * margin);
    for (const line of lines) {
      if (y > 270) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += 6;
    }

    y += 10;
    if (y > 250) {
      pdf.addPage();
      y = margin;
    }
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, y, pageW - margin, y);
    y += 10;
    pdf.setFontSize(11);
    pdf.text('Agreement', margin, y);
    y += 8;
    pdf.setFontSize(10);
    const agreedAt = new Date().toISOString();
    const dateStr = new Date().toLocaleDateString(undefined, { dateStyle: 'long' });
    pdf.text(`I, ${fullName.trim()}, have read and agree to the Liability Policy above.`, margin, y);
    y += 6;
    pdf.text(`Date: ${dateStr}`, margin, y);
    y += 6;
    pdf.text(`Policy version: ${POLICY_VERSION}`, margin, y);

    return pdf.output('blob');
  };

  const handleAccept = async () => {
    if (!user || !fullName.trim() || !agreed) return;
    setSubmitting(true);
    try {
      const blob = await generatePdfBlob();
      const path = `${user.id}/liability-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('liability-pdfs')
        .upload(path, blob, { contentType: 'application/pdf', upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('liability_agreements').insert({
        user_id: user.id,
        full_name: fullName.trim(),
        agreed_at: new Date().toISOString(),
        policy_version: POLICY_VERSION,
        policy_text_snapshot: PLACEHOLDER_LIABILITY_POLICY,
        pdf_storage_path: path,
      });
      if (insertError) throw insertError;

      toast({ title: 'Agreement saved', description: 'You can now use the app.' });
      onAccepted();
    } catch (e) {
      console.error('Liability agreement save error:', e);
      toast({ title: 'Error', description: 'Failed to save agreement. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Liability Policy – Required to Continue
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          You must read and accept the liability policy below before using the app.
        </p>
        <ScrollArea className="flex-1 border rounded-md p-4 min-h-[240px] max-h-[40vh]">
          <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{PLACEHOLDER_LIABILITY_POLICY}</pre>
        </ScrollArea>
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <Checkbox
              id="liability-agree"
              checked={agreed}
              onCheckedChange={(c) => setAgreed(!!c)}
            />
            <Label htmlFor="liability-agree" className="cursor-pointer text-sm font-normal">
              I have read and agree to the Liability Policy above.
            </Label>
          </div>
          <div>
            <Label htmlFor="liability-fullname">Full name (as on agreement)</Label>
            <Input
              id="liability-fullname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="mt-1 max-w-sm"
            />
          </div>
          <Button
            onClick={handleAccept}
            disabled={!agreed || !fullName.trim() || submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Accept and Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
