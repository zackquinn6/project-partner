import { useEffect, useRef } from 'react';

export type SteppedAutoAdvanceStep = {
  /** Current accordion / section key for this step. */
  key: string;
  /** True when this step's required actions are satisfied. */
  isComplete: boolean;
  /** Section to open when this step completes. */
  next: string;
};

type UseSteppedAutoAdvanceOptions = {
  /** When false, tracking resets and no advances fire. */
  enabled?: boolean;
  activeStep: string | null;
  setActiveStep: (next: string) => void;
  steps: SteppedAutoAdvanceStep[];
  delayMs?: number;
};

/**
 * Edge-triggered auto-advance for stepped accordion/collapsible flows.
 * Advances only when the active step's required actions flip incomplete → complete,
 * or when navigating onto an already-complete step from its predecessor.
 */
export function useSteppedAutoAdvance({
  enabled = true,
  activeStep,
  setActiveStep,
  steps,
  delayMs = 280,
}: UseSteppedAutoAdvanceOptions) {
  const activeStepRef = useRef(activeStep);
  activeStepRef.current = activeStep;

  const trackingRef = useRef<{ step: string | null; complete: boolean }>({
    step: activeStep,
    complete: false,
  });

  const stepsKey = steps.map((s) => `${s.key}:${s.isComplete ? 1 : 0}:${s.next}`).join('|');

  useEffect(() => {
    if (!enabled) {
      trackingRef.current = { step: activeStep, complete: false };
      return;
    }

    const current = steps.find((s) => s.key === activeStep);
    if (!current) {
      trackingRef.current = { step: activeStep, complete: false };
      return;
    }

    const prev = trackingRef.current;
    const prevStepIndex = steps.findIndex((s) => s.key === prev.step);
    const currentIndex = steps.findIndex((s) => s.key === current.key);
    const arrivedFromPrevious =
      current.isComplete &&
      prevStepIndex >= 0 &&
      currentIndex === prevStepIndex + 1 &&
      prev.step === steps[prevStepIndex]?.key;

    const completedWhileActive =
      current.isComplete &&
      prev.step === current.key &&
      !prev.complete;

    trackingRef.current = { step: activeStep, complete: current.isComplete };

    if (!completedWhileActive && !arrivedFromPrevious) return;

    const timer = window.setTimeout(() => {
      if (activeStepRef.current === current.key) {
        setActiveStep(current.next);
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
    // stepsKey captures step completeness; steps array identity is not relied on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, activeStep, stepsKey, setActiveStep, delayMs]);
}
