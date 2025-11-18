import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, Edit3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import DIYSurveyPopup from "./DIYSurveyPopup";
import { AchievementsSection } from "./AchievementsSection";
interface ProfileManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
interface ProfileData {
  skill_level?: string;
  avoid_projects?: string[];
  physical_capability?: string;
  home_ownership?: string;
  home_build_year?: string;
  home_state?: string;
  preferred_learning_methods?: string[];
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
  const [showSurveyEditor, setShowSurveyEditor] = useState(false);
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  useEffect(() => {
    if (open && user) {
      loadExistingProfile();
    }
  }, [open, user]);
  const loadExistingProfile = async () => {
    setIsLoading(true);
    try {
      // First fetch profile data
      const {
        data: profileData,
        error: profileError
      } = await supabase.from('profiles').select(`
          skill_level, 
          physical_capability, 
          home_ownership, 
          home_build_year, 
          home_state, 
          preferred_learning_methods, 
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
      if (!profileData || !profileData.survey_completed_at) {
        setExistingProfile(null);
        return;
      }

      // Then fetch primary home data
      const {
        data: homeData,
        error: homeError
      } = await supabase.from('homes').select('name, city, state').eq('user_id', user?.id).eq('is_primary', true).maybeSingle();
      if (homeError && homeError.code !== 'PGRST116') {
        console.error('Error loading primary home:', homeError);
      }

      // Combine profile and home data
      const completeProfile = {
        ...profileData,
        owned_tools: Array.isArray(profileData.owned_tools) ? profileData.owned_tools : [],
        primary_home: homeData || undefined
      };
      setExistingProfile(completeProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
      setExistingProfile(null);
    } finally {
      setIsLoading(false);
    }
  };
  const handleStartEdit = () => {
    setShowSurveyEditor(true);
  };
  const handleSurveyComplete = () => {
    setShowSurveyEditor(false);
    loadExistingProfile(); // Reload the profile data
  };
  const renderProfileView = () => {
    if (!existingProfile) return null;
    return <div className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Your profile helps us match you with the right tools, guidance, and partners—
              so every project starts with an advantage.
            </p>
          </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold">Personal Info</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Full Name:</strong> {existingProfile.full_name || "Not specified"}</p>
                    <p><strong>Nickname:</strong> {existingProfile.nickname || "Not specified"}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold">Skill Level</h4>
                  <p className="text-sm text-muted-foreground capitalize">
                    {existingProfile.skill_level || "Not specified"}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Physical Capability</h4>
                  <p className="text-sm text-muted-foreground capitalize">
                    {existingProfile.physical_capability || "Not specified"}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Primary Home</h4>
                  <p className="text-sm text-muted-foreground">
                    {existingProfile.primary_home ? `${existingProfile.primary_home.name}${existingProfile.primary_home.city && existingProfile.primary_home.state ? ` • ${existingProfile.primary_home.city}, ${existingProfile.primary_home.state}` : ''}` : "No primary home set"}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold">Learning Preferences</h4>
                  <p className="text-sm text-muted-foreground">
                    {existingProfile.preferred_learning_methods?.length ? existingProfile.preferred_learning_methods.join(", ") : "Not specified"}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold">Owned Tools</h4>
                  <p className="text-sm text-muted-foreground">
                    {existingProfile.owned_tools?.length ? `${existingProfile.owned_tools.length} tool${existingProfile.owned_tools.length !== 1 ? 's' : ''} in library` : "No tools specified"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Profile Button - Between Profile and Achievements */}
        <div className="flex justify-center py-4">
          <Button onClick={handleStartEdit} className="flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </Button>
        </div>

        {/* Achievements Section */}
        <div>
          <AchievementsSection />
        </div>
      </div>;
  };
  if (isLoading) {
    return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <div className="flex flex-col h-full overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg md:text-xl font-bold">My Profile</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onOpenChange(false)} 
            className="ml-4 flex-shrink-0"
          >
            Close
          </Button>
        </div>
          <div className="flex items-center justify-center py-8 flex-1">
            <div className="text-center">Loading profile...</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
  }
  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <div className="flex flex-col h-full overflow-hidden">
          {/* Header with close button */}
          <div className="px-4 md:px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg md:text-xl font-bold">My Profile</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onOpenChange(false)} 
              className="ml-4 flex-shrink-0"
            >
              Close
            </Button>
          </div>
          
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              {renderProfileView()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DIYSurveyPopup open={showSurveyEditor} onOpenChange={open => {
      setShowSurveyEditor(open);
      if (!open) {
        handleSurveyComplete();
      }
    }} mode="new" initialData={{
      skillLevel: existingProfile?.skill_level || "",
      physicalCapability: existingProfile?.physical_capability || "",
      homeOwnership: existingProfile?.home_ownership || "",
      homeBuildYear: existingProfile?.home_build_year || "",
      homeState: existingProfile?.home_state || "",
      preferredLearningMethods: existingProfile?.preferred_learning_methods || [],
      ownedTools: existingProfile?.owned_tools || [],
      fullName: existingProfile?.full_name || "",
      nickname: existingProfile?.nickname || ""
    }} />
    </>;
}