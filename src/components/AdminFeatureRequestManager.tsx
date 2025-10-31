import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { MessageSquare, Trash2, Star, Eye, Edit } from 'lucide-react';

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: 'feature' | 'improvement' | 'bugfix' | 'integration';
  priority_request: 'low' | 'medium' | 'high' | 'critical';
  status: 'submitted' | 'under-review' | 'approved' | 'rejected' | 'implemented';
  votes: number;
  created_at: string;
  admin_notes: string | null;
  admin_response: string | null;
  submitted_by: string | null;
}

interface AdminFeatureRequestManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminFeatureRequestManager: React.FC<AdminFeatureRequestManagerProps> = ({
  open,
  onOpenChange
}) => {
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null);

  // Form state for admin response
  const [responseForm, setResponseForm] = useState({
    status: 'submitted' as 'submitted' | 'under-review' | 'approved' | 'rejected' | 'implemented',
    admin_response: '',
    admin_notes: ''
  });

  useEffect(() => {
    if (open) {
      fetchFeatureRequests();
    }
  }, [open]);

  const fetchFeatureRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeatureRequests((data || []) as FeatureRequest[]);
    } catch (error) {
      console.error('Error fetching feature requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = (request: FeatureRequest) => {
    setSelectedRequest(request);
    setResponseForm({
      status: request.status,
      admin_response: request.admin_response || '',
      admin_notes: request.admin_notes || ''
    });
    setShowResponseForm(true);
  };

  const handleSaveResponse = async () => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase
        .from('feature_requests')
        .update({
          status: responseForm.status,
          admin_response: responseForm.admin_response.trim() || null,
          admin_notes: responseForm.admin_notes.trim() || null
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      setShowResponseForm(false);
      setSelectedRequest(null);
      setResponseForm({
        status: 'submitted',
        admin_response: '',
        admin_notes: ''
      });
      fetchFeatureRequests();
    } catch (error) {
      console.error('Error saving response:', error);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this feature request?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('feature_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      fetchFeatureRequests();
    } catch (error) {
      console.error('Error deleting feature request:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented': return 'default';
      case 'approved': return 'secondary';
      case 'under-review': return 'outline';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg md:text-xl font-bold">Feature Request Management</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onOpenChange(false)} 
                className="h-7 px-2 text-[9px] md:text-xs"
              >
                Close
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
            <div className="flex justify-center py-8">Loading feature requests...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl font-bold">Feature Request Management</DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)} 
              className="h-7 px-2 text-[9px] md:text-xs"
            >
              Close
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
          <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Requests ({featureRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Votes</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <div className="max-w-sm">
                          <div className="font-medium">{request.title}</div>
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {request.description}
                          </p>
                          {request.admin_response && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                              <MessageSquare className="w-3 h-3" />
                              Response provided
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {request.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(request.priority_request) as any} className="capitalize">
                          {request.priority_request}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusColor(request.status) as any}
                          className="capitalize"
                        >
                          {request.status.replace('-', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{request.votes}</TableCell>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRespond(request)}
                            title="Respond to request"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRequest(request.id)}
                            title="Delete request"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
        </Card>
          </div>
        </div>

      {/* Response Form Dialog */}
      {showResponseForm && selectedRequest && (
        <Dialog open={showResponseForm} onOpenChange={setShowResponseForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Respond to Feature Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Request Details */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold">{selectedRequest.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedRequest.description}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{selectedRequest.category}</Badge>
                  <Badge variant={getPriorityColor(selectedRequest.priority_request) as any}>
                    {selectedRequest.priority_request}
                  </Badge>
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={responseForm.status}
                  onValueChange={(value: any) => setResponseForm({ ...responseForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under-review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="implemented">Implemented</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="admin_response">Public Response (visible to users)</Label>
                <Textarea
                  id="admin_response"
                  value={responseForm.admin_response}
                  onChange={(e) => setResponseForm({ ...responseForm, admin_response: e.target.value })}
                  placeholder="Enter your response to the user (optional)"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="admin_notes">Private Notes (admin only)</Label>
                <Textarea
                  id="admin_notes"
                  value={responseForm.admin_notes}
                  onChange={(e) => setResponseForm({ ...responseForm, admin_notes: e.target.value })}
                  placeholder="Internal notes for admin reference (optional)"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowResponseForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveResponse}>
                  Save Response
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </DialogContent>
    </Dialog>
  );
};