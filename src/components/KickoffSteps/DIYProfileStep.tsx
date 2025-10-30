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
        <div className="text-center space-y-4">
          <User className="w-16 h-16 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Complete Your DIY Profile</h3>
            <p className="text-muted-foreground mb-4">
              Help us personalize your project experience by completing your DIY profile.
            </p>
            <Button onClick={handleStartEdit}>
              Complete Profile
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            Your profile helps us match you with the right tools, guidance, and partners—
            so every project starts with an advantage.
          </p>
        </div>

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
                <h4 className="font-semibold">Projects to Avoid</h4>
                <p className="text-sm text-muted-foreground">
                  {existingProfile.avoid_projects?.length ? existingProfile.avoid_projects.join(", ") : "Open to anything!"}
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

        <div className="flex justify-center gap-3">
          <Button onClick={handleStartEdit} variant="outline" className="flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </Button>
        </div>
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
        <CardContent className="space-y-6">
          {renderProfileView()}
          
          <div className="sticky bottom-0 bg-background pt-4 border-t mt-4">
            {!isCompleted && existingProfile && (
              <div>
                <Button onClick={onComplete} className="w-full bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Profile Complete - Continue
                </Button>
              </div>
            )}
            
            {!isCompleted && !existingProfile && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Complete your profile above to continue
                </p>
              </div>
            )}

            {isCompleted && (
              <div className="text-center">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Profile Setup Complete
                </Badge>
              </div>
            )}
          </div>
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
          avoidProjects: existingProfile?.avoid_projects || [],
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