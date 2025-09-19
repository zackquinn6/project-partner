import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertTriangle, Star, Shield } from "lucide-react";
import { Operation, Output } from "@/interfaces/Project";

interface KeyCharacteristicsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operations: Operation[];
}

export function KeyCharacteristicsWindow({ open, onOpenChange, operations }: KeyCharacteristicsWindowProps) {
  const [selectedOperationIndex, setSelectedOperationIndex] = useState(0);

  const getCurrentOperation = () => operations[selectedOperationIndex];
  
  const getCriticalOutputs = (operation: Operation) => {
    const criticalOutputs: { step: string; outputs: Output[] }[] = [];
    
    operation.steps.forEach(step => {
      const critical = step.outputs.filter(output => output.type !== 'none');
      if (critical.length > 0) {
        criticalOutputs.push({ step: step.step, outputs: critical });
      }
    });
    
    return criticalOutputs;
  };

  const getOutputIcon = (type: Output['type']) => {
    switch (type) {
      case 'safety':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'performance-durability':
        return <Star className="w-4 h-4 text-blue-500" />;
      case 'major-aesthetics':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getOutputTypeLabel = (type: Output['type']) => {
    switch (type) {
      case 'safety':
        return 'Safety Critical';
      case 'performance-durability':
        return 'Performance';
      case 'major-aesthetics':
        return 'Aesthetics';
      default:
        return '';
    }
  };

  const goToPrevious = () => {
    setSelectedOperationIndex(prev => prev > 0 ? prev - 1 : operations.length - 1);
  };

  const goToNext = () => {
    setSelectedOperationIndex(prev => prev < operations.length - 1 ? prev + 1 : 0);
  };

  if (operations.length === 0) return null;

  const currentOperation = getCurrentOperation();
  const criticalOutputs = getCriticalOutputs(currentOperation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold">Key Characteristics (KC's)</DialogTitle>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ever skip the manual? That's why we created KC's—your quick guide to what really matters in each project. Think of them as the essentials: the key things you need to get right for success.
            <br /><br />
            Step‑by‑step instructions are still there if you want the full detail, but KC's cut through the noise. They highlight the must‑do's that make or break a step, so you can work smarter, not slower.
            <br /><br />
            Whether you're new to DIY or a seasoned builder, KC's save you time, reduce frustration, and keep your project on track—without forcing you to follow every line like a robot.
          </p>
        </DialogHeader>

        {/* Operation Navigation */}
        <div className="flex-shrink-0 space-y-4 border-b pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPrevious}
              className="px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex-1 min-w-[200px]">
              <Select 
                value={selectedOperationIndex.toString()} 
                onValueChange={(value) => setSelectedOperationIndex(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operations.map((operation, index) => (
                    <SelectItem key={operation.id} value={index.toString()}>
                      {operation.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNext}
              className="px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold text-lg">{currentOperation.name}</h3>
            <p className="text-sm text-muted-foreground">{currentOperation.description}</p>
          </div>
        </div>

        {/* Critical Outputs Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {criticalOutputs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No critical characteristics found for this operation.</p>
              <p className="text-sm mt-2">This operation may not have outputs marked as critical.</p>
            </div>
          ) : (
            criticalOutputs.map((stepOutput, stepIndex) => (
              <div key={stepIndex} className="space-y-3">
                <h4 className="font-medium text-base border-b pb-1">{stepOutput.step}</h4>
                
                <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-2">
                  {stepOutput.outputs.map((output, outputIndex) => (
                    <Card key={outputIndex} className="h-fit">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm font-semibold leading-tight">
                            {output.name}
                          </CardTitle>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {getOutputIcon(output.type)}
                            <Badge variant="secondary" className="text-xs px-2 py-0">
                              {getOutputTypeLabel(output.type)}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0 space-y-3 text-xs">
                        {output.description && (
                          <div>
                            <p className="font-medium text-xs mb-1 text-primary">Description:</p>
                            <p className="text-muted-foreground leading-relaxed">{output.description}</p>
                          </div>
                        )}
                        
                        {output.requirement && (
                          <div>
                            <p className="font-medium text-xs mb-1 text-primary">Requirement:</p>
                            <p className="text-muted-foreground leading-relaxed">{output.requirement}</p>
                          </div>
                        )}
                        
                        {output.potentialEffects && (
                          <div>
                            <p className="font-medium text-xs mb-1 text-orange-600">Potential Effects:</p>
                            <p className="text-muted-foreground leading-relaxed">{output.potentialEffects}</p>
                          </div>
                        )}
                        
                        {output.keyInputs && output.keyInputs.length > 0 && (
                          <div>
                            <p className="font-medium text-xs mb-1 text-blue-600">Key Inputs:</p>
                            <ul className="text-muted-foreground leading-relaxed space-y-1">
                              {output.keyInputs.map((input, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span className="text-blue-400 flex-shrink-0 mt-0.5">•</span>
                                  <span>{input}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {output.qualityChecks && (
                          <div>
                            <p className="font-medium text-xs mb-1 text-green-600">Quality Checks:</p>
                            <p className="text-muted-foreground leading-relaxed">{output.qualityChecks}</p>
                          </div>
                        )}
                        
                        {output.mustGetRight && (
                          <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-800">
                            <p className="font-medium text-xs mb-1 text-red-700 dark:text-red-400">Must Get Right:</p>
                            <p className="text-red-600 dark:text-red-300 leading-relaxed">{output.mustGetRight}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}