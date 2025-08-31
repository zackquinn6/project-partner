import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, FileText, PenTool, Download } from 'lucide-react';
import { SignatureCapture } from '@/components/SignatureCapture';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';

interface ProjectAgreementStepProps {
  onComplete: () => void;
  isCompleted: boolean;
}

interface Agreement {
  signedBy: string;
  signature: string;
  dateSigned: Date;
  agreementVersion: string;
}

export const ProjectAgreementStep: React.FC<ProjectAgreementStepProps> = ({
  onComplete,
  isCompleted
}) => {
  const { user } = useAuth();
  const { currentProjectRun, updateProjectRun } = useProject();
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [signature, setSignature] = useState<string>('');
  const [signedAgreement, setSignedAgreement] = useState<Agreement | null>(null);
  const [signerName, setSignerName] = useState(user?.email || '');

  const agreementText = `
PROJECT PARTNER AGREEMENT

This agreement is entered into between the Project Partner and the project participant for the completion of the selected DIY project.

TERMS AND CONDITIONS:

1. PROJECT SCOPE
The Project Partner provides step-by-step guidance, workflows, and support materials for DIY projects. The participant agrees to follow the provided instructions and safety guidelines.

2. RESPONSIBILITIES
- Project Partner: Provide accurate instructions, safety guidelines, and support materials
- Participant: Follow instructions carefully, use appropriate safety equipment, and complete steps as directed

3. SAFETY AND LIABILITY
- Participant assumes full responsibility for their safety and the safety of others
- Participant must use appropriate safety equipment and follow all safety guidelines
- Project Partner is not liable for injuries or damages resulting from project execution

4. PROJECT COMPLETION
- Participant commits to complete the project according to the provided timeline
- Progress tracking and accountability measures will be implemented as agreed

5. SUCCESS GUARANTEE
- Project Partner guarantees success when instructions are followed correctly
- Custom or manually added phases are not covered by this guarantee
- Participant must report issues promptly for support

By signing below, both parties agree to these terms and conditions.

Project: ${currentProjectRun?.name || 'N/A'}
Project Leader: ${currentProjectRun?.projectLeader || 'Not specified'}
Team Mate: ${currentProjectRun?.accountabilityPartner || 'Not specified'}
Date: ${new Date().toLocaleDateString()}
`;

  const handleSignatureComplete = (signatureData: string) => {
    setSignature(signatureData);
  };

  const handleSignAgreement = () => {
    if (!signature || !signerName.trim()) return;

    const agreement: Agreement = {
      signedBy: signerName,
      signature: signature,
      dateSigned: new Date(),
      agreementVersion: '1.0'
    };

    setSignedAgreement(agreement);
    setIsSignatureDialogOpen(false);
    
    console.log("ProjectAgreementStep - Agreement signed, calling onComplete");
    
    // Store the agreement in the project run's phases structure
    if (currentProjectRun) {
      const updatedPhases = [...currentProjectRun.phases];
      const kickoffPhase = updatedPhases.find(p => p.id === 'kickoff-phase');
      
      if (kickoffPhase) {
        const agreementStep = kickoffPhase.operations?.[0]?.steps?.find(s => s.id === 'kickoff-step-2');
        if (agreementStep && agreementStep.outputs?.[0]) {
          // Store the full agreement data in the output (extending the type)
          (agreementStep.outputs[0] as any).agreement = {
            signedAt: new Date().toISOString(),
            signerName: signerName,
            signature: signature,
            agreementText: agreementText
          };
        }
      }

      updateProjectRun({
        ...currentProjectRun,
        phases: updatedPhases,
        updatedAt: new Date()
      });
    }
    
    // Automatically complete this step when agreement is signed
    setTimeout(() => {
      console.log("ProjectAgreementStep - Auto-completing step after agreement");
      onComplete();
    }, 500);
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
          Project Partner Agreement
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
            Project Agreement Terms
          </CardTitle>
          <CardDescription>
            Please review and sign the project partner agreement to proceed
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
                {!isCompleted && (
                  <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Agreement Complete
                  </Button>
                )}
                
                {isCompleted && (
                  <div className="p-3 bg-green-100 border border-green-200 rounded-lg text-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-2" />
                    <p className="text-green-800 font-medium">Agreement Step Completed ✓</p>
                  </div>
                )}
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