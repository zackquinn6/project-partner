import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DIYSurveyPopup from "./DIYSurveyPopup";
import { AchievementsFullDialog } from "./AchievementsFullDialog";
import type { PMFocus } from "@/components/landing/OnboardingDialog";

interface ProfileManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProfileData {
  skill_level?: string;
  avoid_projects?: string[];
  project_skills?: Record<string, number> | null;
  physical_capability?: string;
  home_ownership?: string;
  home_build_year?: string;
  home_state?: string;
  preferred_learning_methods?: string[];
  project_focus?: string | null;
  owned_tools?: any[];
  survey_completed_at?: string;
  full_name?: string;
  nickname?: string;
  primary_home?: {
    name: string;
    city?: string;
    state?: string;
  };
}

export default function ProfileManager({
  open,
  onOpenChange
}: ProfileManagerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [existingProfile, setExistingProfile] = useState<ProfileData | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!open) {
      setIsLoading(true);
      return;
    }
    if (user) {
      void loadExistingProfile(false);
    } else {
      setIsLoading(false);
    }
  }, [open, user]);

  const surveyInitialData = useMemo(
    () => ({
      skillLevel: existingProfile?.skill_level || "",
      physicalCapability: existingProfile?.physical_capability || "",
      homeOwnership: existingProfile?.home_ownership || "",
      homeBuildYear: existingProfile?.home_build_year || "",
      homeState: existingProfile?.home_state || "",
      preferredLearningMethods: existingProfile?.preferred_learning_methods || [],
      projectFocus: (existingProfile?.project_focus as PMFocus | null | undefined) ?? undefined,
      ownedTools: existingProfile?.owned_tools || [],
      fullName: existingProfile?.full_name || "",
      nickname: existingProfile?.nickname || "",
      projectSkills: existingProfile?.project_skills ?? null,
      avoidProjects: existingProfile?.avoid_projects ?? null,
    }),
    [existingProfile]
  );

  const loadExistingProfile = async (quiet: boolean) => {
    if (!quiet) setIsLoading(true);
    try {
      const {
        data: profileData,
        error: profileError
      } = await supabase.from('user_profiles').select(`
          skill_level,
          avoid_projects,
          project_skills,
          physical_capability,
          home_ownership,
          home_build_year,
          home_state,
          preferred_learning_methods,
          project_focus,
          owned_tools,
          survey_completed_at,
          full_name,
          nickname
        `).eq('user_id', user?.id).maybeSingle();
      if (profileError) {
        console.error('Error loading profile:', profileError);
        setExistingProfile(null);
        return;
      }
      if (!profileData) {
        setExistingProfile(null);
        return;
      }

      const { data: primaryHome, error: homeError } = await supabase
        .from('homes')
        .select('id, name')
        .eq('user_id', user?.id)
        .eq('is_primary', true)
        .maybeSingle();
      if (homeError && homeError.code !== 'PGRST116') {
        console.error('Error loading primary home:', homeError);
      }
      let primaryWithLocation = primaryHome ?? undefined;
      if (primaryHome?.id) {
        const { data: details } = await supabase.from('home_details').select('city, state').eq('home_id', primaryHome.id).maybeSingle();
        if (details) primaryWithLocation = { ...primaryHome, city: details.city ?? undefined, state: details.state ?? undefined };
      }

      const completeProfile = {
        ...profileData,
        owned_tools: Array.isArray(profileData.owned_tools) ? profileData.owned_tools : [],
        primary_home: primaryWithLocation
      };
      setExistingProfile(completeProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
      setExistingProfile(null);
    } finally {
      if (!quiet) setIsLoading(false);
    }
  };

  if (open && !user) {
    return (
      <>
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle className="sr-only">My Profile</DialogTitle>
            <p className="text-sm text-muted-foreground">Sign in to edit your profile.</p>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogContent>
        </Dialog>
        <AchievementsFullDialog open={showAchievements} onOpenChange={setShowAchievements} />
      </>
    );
  }

  return (
    <>
      <DIYSurveyPopup
        open={open && Boolean(user)}
        onOpenChange={onOpenChange}
        mode="new"
        enableProgressSave
        initialDataLoading={Boolean(user) && isLoading}
        onProfileSaved={() => void loadExistingProfile(true)}
        onOpenAchievements={() => setShowAchievements(true)}
        initialData={surveyInitialData}
      />

      <AchievementsFullDialog open={showAchievements} onOpenChange={setShowAchievements} />
    </>
  );
}
