import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface BetaProjectWarningProps {
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

export function BetaProjectWarning({ projectName, open, onOpenChange, onAccept }: BetaProjectWarningProps) {
  const { toast } = useToast();

  const handleReportIssue = () => {
    toast({
      title: "Issue Report",
      description: "Report functionality will be implemented to help improve this beta workflow.",
    });
  };

  const handleAccept = () => {
    onAccept();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Beta Testing Project
          </DialogTitle>
          <DialogDescription>
            You're about to start a project that's currently in beta testing phase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Beta Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              BETA
            </Badge>
            <span className="text-sm text-muted-foreground">"{projectName}" is in testing</span>
          </div>

          {/* Warning Alert */}
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="space-y-3">
                <div>
                  <strong>What this means:</strong> This workflow may contain incomplete steps, 
                  experimental features, or instructions that need refinement. The project structure 
                  and content may change as we gather feedback.
                </div>
                
                <div>
                  <strong>How you can help:</strong> Your feedback is invaluable! By testing this 
                  project, you're helping us create better DIY experiences for everyone. Please report 
                  any issues, unclear instructions, or suggestions for improvement.
                </div>
                
                <div>
                  <strong>Important:</strong> Always prioritize safety and consult with professionals 
                  when needed, especially for electrical, plumbing, or structural work.
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              className="text-orange-700 border-orange-300 hover:bg-orange-100"
              onClick={handleReportIssue}
            >
              <Bug className="w-4 h-4 mr-2" />
              Report Issue
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAccept}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                I Understand - Start Beta Test
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}