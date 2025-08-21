import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, Edit3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import DIYSurveyPopup from "./DIYSurveyPopup";

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
}

export default function ProfileManager({
  open,
  onOpenChange
}: ProfileManagerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [existingProfile, setExistingProfile] = useState<ProfileData | null>(null);
  const [showSurveyEditor, setShowSurveyEditor] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) {
      loadExistingProfile();
    }
  }, [open, user]);

  const loadExistingProfile = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          skill_level, 
          avoid_projects, 
          physical_capability, 
          home_ownership, 
          home_build_year, 
          home_state, 
          preferred_learning_methods, 
          owned_tools, 
          survey_completed_at
        `)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        setExistingProfile(null);
      } else if (data && data.survey_completed_at) {
        // Cast owned_tools from Json to array
        const profileData = {
          ...data,
          owned_tools: Array.isArray(data.owned_tools) ? data.owned_tools : []
        };
        setExistingProfile(profileData);
      } else {
        setExistingProfile(null);
      }
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

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
            <User className="w-6 h-6" />
            Your DIY Profile
          </h3>
          <p className="text-muted-foreground">
            Your DIY Profile helps us match you with the right tools, guidance, and partners—
            so every project starts with an advantage.
          </p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold">Skill Level</h4>
                  <p className="text-sm text-muted-foreground capitalize">
                    {existingProfile.skill_level || "Not specified"}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Projects to Avoid</h4>
                  <p className="text-sm text-muted-foreground">
                    {existingProfile.avoid_projects?.length 
                      ? existingProfile.avoid_projects.join(", ") 
                      : "Open to anything!"
                    }
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Physical Capability</h4>
                  <p className="text-sm text-muted-foreground capitalize">
                    {existingProfile.physical_capability || "Not specified"}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Home Details</h4>
                  <p className="text-sm text-muted-foreground">
                    {existingProfile.home_ownership ? (
                      <>
                        {existingProfile.home_ownership}
                        {existingProfile.home_build_year && ` • Built ${existingProfile.home_build_year}`}
                        {existingProfile.home_state && ` • ${existingProfile.home_state}`}
                      </>
                    ) : "Not specified"}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold">Learning Preferences</h4>
                  <p className="text-sm text-muted-foreground">
                    {existingProfile.preferred_learning_methods?.length
                      ? existingProfile.preferred_learning_methods.join(", ")
                      : "Not specified"
                    }
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold">Owned Tools</h4>
                  <p className="text-sm text-muted-foreground">
                    {existingProfile.owned_tools?.length 
                      ? `${existingProfile.owned_tools.length} tool${existingProfile.owned_tools.length !== 1 ? 's' : ''} in library`
                      : "No tools specified"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center gap-3">
          <Button onClick={handleStartEdit} className="flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            Update Profile
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">Loading profile...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold">My Profile</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            {renderProfileView()}
          </div>
        </DialogContent>
      </Dialog>

      <DIYSurveyPopup
        open={showSurveyEditor}
        onOpenChange={(open) => {
          setShowSurveyEditor(open);
          if (!open) {
            handleSurveyComplete();
          }
        }}
        mode="new"
        initialData={{
          skillLevel: existingProfile?.skill_level || "",
          avoidProjects: existingProfile?.avoid_projects || [],
          physicalCapability: existingProfile?.physical_capability || "",
          homeOwnership: existingProfile?.home_ownership || "",
          homeBuildYear: existingProfile?.home_build_year || "",
          homeState: existingProfile?.home_state || "",
          preferredLearningMethods: existingProfile?.preferred_learning_methods || [],
          ownedTools: existingProfile?.owned_tools || []
        }}
      />
    </>
  );
}