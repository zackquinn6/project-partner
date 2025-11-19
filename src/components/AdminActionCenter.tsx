import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, ExternalLink, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminActionCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RevisionAlert {
  phaseId: string;
  sourceProjectId: string;
  currentRevision: number;
  latestRevision: number;
  phaseName: string;
}

interface ProjectAlerts {
  project_id: string;
  project_name: string;
  alerts: RevisionAlert[];
}

interface FeedbackItem {
  id: string;
  user_email: string;
  user_name: string;
  category: string;
  message: string;
  status: string;
  created_at: string;
}

export const AdminActionCenter: React.FC<AdminActionCenterProps> = ({
  open,
  onOpenChange
}) => {
  const [alerts, setAlerts] = useState<ProjectAlerts[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const { toast } = useToast();

  const fetchRevisionAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_phase_revision_updates');
      
      if (error) throw error;
      
      const formattedAlerts = data.map((item: any) => ({
        project_id: item.project_id,
        project_name: item.project_name,
        alerts: item.alerts || []
      }));
      
      setAlerts(formattedAlerts);
    } catch (error) {
      console.error('Error fetching revision alerts:', error);
      toast({
        title: "Failed to Load Alerts",
        description: "Could not fetch revision alerts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async () => {
    setFeedbackLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .neq('status', 'actioned')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setFeedbackItems(data || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast({
        title: "Failed to Load Feedback",
        description: "Could not fetch feedback items. Please try again.",
        variant: "destructive"
      });
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleAlertAction = async (projectId: string, phaseId: string, action: 'incorporate' | 'dismiss', sourceProjectId?: string) => {
    try {
      if (action === 'incorporate' && sourceProjectId) {
        // Incorporate the latest revision
        const { error: incorporateError } = await supabase.rpc('incorporate_latest_phase_revision', {
          p_project_id: projectId,
          p_phase_id: phaseId,
          p_source_project_id: sourceProjectId
        });

        if (incorporateError) throw incorporateError;

        toast({
          title: "Revision Incorporated",
          description: "The latest revision of this phase has been incorporated successfully."
        });
      } else {
        // Just dismiss the alert
        const { error } = await supabase.rpc('update_phase_revision_alert', {
          p_project_id: projectId,
          p_phase_id: phaseId,
          p_action: action
        });

        if (error) throw error;

        toast({
          title: "Alert Dismissed",
          description: "The alert has been dismissed."
        });
      }

      // Refresh alerts
      await fetchRevisionAlerts();
    } catch (error) {
      console.error('Error handling alert action:', error);
      toast({
        title: "Action Failed",
        description: "Failed to update alert status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleFeedbackAction = async (feedbackId: string, newStatus: 'reviewed' | 'actioned', notes?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'reviewed') {
        updateData.reviewed_at = new Date().toISOString();
      } else if (newStatus === 'actioned') {
        updateData.actioned_at = new Date().toISOString();
      }

      if (notes) {
        updateData.admin_notes = notes;
      }

      const { error } = await supabase
        .from('feedback')
        .update(updateData)
        .eq('id', feedbackId);

      if (error) throw error;

      // Refresh feedback
      await fetchFeedback();

      toast({
        title: "Feedback Updated",
        description: `Feedback marked as ${newStatus}.`
      });
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast({
        title: "Action Failed",
        description: "Failed to update feedback status. Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (open) {
      fetchRevisionAlerts();
      fetchFeedback();
    }
  }, [open]);

  const totalAlerts = alerts.reduce((sum, project) => sum + project.alerts.length, 0);
  const totalFeedback = feedbackItems.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
              Action Center
              <div className="flex gap-1.5 ml-2">
                {totalAlerts > 0 && (
                  <Badge variant="destructive" className="text-[9px] md:text-xs h-5 md:h-6">
                    {totalAlerts} alerts
                  </Badge>
                )}
                {totalFeedback > 0 && (
                  <Badge variant="default" className="text-[9px] md:text-xs h-5 md:h-6">
                    {totalFeedback} feedback
                  </Badge>
                )}
              </div>
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)} 
              className="h-7 px-2 text-[9px] md:text-xs flex-shrink-0"
            >
              Close
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
          <div className="space-y-6">
          {/* User Feedback Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">User Feedback</h3>
              <Button onClick={fetchFeedback} disabled={feedbackLoading} size="sm" variant="outline">
                Refresh
              </Button>
            </div>

            {feedbackLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading feedback...
              </div>
            ) : feedbackItems.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h4 className="font-medium mb-2">No Pending Feedback</h4>
                  <p className="text-muted-foreground">
                    All feedback has been reviewed or actioned. New items will appear here when users submit feedback.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {feedbackItems.map((feedback) => (
                  <Card key={feedback.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={feedback.status === 'open' ? 'destructive' : 'secondary'}>
                              {feedback.status}
                            </Badge>
                            <Badge variant="outline">{feedback.category}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            From: {feedback.user_name} ({feedback.user_email})
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(feedback.created_at).toLocaleDateString()} at {new Date(feedback.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm whitespace-pre-wrap">{feedback.message}</div>
                      <div className="flex gap-2">
                        {feedback.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFeedbackAction(feedback.id, 'reviewed')}
                          >
                            Mark as Reviewed
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleFeedbackAction(feedback.id, 'actioned')}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Mark as Actioned
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Phase Revision Updates Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Phase Revision Updates</h3>
              <Button onClick={fetchRevisionAlerts} disabled={loading} size="sm" variant="outline">
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading alerts...
              </div>
            ) : alerts.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h4 className="font-medium mb-2">No Pending Actions</h4>
                  <p className="text-muted-foreground">
                    All phase revisions are up to date. New alerts will appear here when phases from incorporated projects receive updates.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {alerts.map((projectAlert) => (
                  <Card key={projectAlert.project_id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{projectAlert.project_name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/admin?project=${projectAlert.project_id}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {projectAlert.alerts.map((alert, index) => (
                        <div key={`${alert.phaseId}-${index}`}>
                          {index > 0 && <Separator className="mb-4" />}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="w-4 h-4 text-orange-500" />
                                <span className="font-medium">{alert.phaseName}</span>
                              </div>
                              <div className="text-sm text-muted-foreground mb-3">
                                <p>A newer revision is available for this incorporated phase.</p>
                                <div className="flex items-center gap-4 mt-1">
                                  <span>Current: Rev {alert.currentRevision}</span>
                                  <span>→</span>
                                  <span className="text-primary font-medium">
                                    Latest: Rev {alert.latestRevision}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAlertAction(
                                  projectAlert.project_id, 
                                  alert.phaseId, 
                                  'dismiss'
                                )}
                              >
                                <X className="w-3 h-3 mr-1" />
                                Dismiss
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAlertAction(
                                  projectAlert.project_id, 
                                  alert.phaseId, 
                                  'incorporate',
                                  alert.sourceProjectId
                                )}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Incorporate
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Future sections for other admin actions can be added here */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};