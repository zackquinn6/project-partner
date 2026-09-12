import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Edit3, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DIYSurveyPopup from '../DIYSurveyPopup';

interface DIYProfileStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  checkedOutputs?: Set<string>;
  onOutputToggle?: (outputId: string) => void;
  /** Notify kickoff shell to reload user_profiles for Project Match. */
  onProfileSaved?: () => void;
}

/** Project focus labels (matches workshop My Profile). */
const PROJECT_FOCUS_LABELS: Record<string, string> = {
  schedule: 'Hitting my schedule',
  quality: 'Highest quality work',
  savings: 'Maximize savings',
  all_three: 'Balanced',
};

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

        // Show any saved profile fields (same as My Profile). Do not require
        // survey_completed_at — onboarding / partial profiles still have skill data.
        setExistingProfile({
          ...profileData,
          owned_tools: Array.isArray(profileData.owned_tools) ? profileData.owned_tools : [],
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

    const focusLabel = existingProfile.project_focus
      ? (PROJECT_FOCUS_LABELS[existingProfile.project_focus] ?? existingProfile.project_focus)
      : null;
    const toolCount = existingProfile.owned_tools?.length ?? 0;

    return (
      <div className="space-y-3">
        <div className="rounded-lg border bg-muted/20 px-3 py-3 space-y-2">
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

          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Skill</dt>
              <dd className="text-xs capitalize text-foreground mt-0.5">
                {existingProfile.skill_level || 'Not specified'}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Effort</dt>
              <dd className="text-xs capitalize text-foreground mt-0.5">
                {existingProfile.physical_capability || 'Not specified'}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Focus</dt>
              <dd className="text-xs text-foreground mt-0.5">{focusLabel || 'Not specified'}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2">
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
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-2 sm:p-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <User className="h-4 w-4 flex-shrink-0" />
            Personalize
            {isCompleted && <Badge variant="secondary" className="text-xs">Complete</Badge>}
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Confirm your DIY skill, effort, and focus for this project.
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
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <User className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Personalize</span>
                {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Confirm your DIY skill, effort, and focus for this project.
              </CardDescription>
            </div>
          </div>
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