import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, User, ClipboardList, Inbox, CheckCircle2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { addDays } from 'date-fns';

interface MaintenanceTemplate {
  id: string;
  title: string;
  description: string;
  summary?: string | null;
  category: string;
  frequency_days: number;
  instructions: string | null;
  risks_of_skipping?: string | null;
  benefits_of_maintenance?: string | null;
  criticality?: number | null;
  repair_cost_savings?: string | null;
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
  const [existingTemplateIds, setExistingTemplateIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [templateFilterCategory, setTemplateFilterCategory] = useState<string>('all');
  const [templateFilterCriticality, setTemplateFilterCriticality] = useState<string>('all');

  // Custom task form
  const [customTask, setCustomTask] = useState({
    title: '',
    description: '',
    category: 'general',
    frequency_days: 90,
    criticality: 2 as 1 | 2 | 3,
    risks_of_skipping: '',
    benefits_of_maintenance: '',
  });

  useEffect(() => {
    if (open) {
      fetchTemplates();
      if (homeId && user?.id) fetchExistingTemplateIds();
    }
  }, [open, homeId, user?.id]);

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

  const fetchExistingTemplateIds = async () => {
    if (!homeId || !user?.id) return;
    try {
      const { data, error } = await supabase
        .from('user_maintenance_tasks')
        .select('template_id')
        .eq('user_id', user.id)
        .eq('home_id', homeId)
        .not('template_id', 'is', null);
      if (error) throw error;
      const ids = new Set((data || []).map((r: { template_id: string }) => r.template_id));
      setExistingTemplateIds(ids);
    } catch (error) {
      console.error('Error fetching existing template IDs:', error);
      setExistingTemplateIds(new Set());
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
          summary: template.summary ?? null,
          instructions: template.instructions ?? null,
          category: template.category,
          frequency_days: template.frequency_days,
          next_due: nextDueDate.toISOString(),
          risks_of_skipping: template.risks_of_skipping ?? null,
          benefits_of_maintenance: template.benefits_of_maintenance ?? null,
          criticality: template.criticality ?? 2,
          repair_cost_savings: template.repair_cost_savings ?? null,
        });

      if (error) throw error;

      toast({
        title: "Task Added",
        description: `${template.title} has been added to your maintenance schedule`,
      });

      setTemplates(prev => prev.filter(t => t.id !== template.id));
      setExistingTemplateIds(prev => new Set(prev).add(template.id));
      onTaskAdded();
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
          next_due: nextDueDate.toISOString(),
          risks_of_skipping: customTask.risks_of_skipping.trim() || null,
          benefits_of_maintenance: customTask.benefits_of_maintenance.trim() || null,
          criticality: customTask.criticality,
        });

      if (error) throw error;

      toast({
        title: "Custom task added",
        description: `${customTask.title} was added to your maintenance schedule successfully.`,
      });

      setCustomTask({
        title: '',
        description: '',
        category: 'general',
        frequency_days: 90,
        criticality: 2,
        risks_of_skipping: '',
        benefits_of_maintenance: '',
      });

      onTaskAdded();
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

  const categoryLabels: Record<string, string> = {
    appliances: 'Appliances',
    electrical: 'Electrical',
    exterior: 'Exterior',
    general: 'General',
    hvac: 'HVAC',
    interior: 'Interior',
    landscaping: 'Landscaping',
    outdoor: 'Outdoor',
    plumbing: 'Plumbing',
    roof: 'Roof',
    safety: 'Safety',
    security: 'Security',
  };

  const templatesNotYetAdded = templates.filter((t) => !existingTemplateIds.has(t.id));
  const filteredTemplates = templatesNotYetAdded.filter((t) => {
    const matchCategory = templateFilterCategory === 'all' || t.category === templateFilterCategory;
    const c = t.criticality ?? 2;
    const matchCriticality = templateFilterCriticality === 'all' || c === parseInt(templateFilterCriticality, 10);
    return matchCategory && matchCriticality;
  });
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    const ca = a.criticality ?? 2;
    const cb = b.criticality ?? 2;
    if (cb !== ca) return cb - ca;
    return (a.title || '').localeCompare(b.title || '');
  });
  const groupedTemplates = sortedTemplates.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, MaintenanceTemplate[]>);
  const sortedCategoryKeys = Object.keys(groupedTemplates).sort((a, b) => a.localeCompare(b));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[100]" />
        <DialogContent className="w-full max-w-[95vw] md:max-w-[75vw] max-h-[90vh] overflow-hidden z-[101]">
        <div className="absolute right-4 top-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Add Maintenance Task
          </DialogTitle>
          <DialogDescription className="sr-only">
            Add a task from templates or create a custom maintenance task for your home.
          </DialogDescription>
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
            <p className="text-xs text-muted-foreground mb-3">Pick a task below and add it to your plan. Open any task from your list to see full step-by-step instructions.</p>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Select value={templateFilterCategory} onValueChange={setTemplateFilterCategory}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="all">All categories</SelectItem>
                  {Object.entries(categoryLabels)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={templateFilterCriticality} onValueChange={setTemplateFilterCriticality}>
                <SelectTrigger className="w-[140px] h-9 text-sm">
                  <SelectValue placeholder="Criticality" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="all">All criticality</SelectItem>
                  <SelectItem value="3">High</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="1">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[50vh] overflow-y-auto space-y-4">
              {sortedCategoryKeys.map((category) => {
                const categoryTemplates = groupedTemplates[category];
                return (
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
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0"
                              title="Add to plan"
                            >
                              <Plus className="h-4 w-4 text-blue-600" />
                            </Button>
                          </div>
                        </CardHeader>
                        {(template.summary ?? template.description) && (
                          <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground">{template.summary ?? template.description}</p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              );
              })}
              
              {templates.length === 0 && (
                <div className="text-center py-10 rounded-lg border border-dashed bg-muted/30">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground mb-4">
                    <Inbox className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No templates available yet</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Create your own task in the Custom Task tab, or check back later for more templates.
                  </p>
                </div>
              )}
              {templates.length > 0 && templatesNotYetAdded.length === 0 && (
                <div className="text-center py-10 rounded-lg border border-primary/20 bg-primary/5">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-600 mb-4" />
                  <h3 className="text-lg font-medium mb-2">You've added them all</h3>
                  <p className="text-muted-foreground text-sm">All available templates are on your plan. Add a custom task or check back for new templates.</p>
                </div>
              )}
              {templates.length > 0 && templatesNotYetAdded.length > 0 && filteredTemplates.length === 0 && (
                <div className="text-center py-8 flex flex-col items-center gap-2">
                  <Search className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">No templates match the current filters. Try a different category or criticality.</p>
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={customTask.category} 
                      onValueChange={(value) => setCustomTask(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="appliances">Appliances</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="exterior">Exterior</SelectItem>
                        <SelectItem value="hvac">HVAC</SelectItem>
                        <SelectItem value="interior">Interior</SelectItem>
                        <SelectItem value="landscaping">Landscaping</SelectItem>
                        <SelectItem value="outdoor">Outdoor</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="roof">Roof</SelectItem>
                        <SelectItem value="safety">Safety</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="custom-criticality">Criticality</Label>
                    <Select
                      value={String(customTask.criticality)}
                      onValueChange={(v) => setCustomTask(prev => ({ ...prev, criticality: parseInt(v, 10) as 1 | 2 | 3 }))}
                    >
                      <SelectTrigger id="custom-criticality" className="w-full min-w-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        <SelectItem value="1">Low</SelectItem>
                        <SelectItem value="2">Medium</SelectItem>
                        <SelectItem value="3">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="frequency">Frequency (days)</Label>
                    <Input
                      id="frequency"
                      type="number"
                      min={1}
                      max="3650"
                      className="w-full min-w-0"
                      value={customTask.frequency_days}
                      onChange={(e) => setCustomTask(prev => ({ 
                        ...prev, 
                        frequency_days: parseInt(e.target.value) || 90 
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="custom-risks">Risks of skipping (optional)</Label>
                  <Textarea
                    id="custom-risks"
                    rows={2}
                    placeholder="e.g. Sediment buildup, early failure"
                    value={customTask.risks_of_skipping}
                    onChange={(e) => setCustomTask(prev => ({ ...prev, risks_of_skipping: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="custom-benefits">Benefits of maintenance (optional)</Label>
                  <Textarea
                    id="custom-benefits"
                    rows={2}
                    placeholder="e.g. Extend life from 10 to 20 yrs"
                    value={customTask.benefits_of_maintenance}
                    onChange={(e) => setCustomTask(prev => ({ ...prev, benefits_of_maintenance: e.target.value }))}
                  />
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
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
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