import React, { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Sparkles,
  Wrench,
  Hammer,
  Feather,
  Dumbbell,
  Flame,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { type PMFocus, PM_FOCUS_OPTIONS } from '@/components/landing/OnboardingDialog';
import { reportUserFacingError } from '@/utils/errorReporting';

export type DIYTraitKind = 'skill' | 'physical_effort' | 'project_style';

type TraitOption = {
  value: string;
  label: string;
  description: string;
  Icon: LucideIcon;
  iconWrap: string;
};

const SKILL_OPTIONS: TraitOption[] = [
  {
    value: 'newbie',
    label: 'Newbie',
    description: 'Just getting started',
    Icon: Sparkles,
    iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  },
  {
    value: 'confident',
    label: 'Confident',
    description: 'Done a few projects',
    Icon: Wrench,
    iconWrap: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
  },
  {
    value: 'hero',
    label: 'Hero',
    description: 'Tackled big stuff',
    Icon: Hammer,
    iconWrap: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400',
  },
];

const PHYSICAL_EFFORT_OPTIONS: TraitOption[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Short sessions, light-duty only',
    Icon: Feather,
    iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Half-day projects, moderate lifting',
    Icon: Dumbbell,
    iconWrap: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
  },
  {
    value: 'heavy',
    label: 'Heavy',
    description: 'Full-day work, heavy lifting',
    Icon: Flame,
    iconWrap: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  },
];

const TRAIT_COPY: Record<
  DIYTraitKind,
  { title: string; description: string; column: 'skill_level' | 'physical_capability' | 'project_focus' }
> = {
  skill: {
    title: 'Skill',
    description: 'Choose the DIY skill level that fits you best.',
    column: 'skill_level',
  },
  physical_effort: {
    title: 'Physical Effort',
    description: 'Choose how much physical effort you are ready for.',
    column: 'physical_capability',
  },
  project_style: {
    title: 'Project style',
    description: 'Choose what you want to optimize for on projects.',
    column: 'project_focus',
  },
};

function normalizeTraitValue(trait: DIYTraitKind, raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const key = raw.toLowerCase().trim();
  if (!key) return null;

  if (trait === 'skill') {
    if (key === 'newbie' || key === 'beginner') return 'newbie';
    if (key === 'confident' || key === 'intermediate') return 'confident';
    if (key === 'hero' || key === 'advanced') return 'hero';
    return null;
  }

  if (trait === 'physical_effort') {
    if (key === 'light' || key === 'limited') return 'light';
    if (key === 'medium' || key === 'moderate') return 'medium';
    if (key === 'heavy' || key === 'high') return 'heavy';
    return null;
  }

  if (key === 'schedule' || key === 'quality' || key === 'savings' || key === 'all_three') {
    return key;
  }
  return null;
}

function optionsForTrait(trait: DIYTraitKind): TraitOption[] {
  if (trait === 'skill') return SKILL_OPTIONS;
  if (trait === 'physical_effort') return PHYSICAL_EFFORT_OPTIONS;
  return PM_FOCUS_OPTIONS.map((o) => ({
    value: o.value,
    label: o.title,
    description: o.description,
    Icon: o.icon,
    iconWrap: o.iconWrapClasses,
  }));
}

interface DIYTraitEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trait: DIYTraitKind | null;
  currentValue: string | null | undefined;
  onSaved: (trait: DIYTraitKind, value: string) => void;
}

export function DIYTraitEditDialog({
  open,
  onOpenChange,
  trait,
  currentValue,
  onSaved,
}: DIYTraitEditDialogProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !trait) return;
    setSelected(normalizeTraitValue(trait, currentValue));
  }, [open, trait, currentValue]);

  if (!trait) return null;

  const copy = TRAIT_COPY[trait];
  const options = optionsForTrait(trait);

  const handleSave = async () => {
    if (!user?.id || selected == null) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('user_profiles').upsert(
        {
          user_id: user.id,
          [copy.column]: selected as PMFocus | string,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) {
        await reportUserFacingError({
          source: 'kickoff',
          operation: 'save_diy_trait',
          userId: user.id,
          error,
          userMessage: `Failed to save ${copy.title}.`,
          notificationTitle: 'Profile update failed',
        });
        return;
      }
      onSaved(trait, selected);
      onOpenChange(false);
      toast.success(`${copy.title} updated`);
    } catch (error) {
      await reportUserFacingError({
        source: 'kickoff',
        operation: 'save_diy_trait',
        userId: user?.id,
        error,
        userMessage: `Failed to save ${copy.title}.`,
        notificationTitle: 'Profile update failed',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-3 p-4 sm:p-5">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-base sm:text-lg">{copy.title}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {options.map(({ value, label, description, Icon, iconWrap }) => {
            const isSelected = selected === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSelected(value)}
                aria-pressed={isSelected}
                className={`flex w-full items-start gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40'
                }`}
              >
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${iconWrap}`}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-sm font-medium text-foreground">{label}</span>
                  <span className="block text-xs text-muted-foreground">{description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={saving || selected == null}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
