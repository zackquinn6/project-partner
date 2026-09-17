import { useState } from "react";
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { Operation } from "@/interfaces/Project";
import { KeyCharacteristicsExplainer } from "./KeyCharacteristicsExplainer";
import type { StepRiskSummary } from "@/hooks/useRunStepRisk";
import { RISK_COMPONENT_CONSUMER_LABELS } from "@/utils/riskProfileRollup";
import {
  RISK_ITEM_KIND_LABELS,
  type KeyCharacteristicRow,
  type RiskItemKind,
} from "@/utils/keyCharacteristics";

interface KeyCharacteristicsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operations: Operation[];
  currentStepId?: string;
  /**
   * Applied risk per step for this run, carrying the run's Key Characteristic register. What is
   * listed here is what the analysis says this user's attention decides, not every output that
   * happens to carry a type.
   */
  stepRiskByStepId?: Map<string, StepRiskSummary>;
}

export function KeyCharacteristicsWindow({
  open,
  onOpenChange,
  operations,
  currentStepId,
  stepRiskByStepId,
}: KeyCharacteristicsWindowProps) {
  const [selectedOperationIndex, setSelectedOperationIndex] = useState(0);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [showKCExplainer, setShowKCExplainer] = useState(false);

  // Effect to find and navigate to the operation containing the current step
  React.useEffect(() => {
    if (currentStepId && operations.length > 0) {
      
      const operationIndex = operations.findIndex(operation => 
        operation.steps.some(step => step.id === currentStepId)
      );
      
      if (operationIndex >= 0 && operationIndex !== selectedOperationIndex) {
        setSelectedOperationIndex(operationIndex);
      }
    }
  }, [currentStepId, operations, open]);

  // Reset to first operation if no current step when window opens
  React.useEffect(() => {
    if (open && operations.length > 0 && !currentStepId) {
      setSelectedOperationIndex(0);
    }
  }, [open, operations.length, currentStepId]);

  const getCurrentOperation = () => operations[selectedOperationIndex];

  /**
   * The operation's Key Characteristics, grouped by the item they are about.
   *
   * Grouping by item rather than by step is the point of this list: it reads as the handful of
   * things where the user's attention is the variable, not as a tour of the risky steps. A
   * severe risk that a jig already makes impossible does not appear, because there is nothing
   * for the user to do about it.
   */
  const getKeyCharacteristicGroups = (operation: Operation) => {
    const groups: {
      key: string;
      itemLabel: string;
      itemKind: RiskItemKind;
      stepTitle: string;
      rows: KeyCharacteristicRow[];
      worstRank: number;
    }[] = [];

    for (const step of operation.steps) {
      const summary = stepRiskByStepId?.get(step.id);
      if (!summary || summary.keyCharacteristics.length === 0) continue;

      const byItem = new Map<string, KeyCharacteristicRow[]>();
      for (const row of summary.keyCharacteristics) {
        const key = `${row.itemKind}:${row.itemId ?? step.id}`;
        const existing = byItem.get(key);
        if (existing) existing.push(row);
        else byItem.set(key, [row]);
      }

      for (const [key, rows] of byItem) {
        groups.push({
          key: `${step.id}:${key}`,
          itemLabel: rows[0].itemLabel,
          itemKind: rows[0].itemKind,
          stepTitle: step.step,
          rows,
          worstRank: Math.max(
            ...rows.map((row) => (row.actionPriority === 'H' ? 3 : row.actionPriority === 'M' ? 2 : 1))
          ),
        });
      }
    }

    return groups.sort((a, b) => b.worstRank - a.worstRank || a.stepTitle.localeCompare(b.stepTitle));
  };

  const goToPrevious = () => {
    setSelectedOperationIndex(prev => prev > 0 ? prev - 1 : operations.length - 1);
  };

  const goToNext = () => {
    setSelectedOperationIndex(prev => prev < operations.length - 1 ? prev + 1 : 0);
  };

  if (operations.length === 0) return null;

  const currentOperation = getCurrentOperation();
  const keyCharacteristicGroups = getKeyCharacteristicGroups(currentOperation);

  return (
    <>
      {/* Main Priorities window */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90vw] lg:max-w-6xl h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-lg sm:text-xl font-bold">Priorities</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHelpPopup(true)}
                  className="flex items-center gap-1 text-xs sm:text-sm"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">What are Priorities?</span>
                  <span className="sm:hidden">Help</span>
                </Button>
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

          <div className="flex-1 min-h-0 overflow-y-auto pb-4">
            {keyCharacteristicGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nothing in this operation depends on how carefully you work it.</p>
                <p className="text-sm mt-2">The normal instructions cover it.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {keyCharacteristicGroups.map((group) => (
                  <div key={group.key} className="rounded-lg border p-3 sm:p-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h4 className="text-sm font-semibold sm:text-base">{group.itemLabel}</h4>
                      <span className="text-xs text-muted-foreground">
                        {RISK_ITEM_KIND_LABELS[group.itemKind]} on {group.stepTitle}
                      </span>
                      {group.worstRank === 3 ? (
                        <Badge variant="destructive" className="text-xs">
                          Get this right first
                        </Badge>
                      ) : null}
                    </div>

                    <ul className="mt-2 space-y-2">
                      {group.rows.map((row) => (
                        <li key={row.id} className="text-xs leading-relaxed">
                          <span className="font-medium text-foreground">
                            {RISK_COMPONENT_CONSUMER_LABELS[row.dimension]}:
                          </span>{' '}
                          <span className="text-muted-foreground">{row.attentionReason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2 sm:mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Popup */}
      <Dialog open={showHelpPopup} onOpenChange={setShowHelpPopup}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">What are Priorities?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p className="text-primary font-medium">
              These are the items where how carefully you work decides the outcome.
            </p>
            <p>
              A risk lands here only when three things are true: it matters enough to act on, how
              often it goes wrong depends on the person rather than on the process or the
              material, and nothing in the setup already makes the mistake impossible.
            </p>
            <p>
              That last test is why this list is short. Something severe that a jig or a fixture
              already prevents is not here, because there is nothing left for you to watch. The
              list also changes with your profile: an item can need attention from a first-timer
              and not from someone who has done it many times.
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
                Learn More About Priorities
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Priorities detailed explainer */}
      <KeyCharacteristicsExplainer 
        open={showKCExplainer} 
        onOpenChange={setShowKCExplainer} 
      />
    </>
  );
}