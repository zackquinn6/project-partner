import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Plus, ThumbsUp, Calendar, CheckCircle, Clock, AlertCircle, Star, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'feature' | 'improvement' | 'bugfix' | 'integration';
  target_date: string | null;
  completion_date: string | null;
  votes: number;
  display_order: number;
  created_at: string;
}
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
interface FeatureRoadmapWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export const FeatureRoadmapWindow: React.FC<FeatureRoadmapWindowProps> = ({
  open,
  onOpenChange
}) => {
  const {
    user
  } = useAuth();
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [showFeatureRequestForm, setShowFeatureRequestForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState<Record<string, Set<string>>>({
    roadmap: new Set(),
    request: new Set()
  });

  // Form state for feature requests
  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    category: 'feature' as const,
    priority_request: 'medium' as const
  });
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);
  const fetchData = async () => {
    try {
      const [roadmapResponse, requestsResponse, userVotesResponse] = await Promise.all([supabase.from('feature_roadmap').select('*').order('display_order', {
        ascending: true
      }), supabase.from('feature_requests').select('*').order('created_at', {
        ascending: false
      }), user ? supabase.from('feature_votes').select('item_id, item_type').eq('user_id', user.id) : Promise.resolve({
        data: [],
        error: null
      })]);
      if (roadmapResponse.error) throw roadmapResponse.error;
      if (requestsResponse.error) throw requestsResponse.error;
      if (userVotesResponse.error) throw userVotesResponse.error;
      const allRoadmapItems = (roadmapResponse.data || []) as RoadmapItem[];
      
      // Filter out completed items for user-facing view
      const filteredItems = allRoadmapItems.filter(item => item.status !== 'completed');
      
      // Sort by target_date (ETA) soonest to latest, items without dates go last
      const sortedItems = filteredItems.sort((a, b) => {
        // Items with dates come first
        if (a.target_date && !b.target_date) return -1;
        if (!a.target_date && b.target_date) return 1;
        // Both have dates - sort by date
        if (a.target_date && b.target_date) {
          return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
        }
        // Neither has date - maintain original order
        return 0;
      });
      
      setRoadmapItems(sortedItems);
      setFeatureRequests((requestsResponse.data || []) as FeatureRequest[]);

      // Set user votes
      const votes = {
        roadmap: new Set<string>(),
        request: new Set<string>()
      };
      (userVotesResponse.data || []).forEach(vote => {
        votes[vote.item_type as 'roadmap' | 'request'].add(vote.item_id);
      });
      setUserVotes(votes);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load roadmap data');
    } finally {
      setLoading(false);
    }
  };
  const submitFeatureRequest = async () => {
    if (!requestForm.title.trim() || !requestForm.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!user) {
      toast.error('Please sign in to submit feature requests');
      return;
    }
    try {
      const {
        error
      } = await supabase.from('feature_requests').insert({
        ...requestForm,
        submitted_by: user.id
      });
      if (error) throw error;
      toast.success('Feature request submitted successfully');
      setShowFeatureRequestForm(false);
      setRequestForm({
        title: '',
        description: '',
        category: 'feature',
        priority_request: 'medium'
      });
      fetchData();
    } catch (error) {
      console.error('Error submitting feature request:', error);
      toast.error('Failed to submit feature request');
    }
  };
  const handleVote = async (itemId: string, itemType: 'roadmap' | 'request') => {
    if (!user) {
      toast.error('Please sign in to vote');
      return;
    }

    // Check if user owns this request (can't vote on own request)
    if (itemType === 'request') {
      const request = featureRequests.find(r => r.id === itemId);
      if (request?.submitted_by === user.id) {
        toast.error("You can't vote on your own feature request");
        return;
      }
    }
    const hasVoted = userVotes[itemType].has(itemId);
    try {
      if (hasVoted) {
        // Remove vote
        const {
          error
        } = await supabase.from('feature_votes').delete().eq('user_id', user.id).eq('item_id', itemId).eq('item_type', itemType);
        if (error) throw error;
        setUserVotes(prev => ({
          ...prev,
          [itemType]: new Set([...prev[itemType]].filter(id => id !== itemId))
        }));
        toast.success('Vote removed');
      } else {
        // Add vote
        const {
          error
        } = await supabase.from('feature_votes').insert({
          user_id: user.id,
          item_id: itemId,
          item_type: itemType
        });
        if (error) throw error;
        setUserVotes(prev => ({
          ...prev,
          [itemType]: new Set([...prev[itemType], itemId])
        }));
        toast.success('Vote recorded');
      }

      // Refresh data to get updated vote counts
      fetchData();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to record vote');
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'planned':
        return <Calendar className="w-4 h-4 text-gray-600" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500 bg-red-50 dark:bg-red-950/20';
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
      case 'low':
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20';
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20';
    }
  };
  if (loading) {
    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <div className="flex flex-col h-full">
            <div className="px-4 md:px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg md:text-xl font-bold">Loading...</h2>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="ml-4 flex-shrink-0">
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="flex justify-center py-8">Loading roadmap...</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>;
  }
  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <div className="flex flex-col h-full">
            <div className="px-4 md:px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg md:text-xl font-bold">Project Partner Roadmap</h2>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="ml-4 flex-shrink-0">
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              See what's coming next and request new features for Project Partner
            </p>
          </div>

          <Tabs defaultValue="roadmap" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="roadmap">Feature Roadmap</TabsTrigger>
              <TabsTrigger value="requests">Feature Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="roadmap" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Upcoming Features</h3>
                
              </div>

              <div className="grid gap-4">
                {roadmapItems.map(item => <Card key={item.id} className={`border-l-4 ${getPriorityColor(item.priority)} transition-all hover:shadow-md`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            {getStatusIcon(item.status)}
                            {item.title}
                          </CardTitle>
                          {item.description && <p className="text-muted-foreground mt-2">{item.description}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {item.category}
                            </Badge>
                            <Badge variant={item.priority === 'critical' ? 'destructive' : item.priority === 'high' ? 'secondary' : 'outline'} className="capitalize">
                              {item.priority}
                            </Badge>
                          </div>
                          {item.target_date && <p className="text-sm text-muted-foreground">
                              ETA: {new Date(item.target_date).toLocaleDateString()}
                            </p>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant={item.status === 'completed' ? 'default' : item.status === 'in-progress' ? 'secondary' : 'outline'} className="capitalize">
                          {item.status.replace('-', ' ')}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => handleVote(item.id, 'roadmap')} className={`flex items-center gap-1 text-sm ${userVotes.roadmap.has(item.id) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                          <ThumbsUp className={`w-4 h-4 ${userVotes.roadmap.has(item.id) ? 'fill-current' : ''}`} />
                          {item.votes} votes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>)}
              </div>
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Community Requests</h3>
                <Button className="flex items-center gap-2" onClick={() => setShowFeatureRequestForm(true)}>
                  <Plus className="w-4 h-4" />
                  Request Feature
                </Button>
              </div>

              <div className="grid gap-4">
                {featureRequests.map(request => <Card key={request.id} className={`border-l-4 ${getPriorityColor(request.priority_request)} transition-all hover:shadow-md`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Star className="w-4 h-4 text-yellow-500" />
                            {request.title}
                          </CardTitle>
                           <p className="text-muted-foreground mt-2">{request.description}</p>
                           {request.admin_response && <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                               <div className="flex items-center gap-2 mb-1">
                                 <Badge variant="outline" className="text-xs">Admin Response</Badge>
                               </div>
                               <p className="text-sm text-blue-800 dark:text-blue-200">{request.admin_response}</p>
                             </div>}
                         </div>
                         <div className="flex flex-col items-end gap-2">
                           <div className="flex items-center gap-2">
                             <Badge variant="outline" className="capitalize">
                               {request.category}
                             </Badge>
                             <Badge variant={request.priority_request === 'critical' ? 'destructive' : request.priority_request === 'high' ? 'secondary' : 'outline'} className="capitalize">
                               {request.priority_request}
                             </Badge>
                           </div>
                           <p className="text-sm text-muted-foreground">
                             {new Date(request.created_at).toLocaleDateString()}
                           </p>
                         </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant={request.status === 'implemented' ? 'default' : request.status === 'approved' ? 'secondary' : 'outline'} className="capitalize">
                          {request.status.replace('-', ' ')}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => handleVote(request.id, 'request')} disabled={request.submitted_by === user?.id} className={`flex items-center gap-1 text-sm ${request.submitted_by === user?.id ? 'text-muted-foreground/50 cursor-not-allowed' : userVotes.request.has(request.id) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                          <ThumbsUp className={`w-4 h-4 ${userVotes.request.has(request.id) ? 'fill-current' : ''}`} />
                          {request.votes} votes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>)}
              </div>
            </TabsContent>
          </Tabs>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feature Request Form */}
      <Dialog open={showFeatureRequestForm} onOpenChange={setShowFeatureRequestForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Feature Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="req-title">Title *</Label>
              <Input id="req-title" value={requestForm.title} onChange={e => setRequestForm({
              ...requestForm,
              title: e.target.value
            })} placeholder="What feature would you like?" />
            </div>
            
            <div>
              <Label htmlFor="req-description">Description *</Label>
              <Textarea id="req-description" value={requestForm.description} onChange={e => setRequestForm({
              ...requestForm,
              description: e.target.value
            })} placeholder="Please describe the feature in detail" rows={4} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="req-category">Category</Label>
                <Select value={requestForm.category} onValueChange={(value: any) => setRequestForm({
                ...requestForm,
                category: value
              })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">New Feature</SelectItem>
                    <SelectItem value="improvement">Improvement</SelectItem>
                    <SelectItem value="bugfix">Bug Fix</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="req-priority">Priority</Label>
                <Select value={requestForm.priority_request} onValueChange={(value: any) => setRequestForm({
                ...requestForm,
                priority_request: value
              })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFeatureRequestForm(false)}>
                Cancel
              </Button>
              <Button onClick={submitFeatureRequest}>
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>;
};