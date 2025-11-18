import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Save, X, AlertTriangle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

interface Risk {
  id: string;
  risk: string;
  likelihood: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string | null;
  status?: 'open' | 'mitigated' | 'closed' | 'monitoring';
  is_template_risk?: boolean;
  template_risk_id?: string | null;
  display_order?: number;
}

interface RiskManagementWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string; // Template project ID (for admin editing)
  projectRunId?: string; // Project run ID (for user viewing/editing)
  mode?: 'template' | 'run'; // 'template' for admin editing templates, 'run' for user editing runs
}

export function RiskManagementWindow({
  open,
  onOpenChange,
  projectId,
  projectRunId,
  mode = 'run'
}: RiskManagementWindowProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    risk: '',
    likelihood: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    impact: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    mitigation: '',
    status: 'open' as 'open' | 'mitigated' | 'closed' | 'monitoring'
  });

  useEffect(() => {
    if (open) {
      fetchRisks();
    }
  }, [open, projectId, projectRunId, mode]);

  const fetchRisks = async () => {
    if (!open) return;
    
    setLoading(true);
    try {
      if (mode === 'template' && projectId) {
        // Fetch template-level risks
        const { data, error } = await supabase
          .from('project_risks')
          .select('*')
          .eq('project_id', projectId)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setRisks((data || []) as Risk[]);
      } else if (mode === 'run' && projectRunId) {
        // Fetch run-level risks (template risks + user-added risks)
        const { data, error } = await supabase
          .from('project_run_risks')
          .select('*')
          .eq('project_run_id', projectRunId)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setRisks((data || []) as Risk[]);
      }
    } catch (error) {
      console.error('Error fetching risks:', error);
      toast.error('Failed to load risks');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRisk = async () => {
    if (!formData.risk.trim()) {
      toast.error('Please enter a risk description');
      return;
    }

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    try {
      if (mode === 'template' && projectId) {
        // Save template risk
        if (editingRisk) {
          const { error } = await supabase
            .from('project_risks')
            .update({
              risk: formData.risk.trim(),
              likelihood: formData.likelihood,
              impact: formData.impact,
              mitigation: formData.mitigation.trim() || null
            })
            .eq('id', editingRisk.id);

          if (error) throw error;
          toast.success('Risk updated successfully');
        } else {
          const { data: existingRisks } = await supabase
            .from('project_risks')
            .select('display_order')
            .eq('project_id', projectId)
            .order('display_order', { ascending: false })
            .limit(1);

          const nextOrder = existingRisks && existingRisks.length > 0 
            ? (existingRisks[0].display_order || 0) + 1 
            : 0;

          const { error } = await supabase
            .from('project_risks')
            .insert({
              project_id: projectId,
              risk: formData.risk.trim(),
              likelihood: formData.likelihood,
              impact: formData.impact,
              mitigation: formData.mitigation.trim() || null,
              created_by: user.id,
              display_order: nextOrder
            });

          if (error) throw error;
          toast.success('Risk added successfully');
        }
      } else if (mode === 'run' && projectRunId) {
        // Save run risk
        if (editingRisk) {
          const { error } = await supabase
            .from('project_run_risks')
            .update({
              risk: formData.risk.trim(),
              likelihood: formData.likelihood,
              impact: formData.impact,
              mitigation: formData.mitigation.trim() || null,
              status: formData.status
            })
            .eq('id', editingRisk.id);

          if (error) throw error;
          toast.success('Risk updated successfully');
        } else {
          const { data: existingRisks } = await supabase
            .from('project_run_risks')
            .select('display_order')
            .eq('project_run_id', projectRunId)
            .order('display_order', { ascending: false })
            .limit(1);

          const nextOrder = existingRisks && existingRisks.length > 0 
            ? (existingRisks[0].display_order || 0) + 1 
            : 0;

          const { error } = await supabase
            .from('project_run_risks')
            .insert({
              project_run_id: projectRunId,
              risk: formData.risk.trim(),
              likelihood: formData.likelihood,
              impact: formData.impact,
              mitigation: formData.mitigation.trim() || null,
              status: formData.status,
              is_template_risk: false, // User-added risk
              created_by: user.id,
              display_order: nextOrder
            });

          if (error) throw error;
          toast.success('Risk added successfully');
        }
      }

      setShowAddForm(false);
      setEditingRisk(null);
      setFormData({
        risk: '',
        likelihood: 'medium',
        impact: 'medium',
        mitigation: '',
        status: 'open'
      });
      fetchRisks();
    } catch (error) {
      console.error('Error saving risk:', error);
      toast.error('Failed to save risk');
    }
  };

  const handleEditRisk = (risk: Risk) => {
    setEditingRisk(risk);
    setFormData({
      risk: risk.risk,
      likelihood: risk.likelihood,
      impact: risk.impact,
      mitigation: risk.mitigation || '',
      status: risk.status || 'open'
    });
    setShowAddForm(true);
  };

  const handleDeleteRisk = async (risk: Risk) => {
    if (!confirm('Are you sure you want to delete this risk?')) return;

    // Prevent deletion of template risks by users
    if (mode === 'run' && risk.is_template_risk) {
      toast.error('Template risks cannot be deleted. You can only change their status.');
      return;
    }

    try {
      if (mode === 'template' && projectId) {
        const { error } = await supabase
          .from('project_risks')
          .delete()
          .eq('id', risk.id);

        if (error) throw error;
        toast.success('Risk deleted successfully');
      } else if (mode === 'run' && projectRunId) {
        const { error } = await supabase
          .from('project_run_risks')
          .delete()
          .eq('id', risk.id);

        if (error) throw error;
        toast.success('Risk deleted successfully');
      }

      fetchRisks();
    } catch (error) {
      console.error('Error deleting risk:', error);
      toast.error('Failed to delete risk');
    }
  };

  const handleUpdateStatus = async (risk: Risk, newStatus: 'open' | 'mitigated' | 'closed' | 'monitoring') => {
    if (mode !== 'run' || !projectRunId) return;

    try {
      const { error } = await supabase
        .from('project_run_risks')
        .update({ status: newStatus })
        .eq('id', risk.id);

      if (error) throw error;
      toast.success('Risk status updated');
      fetchRisks();
    } catch (error) {
      console.error('Error updating risk status:', error);
      toast.error('Failed to update risk status');
    }
  };

  const getRiskLevelColor = (likelihood: string, impact: string) => {
    const levels = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    };
    const riskScore = Math.max(levels[likelihood as keyof typeof levels] || 1, levels[impact as keyof typeof levels] || 1);
    
    if (riskScore >= 4) return 'bg-red-100 text-red-800 border-red-300';
    if (riskScore >= 3) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (riskScore >= 2) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed': return 'bg-green-100 text-green-800';
      case 'mitigated': return 'bg-blue-100 text-blue-800';
      case 'monitoring': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Risk Management
            </DialogTitle>
            <div className="flex items-center gap-2">
              {(mode === 'template' || (mode === 'run' && projectRunId)) && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setEditingRisk(null);
                    setFormData({
                      risk: '',
                      likelihood: 'medium',
                      impact: 'medium',
                      mitigation: '',
                      status: 'open'
                    });
                    setShowAddForm(true);
                  }}
                  className="h-7 px-2 text-[9px] md:text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Risk
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onOpenChange(false)} 
                className="h-7 px-2 text-[9px] md:text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading risks...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {risks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No risks defined yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {mode === 'template' 
                      ? 'Add risks to this project template' 
                      : 'Add risks specific to this project'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Risk</TableHead>
                        <TableHead className="w-[100px]">Likelihood</TableHead>
                        <TableHead className="w-[100px]">Impact</TableHead>
                        <TableHead className="w-[200px]">Mitigation</TableHead>
                        {mode === 'run' && <TableHead className="w-[120px]">Status</TableHead>}
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {risks.map((risk) => (
                        <TableRow key={risk.id}>
                          <TableCell className="font-medium">
                            {risk.risk}
                            {risk.is_template_risk && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Template
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getRiskLevelColor(risk.likelihood, 'low')}>
                              {risk.likelihood}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRiskLevelColor('low', risk.impact)}>
                              {risk.impact}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {risk.mitigation || '-'}
                          </TableCell>
                          {mode === 'run' && (
                            <TableCell>
                              <Select
                                value={risk.status || 'open'}
                                onValueChange={(value) => handleUpdateStatus(risk, value as any)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="mitigated">Mitigated</SelectItem>
                                  <SelectItem value="monitoring">Monitoring</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRisk(risk)}
                                className="h-7 w-7 p-0"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              {!(mode === 'run' && risk.is_template_risk) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRisk(risk)}
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add/Edit Form Dialog */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRisk ? 'Edit Risk' : 'Add Risk'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="risk">Risk Description *</Label>
                <Textarea
                  id="risk"
                  value={formData.risk}
                  onChange={(e) => setFormData({ ...formData, risk: e.target.value })}
                  placeholder="Describe the risk..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="likelihood">Likelihood</Label>
                  <Select
                    value={formData.likelihood}
                    onValueChange={(value: any) => setFormData({ ...formData, likelihood: value })}
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

                <div>
                  <Label htmlFor="impact">Impact</Label>
                  <Select
                    value={formData.impact}
                    onValueChange={(value: any) => setFormData({ ...formData, impact: value })}
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

              <div>
                <Label htmlFor="mitigation">Mitigation Strategy</Label>
                <Textarea
                  id="mitigation"
                  value={formData.mitigation}
                  onChange={(e) => setFormData({ ...formData, mitigation: e.target.value })}
                  placeholder="Describe how to mitigate this risk..."
                  rows={3}
                />
              </div>

              {mode === 'run' && (
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="mitigated">Mitigated</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowAddForm(false);
                  setEditingRisk(null);
                  setFormData({
                    risk: '',
                    likelihood: 'medium',
                    impact: 'medium',
                    mitigation: '',
                    status: 'open'
                  });
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRisk}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingRisk ? 'Update' : 'Add'} Risk
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

