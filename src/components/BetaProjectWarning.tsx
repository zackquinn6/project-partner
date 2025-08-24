import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface BetaProjectWarningProps {
  projectName: string;
  className?: string;
}

export function BetaProjectWarning({ projectName, className }: BetaProjectWarningProps) {
  const { toast } = useToast();

  const handleReportIssue = () => {
    toast({
      title: "Issue Report",
      description: "Report functionality will be implemented to help improve this beta workflow.",
    });
  };

  return (
    <div className={className}>
      {/* Beta Badge */}
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          BETA
        </Badge>
        <span className="text-sm text-muted-foreground">This project is in testing</span>
      </div>

      {/* Beta Warning Alert */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Beta Testing Project:</strong> "{projectName}" is currently in testing phase. 
          The workflow may contain incomplete steps or experimental features. Please report any 
          issues you encounter to help us improve the project.
          
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
              onClick={handleReportIssue}
            >
              <Bug className="w-4 h-4 mr-2" />
              Report Issue
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}