import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { addDays } from 'date-fns';

interface MaintenanceTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  frequency_days: number;
  instructions: string;
}

interface AddMaintenanceTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeId: string;
  onTaskAdded: () => void;
}

export function AddMaintenanceTaskDialog({ 
  open, 
  onOpenChange, 
  homeId, 
  onTaskAdded 
}: AddMaintenanceTaskDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MaintenanceTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  
  // Custom task form
  const [customTask, setCustomTask] = useState({
    title: '',
    description: '',
    category: 'general',
    frequency_days: 90
  });

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load maintenance templates",
        variant: "destructive",
      });
    }
  };

  const handleAddFromTemplate = async (template: MaintenanceTemplate) => {
    if (!homeId) return;
    
    setLoading(true);
    try {
      const nextDueDate = addDays(new Date(), template.frequency_days);
      
      const { error } = await supabase
        .from('user_maintenance_tasks')
        .insert({
          user_id: user?.id,
          home_id: homeId,
          template_id: template.id,
          title: template.title,
          description: template.description,
          category: template.category,
          frequency_days: template.frequency_days,
          next_due_date: nextDueDate.toISOString(),
          is_custom: false
        });

      if (error) throw error;

      toast({
        title: "Task Added",
        description: `${template.title} has been added to your maintenance schedule`,
      });

      onTaskAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding task from template:', error);
      toast({
        title: "Error",
        description: "Failed to add maintenance task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomTask = async () => {
    if (!homeId || !customTask.title.trim()) return;
    
    setLoading(true);
    try {
      const nextDueDate = addDays(new Date(), customTask.frequency_days);
      
      const { error } = await supabase
        .from('user_maintenance_tasks')
        .insert({
          user_id: user?.id,
          home_id: homeId,
          title: customTask.title.trim(),
          description: customTask.description.trim() || null,
          category: customTask.category,
          frequency_days: customTask.frequency_days,
          next_due_date: nextDueDate.toISOString(),
          is_custom: true
        });

      if (error) throw error;

      toast({
        title: "Custom Task Added",
        description: `${customTask.title} has been added to your maintenance schedule`,
      });

      setCustomTask({
        title: '',
        description: '',
        category: 'general',
        frequency_days: 90
      });

      onTaskAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding custom task:', error);
      toast({
        title: "Error",
        description: "Failed to add custom maintenance task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, MaintenanceTemplate[]>);

  const categoryLabels: Record<string, string> = {
    appliances: 'Appliances',
    electrical: 'Electrical',
    exterior: 'Exterior',
    hvac: 'HVAC',
    interior: 'Interior',
    landscaping: 'Landscaping',
    outdoor: 'Outdoor',
    plumbing: 'Plumbing',
    safety: 'Safety',
    security: 'Security',
    general: 'General'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[100]" />
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden z-[101]">
        <DialogHeader>
          <DialogTitle>Add Maintenance Task</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              From Templates
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Custom Task
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4">
            <div className="max-h-[50vh] overflow-y-auto space-y-4">
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    {categoryLabels[category] || category}
                    <Badge variant="outline">{categoryTemplates.length}</Badge>
                  </h3>
                  <div className="grid gap-3">
                    {categoryTemplates.map(template => (
                      <Card key={template.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{template.title}</CardTitle>
                              <div className="text-sm text-muted-foreground">
                                Every {template.frequency_days} days
                              </div>
                            </div>
                            <Button 
                              onClick={() => handleAddFromTemplate(template)}
                              disabled={loading}
                              size="sm"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        </CardHeader>
                        {template.description && (
                          <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                            {template.instructions && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs">
                                <strong>Instructions:</strong> {template.instructions}
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
              
              {templates.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No templates available</h3>
                  <p className="text-muted-foreground">
                    Create a custom task or ask an admin to add maintenance templates.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <div className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="title">Task Title *</Label>
                  <Input
                    id="title"
                    value={customTask.title}
                    onChange={(e) => setCustomTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Check garage door opener"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={customTask.description}
                    onChange={(e) => setCustomTask(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description of the maintenance task"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={customTask.category} 
                      onValueChange={(value) => setCustomTask(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="appliances">Appliances</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="exterior">Exterior</SelectItem>
                        <SelectItem value="hvac">HVAC</SelectItem>
                        <SelectItem value="interior">Interior</SelectItem>
                        <SelectItem value="landscaping">Landscaping</SelectItem>
                        <SelectItem value="outdoor">Outdoor</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="safety">Safety</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="frequency">Frequency (days)</Label>
                    <Input
                      id="frequency"
                      type="number"
                      min="1"
                      max="3650"
                      value={customTask.frequency_days}
                      onChange={(e) => setCustomTask(prev => ({ 
                        ...prev, 
                        frequency_days: parseInt(e.target.value) || 90 
                      }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddCustomTask}
                    disabled={loading || !customTask.title.trim()}
                  >
                    {loading ? 'Adding...' : 'Add Custom Task'}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}