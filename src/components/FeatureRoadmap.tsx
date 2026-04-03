import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Plus, ThumbsUp, Calendar, CheckCircle, Clock, AlertCircle, Star } from 'lucide-react';
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
  admin_response: string | null;
}

export const FeatureRoadmap: React.FC = () => {
  const { isAdmin } = useUserRole();
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [showAddRoadmapItem, setShowAddRoadmapItem] = useState(false);
  const [showFeatureRequestForm, setShowFeatureRequestForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [roadmapForm, setRoadmapForm] = useState({
    title: '',
    description: '',
    status: 'planned' as const,
    priority: 'medium' as const,
    category: 'feature' as const,
    target_date: ''
  });

  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    category: 'feature' as const,
    priority_request: 'medium' as const
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [roadmapResponse, requestsResponse] = await Promise.all([
        supabase
          .from('feature_roadmap')
          .select('*')
          .order('display_order', { ascending: true }),
        supabase
          .from('feature_requests_public')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (roadmapResponse.error) throw roadmapResponse.error;
      if (requestsResponse.error) throw requestsResponse.error;

      setRoadmapItems((roadmapResponse.data || []) as RoadmapItem[]);
      setFeatureRequests((requestsResponse.data || []) as FeatureRequest[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load roadmap data');
    } finally {
      setLoading(false);
    }
  };

  const addRoadmapItem = async () => {
    if (!roadmapForm.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      const { error } = await supabase
        .from('feature_roadmap')
        .insert({
          ...roadmapForm,
          target_date: roadmapForm.target_date || null,
          display_order: roadmapItems.length
        });

      if (error) throw error;

            setShowAddRoadmapItem(false);
      setRoadmapForm({
        title: '',
        description: '',
        status: 'planned',
        priority: 'medium',
        category: 'feature',
        target_date: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error adding roadmap item:', error);
      toast.error('Failed to add roadmap item');
    }
  };

  const submitFeatureRequest = async () => {
    if (!requestForm.title.trim() || !requestForm.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('feature_requests')
        .insert(requestForm);

      if (error) throw error;

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in-progress': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'planned': return <Calendar className="w-4 h-4 text-gray-600" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-gray-500 bg-gray-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading roadmap...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2">Project Partner Feature Roadmap</h2>
        <p className="text-muted-foreground">
          See what's coming next and request new features for Project Partner
        </p>
      </div>

      <Tabs defaultValue="roadmap" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roadmap">Current Roadmap</TabsTrigger>
          <TabsTrigger value="requests">Feature Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Planned Features</h3>
            {isAdmin && (
              <Dialog open={showAddRoadmapItem} onOpenChange={setShowAddRoadmapItem}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Roadmap Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Roadmap Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={roadmapForm.title}
                        onChange={(e) => setRoadmapForm({ ...roadmapForm, title: e.target.value })}
                        placeholder="Feature title"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={roadmapForm.description}
                        onChange={(e) => setRoadmapForm({ ...roadmapForm, description: e.target.value })}
                        placeholder="Feature description"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={roadmapForm.status}
                          onValueChange={(value: any) => setRoadmapForm({ ...roadmapForm, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={roadmapForm.priority}
                          onValueChange={(value: any) => setRoadmapForm({ ...roadmapForm, priority: value })}
                        >
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={roadmapForm.category}
                          onValueChange={(value: any) => setRoadmapForm({ ...roadmapForm, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="feature">Feature</SelectItem>
                            <SelectItem value="improvement">Improvement</SelectItem>
                            <SelectItem value="bugfix">Bug Fix</SelectItem>
                            <SelectItem value="integration">Integration</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="target_date">Target Date</Label>
                        <Input
                          id="target_date"
                          type="date"
                          value={roadmapForm.target_date}
                          onChange={(e) => setRoadmapForm({ ...roadmapForm, target_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddRoadmapItem(false)}>
                        Cancel
                      </Button>
                      <Button onClick={addRoadmapItem}>
                        Add Item
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid gap-4">
            {roadmapItems.map((item) => (
              <Card key={item.id} className={`border-l-4 ${getPriorityColor(item.priority)}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {getStatusIcon(item.status)}
                        {item.title}
                      </CardTitle>
                      {item.description && (
                        <p className="text-muted-foreground mt-2">{item.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {item.category}
                        </Badge>
                        <Badge 
                          variant={item.priority === 'critical' ? 'destructive' : 
                                 item.priority === 'high' ? 'secondary' : 'outline'}
                          className="capitalize"
                        >
                          {item.priority}
                        </Badge>
                      </div>
                      {item.target_date && (
                        <p className="text-sm text-muted-foreground">
                          Target: {new Date(item.target_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant={item.status === 'completed' ? 'default' : 
                               item.status === 'in-progress' ? 'secondary' : 'outline'}
                      className="capitalize"
                    >
                      {item.status.replace('-', ' ')}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ThumbsUp className="w-4 h-4" />
                      {item.votes} votes
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Submit Feature Request</h3>
            <Dialog open={showFeatureRequestForm} onOpenChange={setShowFeatureRequestForm}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Request Feature
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Feature Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="req-title">Title *</Label>
                    <Input
                      id="req-title"
                      value={requestForm.title}
                      onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                      placeholder="What feature would you like?"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="req-description">Description *</Label>
                    <Textarea
                      id="req-description"
                      value={requestForm.description}
                      onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                      placeholder="Please describe the feature in detail"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="req-category">Category</Label>
                      <Select
                        value={requestForm.category}
                        onValueChange={(value: any) => setRequestForm({ ...requestForm, category: value })}
                      >
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
                      <Select
                        value={requestForm.priority_request}
                        onValueChange={(value: any) => setRequestForm({ ...requestForm, priority_request: value })}
                      >
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
          </div>

          <div className="grid gap-4">
            {featureRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{request.title}</CardTitle>
                      <p className="text-muted-foreground mt-2">{request.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {request.category}
                        </Badge>
                        <Badge 
                          variant={request.priority_request === 'critical' ? 'destructive' : 
                                 request.priority_request === 'high' ? 'secondary' : 'outline'}
                          className="capitalize"
                        >
                          {request.priority_request}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant={request.status === 'approved' ? 'default' : 
                               request.status === 'under-review' ? 'secondary' : 'outline'}
                      className="capitalize"
                    >
                      {request.status.replace('-', ' ')}
                    </Badge>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        {request.votes} votes
                      </div>
                      <span>{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {request.admin_response && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Admin Response:</p>
                      <p className="text-sm text-muted-foreground">{request.admin_response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};