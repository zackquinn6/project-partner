import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Calendar, CheckCircle, Clock, AlertCircle, Star, MessageSquare } from 'lucide-react';
import { AdminFeatureRequestManager } from './AdminFeatureRequestManager';

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

interface AdminRoadmapManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminRoadmapManager: React.FC<AdminRoadmapManagerProps> = ({
  open,
  onOpenChange
}) => {
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);

  // Form state
  const [roadmapForm, setRoadmapForm] = useState({
    title: '',
    description: '',
    status: 'planned' as 'planned' | 'in-progress' | 'completed' | 'cancelled',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    category: 'feature' as 'feature' | 'improvement' | 'bugfix' | 'integration',
    target_date: ''
  });

  useEffect(() => {
    if (open) {
      fetchRoadmapItems();
    }
  }, [open]);

  const fetchRoadmapItems = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_roadmap')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setRoadmapItems((data || []) as RoadmapItem[]);
    } catch (error) {
      console.error('Error fetching roadmap items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!roadmapForm.title.trim()) {
      console.error('Please enter a title');
      return;
    }

    try {
      const itemData = {
        ...roadmapForm,
        target_date: roadmapForm.target_date || null,
        display_order: editingItem?.display_order ?? roadmapItems.length
      };

      if (editingItem) {
        const { error } = await supabase
          .from('feature_roadmap')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('feature_roadmap')
          .insert(itemData);

        if (error) throw error;
      }

      setShowAddForm(false);
      setEditingItem(null);
      setRoadmapForm({
        title: '',
        description: '',
        status: 'planned',
        priority: 'medium',
        category: 'feature',
        target_date: ''
      });
      fetchRoadmapItems();
    } catch (error) {
      console.error('Error saving roadmap item:', error);
    }
  };

  const handleEditItem = (item: RoadmapItem) => {
    setEditingItem(item);
    setRoadmapForm({
      title: item.title,
      description: item.description || '',
      status: item.status,
      priority: item.priority,
      category: item.category,
      target_date: item.target_date || ''
    });
    setShowAddForm(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this roadmap item?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('feature_roadmap')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      fetchRoadmapItems();
    } catch (error) {
      console.error('Error deleting roadmap item:', error);
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
              <DialogTitle className="text-lg md:text-xl font-bold">Roadmap Management</DialogTitle>
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
            <div className="flex justify-center py-8">Loading roadmap...</div>
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
            <DialogTitle className="text-lg md:text-xl font-bold">Roadmap & Feature Request Management</DialogTitle>
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
          <Tabs defaultValue="roadmap" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="roadmap">Roadmap Items</TabsTrigger>
              <TabsTrigger value="requests">Feature Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="roadmap" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Feature Roadmap Items
                    <Button 
                      className="flex items-center gap-2"
                      onClick={() => {
                        setEditingItem(null);
                        setRoadmapForm({
                          title: '',
                          description: '',
                          status: 'planned',
                          priority: 'medium',
                          category: 'feature',
                          target_date: ''
                        });
                        setShowAddForm(true);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Add Roadmap Item
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>ETA</TableHead>
                        <TableHead>Votes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roadmapItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(item.status)}
                                {item.title}
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1 max-w-md truncate">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {item.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityColor(item.priority) as any} className="capitalize">
                              {item.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={item.status === 'completed' ? 'default' : 
                                       item.status === 'in-progress' ? 'secondary' : 'outline'}
                              className="capitalize"
                            >
                              {item.status.replace('-', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.target_date ? (
                              new Date(item.target_date).toLocaleDateString()
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{item.votes}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditItem(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteItem(item.id)}
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
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              <div className="h-96 overflow-y-auto">
                <AdminFeatureRequestManager
                  open={true}
                  onOpenChange={() => {}}
                />
              </div>
            </TabsContent>
        </Tabs>
          </div>
        </div>

      {/* Add/Edit Form */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Roadmap Item' : 'Add Roadmap Item'}</DialogTitle>
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
                rows={3}
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
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveItem}>
                {editingItem ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </DialogContent>
    </Dialog>
  );
};