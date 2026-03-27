import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, Sparkles, Wrench, Hammer, Calendar, Award, PiggyBank, Target } from 'lucide-react';

export type DIYLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type PMFocus = 'schedule' | 'quality' | 'savings' | 'all_three';

export interface OnboardingData {
  name: string;
  diyLevel: DIYLevel | null;
  pmFocus: PMFocus | null;
}

const DIY_LEVELS: { value: DIYLevel; label: string; short: string; icon: typeof Sparkles }[] = [
  { value: 'Beginner', label: 'Beginner', short: 'New to DIY — we\'ll keep it simple', icon: Sparkles },
  { value: 'Intermediate', label: 'Intermediate', short: 'Comfortable with light projects', icon: Wrench },
  { value: 'Advanced', label: 'Advanced', short: 'Experienced with tools and trades', icon: Hammer },
];

export const PM_FOCUS_OPTIONS: {
  value: PMFocus;
  title: string;
  description: string;
  icon: typeof Calendar;
  colorClasses: string;
}[] = [
  {
    value: 'schedule',
    title: 'Go Fast',
    description: 'Hitting the schedule I told myself and others',
    icon: Calendar,
    colorClasses: 'border-slate-700 bg-slate-950/90 hover:border-slate-500',
  },
  {
    value: 'quality',
    title: 'Highest quality work',
    description: 'Focusing on precision of work',
    icon: Award,
    colorClasses: 'border-emerald-700 bg-emerald-950/70 hover:border-emerald-500',
  },
  {
    value: 'savings',
    title: 'Maximize savings',
    description: 'Avoiding overspending / maximize savings',
    icon: PiggyBank,
    colorClasses: 'border-violet-700 bg-violet-950/70 hover:border-violet-500',
  },
  {
    value: 'all_three',
    title: 'Balanced',
    description: 'Balance cost, quality, and schedule together',
    icon: Target,
    colorClasses: 'border-blue-700 bg-blue-950/70 hover:border-blue-500',
  },
];

const TOTAL_STEPS = 3;

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [visualViewportHeight, setVisualViewportHeight] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [diyLevel, setDiyLevel] = useState<DIYLevel | null>(null);
  const [pmFocus, setPmFocus] = useState<PMFocus | null>(null);

  useEffect(() => {
    if (!open || !isMobile) {
      setVisualViewportHeight(null);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) {
      setVisualViewportHeight(window.innerHeight);
      return;
    }
    const sync = () => setVisualViewportHeight(vv.height);
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [open, isMobile]);

  useLayoutEffect(() => {
    if (!open || step !== 1 || !isMobile) return;
    const id = window.requestAnimationFrame(() => {
      const el = nameInputRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, step, isMobile]);

  const handleClose = (open: boolean) => {
    if (!open) {
      setStep(1);
      setName('');
      setDiyLevel(null);
      setPmFocus(null);
    }
    onOpenChange(open);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) return;
      setStep(2);
    } else if (step === 2) {
      if (!diyLevel) return;
      setStep(3);
    } else if (step === 3) {
      if (!pmFocus) return;
      onOpenChange(false);
      navigate('/auth?mode=signup', {
        state: { onboarding: { name: name.trim(), diyLevel, pmFocus } },
      });
      setStep(1);
      setName('');
      setDiyLevel(null);
      setPmFocus(null);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as 1 | 2 | 3);
  };

  const canProceed =
    (step === 1 && name.trim().length > 0) ||
    (step === 2 && diyLevel !== null) ||
    (step === 3 && pmFocus !== null);

  const mobileMaxHeight =
    isMobile && visualViewportHeight != null
      ? Math.max(220, visualViewportHeight - 24)
      : undefined;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={
          'max-w-md border-border/60 shadow-xl bg-background/95 backdrop-blur sm:max-w-[420px] ' +
          'max-md:top-3 max-md:translate-y-0 max-md:max-h-[min(92dvh,calc(100svh-0.75rem))] max-md:overflow-y-auto max-md:flex max-md:flex-col'
        }
        style={
          isMobile && mobileMaxHeight != null
            ? { maxHeight: mobileMaxHeight }
            : undefined
        }
        onOpenAutoFocus={(e) => {
          if (isMobile && step === 1) {
            e.preventDefault();
          }
        }}
        aria-describedby={step === 1 ? 'name-description' : step === 2 ? 'diy-description' : undefined}
      >
        {/* Step progress */}
        <div className="flex gap-1.5 mb-1" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i + 1 <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-4">Step {step} of {TOTAL_STEPS}</p>

        <DialogHeader className="space-y-2 pb-2 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {step === 1 && "What should we call you?"}
            {step === 2 && "How would you describe your DIY experience?"}
            {step === 3 && "What is most important to you?"}
          </DialogTitle>
          {step === 1 && (
            <p id="name-description" className="text-sm text-muted-foreground font-normal">
              First name or nickname is fine — we use this to personalize your experience.
            </p>
          )}
          {step === 2 && (
            <p id="diy-description" className="text-sm text-muted-foreground font-normal">
              We'll tailor project suggestions and tips to your level. You can change this later.
            </p>
          )}
          {step === 3 && (
            <p className="text-sm text-muted-foreground font-normal">
              Pick Your Project Strategy
            </p>
          )}
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-2 py-2 min-h-0">
            <Label htmlFor="onboarding-name" className="sr-only">
              Your name
            </Label>
            <Input
              ref={nameInputRef}
              id="onboarding-name"
              type="text"
              inputMode="text"
              enterKeyHint="next"
              placeholder="e.g. Alex or Jordan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canProceed && handleNext()}
              onFocus={(e) => {
                if (isMobile) {
                  window.requestAnimationFrame(() => {
                    e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  });
                }
              }}
              className="h-14 min-h-[48px] text-base md:h-12 md:min-h-0 md:text-sm border-border/80 bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary/20"
              autoFocus={!isMobile}
              autoComplete="given-name"
              autoCorrect="on"
              spellCheck={false}
              aria-invalid={name.length > 0 && !name.trim()}
            />
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-3 py-2" role="group" aria-label="DIY experience level">
            {DIY_LEVELS.map(({ value, label, short, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setDiyLevel(value)}
                className={`
                  flex items-start gap-3 p-4 rounded-xl border-2 text-left
                  transition-all duration-200
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                  ${diyLevel === value
                    ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                    : 'border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-muted/40 text-foreground'
                  }
                `}
                aria-pressed={diyLevel === value}
                aria-label={`${label}: ${short}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/80">
                  <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{label}</span>
                  <span className="text-sm text-muted-foreground">{short}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 gap-3 py-2" role="group" aria-label="Project management focus">
            {PM_FOCUS_OPTIONS.map(({ value, title, description, icon: Icon, colorClasses }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPmFocus(value)}
                className={`
                  flex items-start gap-3 p-4 rounded-xl border-2 text-left
                  transition-all duration-200
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                  ${colorClasses}
                  ${pmFocus === value
                    ? 'ring-2 ring-primary/70 text-foreground shadow-sm'
                    : 'text-foreground/95'
                  }
                `}
                aria-pressed={pmFocus === value}
                aria-label={`${title}: ${description}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/35">
                  <Icon className="h-5 w-5 text-foreground/90" aria-hidden />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">{title}</span>
                  <span className="text-sm text-foreground/75">{description}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            className={step === 1 ? 'invisible' : ''}
            aria-hidden={step === 1}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className="min-w-[120px]"
          >
            {step === 3 ? 'Create account' : 'Continue'}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
