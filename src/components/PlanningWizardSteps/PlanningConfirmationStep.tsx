import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PLANNING_TOOLS } from '@/components/KickoffSteps/ProjectToolsStep';
import type { PlanningToolId } from '@/components/KickoffSteps/ProjectToolsStep';
import type { Phase } from '@/interfaces/Project';
import { parseCustomizationDecisions } from '@/utils/customizationDecisions';
import { format } from 'date-fns';

function phaseTitle(phases: Phase[], phaseId: string): string {
  const p = phases.find((ph) => ph.id === phaseId);
  return typeof p?.name === 'string' && p.name.trim() ? p.name.trim() : phaseId;
}

export interface PlanningConfirmationStepProps {
  selectedTools: PlanningToolId[];
  phases: Phase[];
  customizationDecisionsRaw: unknown;
  initialBudget?: string;
  initialTimeline?: string;
}

export function PlanningConfirmationStep({
  selectedTools,
  phases,
  customizationDecisionsRaw,
  initialBudget,
  initialTimeline,
}: PlanningConfirmationStepProps) {
  const decisions = useMemo(() => parseCustomizationDecisions(customizationDecisionsRaw), [customizationDecisionsRaw]);

  const standardDecisions =
    decisions.standardDecisions && typeof decisions.standardDecisions === 'object' && !Array.isArray(decisions.standardDecisions)
      ? (decisions.standardDecisions as Record<string, string[]>)
      : {};
  const ifNecessaryWork =
    decisions.ifNecessaryWork && typeof decisions.ifNecessaryWork === 'object' && !Array.isArray(decisions.ifNecessaryWork)
      ? (decisions.ifNecessaryWork as Record<string, string[]>)
      : {};

  const toolLabels = useMemo(() => {
    const order = new Map(PLANNING_TOOLS.map((t, i) => [t.id, i] as const));
    return [...selectedTools]
      .filter((id) => PLANNING_TOOLS.some((t) => t.id === id))
      .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
      .map((id) => PLANNING_TOOLS.find((t) => t.id === id)?.label ?? id);
  }, [selectedTools]);

  const standardRows = Object.entries(standardDecisions).filter(([, vals]) => Array.isArray(vals) && vals.length > 0);
  const necessaryRows = Object.entries(ifNecessaryWork).filter(([, vals]) => Array.isArray(vals) && vals.length > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Review planning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-4 pt-0 sm:p-6 sm:pt-0">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Planning tools</h3>
            {toolLabels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No additional planning tools were selected for this run.</p>
            ) : (
              <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                {toolLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            )}
          </section>

          <Separator />

          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Key scope decisions</h3>
            {standardRows.length === 0 && necessaryRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No customization choices are stored yet. If you used Customize (scope), open that step and save your
                selections, or continue if scope is unchanged.
              </p>
            ) : (
              <div className="space-y-4">
                {standardRows.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Standard path</p>
                    <ul className="space-y-2 text-sm">
                      {standardRows.map(([phaseId, vals]) => (
                        <li key={phaseId} className="rounded-md border bg-muted/30 px-3 py-2">
                          <span className="font-medium text-foreground">{phaseTitle(phases, phaseId)}</span>
                          <ul className="mt-1 list-inside list-disc text-muted-foreground">
                            {vals.map((v) => (
                              <li key={v}>{v}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {necessaryRows.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">If necessary</p>
                    <ul className="space-y-2 text-sm">
                      {necessaryRows.map(([phaseId, vals]) => (
                        <li key={phaseId} className="rounded-md border bg-muted/30 px-3 py-2">
                          <span className="font-medium text-foreground">{phaseTitle(phases, phaseId)}</span>
                          <ul className="mt-1 list-inside list-disc text-muted-foreground">
                            {vals.map((v) => (
                              <li key={v}>{v}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          {(initialBudget !== undefined && initialBudget !== '') || (initialTimeline !== undefined && initialTimeline !== '') ? (
            <>
              <Separator />
              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Kickoff targets</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  {initialBudget !== undefined && initialBudget !== '' ? (
                    <div>
                      <dt className="text-muted-foreground">Budget goal</dt>
                      <dd className="font-medium text-foreground">{initialBudget}</dd>
                    </div>
                  ) : null}
                  {initialTimeline !== undefined && initialTimeline !== '' ? (
                    <div>
                      <dt className="text-muted-foreground">Target end</dt>
                      <dd className="font-medium text-foreground">
                        {(() => {
                          const d = new Date(initialTimeline);
                          return Number.isNaN(d.getTime()) ? initialTimeline : format(d, 'MMM d, yyyy');
                        })()}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
