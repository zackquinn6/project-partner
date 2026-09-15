import React, { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Edit3,
  Wrench,
  Sparkles,
  Hammer,
  Feather,
  Dumbbell,
  Flame,
  Target,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DIYSurveyPopup from '../DIYSurveyPopup';
import { PM_FOCUS_OPTIONS } from '@/components/landing/OnboardingDialog';
import {
  DIYTraitEditDialog,
  type DIYTraitKind,
} from '@/components/KickoffSteps/DIYTraitEditDialog';
import {
  collectOwnedToolCoreIds,
  enrichOwnedToolsWithCatalogPhotos,
  fetchOwnedToolsPhotoResolution,
} from '@/utils/ownedToolsCatalogPhotos';

interface DIYProfileStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  checkedOutputs?: Set<string>;
  onOutputToggle?: (outputId: string) => void;
  /** Notify kickoff shell to reload user_profiles for Project Match. */
  onProfileSaved?: () => void;
}

/** Project style labels (matches workshop My Profile). */
const PROJECT_STYLE_LABELS: Record<string, string> = {
  schedule: 'Hitting my schedule',
  quality: 'Highest quality work',
  savings: 'Maximize savings',
  all_three: 'Balanced',
};

const SKILL_VISUALS: Record<string, { label: string; Icon: LucideIcon; iconWrap: string }> = {
  newbie: { label: 'Newbie', Icon: Sparkles, iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  beginner: { label: 'Newbie', Icon: Sparkles, iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  confident: { label: 'Confident', Icon: Wrench, iconWrap: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400' },
  intermediate: { label: 'Confident', Icon: Wrench, iconWrap: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400' },
  hero: { label: 'Hero', Icon: Hammer, iconWrap: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400' },
  advanced: { label: 'Hero', Icon: Hammer, iconWrap: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400' },
};

const EFFORT_VISUALS: Record<string, { label: string; Icon: LucideIcon; iconWrap: string }> = {
  light: { label: 'Light', Icon: Feather, iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  limited: { label: 'Light', Icon: Feather, iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  medium: { label: 'Medium', Icon: Dumbbell, iconWrap: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400' },
  moderate: { label: 'Medium', Icon: Dumbbell, iconWrap: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400' },
  heavy: { label: 'Heavy', Icon: Flame, iconWrap: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' },
  high: { label: 'Heavy', Icon: Flame, iconWrap: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' },
};

function toolDisplayName(tool: Record<string, unknown> | null | undefined): string | undefined {
  if (!tool || typeof tool !== 'object') return undefined;
  const candidates = ['name', 'item', 'tool_name', 'title', 'label'] as const;
  for (const key of candidates) {
    const v = tool[key];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return undefined;
}

function toolPhotoUrl(tool: Record<string, unknown> | null | undefined): string | undefined {
  if (!tool || typeof tool !== 'object') return undefined;
  for (const key of ['user_photo_url', 'photo_url'] as const) {
    const v = tool[key];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return undefined;
}

interface ProfileData {
  skill_level?: string;
  avoid_projects?: string[];
  project_skills?: Record<string, number> | null;
  physical_capability?: string;
  home_ownership?: string;
  home_build_year?: string;
  home_state?: string;
  project_focus?: string | null;
  owned_tools?: any[];
  survey_completed_at?: string;
  full_name?: string;
  nickname?: string;
}

export const DIYProfileStep: React.FC<DIYProfileStepProps> = ({
  onComplete,
  isCompleted,
  checkedOutputs = new Set(),
  onOutputToggle,
  onProfileSaved,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [existingProfile, setExistingProfile] = useState<ProfileData | null>(null);
  const [showSurveyEditor, setShowSurveyEditor] = useState(false);
  const [profileReloadToken, setProfileReloadToken] = useState(0);
  const [editingTrait, setEditingTrait] = useState<DIYTraitKind | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setExistingProfile(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const loadExistingProfile = async () => {
      setIsLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select(`
            skill_level, 
            avoid_projects, 
            project_skills,
            physical_capability, 
            home_ownership, 
            home_build_year, 
            home_state, 
            project_focus, 
            owned_tools, 
            survey_completed_at,
            full_name,
            nickname
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profileError) {
          console.error('Error loading profile:', profileError);
          setExistingProfile(null);
          return;
        }

        if (!profileData) {
          setExistingProfile(null);
          return;
        }

        const ownedToolsRaw = Array.isArray(profileData.owned_tools) ? profileData.owned_tools : [];
        let ownedTools = ownedToolsRaw as ProfileData['owned_tools'];
        try {
          const coreIds = collectOwnedToolCoreIds(ownedToolsRaw);
          if (coreIds.length > 0) {
            const { corePhotoById, variationsByCore } = await fetchOwnedToolsPhotoResolution(
              supabase,
              coreIds
            );
            ownedTools = enrichOwnedToolsWithCatalogPhotos(
              ownedToolsRaw,
              corePhotoById,
              variationsByCore
            );
          }
        } catch (photoError) {
          console.error('Error enriching owned tool photos:', photoError);
        }

        if (cancelled) return;

        // Show any saved profile fields (same as My Profile). Do not require
        // survey_completed_at — onboarding / partial profiles still have skill data.
        setExistingProfile({
          ...profileData,
          owned_tools: ownedTools,
        } as ProfileData);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading profile:', error);
        setExistingProfile(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadExistingProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.id, profileReloadToken]);

  // Auto-open profile editor only when there is no usable profile yet
  useEffect(() => {
    if (isLoading || !user?.id || existingProfile) return;
    setShowSurveyEditor(true);
  }, [isLoading, existingProfile, user?.id]);

  const handleStartEdit = () => {
    setShowSurveyEditor(true);
  };

  const handleSurveyComplete = () => {
    setShowSurveyEditor(false);
    setProfileReloadToken((token) => token + 1);
    onProfileSaved?.();
    window.dispatchEvent(new CustomEvent('user-profile-updated'));
  };

  const handleTraitSaved = (trait: DIYTraitKind, value: string) => {
    setExistingProfile((prev) => {
      if (!prev) return prev;
      if (trait === 'skill') return { ...prev, skill_level: value };
      if (trait === 'physical_effort') return { ...prev, physical_capability: value };
      return { ...prev, project_focus: value };
    });
    onProfileSaved?.();
    window.dispatchEvent(new CustomEvent('user-profile-updated'));
  };

  const traitCurrentValue =
    editingTrait === 'skill'
      ? existingProfile?.skill_level
      : editingTrait === 'physical_effort'
        ? existingProfile?.physical_capability
        : editingTrait === 'project_style'
          ? existingProfile?.project_focus
          : null;

  const renderProfileView = () => {
    if (!existingProfile) {
      return (
        <div className="text-center space-y-2">
          <User className="w-10 h-10 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold mb-1">Personalize</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Help us personalize your project experience by completing your DIY profile.
            </p>
            <Button onClick={handleStartEdit} size="sm" className="h-8 sm:h-9">
              Complete Profile
            </Button>
          </div>
        </div>
      );
    }

    const skillKey = (existingProfile.skill_level || '').toLowerCase().trim();
    const effortKey = (existingProfile.physical_capability || '').toLowerCase().trim();
    const styleKey = (existingProfile.project_focus || '').toLowerCase().trim();

    const skillVisual = skillKey ? SKILL_VISUALS[skillKey] : undefined;
    const effortVisual = effortKey ? EFFORT_VISUALS[effortKey] : undefined;
    const styleOption = PM_FOCUS_OPTIONS.find((o) => o.value === styleKey);
    const styleLabel = styleKey
      ? (PROJECT_STYLE_LABELS[styleKey] ?? existingProfile.project_focus)
      : null;

    const ownedTools = Array.isArray(existingProfile.owned_tools) ? existingProfile.owned_tools : [];
    const toolCount = ownedTools.length;
    const visibleTools = ownedTools.slice(0, 12);

    const traitCards: {
      key: DIYTraitKind;
      title: string;
      value: string;
      Icon: LucideIcon;
      iconWrap: string;
    }[] = [
      {
        key: 'skill',
        title: 'Skill',
        value: skillVisual?.label
          ?? (existingProfile.skill_level
            ? existingProfile.skill_level.charAt(0).toUpperCase() + existingProfile.skill_level.slice(1)
            : 'Not specified'),
        Icon: skillVisual?.Icon ?? Sparkles,
        iconWrap: skillVisual?.iconWrap ?? 'bg-muted text-muted-foreground',
      },
      {
        key: 'physical_effort',
        title: 'Physical Effort',
        value: effortVisual?.label
          ?? (existingProfile.physical_capability
            ? existingProfile.physical_capability.charAt(0).toUpperCase() + existingProfile.physical_capability.slice(1)
            : 'Not specified'),
        Icon: effortVisual?.Icon ?? Dumbbell,
        iconWrap: effortVisual?.iconWrap ?? 'bg-muted text-muted-foreground',
      },
      {
        key: 'project_style',
        title: 'Project style',
        value: styleLabel || 'Not specified',
        Icon: styleOption?.icon ?? Target,
        iconWrap: styleOption?.iconWrapClasses ?? 'bg-muted text-muted-foreground',
      },
    ];

    return (
      <div className="space-y-3">
        <div className="rounded-lg border bg-muted/20 px-3 py-3 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-semibold text-xs sm:text-sm truncate">
                  {existingProfile.nickname || existingProfile.full_name || 'Your DIY profile'}
                </h4>
                {existingProfile.full_name && existingProfile.nickname ? (
                  <p className="text-[11px] text-muted-foreground truncate">{existingProfile.full_name}</p>
                ) : null}
              </div>
            </div>
            <Button
              onClick={handleStartEdit}
              variant="outline"
              size="sm"
              className="h-7 min-h-7 px-2 gap-1 text-[11px] font-normal leading-none"
            >
              <Edit3 className="w-3 h-3 shrink-0" />
              Edit
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {traitCards.map(({ key, title, value, Icon, iconWrap }) => (
              <button
                key={key}
                type="button"
                onClick={() => setEditingTrait(key)}
                className="flex flex-col items-center gap-1 rounded-lg border bg-background px-1.5 py-2 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 sm:px-2"
                aria-label={`Edit ${title}`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-md ${iconWrap}`}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[10px]">
                  {title}
                </span>
                <span className="text-[11px] font-medium leading-tight text-foreground sm:text-xs">{value}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-dashed px-3 py-2 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wrench className="h-3.5 w-3.5 shrink-0" />
              <span>
                {toolCount > 0
                  ? `${toolCount} tool${toolCount !== 1 ? 's' : ''} in your library`
                  : 'No tools in your library yet'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => window.dispatchEvent(new CustomEvent('show-tools-library-grid'))}
            >
              Manage tools
            </Button>
          </div>

          {toolCount > 0 ? (
            <div>
              <div className="flex flex-wrap gap-x-1.5 gap-y-2">
                {visibleTools.map((tool: Record<string, unknown>, index: number) => {
                  const toolId = typeof tool?.id === 'string' ? tool.id : undefined;
                  const toolName = toolDisplayName(tool);
                  const photoUrl = toolPhotoUrl(tool);
                  const quantity = typeof tool?.quantity === 'number' ? tool.quantity : undefined;
                  const label = toolName ?? 'Tool';

                  return (
                    <div
                      key={toolId ?? toolName ?? String(index)}
                      className="flex w-[3.25rem] flex-col items-center gap-0.5 flex-shrink-0 sm:w-[3.5rem]"
                      title={label}
                    >
                      <div className="relative h-9 w-9 shrink-0">
                        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-md border bg-background">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={label}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling;
                                if (fallback instanceof HTMLElement) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className={`h-full w-full items-center justify-center ${photoUrl ? 'hidden' : 'flex'}`}
                            aria-hidden={Boolean(photoUrl)}
                          >
                            <Wrench className="h-4 w-4 text-muted-foreground" aria-hidden />
                          </div>
                        </div>
                        {typeof quantity === 'number' && quantity > 1 ? (
                          <div className="pointer-events-none absolute -right-1 -top-1 z-10 min-w-[1.125rem] rounded-full border border-primary/30 bg-primary px-1 py-0 text-center text-[10px] font-medium leading-none text-primary-foreground">
                            {quantity}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              {toolCount > 12 ? (
                <p className="mt-1.5 text-[10px] text-muted-foreground">+{toolCount - 12} more</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-2 sm:p-3">
          <CardTitle className="font-display text-xl font-semibold leading-tight">
            Personalize
            {isCompleted ? (
              <Badge variant="secondary" className="ml-2 align-middle text-xs">
                Complete
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription className="text-sm">
            Your skill and effort shape which tools and warnings we show.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-3">
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-sm text-muted-foreground">Loading profile...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="p-2 sm:p-3">
          <CardTitle className="font-display text-xl font-semibold leading-tight">
            Personalize
            {isCompleted ? (
              <Badge variant="secondary" className="ml-2 align-middle text-xs">
                Complete
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription className="text-sm">
            Your skill and effort shape which tools and warnings we show.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-2 sm:space-y-3 sm:p-3">
          {renderProfileView()}
          
          {!isCompleted && !existingProfile && (
            <div className="text-center p-3 bg-muted/50 rounded-lg border border-muted">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Complete your profile above to continue
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <DIYTraitEditDialog
        open={editingTrait != null}
        onOpenChange={(open) => {
          if (!open) setEditingTrait(null);
        }}
        trait={editingTrait}
        currentValue={traitCurrentValue}
        onSaved={handleTraitSaved}
      />

      <DIYSurveyPopup 
        open={showSurveyEditor} 
        onOpenChange={(open) => {
          setShowSurveyEditor(open);
          if (!open) {
            handleSurveyComplete();
          }
        }} 
        mode="new"
        enableProgressSave
        initialDataLoading={Boolean(user?.id) && isLoading}
        onProfileSaved={() => {
          setProfileReloadToken((token) => token + 1);
          onProfileSaved?.();
          window.dispatchEvent(new CustomEvent('user-profile-updated'));
        }}
        initialData={{
          skillLevel: existingProfile?.skill_level || "",
          physicalCapability: existingProfile?.physical_capability || "",
          homeOwnership: existingProfile?.home_ownership || "",
          homeBuildYear: existingProfile?.home_build_year || "",
          homeState: existingProfile?.home_state || "",
          projectFocus: (existingProfile?.project_focus ?? undefined) as any,
          ownedTools: existingProfile?.owned_tools || [],
          fullName: existingProfile?.full_name || "",
          nickname: existingProfile?.nickname || "",
          projectSkills: existingProfile?.project_skills ?? null,
          avoidProjects: existingProfile?.avoid_projects ?? null,
        }} 
      />
    </>
  );
};