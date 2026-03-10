import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
}[] = [
  {
    value: 'schedule',
    title: 'Hitting my schedule',
    description: 'Hitting the schedule I told myself and others',
    icon: Calendar,
  },
  {
    value: 'quality',
    title: 'Highest quality work',
    description: 'Focusing on precision of work',
    icon: Award,
  },
  {
    value: 'savings',
    title: 'Maximize savings',
    description: 'Avoiding overspending / maximize savings',
    icon: PiggyBank,
  },
  {
    value: 'all_three',
    title: 'Balanced',
    description: 'Balance cost, quality, and schedule together',
    icon: Target,
  },
];

const TOTAL_STEPS = 3;

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [diyLevel, setDiyLevel] = useState<DIYLevel | null>(null);
  const [pmFocus, setPmFocus] = useState<PMFocus | null>(null);

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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md border-border/60 shadow-xl bg-background/95 backdrop-blur sm:max-w-[420px]"
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
              Pick your primary project management focus. This helps us prioritize guidance for your projects.
            </p>
          )}
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-2 py-2">
            <Label htmlFor="onboarding-name" className="sr-only">
              Your name
            </Label>
            <Input
              id="onboarding-name"
              type="text"
              placeholder="e.g. Alex or Jordan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canProceed && handleNext()}
              className="h-12 text-base border-border/80 bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary/20"
              autoFocus
              autoComplete="given-name"
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
            {PM_FOCUS_OPTIONS.map(({ value, title, description, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPmFocus(value)}
                className={`
                  flex items-start gap-3 p-4 rounded-xl border-2 text-left
                  transition-all duration-200
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                  ${pmFocus === value
                    ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                    : 'border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-muted/40 text-foreground'
                  }
                `}
                aria-pressed={pmFocus === value}
                aria-label={`${title}: ${description}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/80">
                  <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{title}</span>
                  <span className="text-sm text-muted-foreground">{description}</span>
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
