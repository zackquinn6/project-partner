import { useState } from "react";
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertTriangle, Star, Shield, HelpCircle, X } from "lucide-react";
import { Operation, Output } from "@/interfaces/Project";
import { KeyCharacteristicsExplainer } from "./KeyCharacteristicsExplainer";

interface KeyCharacteristicsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operations: Operation[];
  currentStepId?: string;
}

export function KeyCharacteristicsWindow({ open, onOpenChange, operations, currentStepId }: KeyCharacteristicsWindowProps) {
  const [selectedOperationIndex, setSelectedOperationIndex] = useState(0);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [showKCExplainer, setShowKCExplainer] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<Output | null>(null);

  // Effect to find and navigate to the operation containing the current step
  React.useEffect(() => {
    if (currentStepId && operations.length > 0) {
      console.log('🔍 KC Window: Looking for operation containing step:', currentStepId);
      
      const operationIndex = operations.findIndex(operation => 
        operation.steps.some(step => step.id === currentStepId)
      );
      
      console.log('🎯 KC Window: Found operation index:', operationIndex, 'for step:', currentStepId);
      
      if (operationIndex >= 0 && operationIndex !== selectedOperationIndex) {
        console.log('📍 KC Window: Switching to operation:', operations[operationIndex].name);
        setSelectedOperationIndex(operationIndex);
      }
    }
  }, [currentStepId, operations, open]);

  // Reset to first operation if no current step when window opens
  React.useEffect(() => {
    if (open && operations.length > 0 && !currentStepId) {
      console.log('🔄 KC Window: No current step, resetting to first operation');
      setSelectedOperationIndex(0);
    }
  }, [open, operations.length, currentStepId]);

  const getCurrentOperation = () => operations[selectedOperationIndex];
  
  const getCriticalOutputs = (operation: Operation) => {
    const criticalOutputs: { step: string; outputs: Output[] }[] = [];
    
    operation.steps.forEach(step => {
      // Handle case where outputs might be undefined or null
      if (step.outputs && Array.isArray(step.outputs)) {
        const critical = step.outputs.filter(output => output.type !== 'none');
        if (critical.length > 0) {
          criticalOutputs.push({ step: step.step, outputs: critical });
        }
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
        <DialogContent className="max-w-[90vw] lg:max-w-6xl h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-lg sm:text-xl font-bold">Key Characteristics (KC's)</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHelpPopup(true)}
                  className="flex items-center gap-1 text-xs sm:text-sm"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">What's a KC?</span>
                  <span className="sm:hidden">Help</span>
                </Button>
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          {/* Operation Navigation */}
          <div className="flex-shrink-0 space-y-3 sm:space-y-4 border-b pb-3 sm:pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToPrevious}
                className="px-2 sm:px-3"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex-1 min-w-[150px] sm:min-w-[200px]">
                <Select 
                  value={selectedOperationIndex.toString()} 
                  onValueChange={(value) => setSelectedOperationIndex(parseInt(value))}
                >
                  <SelectTrigger className="text-xs sm:text-sm">
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
                className="px-2 sm:px-3"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="text-center">
              <h3 className="font-semibold text-base sm:text-lg">{currentOperation.name}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{currentOperation.description}</p>
            </div>
          </div>

          {/* 2-Column Tabular View */}
          <div className="flex-1 min-h-0 overflow-y-auto pb-4">
            {criticalOutputs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No critical characteristics found for this operation.</p>
                <p className="text-sm mt-2">This operation may not have outputs marked as critical.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {criticalOutputs.map((stepOutput, stepIndex) => (
                  <div key={stepIndex} className="space-y-3 sm:space-y-4">
                    <h4 className="font-medium text-sm sm:text-base border-b pb-2 sticky top-0 bg-background z-10">
                      {stepOutput.step}
                    </h4>
                    
                    <div className="space-y-3">
                      {stepOutput.outputs.map((output, outputIndex) => (
                        <div key={outputIndex} className="grid grid-cols-1 lg:grid-cols-2 gap-4 border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                          {/* Left Column - Output Details */}
                          <div 
                            className="space-y-2 cursor-pointer"
                            onClick={() => setSelectedOutput(output)}
                          >
                            <div className="flex items-start gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-semibold text-sm leading-tight">
                                  {output.name}
                                </h5>
                                {output.type !== 'none' && (
                                  <div className="flex items-center gap-1">
                                    {getOutputIcon(output.type)}
                                    <Badge variant="secondary" className="text-xs px-2 py-0">
                                      {getOutputTypeLabel(output.type)}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {output.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {output.description}
                              </p>
                            )}
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
            <p className="text-primary font-medium">
              KCs are how we personalize our projects to each builder.
            </p>
            <p>
              We tailor detail to skill level: first‑timers get the full play‑by‑play, while seasoned DIYers aren't stuck reading what a miter saw looks like. 
              KCs deliver the right level of detail for successful project completion.
            </p>
            <div className="flex justify-center mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowHelpPopup(false);
                  setShowKCExplainer(true);
                }}
                className="text-primary border-primary hover:bg-primary/10"
              >
                Learn More About Key Characteristics
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Output Details Popup */}
      <Dialog open={!!selectedOutput} onOpenChange={() => setSelectedOutput(null)}>
        <DialogContent className="max-w-[90vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedOutput && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <DialogTitle className="text-lg font-bold leading-tight">
                    {selectedOutput.name}
                  </DialogTitle>
                  {selectedOutput.type !== 'none' && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {getOutputIcon(selectedOutput.type)}
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        {getOutputTypeLabel(selectedOutput.type)}
                      </Badge>
                    </div>
                  )}
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

      {/* Key Characteristics Detailed Explainer */}
      <KeyCharacteristicsExplainer 
        open={showKCExplainer} 
        onOpenChange={setShowKCExplainer} 
      />
    </>
  );
}