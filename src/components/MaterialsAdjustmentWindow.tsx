import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Package, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { MaterialReference } from '@/interfaces/Project';
import { useProject } from '@/contexts/ProjectContext';

interface MaterialsAdjustmentWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

interface MaterialAdjustment {
  materialId: string;
  materialName: string;
  currentQuantity: number;
  newQuantity: number;
  reason?: string;
}

export const MaterialsAdjustmentWindow: React.FC<MaterialsAdjustmentWindowProps> = ({
  open,
  onOpenChange,
  onComplete
}) => {
  const { currentProjectRun } = useProject();
  const [adjustments, setAdjustments] = useState<MaterialAdjustment[]>([]);
  const [additionalMaterials, setAdditionalMaterials] = useState<string>('');
  const [generalReason, setGeneralReason] = useState<string>('');

  // Extract materials from current project run
  useEffect(() => {
    if (currentProjectRun && open) {
      const projectMaterials: MaterialAdjustment[] = [];
      
      // Collect all materials from all phases/operations/steps
      currentProjectRun.phases.forEach(phase => {
        phase.operations.forEach(operation => {
          operation.steps.forEach(step => {
            step.materials?.forEach(material => {
              const existingMaterial = projectMaterials.find(m => m.materialId === material.id);
              const materialQuantity = 1; // Default quantity since legacy materials don't have quantity
              
              if (existingMaterial) {
                existingMaterial.currentQuantity += materialQuantity;
              } else {
                projectMaterials.push({
                  materialId: material.id,
                  materialName: material.name || 'Unknown Material',
                  currentQuantity: materialQuantity,
                  newQuantity: materialQuantity,
                  reason: ''
                });
              }
            });
          });
        });
      });

      setAdjustments(projectMaterials);
    }
  }, [currentProjectRun, open]);

  const updateQuantity = (materialId: string, newQuantity: number) => {
    setAdjustments(prev => prev.map(adj => 
      adj.materialId === materialId 
        ? { ...adj, newQuantity: Math.max(0, newQuantity) }
        : adj
    ));
  };

  const updateReason = (materialId: string, reason: string) => {
    setAdjustments(prev => prev.map(adj => 
      adj.materialId === materialId 
        ? { ...adj, reason }
        : adj
    ));
  };

  const handleSave = () => {
    const changedMaterials = adjustments.filter(adj => adj.currentQuantity !== adj.newQuantity);
    
    // In a real implementation, this would update the project materials
    console.log('Material adjustments:', {
      adjustments: changedMaterials,
      additionalMaterials: additionalMaterials.trim(),
      generalReason: generalReason.trim()
    });

    onComplete?.();
    onOpenChange(false);
  };

  const getTotalChanges = () => {
    return adjustments.filter(adj => adj.currentQuantity !== adj.newQuantity).length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Adjust Project Materials
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Update material quantities based on what you've discovered during the project
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Materials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Project Materials</CardTitle>
              <p className="text-sm text-muted-foreground">
                Adjust quantities as needed. Changes will update your shopping list.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {adjustments.length > 0 ? (
                adjustments.map(material => (
                  <div key={material.materialId} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{material.materialName}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Current: {material.currentQuantity}</span>
                          {material.currentQuantity !== material.newQuantity && (
                            <Badge variant="secondary">
                              → {material.newQuantity} 
                              ({material.newQuantity > material.currentQuantity ? '+' : ''}
                              {material.newQuantity - material.currentQuantity})
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(material.materialId, material.newQuantity - 1)}
                          disabled={material.newQuantity <= 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Input
                          type="number"
                          value={material.newQuantity}
                          onChange={(e) => updateQuantity(material.materialId, parseInt(e.target.value) || 0)}
                          className="w-20 text-center"
                          min="0"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(material.materialId, material.newQuantity + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {material.currentQuantity !== material.newQuantity && (
                      <div className="space-y-1">
                        <Label htmlFor={`reason-${material.materialId}`} className="text-xs">
                          Why is this adjustment needed? (optional)
                        </Label>
                        <Input
                          id={`reason-${material.materialId}`}
                          placeholder="e.g., Found damage, need extra for waste, measurement error..."
                          value={material.reason || ''}
                          onChange={(e) => updateReason(material.materialId, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No materials found in current project
                </p>
              )}
            </CardContent>
          </Card>

          {/* Additional Materials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Materials Needed</CardTitle>
              <p className="text-sm text-muted-foreground">
                List any new materials you discovered you need
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="List additional materials needed (one per line)..."
                value={additionalMaterials}
                onChange={(e) => setAdditionalMaterials(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* General Reason */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">General Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any additional context about why these material changes were needed..."
                value={generalReason}
                onChange={(e) => setGeneralReason(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          <Separator />

          {/* Summary and Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {getTotalChanges() > 0 && (
                <span>{getTotalChanges()} material quantities will be updated</span>
              )}
              {additionalMaterials.trim() && (
                <span className="ml-4">Additional materials will be added</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} size="icon">
                <X className="w-4 h-4" />
              </Button>
              <Button onClick={handleSave} size="icon" variant="outline">
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};