import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminActionCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FeedbackItem {
  id: string;
  user_id: string | null;
  category: string;
  message: string;
  status: string;
  created_at: string;
  submitter_display: string;
}

export const AdminActionCenter: React.FC<AdminActionCenterProps> = ({
  open,
  onOpenChange
}) => {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const { toast } = useToast();

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
      fetchFeedback();
    }
  }, [open]);

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
                            From: {feedback.submitter_display}
                            {feedback.user_id ? (
                              <span className="ml-2 font-mono text-xs text-muted-foreground/80">
                                {feedback.user_id}
                              </span>
                            ) : null}
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};