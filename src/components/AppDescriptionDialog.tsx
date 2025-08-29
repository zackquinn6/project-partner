import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface AppDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AppDescriptionDialog: React.FC<AppDescriptionDialogProps> = ({
  open,
  onOpenChange
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application Features & Nomenclature Guide</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Core User Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Core User Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Navigation & Dashboard</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><strong>Landing Page:</strong> Pre-authentication welcome page</li>
                    <li><strong>User Home Page:</strong> Post-login dashboard with stats and quick actions</li>
                    <li><strong>My Projects:</strong> User's active and completed project runs</li>
                    <li><strong>Project Catalog:</strong> Browse available DIY project templates</li>
                    <li><strong>My Profile:</strong> User settings, preferences, and DIY survey data</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Project Management</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><strong>Workflow:</strong> Step-by-step project execution interface</li>
                    <li><strong>Kickoff Workflow:</strong> Project initiation and customization process</li>
                    <li><strong>Project Run:</strong> User's instance of a project template</li>
                    <li><strong>Phases:</strong> Major project sections (Planning, Execution, etc.)</li>
                    <li><strong>Operations:</strong> Groups of related steps within phases</li>
                    <li><strong>Steps:</strong> Individual actionable tasks with instructions</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Components */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Workflow Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Step Types & Flow Control</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">📋 Standard</Badge>
                      <span className="text-sm">Regular instructional steps</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">❓ Decision</Badge>
                      <span className="text-sm">Choice points that branch workflow</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">⚠️ Critical</Badge>
                      <span className="text-sm">Important safety or quality steps</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">✅ Checkpoint</Badge>
                      <span className="text-sm">Quality control and validation points</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Support Features</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><strong>Call the Coach:</strong> Help system and guidance</li>
                    <li><strong>Call an Audible:</strong> Unplanned work and issue reporting</li>
                    <li><strong>Review Decisions:</strong> Project customization decision management</li>
                    <li><strong>DIY Quiz:</strong> User skill and preference assessment</li>
                    <li><strong>Weather Planning:</strong> Environmental consideration tool</li>
                    <li><strong>Calendar Integration:</strong> Google Calendar sync for scheduling</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Admin Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Administrative Functions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Content Management</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><strong>Project Management:</strong> Create and edit project templates</li>
                    <li><strong>Workflow Editor:</strong> Visual workflow design and modification</li>
                    <li><strong>Structure Manager:</strong> Project phase, operation, and step editing</li>
                    <li><strong>Tools & Materials Library:</strong> Reusable component management</li>
                    <li><strong>Knowledge System:</strong> AI content ingestion and updates</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Analytics & Management</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><strong>Project Analytics:</strong> Usage metrics and performance data</li>
                    <li><strong>User Management:</strong> Role assignments and permissions</li>
                    <li><strong>Security Dashboard:</strong> Audit logs and security monitoring</li>
                    <li><strong>Process Optimization:</strong> AI-powered workflow improvements</li>
                    <li><strong>Roadmap Management:</strong> Feature planning and user requests</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Technical Nomenclature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Data Structure</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li><strong>Template:</strong> Master project definition</li>
                    <li><strong>Instance:</strong> User's copy of a template</li>
                    <li><strong>Variation:</strong> Customizable project options</li>
                    <li><strong>Rollup:</strong> Aggregated data views</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">User Management</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li><strong>Profile:</strong> User account and preferences</li>
                    <li><strong>Roles:</strong> Permission levels (admin, user)</li>
                    <li><strong>Session:</strong> Active user login period</li>
                    <li><strong>Audit Log:</strong> Security and action tracking</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">System Features</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li><strong>RLS:</strong> Row Level Security policies</li>
                    <li><strong>Migration:</strong> Database schema updates</li>
                    <li><strong>Optimization:</strong> Performance improvements</li>
                    <li><strong>Ingestion:</strong> Automated content updates</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};