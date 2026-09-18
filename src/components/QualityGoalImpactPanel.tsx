import React, { useEffect, useMemo, useState } from 'react';
import type { Phase } from '@/interfaces/Project';
import {
  gatedStepTitlesBetween,
  qualityGoalBelow,
  qualityGoalLabel,
  type QualityGoal,
} from '@/utils/qualityGoal';
import {
  contributingQualityProjectIds,
  levelForGoal,
  loadProjectQualityLevelBundles,
  type ProjectQualityLevelsBundle,
} from '@/utils/projectQualityLevels';
import { cn } from '@/lib/utils';

type QualityGoalImpactPanelProps = {
  draftGoal: QualityGoal;
  hostProjectId: string | null | undefined;
  phases: Phase[] | null | undefined;
  className?: string;
};

export function QualityGoalImpactPanel({
  draftGoal,
  hostProjectId,
  phases,
  className,
}: QualityGoalImpactPanelProps) {
  const [bundles, setBundles] = useState<ProjectQualityLevelsBundle[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const projectIds = useMemo(
    () => contributingQualityProjectIds(hostProjectId, phases),
    [hostProjectId, phases],
  );

  const professionalExtraSteps = useMemo(() => {
    if (draftGoal !== 'professional') return [];
    return gatedStepTitlesBetween(phases, 'great', 'professional');
  }, [draftGoal, phases]);

  useEffect(() => {
    let cancelled = false;
    if (projectIds.length === 0) {
      setBundles([]);
      setLoadError(null);
      return;
    }

    setLoading(true);
    setLoadError(null);
    void loadProjectQualityLevelBundles(projectIds)
      .then((rows) => {
        if (!cancelled) setBundles(rows);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) {
          setLoadError('Quality impact content could not be loaded.');
          setBundles([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectIds.join('|')]);

  const lowerGoal = qualityGoalBelow(draftGoal);
  const draftLabel = qualityGoalLabel(draftGoal);

  return (
    <div className={cn('space-y-4 rounded-md border border-border bg-muted/30 p-3', className)}>
      <div>
        <p className="text-sm font-medium">What {draftLabel} means</p>
        <p className="text-xs text-muted-foreground">
          Outcome and process for this choice
          {lowerGoal ? `, compared with ${qualityGoalLabel(lowerGoal)}` : ''}.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading impact details…</p>
      ) : null}
      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

      {!loading && !loadError && bundles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No quality-impact content is authored for the projects in this run yet.
        </p>
      ) : null}

      {bundles.map((bundle) => {
        const level = levelForGoal(bundle, draftGoal);
        const lowerLevel = lowerGoal ? levelForGoal(bundle, lowerGoal) : undefined;
        const missing =
          !level &&
          bundle.levels.length === 0;

        return (
          <div key={bundle.projectId} className="space-y-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {bundle.projectName}
            </p>
            {missing ? (
              <p className="text-sm text-muted-foreground">
                No quality levels authored for this source project.
              </p>
            ) : null}
            {level ? (
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Outcome</p>
                  <p className="text-sm">{level.outcome_summary}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Process</p>
                  <p className="text-sm">{level.process_summary}</p>
                </div>
                {level.vs_lower_summary ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      vs {lowerGoal ? qualityGoalLabel(lowerGoal) : 'lower'}
                    </p>
                    <p className="text-sm">{level.vs_lower_summary}</p>
                  </div>
                ) : null}
                {lowerLevel && draftGoal !== 'good' ? (
                  <div className="rounded-md bg-background/80 p-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      If you choose {qualityGoalLabel(lowerGoal!)} instead
                    </p>
                    <p className="text-sm">{lowerLevel.outcome_summary}</p>
                    {lowerLevel.example_image_urls[0] ? (
                      <img
                        src={lowerLevel.example_image_urls[0]}
                        alt=""
                        className="mt-2 max-h-32 w-full rounded object-cover"
                      />
                    ) : null}
                  </div>
                ) : null}
                {level.example_image_urls.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {level.example_image_urls.map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt=""
                        className="h-24 w-32 rounded object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : !missing ? (
              <p className="text-sm text-muted-foreground">
                No {draftLabel} row for this source.
              </p>
            ) : null}
          </div>
        );
      })}

      {draftGoal === 'professional' && professionalExtraSteps.length > 0 ? (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            Extra steps vs {qualityGoalLabel('great')}
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {professionalExtraSteps.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
