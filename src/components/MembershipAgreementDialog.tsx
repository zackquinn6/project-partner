import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SignatureCapture } from './SignatureCapture';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';

interface MembershipAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgreementSigned: () => void;
}

interface Agreement {
  signature: string;
  signerName: string;
  signedDate: string;
  version: string;
}

const DEFAULT_MEMBERSHIP_AGREEMENT = `### Service Terms for Project Partner

These Service Terms (the Terms) are between Project Partner ("Project Partner") and the individual or entity receiving services ("Participant"). These Terms govern Project Partner's provision of project guidance, instructional content, tools, and support related to do‑it‑yourself projects (the Services). By using the Services, forwarding receipts, or otherwise engaging with Project Partner, the Participant agrees to these Terms.

---

### 1. Scope of Services
- **Services Provided**  
  Project Partner provides instructional content, step‑by‑step workflows, templates, tool‑lists, safety guidance, digital features (including receipt ingestion and budget tools), and non‑technical project support.
- **Informational Nature**  
  All content and guidance are educational and informational in nature and are intended to assist the Participant in performing their own work. Project Partner does not perform physical labor, supervise work on site, or assume control of the Participant's worksite.

---

### 2. No Guarantee of Results and No Professional Relationship
- **No Outcome Guarantee**  
  Project Partner does not guarantee any particular result, fit‑for‑purpose outcome, or project timeline. Results depend on Participant decisions, skill, local conditions, materials, tools, and compliance with applicable laws.
- **No Professional Services**  
  Unless explicitly agreed in a separate written contract signed by an authorized representative of Project Partner, the Services do not create a professional-client relationship (such as contractor, engineering, legal, medical, or other licensed professional services). Participants must seek licensed professionals where required by law or where specialized expertise is needed.

---

### 3. Assumption of Risk and Participant Responsibilities
- **Assumption of Risk**  
  The Participant accepts full responsibility for planning, execution, supervision, and safety for any work performed. The Participant assumes all risks associated with using the Services, including personal injury, property damage, and financial loss.
- **Participant Obligations**  
  - Follow applicable laws, building codes, permits, and manufacturer instructions.  
  - Use appropriate safety equipment and safe work practices.  
  - Verify materials, measurements, and suitability before performing work.  
  - Stop and consult a qualified professional if unsure about a procedure or safety issue.  
- **Receiving Third‑Party Materials**  
  Project Partner may provide links, vendor templates, or third‑party content. Project Partner is not responsible for the accuracy or safety of third‑party content.

---

### 4. Limitation of Liability and Indemnification
- **Limitation of Liability**  
  To the maximum extent permitted by law, Project Partner's total liability for any claim arising from or related to the Services, whether in contract, tort, strict liability, or otherwise, shall not exceed the amount paid by the Participant to Project Partner for the Services in the 12 months preceding the claim. In no event shall Project Partner be liable for any indirect, special, incidental, punitive, or consequential damages, including lost profits, lost data, or business interruption.
- **Indemnification**  
  The Participant agrees to indemnify, defend, and hold harmless Project Partner and its officers, employees, contractors, and agents from and against any claims, losses, liabilities, damages, costs, and expenses (including reasonable attorneys' fees) arising out of or related to the Participant's use of the Services, breach of these Terms, or negligent or willful acts or omissions.

---

### 5. Safety Warnings and Dangerous Activities
- **No Obligation to Advise on Hazardous Work**  
  Project Partner may provide general safety guidance but does not assume responsibility for identifying all hazards or for supervising dangerous activities.
- **High‑Risk Work**  
  Work that involves structural changes, electrical, gas, hazardous chemicals, confined spaces, heavy equipment, working at height, or other high‑risk activities should only be performed by appropriately licensed and insured professionals. Participants must obtain required permits and follow manufacturer and regulatory safety procedures.
- **Emergency Situations**  
  Project Partner is not an emergency service and will not respond to emergencies or provide crisis intervention instructions.

---

### 6. Miscellaneous Terms
- **Changes to Services and Terms**  
  Project Partner may modify or discontinue the Services or these Terms at any time. Continued use after changes constitutes acceptance of the revised Terms.
- **Intellectual Property**  
  All content provided by Project Partner is its property or used under license. Participants are granted a non‑exclusive, non‑transferable license to use content for their personal or project‑related use only. Redistribution, resale, or public posting is prohibited without prior written consent.
- **Data and Privacy**  
  Project Partner may collect and process data necessary to provide Services. Data handling is governed by the Project Partner Privacy Policy.
- **Termination**  
  Either party may terminate access to Services in accordance with Project Partner's policies. Termination does not relieve the Participant of obligations incurred prior to termination, including indemnity or payment obligations.
- **Governing Law**  
  These Terms are governed by the laws of the jurisdiction specified in the Project Partner account or service agreement. If no jurisdiction is specified, the laws of the commonwealth or state where Project Partner is incorporated will apply.
- **Severability**  
  If any provision is held unenforceable, the remaining provisions remain in full force.

---

### Acceptance
By using Project Partner, the Participant acknowledges they have read, understand, and agree to these Terms.`;

export const MembershipAgreementDialog: React.FC<MembershipAgreementDialogProps> = ({
  open,
  onOpenChange,
  onAgreementSigned
}) => {
  const { user } = useAuth();
  const [signature, setSignature] = useState<string>('');
  const [signerName, setSignerName] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
  const [agreementText, setAgreementText] = useState(DEFAULT_MEMBERSHIP_AGREEMENT);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data } = await supabase
        .from('agreement_templates')
        .select('body')
        .eq('type', 'membership')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.body) setAgreementText(data.body);
      else setAgreementText(DEFAULT_MEMBERSHIP_AGREEMENT);
    };
    load();
  }, [open]);

  useEffect(() => {
    if (user) {
      // Fetch user's profile to pre-fill name
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();
        
        if (data?.display_name) {
          setSignerName(data.display_name);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handleSignAgreement = async () => {
    if (!signature || !signerName.trim() || !user) {
      toast.error('Please provide your name and signature');
      return;
    }

    setIsSigning(true);

    try {
      const agreement: Agreement = {
        signature,
        signerName,
        signedDate: new Date().toISOString(),
        version: '2.0'
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          signed_agreement: agreement as any,
          agreement_signed_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Agreement signed successfully!');
      onAgreementSigned();
      onOpenChange(false);
    } catch (error) {
      console.error('Error signing agreement:', error);
      toast.error('Failed to sign agreement. Please try again.');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl">Service Terms Agreement</DialogTitle>
          <DialogDescription>
            Please review and sign the service terms before subscribing
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[50vh] min-h-[200px] pr-4 shrink-0">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm">{agreementText}</pre>
          </div>
        </ScrollArea>

        <div className="space-y-4 pt-4 border-t shrink-0">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="agree-terms"
              checked={hasAgreedToTerms}
              onChange={(e) => setHasAgreedToTerms(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="agree-terms" className="text-sm">
              I have read and agree to the Service Terms
            </Label>
          </div>

          {hasAgreedToTerms && (
            <>
              <div className="space-y-2">
                <Label htmlFor="signer-name">Full Name *</Label>
                <Input
                  id="signer-name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <SignatureCapture
                onSignatureComplete={setSignature}
                onClear={() => setSignature('')}
              />
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSignAgreement}
              disabled={!signature || !signerName.trim() || !hasAgreedToTerms || isSigning}
            >
              {isSigning ? 'Signing...' : 'Sign Agreement & Continue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};