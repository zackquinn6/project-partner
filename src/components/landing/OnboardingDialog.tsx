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
import { ArrowRight } from 'lucide-react';

export type DIYLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface OnboardingData {
  name: string;
  diyLevel: DIYLevel | null;
}

const DIY_LEVELS: { value: DIYLevel; label: string; short: string }[] = [
  { value: 'Beginner', label: 'Beginner', short: 'New to projects' },
  { value: 'Intermediate', label: 'Intermediate', short: 'Comfortable with light DIY' },
  { value: 'Advanced', label: 'Advanced', short: 'Experienced with trades' },
];

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [diyLevel, setDiyLevel] = useState<DIYLevel | null>(null);

  const handleClose = (open: boolean) => {
    if (!open) {
      setStep(1);
      setName('');
      setDiyLevel(null);
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
    } else {
      onOpenChange(false);
      navigate('/auth?mode=signup', {
        state: { onboarding: { name: name.trim(), diyLevel } },
      });
      setStep(1);
      setName('');
      setDiyLevel(null);
    }
  };

  const canProceed =
    (step === 1 && name.trim().length > 0) ||
    (step === 2 && diyLevel !== null) ||
    step === 3;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md border-border/60 shadow-xl bg-background/95 backdrop-blur">
        <DialogHeader className="space-y-1 pb-4">
          <DialogTitle className="text-xl font-medium tracking-tight text-center">
            {step === 1 && "What's your name?"}
            {step === 2 && 'Your DIY experience'}
            {step === 3 && 'Almost there'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-2">
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canProceed && handleNext()}
              className="h-12 text-base border-border/80 bg-transparent focus-visible:ring-2"
              autoFocus
            />
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-3 py-2">
            {DIY_LEVELS.map(({ value, label, short }) => (
              <button
                key={value}
                type="button"
                onClick={() => setDiyLevel(value)}
                className={`
                  flex flex-col items-center justify-center p-4 rounded-lg border-2 text-left
                  transition-colors transition-shadow
                  ${diyLevel === value
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50 text-foreground'
                  }
                `}
              >
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{short}</span>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <p className="text-muted-foreground text-center py-4 leading-relaxed">
            Project Partner is designed around personalization to you — you'll need to create an account.
          </p>
        )}

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className="min-w-[100px]"
          >
            Next
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
