import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Edit, Trash2, Settings, GitBranch, Table as TableIcon } from 'lucide-react';
import { useDecisionTree } from '@/hooks/useDecisionTree';
import { DecisionTree, DecisionTreeOperation } from '@/interfaces/DecisionTree';
import { Project } from '@/interfaces/Project';
import { useToast } from '@/hooks/use-toast';

interface DecisionTreeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProject: Project;
}

export const DecisionTreeManager: React.FC<DecisionTreeManagerProps> = ({
  open,
  onOpenChange,
  currentProject
}) => {
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('operations');
  const [showCreateTree, setShowCreateTree] = useState(false);
  const [showCreateOperation, setShowCreateOperation] = useState(false);
  const [editingOperation, setEditingOperation] = useState<DecisionTreeOperation | null>(null);
  
  const { toast } = useToast();
  const {
    decisionTrees,
    operations,
    loading,
    fetchDecisionTrees,
    fetchOperations,
    createDecisionTree,
    createOperation,
    updateOperation,
    deleteOperation,
  } = useDecisionTree(currentProject.id);

  // Create default decision tree if none exists
  useEffect(() => {
    if (open && decisionTrees.length === 0 && !loading) {
      createDecisionTree({
        project_id: currentProject.id,
        name: `${currentProject.name} - Decision Tree`,
        description: 'Operation-level workflow configuration',
        version: 1,
        is_active: true,
      }).then((tree) => {
        if (tree) {
          setSelectedTreeId(tree.id);
        }
      });
    } else if (decisionTrees.length > 0 && !selectedTreeId) {
      const activeTree = decisionTrees.find(t => t.is_active) || decisionTrees[0];
      setSelectedTreeId(activeTree.id);
    }
  }, [open, decisionTrees, loading]);

  // Fetch operations when tree is selected
  useEffect(() => {
    if (selectedTreeId) {
      fetchOperations(selectedTreeId);
    }
  }, [selectedTreeId]);

  const getOperationTypeBadge = (type: string) => {
    const variants = {
      necessary: 'default',
      alternative: 'secondary',
      standard_flow: 'outline',
      if_necessary: 'destructive'
    } as const;
    
    return <Badge variant={variants[type as keyof typeof variants] || 'outline'}>{type}</Badge>;
  };

  const getPhaseOperations = () => {
    const phases = currentProject.phases || [];
    const phaseMap = new Map<string, DecisionTreeOperation[]>();
    
    // Group operations by phase
    operations.forEach(op => {
      if (!phaseMap.has(op.phase_name)) {
        phaseMap.set(op.phase_name, []);
      }
      phaseMap.get(op.phase_name)!.push(op);
    });
    
    // Ensure all project phases are represented
    phases.forEach(phase => {
      if (!phaseMap.has(phase.name)) {
        phaseMap.set(phase.name, []);
      }
    });
    
    return Array.from(phaseMap.entries()).sort(([a], [b]) => {
      const aIndex = phases.findIndex(p => p.name === a);
      const bIndex = phases.findIndex(p => p.name === b);
      return aIndex - bIndex;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Decision Tree Manager - {currentProject.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-fit">
              <TabsTrigger value="operations" className="flex items-center gap-2">
                <TableIcon className="w-4 h-4" />
                Operations Configuration
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Visual Map (Coming Soon)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="operations" className="flex-1 overflow-hidden">
              <div className="h-full flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Select value={selectedTreeId || ''} onValueChange={setSelectedTreeId}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select decision tree" />
                      </SelectTrigger>
                      <SelectContent>
                        {decisionTrees.map(tree => (
                          <SelectItem key={tree.id} value={tree.id}>
                            {tree.name} (v{tree.version})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={() => setShowCreateOperation(true)}
                    disabled={!selectedTreeId}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Operation
                  </Button>
                </div>

                <div className="flex-1 overflow-auto">
                  {getPhaseOperations().map(([phaseName, phaseOps]) => (
                    <Card key={phaseName} className="mb-4">
                      <CardHeader>
                        <CardTitle className="text-lg">{phaseName}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {phaseOps.length === 0 ? (
                          <p className="text-muted-foreground italic">No operations configured for this phase</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Operation</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Dependencies</TableHead>
                                <TableHead>Parallel Group</TableHead>
                                <TableHead>Optional</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {phaseOps.map(operation => (
                                <TableRow key={operation.id}>
                                  <TableCell className="font-medium">
                                    {operation.operation_name}
                                  </TableCell>
                                  <TableCell>
                                    {getOperationTypeBadge(operation.operation_type)}
                                  </TableCell>
                                  <TableCell>
                                    {operation.dependencies?.length ? (
                                      <Badge variant="outline">{operation.dependencies.length} deps</Badge>
                                    ) : (
                                      <span className="text-muted-foreground">None</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {operation.parallel_group || (
                                      <span className="text-muted-foreground">None</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={operation.is_optional ? 'secondary' : 'outline'}>
                                      {operation.is_optional ? 'Yes' : 'No'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingOperation(operation)}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => deleteOperation(operation.id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="map" className="flex-1">
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <GitBranch className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Visual Map View</h3>
                  <p className="text-muted-foreground">Coming soon - Visual workflow mapping interface</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Create/Edit Operation Dialog */}
        <OperationDialog
          open={showCreateOperation || !!editingOperation}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateOperation(false);
              setEditingOperation(null);
            }
          }}
          operation={editingOperation}
          decisionTreeId={selectedTreeId!}
          project={currentProject}
          onSave={async (operationData) => {
            if (editingOperation) {
              await updateOperation(editingOperation.id, operationData);
            } else {
              const fullOperationData = {
                ...operationData,
                decision_tree_id: selectedTreeId!,
                condition_rules: {},
                dependencies: [],
              };
              await createOperation(fullOperationData);
            }
            setShowCreateOperation(false);
            setEditingOperation(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

interface OperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation?: DecisionTreeOperation | null;
  decisionTreeId: string;
  project: Project;
  onSave: (operation: Required<Pick<DecisionTreeOperation, 'phase_name' | 'operation_name' | 'operation_type' | 'display_order' | 'is_optional'>> & Partial<DecisionTreeOperation>) => Promise<void>;
}

const OperationDialog: React.FC<OperationDialogProps> = ({
  open,
  onOpenChange,
  operation,
  project,
  onSave
}) => {
  const [formData, setFormData] = useState({
    phase_name: '',
    operation_name: '',
    operation_type: 'standard_flow',
    display_order: 0,
    is_optional: false,
    parallel_group: '',
    notes: '',
  });

  useEffect(() => {
    if (operation) {
      setFormData({
        phase_name: operation.phase_name,
        operation_name: operation.operation_name,
        operation_type: operation.operation_type,
        display_order: operation.display_order,
        is_optional: operation.is_optional,
        parallel_group: operation.parallel_group || '',
        notes: operation.notes || '',
      });
    } else {
      setFormData({
        phase_name: '',
        operation_name: '',
        operation_type: 'standard_flow',
        display_order: 0,
        is_optional: false,
        parallel_group: '',
        notes: '',
      });
    }
  }, [operation, open]);

  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phase_name || !formData.operation_name) {
      toast({
        title: "Error",
        description: "Phase and operation name are required",
        variant: "destructive",
      });
      return;
    }
    
    await onSave({
      phase_name: formData.phase_name,
      operation_name: formData.operation_name,
      operation_type: formData.operation_type,
      display_order: formData.display_order,
      is_optional: formData.is_optional,
      parallel_group: formData.parallel_group || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {operation ? 'Edit Operation' : 'Create Operation'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phase_name">Phase</Label>
              <Select value={formData.phase_name} onValueChange={(value) => setFormData(prev => ({ ...prev, phase_name: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  {project.phases?.map(phase => (
                    <SelectItem key={phase.id} value={phase.name}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="operation_type">Operation Type</Label>
              <Select value={formData.operation_type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, operation_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="necessary">Necessary</SelectItem>
                  <SelectItem value="alternative">Alternative</SelectItem>
                  <SelectItem value="standard_flow">Standard Flow</SelectItem>
                  <SelectItem value="if_necessary">If Necessary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="operation_name">Operation Name</Label>
            <Input
              id="operation_name"
              value={formData.operation_name}
              onChange={(e) => setFormData(prev => ({ ...prev, operation_name: e.target.value }))}
              placeholder="Enter operation name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div>
              <Label htmlFor="parallel_group">Parallel Group (optional)</Label>
              <Input
                id="parallel_group"
                value={formData.parallel_group}
                onChange={(e) => setFormData(prev => ({ ...prev, parallel_group: e.target.value }))}
                placeholder="e.g., group_a"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_optional"
              checked={formData.is_optional}
              onChange={(e) => setFormData(prev => ({ ...prev, is_optional: e.target.checked }))}
            />
            <Label htmlFor="is_optional">This operation is optional</Label>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or context for this operation"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {operation ? 'Update Operation' : 'Create Operation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};