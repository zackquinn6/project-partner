import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, ShoppingCart } from "lucide-react";
import { WorkflowStep, Output } from '@/interfaces/Project';

interface PhaseCompletionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: any;
  checkedOutputs: Record<string, Set<string>>;
  onOutputToggle: (stepId: string, outputId: string) => void;
  onPhaseComplete: () => void;
  orderedTools?: Set<string>;
  orderedMaterials?: Set<string>;
}

export function PhaseCompletionPopup({ 
  open, 
  onOpenChange, 
  phase, 
  checkedOutputs, 
  onOutputToggle, 
  onPhaseComplete,
  orderedTools = new Set(),
  orderedMaterials = new Set()
}: PhaseCompletionPopupProps) {
  if (!phase) return null;

  // Get all steps in the phase
  const allSteps = phase.operations.flatMap((operation: any) => operation.steps);
  
  // Auto-complete shopping cart outputs if all items are ordered
  useEffect(() => {
    if (!open) return;
    
    allSteps.forEach((step: WorkflowStep) => {
      if (step.outputs) {
        step.outputs.forEach(output => {
          // Check if this is a shopping-related output by name or description
          const isShoppingOutput = output.name.toLowerCase().includes('shopping') || 
                                 output.name.toLowerCase().includes('order') ||
                                 output.description?.toLowerCase().includes('shopping') ||
                                 output.description?.toLowerCase().includes('order');
          
          if (isShoppingOutput) {
            // Get all tools and materials for this step
            const stepTools = step.tools || [];
            const stepMaterials = step.materials || [];
            
            // Check if all tools and materials are ordered
            const allToolsOrdered = stepTools.length === 0 || stepTools.every(tool => 
              orderedTools.has(tool.id || tool.name)
            );
            const allMaterialsOrdered = stepMaterials.length === 0 || stepMaterials.every(material => 
              orderedMaterials.has(material.id || material.name)
            );
            
            // Auto-complete shopping cart if all items are ordered
            if (allToolsOrdered && allMaterialsOrdered) {
              const stepOutputs = checkedOutputs[step.id] || new Set();
              if (!stepOutputs.has(output.id)) {
                onOutputToggle(step.id, output.id);
              }
            }
          }
        });
      }
    });
  }, [open, allSteps, orderedTools, orderedMaterials, checkedOutputs, onOutputToggle]);
  
  // Get all incomplete outputs across all steps
  const incompleteOutputs = allSteps.reduce((acc: Array<{step: WorkflowStep, output: Output}>, step: WorkflowStep) => {
    if (step.outputs) {
      const stepOutputs = checkedOutputs[step.id] || new Set();
      step.outputs.forEach(output => {
        if (!stepOutputs.has(output.id)) {
          acc.push({ step, output });
        }
      });
    }
    return acc;
  }, []);

  const allOutputsComplete = incompleteOutputs.length === 0;

  const handleCompletePhase = () => {
    if (allOutputsComplete) {
      onPhaseComplete();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Complete Phase: {phase.name}
          </DialogTitle>
          <DialogDescription>
            Please complete all remaining outputs from this phase before marking it as complete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {incompleteOutputs.length === 0 ? (
            <Card className="border-success/40 bg-success/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">All outputs completed!</span>
                </div>
                <p className="text-sm text-success mt-1">
                  You can now mark this phase as complete.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-warning-soft/40 bg-warning-soft/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-warning-soft mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">
                    {incompleteOutputs.length} output{incompleteOutputs.length !== 1 ? 's' : ''} remaining
                  </span>
                </div>
                <p className="text-sm text-warning-soft">
                  Complete all outputs below to finish this phase.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Group incomplete outputs by step */}
          {incompleteOutputs.length > 0 && (
            <div className="space-y-4">
              {allSteps.map((step: WorkflowStep) => {
                const stepIncompleteOutputs = incompleteOutputs.filter(item => item.step.id === step.id);
                if (stepIncompleteOutputs.length === 0) return null;

                return (
                  <Card key={step.id} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{step.step}</CardTitle>
                      <CardDescription>{step.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {stepIncompleteOutputs.map(({ output }) => (
                          <div key={output.id} className="flex items-start gap-3 p-3 rounded-lg border">
                            <Checkbox
                              checked={checkedOutputs[step.id]?.has(output.id) || false}
                              onCheckedChange={() => onOutputToggle(step.id, output.id)}
                              className="mt-1"
                            />
                             <div className="flex-1 space-y-2">
                               <div className="flex items-center gap-2">
                                 <span className="font-medium">{output.name}</span>
                                 {output.type !== 'none' && (
                                   <Badge variant="outline" className="text-xs">
                                     {output.type}
                                   </Badge>
                                 )}
                                 {(output.name.toLowerCase().includes('shopping') || 
                                   output.name.toLowerCase().includes('order') ||
                                   output.description?.toLowerCase().includes('shopping') ||
                                   output.description?.toLowerCase().includes('order')) && (
                                   <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                     <ShoppingCart className="w-3 h-3" />
                                     Auto-complete when ordered
                                   </Badge>
                                 )}
                               </div>
                               {output.description && (
                                 <p className="text-sm text-muted-foreground">
                                   {output.description}
                                 </p>
                               )}
                               {(output.name.toLowerCase().includes('shopping') || 
                                 output.name.toLowerCase().includes('order') ||
                                 output.description?.toLowerCase().includes('shopping') ||
                                 output.description?.toLowerCase().includes('order')) && (
                                 <p className="text-xs text-info">
                                   This output will be automatically marked complete when you order all required tools and materials in the shopping window.
                                 </p>
                               )}
                             </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCompletePhase}
            disabled={!allOutputsComplete}
            className="bg-success hover:bg-success"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Phase
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}