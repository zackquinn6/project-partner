import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, FileText, PenTool, Download, Target } from 'lucide-react';
import { SignatureCapture } from '@/components/SignatureCapture';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';

interface ProjectAgreementStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  checkedOutputs?: Set<string>;
  onOutputToggle?: (outputId: string) => void;
}

interface Agreement {
  signedBy: string;
  signature: string;
  dateSigned: Date;
  agreementVersion: string;
}

export const ProjectAgreementStep: React.FC<ProjectAgreementStepProps> = ({
  onComplete,
  isCompleted,
  checkedOutputs = new Set(),
  onOutputToggle
}) => {
  const { user } = useAuth();
  const { currentProjectRun, updateProjectRun } = useProject();
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [signature, setSignature] = useState<string>('');
  const [signedAgreement, setSignedAgreement] = useState<Agreement | null>(null);
  const [signerName, setSignerName] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, display_name')
          .eq('user_id', user.id)
          .single();
        
        setUserProfile(profile);
        setSignerName(profile?.full_name || profile?.display_name || '');
      }
    };

    fetchUserProfile();
  }, [user]);

  const agreementText = `
SERVICE TERMS FOR PROJECT PARTNER

These Service Terms (the "Terms") are between Project Partner ("Project Partner") and the individual or entity receiving services ("Participant"). These Terms govern Project Partner's provision of project guidance, instructional content, tools, and support related to do-it-yourself projects (the "Services"). By using the Services, forwarding receipts, or otherwise engaging with Project Partner, the Participant agrees to these Terms.

---

1. SCOPE OF SERVICES

Services Provided
Project Partner provides instructional content, step-by-step workflows, templates, tool-lists, safety guidance, digital features (including receipt ingestion and budget tools), and non-technical project support.

Informational Nature
All content and guidance are educational and informational in nature and are intended to assist the Participant in performing their own work. Project Partner does not perform physical labor, supervise work on site, or assume control of the Participant's worksite.

---

2. NO GUARANTEE OF RESULTS AND NO PROFESSIONAL RELATIONSHIP

No Outcome Guarantee
Project Partner does not guarantee any particular result, fit-for-purpose outcome, or project timeline. Results depend on Participant decisions, skill, local conditions, materials, tools, and compliance with applicable laws.

No Professional Services
Unless explicitly agreed in a separate written contract signed by an authorized representative of Project Partner, the Services do not create a professional-client relationship (such as contractor, engineering, legal, medical, or other licensed professional services). Participants must seek licensed professionals where required by law or where specialized expertise is needed.

---

3. ASSUMPTION OF RISK AND PARTICIPANT RESPONSIBILITIES

Assumption of Risk
The Participant accepts full responsibility for planning, execution, supervision, and safety for any work performed. The Participant assumes all risks associated with using the Services, including personal injury, property damage, and financial loss.

Participant Obligations
- Follow applicable laws, building codes, permits, and manufacturer instructions.
- Use appropriate safety equipment and safe work practices.
- Verify materials, measurements, and suitability before performing work.
- Stop and consult a qualified professional if unsure about a procedure or safety issue.

Receiving Third-Party Materials
Project Partner may provide links, vendor templates, or third-party content. Project Partner is not responsible for the accuracy or safety of third-party content.

---

4. LIMITATION OF LIABILITY AND INDEMNIFICATION

Limitation of Liability
To the maximum extent permitted by law, Project Partner's total liability for any claim arising from or related to the Services, whether in contract, tort, strict liability, or otherwise, shall not exceed the amount paid by the Participant to Project Partner for the Services in the 12 months preceding the claim. In no event shall Project Partner be liable for any indirect, special, incidental, punitive, or consequential damages, including lost profits, lost data, or business interruption.

Indemnification
The Participant agrees to indemnify, defend, and hold harmless Project Partner and its officers, employees, contractors, and agents from and against any claims, losses, liabilities, damages, costs, and expenses (including reasonable attorneys' fees) arising out of or related to the Participant's use of the Services, breach of these Terms, or negligent or willful acts or omissions.

---

5. SAFETY WARNINGS AND DANGEROUS ACTIVITIES

No Obligation to Advise on Hazardous Work
Project Partner may provide general safety guidance but does not assume responsibility for identifying all hazards or for supervising dangerous activities.

High-Risk Work
Work that involves structural changes, electrical, gas, hazardous chemicals, confined spaces, heavy equipment, working at height, or other high-risk activities should only be performed by appropriately licensed and insured professionals. Participants must obtain required permits and follow manufacturer and regulatory safety procedures.

Emergency Situations
Project Partner is not an emergency service and will not respond to emergencies or provide crisis intervention instructions.

---

6. MISCELLANEOUS TERMS

Changes to Services and Terms
Project Partner may modify or discontinue the Services or these Terms at any time. Continued use after changes constitutes acceptance of the revised Terms.

Intellectual Property
All content provided by Project Partner is its property or used under license. Participants are granted a non-exclusive, non-transferable license to use content for their personal or project-related use only. Redistribution, resale, or public posting is prohibited without prior written consent.

Data and Privacy
Project Partner may collect and process data necessary to provide Services. Data handling is governed by the Project Partner Privacy Policy.

Termination
Either party may terminate access to Services in accordance with Project Partner's policies. Termination does not relieve the Participant of obligations incurred prior to termination, including indemnity or payment obligations.

Governing Law
These Terms are governed by the laws of the jurisdiction specified in the Project Partner account or service agreement. If no jurisdiction is specified, the laws of the commonwealth or state where Project Partner is incorporated will apply.

Severability
If any provision is held unenforceable, the remaining provisions remain in full force.

---

ACCEPTANCE

By using Project Partner, the Participant acknowledges they have read, understand, and agree to these Terms.

Project: ${currentProjectRun?.name || 'N/A'}
Project Leader: ${currentProjectRun?.projectLeader || 'Not specified'}
Team Mate: ${currentProjectRun?.accountabilityPartner || 'Not specified'}
Date: ${new Date().toLocaleDateString()}
`;

  const handleSignatureComplete = (signatureData: string) => {
    setSignature(signatureData);
  };

  const handleSignAgreement = async () => {
    if (!signature || !signerName.trim()) return;

    const agreement: Agreement = {
      signedBy: signerName,
      signature: signature,
      dateSigned: new Date(),
      agreementVersion: '2.0'
    };

    setSignedAgreement(agreement);
    setIsSignatureDialogOpen(false);
    
    console.log("ProjectAgreementStep - Agreement signed, updating project and completing step");
    
    // Store the agreement in the project run's phases structure
    if (currentProjectRun) {
      const updatedPhases = [...currentProjectRun.phases];
      const kickoffPhase = updatedPhases.find(p => p.id === 'kickoff-phase');
      
      if (kickoffPhase) {
        const agreementStep = kickoffPhase.operations?.[0]?.steps?.find(s => s.id === 'kickoff-step-4');
        if (agreementStep && agreementStep.outputs?.[0]) {
          // Store the full agreement data in the output (extending the type)
          (agreementStep.outputs[0] as any).agreement = {
            signedAt: new Date().toISOString(),
            signerName: signerName,
            signature: signature,
            agreementText: agreementText,
            agreementVersion: '2.0'
          };
        }
      }

      await updateProjectRun({
        ...currentProjectRun,
        phases: updatedPhases,
        updatedAt: new Date()
      });
    }
    
    // Automatically complete this step immediately after signing and saving
    console.log("ProjectAgreementStep - Calling onComplete immediately");
    onComplete();
  };

  const generatePDF = () => {
    // Create a simple text document (in a real implementation, you'd use a PDF library)
    const content = `${agreementText}\n\nSIGNATURE:\nSigned by: ${signedAgreement?.signedBy}\nDate: ${signedAgreement?.dateSigned?.toLocaleDateString()}\nAgreement Version: ${signedAgreement?.agreementVersion}`;
    
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Project_Agreement_${currentProjectRun?.name?.replace(/\s+/g, '_') || 'Project'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          Service Terms
          {isCompleted && <CheckCircle className="w-6 h-6 text-green-500" />}
        </h2>
        <Badge variant={isCompleted ? "default" : "secondary"}>
          {isCompleted ? "Completed" : "Requires Signature"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Service Terms
          </CardTitle>
          <CardDescription>
            Please review and sign the service terms to proceed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto mb-6">
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {agreementText}
            </pre>
          </div>

          {signedAgreement ? (
            <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Agreement Signed</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Signed By</Label>
                  <p className="font-medium">{signedAgreement.signedBy}</p>
                </div>
                <div>
                  <Label>Date Signed</Label>
                  <p className="font-medium">{signedAgreement.dateSigned.toLocaleDateString()}</p>
                </div>
              </div>
              <div className="mt-4">
                <Label>Digital Signature</Label>
                <div className="mt-1 p-2 border rounded bg-white">
                  <img 
                    src={signedAgreement.signature} 
                    alt="Digital Signature" 
                    className="max-h-20 max-w-full"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={generatePDF} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Agreement
                </Button>
              </div>
            </div>
          ) : (
            <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <PenTool className="w-4 h-4 mr-2" />
                  Sign Agreement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Digital Signature</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="signer-name">Full Name</Label>
                    <Input
                      id="signer-name"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label>Digital Signature</Label>
                    <SignatureCapture
                      onSignatureComplete={handleSignatureComplete}
                      onClear={() => setSignature('')}
                      width={600}
                      height={200}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsSignatureDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSignAgreement}
                      disabled={!signature || !signerName.trim()}
                    >
                      Sign Agreement
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
};