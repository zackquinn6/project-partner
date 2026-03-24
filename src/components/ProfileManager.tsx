import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DIYSurveyPopup from "./DIYSurveyPopup";
import { AchievementsSection } from "./AchievementsSection";
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

  if (open && (isLoading || !user)) {
    return (
      <>
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent className="flex h-screen max-h-full w-full max-w-full flex-col overflow-hidden p-0 md:h-[90vh] md:max-h-[90vh] md:max-w-[90vw] md:rounded-lg [&>button]:hidden">
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex flex-shrink-0 items-center justify-between border-b px-4 py-4 md:px-6">
                <h2 className="text-lg font-bold md:text-xl">My Profile</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="ml-4 flex-shrink-0"
                >
                  Close
                </Button>
              </div>
              <div className="flex flex-1 items-center justify-center py-8">
                <div className="text-center text-muted-foreground">
                  {!user ? 'Sign in to edit your profile.' : 'Loading profile…'}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={showAchievements} onOpenChange={setShowAchievements}>
          <DialogContent className="flex h-screen max-h-full w-full max-w-full flex-col overflow-hidden p-0 md:h-[90vh] md:max-h-[90vh] md:max-w-[90vw] md:rounded-lg [&>button]:hidden">
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex flex-shrink-0 items-center justify-between border-b px-4 py-4 md:px-6">
                <h2 className="text-lg font-bold md:text-xl">My Achievements</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAchievements(false)}
                  className="ml-4 flex-shrink-0"
                >
                  Close
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-6">
                <AchievementsSection />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <DIYSurveyPopup
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            onOpenChange(false);
          }
        }}
        mode="new"
        enableProgressSave
        onProfileSaved={() => void loadExistingProfile(true)}
        onOpenAchievements={() => setShowAchievements(true)}
        initialData={{
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
        }}
      />

      <Dialog open={showAchievements} onOpenChange={setShowAchievements}>
        <DialogContent className="flex h-screen max-h-full w-full max-w-full flex-col overflow-hidden p-0 md:h-[90vh] md:max-h-[90vh] md:max-w-[90vw] md:rounded-lg [&>button]:hidden">
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex flex-shrink-0 items-center justify-between border-b px-4 py-4 md:px-6">
              <h2 className="text-lg font-bold md:text-xl">My Achievements</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAchievements(false)}
                className="ml-4 flex-shrink-0"
              >
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <AchievementsSection />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
