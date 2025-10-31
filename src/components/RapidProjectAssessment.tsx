import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Calculator, DollarSign, Save, FolderOpen, FileText, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  enhancedSanitizeFormData, 
  sanitizeNumericInput, 
  initializeCSRFProtection, 
  validateFormSubmission,
  checkOperationRateLimit,
  recordOperationAttempt 
} from "@/utils/enhancedInputSanitization";
import { logAdminAction, logInputValidationFailure, logRateLimitExceeded, getClientInfo } from "@/utils/securityLogger";

interface LineItem {
  id: string;
  item: string;
  lowCost: number;
  highCost: number;
  units: number;
  type: 'material' | 'labor';
}

interface ProjectPlan {
  id?: string;
  name: string;
  description: string;
  notes: string;
  lineItems: LineItem[];
  contingencyPercent: number;
  salesTaxPercent: number;
  state: string;
}

interface SavedProjectPlan extends ProjectPlan {
  id: string;
  created_at: string;
  updated_at: string;
}

const US_STATES_TAX_RATES = {
  'AL': 4.0, 'AK': 0.0, 'AZ': 5.6, 'AR': 6.5, 'CA': 7.25, 'CO': 2.9, 'CT': 6.35, 'DE': 0.0,
  'FL': 6.0, 'GA': 4.0, 'HI': 4.17, 'ID': 6.0, 'IL': 6.25, 'IN': 7.0, 'IA': 6.0, 'KS': 6.5,
  'KY': 6.0, 'LA': 4.45, 'ME': 5.5, 'MD': 6.0, 'MA': 6.25, 'MI': 6.0, 'MN': 6.88, 'MS': 7.0,
  'MO': 4.23, 'MT': 0.0, 'NE': 5.5, 'NV': 6.85, 'NH': 0.0, 'NJ': 6.63, 'NM': 5.13, 'NY': 4.0,
  'NC': 4.75, 'ND': 5.0, 'OH': 5.75, 'OK': 4.5, 'OR': 0.0, 'PA': 6.0, 'RI': 7.0, 'SC': 6.0,
  'SD': 4.0, 'TN': 7.0, 'TX': 6.25, 'UT': 4.85, 'VT': 6.0, 'VA': 5.3, 'WA': 6.5, 'WV': 6.0,
  'WI': 5.0, 'WY': 4.0
};

const CONTINGENCY_OPTIONS = [0, 5, 10, 25, 50, 100];

interface RapidProjectAssessmentProps {
  taskId?: string;
  taskTitle?: string;
  taskNotes?: string;
  onClose?: () => void;
}

export function RapidProjectAssessment({ taskId, taskTitle, taskNotes, onClose }: RapidProjectAssessmentProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // View state
  const [currentView, setCurrentView] = useState<'list' | 'edit'>(taskId ? 'edit' : 'list');
  const [savedProjects, setSavedProjects] = useState<SavedProjectPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [hasLoadedTask, setHasLoadedTask] = useState(false);

  // When taskId is provided, skip list view entirely
  const shouldShowListView = !taskId && currentView === 'list';

  // Current project state
  const [project, setProject] = useState<ProjectPlan>({
    name: '',
    description: '',
    notes: '',
    lineItems: [],
    contingencyPercent: 10,
    salesTaxPercent: 0,
    state: ''
  });

  // Load saved projects and initialize CSRF protection on component mount
  useEffect(() => {
    if (user) {
      loadSavedProjects();
      // Initialize CSRF protection
      const token = initializeCSRFProtection();
      setCsrfToken(token);
    }
  }, [user]);

  // Auto-load or create assessment when taskId is provided
  useEffect(() => {
    if (taskId && !hasLoadedTask && !isLoading && savedProjects !== undefined) {
      if (savedProjects.length > 0) {
        // If there's an existing assessment for this task, load it
        const existingAssessment = savedProjects[0];
        loadProject(existingAssessment);
      } else if (savedProjects.length === 0) {
        // If no assessment exists, start a new one
        createNewProject();
      }
      setHasLoadedTask(true);
    }
  }, [taskId, savedProjects, isLoading, hasLoadedTask]);

  const loadSavedProjects = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('project_plans')
        .select('*')
        .eq('user_id', user.id);
      
      if (taskId) {
        query = query.eq('task_id', taskId);
      }
      
      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;

      const projects = (data || []).map(plan => ({
        ...plan,
        lineItems: (plan.line_items as any) || [],
        contingencyPercent: plan.contingency_percent,
        salesTaxPercent: Number(plan.sales_tax_percent)
      }));

      setSavedProjects(projects);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({ title: "Error", description: "Failed to load saved projects", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const saveProject = async () => {
    if (!user) return;

    // Validate form submission with CSRF and rate limiting
    const validation = validateFormSubmission(csrfToken, user.id);
    if (!validation.isValid) {
      console.error('Security validation failed:', validation.error);
      return;
    }

    // Sanitize all input data
    const sanitizedProject = enhancedSanitizeFormData({
      name: project.name,
      description: project.description,
      notes: project.notes,
      state: project.state
    });

    // Sanitize line items
    const sanitizedLineItems = project.lineItems.map(item => ({
      ...item,
      item: enhancedSanitizeFormData({ item: item.item }).item,
      lowCost: sanitizeNumericInput(item.lowCost, 0, 1000000),
      highCost: sanitizeNumericInput(item.highCost, 0, 1000000),
      units: sanitizeNumericInput(item.units, 0.1, 10000)
    }));

    // Basic validation
    if (!sanitizedProject.name.trim()) {
      console.error('Project name is required');
      return;
    }

    setIsLoading(true);
    try {
      const projectData = {
        user_id: user.id,
        task_id: taskId || null,
        name: sanitizedProject.name,
        description: sanitizedProject.description,
        notes: sanitizedProject.notes,
        state: sanitizedProject.state,
        line_items: sanitizedLineItems,
        contingency_percent: sanitizeNumericInput(project.contingencyPercent, 0, 100),
        sales_tax_percent: sanitizeNumericInput(project.salesTaxPercent, 0, 50)
      };

      let result;
      if (project.id) {
        // Update existing project
        result = await supabase
          .from('project_plans')
          .update(projectData)
          .eq('id', project.id)
          .select()
          .single();
      } else {
        // Create new project
        result = await supabase
          .from('project_plans')
          .insert(projectData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Log admin action if user has admin privileges
      if (user) {
        await logAdminAction(user.id, project.id ? 'update_project' : 'create_project', sanitizedProject.name);
      }
      
      // Update project with returned ID
      setProject(prev => ({ ...prev, id: result.data.id }));
      
      // Reload saved projects list
      await loadSavedProjects();
      
      // Generate new CSRF token for next operation
      const newToken = initializeCSRFProtection();
      setCsrfToken(newToken);
      
      // If this is a task-based assessment, close only this dialog
      if (taskId && onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving project:', error);
      
      // Log input validation failure if it's a validation error
      if (user && error instanceof Error && (error.message.includes('validation') || error.message.includes('constraint'))) {
        await logInputValidationFailure('project_form', error.message, user.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadProject = (savedProject: SavedProjectPlan) => {
    setProject({
      id: savedProject.id,
      name: savedProject.name,
      description: savedProject.description || '',
      notes: savedProject.notes || '',
      lineItems: savedProject.lineItems,
      contingencyPercent: savedProject.contingencyPercent,
      salesTaxPercent: savedProject.salesTaxPercent,
      state: savedProject.state || ''
    });
    setCurrentView('edit');
  };

  const createNewProject = () => {
    setProject({
      name: taskTitle || '',
      description: taskNotes || '',
      notes: '',
      lineItems: [],
      contingencyPercent: 10,
      salesTaxPercent: 0,
      state: ''
    });
    setCurrentView('edit');
  };

  const deleteProject = async (projectId: string) => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this project?')) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('project_plans')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: "Success", description: "Project deleted successfully" });
      await loadSavedProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({ title: "Error", description: "Failed to delete project", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const addLineItem = (type: 'material' | 'labor') => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      item: '',
      lowCost: 0,
      highCost: 0,
      units: 1,
      type
    };
    setProject(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem]
    }));
  };

  const removeLineItem = (id: string) => {
    setProject(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== id)
    }));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    let sanitizedValue = value;
    
    // Only sanitize numeric inputs in real-time to prevent invalid values
    // Text inputs will be sanitized when saving to avoid interfering with typing
    if ((field === 'lowCost' || field === 'highCost') && typeof value === 'number') {
      sanitizedValue = sanitizeNumericInput(value, 0, 1000000);
    } else if (field === 'units' && typeof value === 'number') {
      sanitizedValue = sanitizeNumericInput(value, 0.1, 10000);
    }
    
    setProject(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item =>
        item.id === id ? { ...item, [field]: sanitizedValue } : item
      )
    }));
  };

  const updateProject = (field: keyof ProjectPlan, value: string | number) => {
    let sanitizedValue = value;
    
    // Sanitize based on field type
    if (typeof value === 'string') {
      sanitizedValue = enhancedSanitizeFormData({ [field]: value })[field];
    } else if (typeof value === 'number') {
      if (field === 'contingencyPercent') {
        sanitizedValue = sanitizeNumericInput(value, 0, 100);
      } else if (field === 'salesTaxPercent') {
        sanitizedValue = sanitizeNumericInput(value, 0, 50);
      }
    }
    
    if (field === 'state' && typeof sanitizedValue === 'string') {
      const taxRate = US_STATES_TAX_RATES[sanitizedValue as keyof typeof US_STATES_TAX_RATES] || 0;
      setProject(prev => ({
        ...prev,
        [field]: sanitizedValue,
        salesTaxPercent: taxRate
      }));
    } else {
      setProject(prev => ({ ...prev, [field]: sanitizedValue }));
    }
  };

  const calculateSubtotal = () => {
    return project.lineItems.reduce((acc, item) => {
      const lowTotal = item.lowCost * item.units;
      const highTotal = item.highCost * item.units;
      return {
        low: acc.low + lowTotal,
        high: acc.high + highTotal
      };
    }, { low: 0, high: 0 });
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const contingencyMultiplier = 1 + (project.contingencyPercent / 100);
    const taxMultiplier = 1 + (project.salesTaxPercent / 100);
    
    const lowWithContingency = subtotal.low * contingencyMultiplier;
    const highWithContingency = subtotal.high * contingencyMultiplier;
    
    const finalLow = lowWithContingency * taxMultiplier;
    const finalHigh = highWithContingency * taxMultiplier;
    const expected = (finalLow + finalHigh) / 2;
    
    return { low: finalLow, high: finalHigh, expected };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Render project list view (only for non-task assessments)
  if (shouldShowListView) {
    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Rapid Costing
            </CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-muted-foreground text-sm">
                  {taskId ? 'Cost assessments for this task' : 'Manage your project cost assessments'}
                </p>
              </div>
              <Button onClick={createNewProject} size="sm" className="flex items-center gap-2 self-start sm:self-auto">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Assessment</span>
                <span className="sr-only sm:hidden">Create New Assessment</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading projects...</div>
            ) : savedProjects.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">
                  {taskId ? 'No assessment for this task' : 'No assessments yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {taskId 
                    ? 'Create a cost assessment to track materials and labor for this task.' 
                    : 'Create your first project cost assessment to get started.'}
                </p>
                <Button onClick={createNewProject}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create {taskId ? '' : 'First '}Assessment
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {savedProjects.map((savedProject) => {
                  const subtotal = savedProject.lineItems.reduce((acc, item) => {
                    return acc + (item.lowCost + item.highCost) / 2 * item.units;
                  }, 0);
                  
                  return (
                    <Card key={savedProject.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1" onClick={() => loadProject(savedProject)}>
                            <h3 className="font-semibold text-lg">{savedProject.name}</h3>
                            {savedProject.description && (
                              <p className="text-muted-foreground text-sm mb-2">{savedProject.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{savedProject.lineItems.length} items</span>
                              <span>Est. {formatCurrency(subtotal)}</span>
                              <span>Updated {formatDate(savedProject.updated_at)}</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteProject(savedProject.id);
                            }}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render project edit view
  const subtotal = calculateSubtotal();
  const total = calculateTotal();
  const materialItems = project.lineItems.filter(item => item.type === 'material');
  const laborItems = project.lineItems.filter(item => item.type === 'labor');

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Rapid Costing
              </CardTitle>
              <div className="flex gap-2">
                {!taskId && (
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentView('list')} 
                    size="sm"
                    className="p-1 h-8 w-8"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    saveProject();
                  }}
                  disabled={isLoading} 
                  size="sm"
                  className="p-1 h-8 w-8"
                  type="button"
                  title="Save Assessment"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Details */}
          <div className="space-y-4">
            {taskId ? (
              // Read-only name for task-based assessments
              <div>
                <Label className="text-sm font-medium">Task</Label>
                <div className="text-sm font-semibold p-2 bg-muted rounded-md">{project.name}</div>
              </div>
            ) : (
              // Editable name for standalone assessments
              <div>
                <Label htmlFor="project-name" className="text-sm font-medium">Assessment Name *</Label>
                <Input
                  id="project-name"
                  value={project.name}
                  onChange={(e) => updateProject('name', e.target.value)}
                  placeholder="Enter assessment name"
                  className="text-sm"
                />
              </div>
            )}

            <div>
              <Label htmlFor="project-notes" className="text-sm font-medium">Cost Notes</Label>
              <Textarea
                id="project-notes"
                value={project.notes}
                onChange={(e) => updateProject('notes', e.target.value)}
                placeholder="Add notes specific to this cost assessment..."
                rows={3}
                className="text-sm"
              />
            </div>
          </div>

          {/* Materials Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Materials
                <Badge variant="secondary" className="text-xs">{materialItems.length}</Badge>
              </h3>
              <Button
                size="sm"
                onClick={() => addLineItem('material')}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Material
              </Button>
            </div>

            {materialItems.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-medium">Item</TableHead>
                      <TableHead className="text-xs font-medium w-24">Low Cost</TableHead>
                      <TableHead className="text-xs font-medium w-24">High Cost</TableHead>
                      <TableHead className="text-xs font-medium w-16">Units</TableHead>
                      <TableHead className="text-xs font-medium w-24">Low Total</TableHead>
                      <TableHead className="text-xs font-medium w-24">High Total</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.item}
                            onChange={(e) => updateLineItem(item.id, 'item', e.target.value)}
                            placeholder="Material name"
                            className="text-xs border-0 p-1 h-7"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.lowCost}
                            onChange={(e) => updateLineItem(item.id, 'lowCost', parseFloat(e.target.value) || 0)}
                            className="text-xs border-0 p-1 h-7"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.highCost}
                            onChange={(e) => updateLineItem(item.id, 'highCost', parseFloat(e.target.value) || 0)}
                            className="text-xs border-0 p-1 h-7"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.units}
                            onChange={(e) => updateLineItem(item.id, 'units', parseFloat(e.target.value) || 1)}
                            className="text-xs border-0 p-1 h-7"
                            min="0.1"
                            step="0.1"
                          />
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {formatCurrency(item.lowCost * item.units)}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {formatCurrency(item.highCost * item.units)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeLineItem(item.id)}
                            className="w-6 h-6 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Labor Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Labor
                <Badge variant="secondary" className="text-xs">{laborItems.length}</Badge>
              </h3>
              <Button
                size="sm"
                onClick={() => addLineItem('labor')}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Labor
              </Button>
            </div>

            {laborItems.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-medium">Description</TableHead>
                      <TableHead className="text-xs font-medium w-24">Low Rate</TableHead>
                      <TableHead className="text-xs font-medium w-24">High Rate</TableHead>
                      <TableHead className="text-xs font-medium w-16">Hours</TableHead>
                      <TableHead className="text-xs font-medium w-24">Low Total</TableHead>
                      <TableHead className="text-xs font-medium w-24">High Total</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {laborItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.item}
                            onChange={(e) => updateLineItem(item.id, 'item', e.target.value)}
                            placeholder="Labor description"
                            className="text-xs border-0 p-1 h-7"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.lowCost}
                            onChange={(e) => updateLineItem(item.id, 'lowCost', parseFloat(e.target.value) || 0)}
                            className="text-xs border-0 p-1 h-7"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.highCost}
                            onChange={(e) => updateLineItem(item.id, 'highCost', parseFloat(e.target.value) || 0)}
                            className="text-xs border-0 p-1 h-7"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.units}
                            onChange={(e) => updateLineItem(item.id, 'units', parseFloat(e.target.value) || 1)}
                            className="text-xs border-0 p-1 h-7"
                            min="0.1"
                            step="0.1"
                          />
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {formatCurrency(item.lowCost * item.units)}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {formatCurrency(item.highCost * item.units)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeLineItem(item.id)}
                            className="w-6 h-6 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Calculations Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Contingency</Label>
                <Select 
                  value={project.contingencyPercent.toString()} 
                  onValueChange={(value) => updateProject('contingencyPercent', parseInt(value))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTINGENCY_OPTIONS.map(percent => (
                      <SelectItem key={percent} value={percent.toString()}>
                        {percent}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">State (for sales tax)</Label>
                <Select 
                  value={project.state} 
                  onValueChange={(value) => updateProject('state', value)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(US_STATES_TAX_RATES).map(([code, rate]) => (
                      <SelectItem key={code} value={code}>
                        {code} ({rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Sales Tax Rate</Label>
                <Input 
                  value={`${project.salesTaxPercent}%`}
                  readOnly
                  className="text-sm bg-muted"
                />
              </div>
            </div>

            {/* Cost Summary */}
            <Card className="bg-muted/20 border-primary/20">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Project Cost Summary
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">
                      {formatCurrency(subtotal.low)} - {formatCurrency(subtotal.high)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-muted-foreground">
                    <span>+ Contingency ({project.contingencyPercent}%):</span>
                    <span className="font-mono">
                      {formatCurrency(subtotal.low * (project.contingencyPercent / 100))} - {formatCurrency(subtotal.high * (project.contingencyPercent / 100))}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-muted-foreground">
                    <span>+ Sales Tax ({project.salesTaxPercent.toFixed(2)}%):</span>
                    <span className="font-mono">
                      {formatCurrency((subtotal.low * (1 + project.contingencyPercent / 100)) * (project.salesTaxPercent / 100))} - {formatCurrency((subtotal.high * (1 + project.contingencyPercent / 100)) * (project.salesTaxPercent / 100))}
                    </span>
                  </div>
                  
                  <hr className="my-2" />
                  
                  <div className="grid grid-cols-3 gap-4 text-lg font-semibold">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Low Estimate</div>
                      <div className="text-green-600">{formatCurrency(total.low)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Expected</div>
                      <div className="text-primary">{formatCurrency(total.expected)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">High Estimate</div>
                      <div className="text-orange-600">{formatCurrency(total.high)}</div>
                    </div>
                   </div>
                 </div>
               </CardContent>
             </Card>

             {/* Sensitivity Analysis */}
             {project.lineItems.length > 0 && (
               <Card className="bg-muted/10">
                 <CardContent className="p-4">
                   <h4 className="font-semibold mb-4 flex items-center gap-2">
                     <Calculator className="w-4 h-4" />
                     Sensitivity Analysis
                   </h4>
                   
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {/* Column 1: Uncertainty Analysis */}
                     <div className="space-y-3">
                       <div>
                         <h5 className="text-sm font-semibold mb-1">Cost Uncertainty</h5>
                         <p className="text-xs text-muted-foreground mb-3">
                           Items with largest range between low and high estimates. Get more info to firm up these numbers.
                         </p>
                       </div>
                       
                       <div className="space-y-2">
                         {[...project.lineItems]
                           .map(item => ({
                             ...item,
                             lowTotal: item.lowCost * item.units,
                             highTotal: item.highCost * item.units,
                             uncertainty: (item.highCost - item.lowCost) * item.units
                           }))
                           .sort((a, b) => b.uncertainty - a.uncertainty)
                           .map((item) => {
                             const maxUncertainty = Math.max(
                               ...project.lineItems.map(i => (i.highCost - i.lowCost) * i.units)
                             );
                             const barWidth = maxUncertainty > 0 ? (item.uncertainty / maxUncertainty) * 100 : 0;
                             
                             return (
                               <div key={item.id} className="space-y-1">
                                 <div className="flex justify-between items-center text-xs">
                                   <span className="font-medium truncate flex-1 mr-2">{item.item || 'Unnamed'}</span>
                                   <span className="font-mono text-muted-foreground whitespace-nowrap">
                                     ±{formatCurrency(item.uncertainty)}
                                   </span>
                                 </div>
                                 <div className="h-2 bg-muted rounded-full overflow-hidden">
                                   <div 
                                     className="h-full bg-orange-500/70 transition-all duration-300"
                                     style={{ width: `${barWidth}%` }}
                                   />
                                 </div>
                               </div>
                             );
                           })}
                       </div>
                     </div>

                     {/* Column 2: Total Cost Impact */}
                     <div className="space-y-3">
                       <div>
                         <h5 className="text-sm font-semibold mb-1">Cost Impact</h5>
                         <p className="text-xs text-muted-foreground mb-3">
                           Items with highest average cost. Seek lower cost options to reduce total project cost.
                         </p>
                       </div>
                       
                       <div className="space-y-2">
                         {[...project.lineItems]
                           .map(item => ({
                             ...item,
                             lowTotal: item.lowCost * item.units,
                             highTotal: item.highCost * item.units,
                             avgCost: ((item.lowCost + item.highCost) / 2) * item.units
                           }))
                           .sort((a, b) => b.avgCost - a.avgCost)
                           .map((item) => {
                             const maxAvgCost = Math.max(
                               ...project.lineItems.map(i => ((i.lowCost + i.highCost) / 2) * i.units)
                             );
                             const barWidth = maxAvgCost > 0 ? (item.avgCost / maxAvgCost) * 100 : 0;
                             
                             return (
                               <div key={item.id} className="space-y-1">
                                 <div className="flex justify-between items-center text-xs">
                                   <span className="font-medium truncate flex-1 mr-2">{item.item || 'Unnamed'}</span>
                                   <span className="font-mono text-muted-foreground whitespace-nowrap">
                                     {formatCurrency(item.avgCost)}
                                   </span>
                                 </div>
                                 <div className="h-2 bg-muted rounded-full overflow-hidden">
                                   <div 
                                     className="h-full bg-primary/70 transition-all duration-300"
                                     style={{ width: `${barWidth}%` }}
                                   />
                                 </div>
                               </div>
                             );
                           })}
                       </div>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             )}
           </div>
        </CardContent>
        </Card>
      </div>
    );
}