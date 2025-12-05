import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Edit3, CheckCircle, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DIYSurveyPopup from '../DIYSurveyPopup';

interface DIYProfileStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  checkedOutputs?: Set<string>;
  onOutputToggle?: (outputId: string) => void;
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

export const DIYProfileStep: React.FC<DIYProfileStepProps> = ({ onComplete, isCompleted, checkedOutputs = new Set(), onOutputToggle }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [existingProfile, setExistingProfile] = useState<ProfileData | null>(null);
  const [showSurveyEditor, setShowSurveyEditor] = useState(false);

  useEffect(() => {
    if (user) {
      loadExistingProfile();
    }
  }, [user]);

  // Auto-open profile editor for new users when navigating to step 2
  useEffect(() => {
    if (!isLoading && !existingProfile && user) {
      setShowSurveyEditor(true);
    }
  }, [isLoading, existingProfile, user]);

  const loadExistingProfile = async () => {
    setIsLoading(true);
    try {
      // First fetch profile data
      const { data: profileData, error: profileError } = await supabase
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
          survey_completed_at,
          full_name,
          nickname
        `)
        .eq('user_id', user?.id)
        .maybeSingle();

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
      const { data: homeData, error: homeError } = await supabase
        .from('homes')
        .select('name, city, state')
        .eq('user_id', user?.id)
        .eq('is_primary', true)
        .maybeSingle();

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
    if (!existingProfile) {
      return (
        <div className="text-center space-y-2">
          <User className="w-10 h-10 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold mb-1">Complete Your DIY Profile</h3>
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

    return (
      <div className="space-y-1.5">
        <div className="text-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Your profile helps us match you with the right tools, guidance, and partners—
            so every project starts with an advantage.
          </p>
        </div>

        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
              {/* Column 1 */}
              <div className="space-y-1.5 sm:space-y-2">
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm">Full Name</h4>
                  <p className="text-xs text-muted-foreground break-words mt-0.5">
                    {existingProfile.full_name || "Not specified"}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm">Nickname</h4>
                  <p className="text-xs text-muted-foreground break-words mt-0.5">
                    {existingProfile.nickname || "Not specified"}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm">Skill Level</h4>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">
                    {existingProfile.skill_level || "Not specified"}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm">Physical Capability</h4>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">
                    {existingProfile.physical_capability || "Not specified"}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm">Primary Home</h4>
                  <p className="text-xs text-muted-foreground break-words mt-0.5">
                    {existingProfile.primary_home ? `${existingProfile.primary_home.name}${existingProfile.primary_home.city && existingProfile.primary_home.state ? ` • ${existingProfile.primary_home.city}, ${existingProfile.primary_home.state}` : ''}` : "No primary home set"}
                  </p>
                </div>
              </div>

              {/* Column 2 */}
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm">Learning Preferences</h4>
                  <p className="text-xs text-muted-foreground break-words mt-0.5">
                    {existingProfile.preferred_learning_methods?.length ? existingProfile.preferred_learning_methods.join(", ") : "Not specified"}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-xs sm:text-sm">Owned Tools</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {existingProfile.owned_tools?.length ? `${existingProfile.owned_tools.length} tool${existingProfile.owned_tools.length !== 1 ? 's' : ''} in library` : "No tools specified"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            DIY Profile
            {isCompleted && <Badge variant="secondary">Complete</Badge>}
          </CardTitle>
          <CardDescription>
            Set up your DIY profile for personalized project guidance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">Loading profile...</div>
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
                <span className="truncate">DIY Profile</span>
                {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Set up your DIY profile for personalized project guidance
              </CardDescription>
            </div>
            {existingProfile && (
              <Button 
                onClick={handleStartEdit} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1.5 text-xs h-7 flex-shrink-0 px-2"
              >
                <Edit3 className="w-3 h-3" />
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5 p-2 sm:p-3">
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
        initialData={{
          skillLevel: existingProfile?.skill_level || "",
          physicalCapability: existingProfile?.physical_capability || "",
          homeOwnership: existingProfile?.home_ownership || "",
          homeBuildYear: existingProfile?.home_build_year || "",
          homeState: existingProfile?.home_state || "",
          preferredLearningMethods: existingProfile?.preferred_learning_methods || [],
          ownedTools: existingProfile?.owned_tools || [],
          fullName: existingProfile?.full_name || "",
          nickname: existingProfile?.nickname || ""
        }} 
      />
    </>
  );
};