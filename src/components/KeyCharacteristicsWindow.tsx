import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertTriangle, Star, Shield, HelpCircle, X } from "lucide-react";
import { Operation, Output } from "@/interfaces/Project";

interface KeyCharacteristicsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operations: Operation[];
}

export function KeyCharacteristicsWindow({ open, onOpenChange, operations }: KeyCharacteristicsWindowProps) {
  const [selectedOperationIndex, setSelectedOperationIndex] = useState(0);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<Output | null>(null);

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
    <>
      {/* Main KC Window */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">Key Characteristics (KC's)</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelpPopup(true)}
                className="flex items-center gap-1"
              >
                <HelpCircle className="w-4 h-4" />
                What's a KC?
              </Button>
            </div>
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

          {/* 2-Column Tabular View */}
          <div className="flex-1 overflow-y-auto">
            {criticalOutputs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No critical characteristics found for this operation.</p>
                <p className="text-sm mt-2">This operation may not have outputs marked as critical.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {criticalOutputs.map((stepOutput, stepIndex) => (
                  <div key={stepIndex} className="space-y-4">
                    <h4 className="font-medium text-base border-b pb-2 sticky top-0 bg-background z-10">
                      {stepOutput.step}
                    </h4>
                    
                    <div className="space-y-3">
                      {stepOutput.outputs.map((output, outputIndex) => (
                        <div key={outputIndex} className="grid md:grid-cols-2 gap-4 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          {/* Left Column - Output Details */}
                          <div 
                            className="space-y-2 cursor-pointer"
                            onClick={() => setSelectedOutput(output)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-semibold text-sm leading-tight">
                                {output.name}
                              </h5>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {getOutputIcon(output.type)}
                                <Badge variant="secondary" className="text-xs px-2 py-0">
                                  {getOutputTypeLabel(output.type)}
                                </Badge>
                              </div>
                            </div>
                            
                            {output.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {output.description}
                              </p>
                            )}
                            
                            <div className="text-xs text-primary underline">
                              Click for more details →
                            </div>
                          </div>
                          
                          {/* Right Column - Key Inputs */}
                          <div className="space-y-2">
                            <h6 className="font-medium text-xs text-blue-600">Key Inputs:</h6>
                            {output.keyInputs && output.keyInputs.length > 0 ? (
                              <ul className="text-xs text-muted-foreground leading-relaxed space-y-1">
                                {output.keyInputs.map((input, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span className="text-blue-400 flex-shrink-0 mt-0.5">•</span>
                                    <span>{input}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">No key inputs specified</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Popup */}
      <Dialog open={showHelpPopup} onOpenChange={setShowHelpPopup}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">What are Key Characteristics (KC's)?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              Ever skip the manual? That's why we created KC's—your quick guide to what really matters in each project. 
              Think of them as the essentials: the key things you need to get right for success.
            </p>
            <p>
              Step‑by‑step instructions are still there if you want the full detail, but KC's cut through the noise. 
              They highlight the must‑do's that make or break a step, so you can work smarter, not slower.
            </p>
            <p>
              Whether you're new to DIY or a seasoned builder, KC's save you time, reduce frustration, and keep your 
              project on track—without forcing you to follow every line like a robot.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Output Details Popup */}
      <Dialog open={!!selectedOutput} onOpenChange={() => setSelectedOutput(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedOutput && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <DialogTitle className="text-lg font-bold leading-tight">
                    {selectedOutput.name}
                  </DialogTitle>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {getOutputIcon(selectedOutput.type)}
                    <Badge variant="secondary" className="text-xs px-2 py-0">
                      {getOutputTypeLabel(selectedOutput.type)}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4 text-sm">
                {selectedOutput.description && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-primary">Description:</h4>
                    <p className="text-muted-foreground leading-relaxed">{selectedOutput.description}</p>
                  </div>
                )}
                
                {selectedOutput.requirement && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-primary">Requirement:</h4>
                    <p className="text-muted-foreground leading-relaxed">{selectedOutput.requirement}</p>
                  </div>
                )}
                
                {selectedOutput.potentialEffects && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-orange-600">Potential Effects:</h4>
                    <p className="text-muted-foreground leading-relaxed">{selectedOutput.potentialEffects}</p>
                  </div>
                )}
                
                {selectedOutput.qualityChecks && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-green-600">Quality Checks:</h4>
                    <p className="text-muted-foreground leading-relaxed">{selectedOutput.qualityChecks}</p>
                  </div>
                )}
                
                {selectedOutput.mustGetRight && (
                  <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200 dark:border-red-800">
                    <h4 className="font-medium text-sm mb-2 text-red-700 dark:text-red-400">Must Get Right:</h4>
                    <p className="text-red-600 dark:text-red-300 leading-relaxed">{selectedOutput.mustGetRight}</p>
                  </div>
                )}
                
                {selectedOutput.keyInputs && selectedOutput.keyInputs.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-blue-600">Key Inputs:</h4>
                    <ul className="text-muted-foreground leading-relaxed space-y-1">
                      {selectedOutput.keyInputs.map((input, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-400 flex-shrink-0 mt-0.5">•</span>
                          <span>{input}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}