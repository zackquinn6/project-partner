import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Edit3, CheckCircle, Target, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DIYSurveyPopup from '../DIYSurveyPopup';

interface DIYProfileStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  checkedOutputs?: Set<string>;
  onOutputToggle?: (outputId: string) => void;
}

/** Project focus labels (matches workshop My Profile). */
const PROJECT_FOCUS_LABELS: Record<string, string> = {
  schedule: 'Hitting my schedule',
  quality: 'Highest quality work',
  savings: 'Maximize savings',
  all_three: 'Balanced',
};

function toolDisplayName(tool: Record<string, unknown> | null | undefined): string | undefined {
  if (!tool || typeof tool !== 'object') return undefined;
  const candidates = ['name', 'tool_name', 'title', 'label', 'appName', 'toolName'] as const;
  for (const key of candidates) {
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

      const completeProfile = {
        ...profileData,
        owned_tools: Array.isArray(profileData.owned_tools) ? profileData.owned_tools : [],
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

    return (
      <div className="space-y-1.5">
        {/* Two-card layout: Personal info ~28.75% (+15% vs 1/4) + Owned Tools */}
        <div className="grid grid-cols-1 md:grid-cols-[23fr_57fr] gap-3">
          <Card className="min-w-0">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <h4 className="font-semibold text-xs sm:text-sm truncate">Personal Info</h4>
                </div>
                <Button
                  onClick={handleStartEdit}
                  variant="outline"
                  size="sm"
                  className="h-6 min-h-6 px-1.5 gap-0.5 text-[10px] font-normal leading-none"
                >
                  <Edit3 className="w-2.5 h-2.5 shrink-0" />
                  <span className="hidden sm:inline">Edit Profile</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
              </div>

              <div className="space-y-2">
                <div>
                  <h4 className="font-semibold text-xs">Full Name</h4>
                  <p className="text-xs text-muted-foreground break-words mt-0.5">
                    {existingProfile.full_name || "Not specified"}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-xs">Nickname</h4>
                  <p className="text-xs text-muted-foreground break-words mt-0.5">
                    {existingProfile.nickname || "Not specified"}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-xs">Skill Level</h4>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">
                    {existingProfile.skill_level || "Not specified"}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-xs">Physical Capability</h4>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">
                    {existingProfile.physical_capability || "Not specified"}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-xs">Project Focus</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {existingProfile.project_focus
                      ? (PROJECT_FOCUS_LABELS[existingProfile.project_focus] ?? existingProfile.project_focus)
                      : "Not specified"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Wrench className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <h4 className="font-semibold text-xs sm:text-sm truncate">Owned Tools</h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 min-h-6 px-1.5 gap-0.5 text-[10px] font-normal leading-none"
                  onClick={() => window.dispatchEvent(new CustomEvent('show-tools-library-grid'))}
                >
                  <Edit3 className="w-2.5 h-2.5 shrink-0" />
                  <span className="hidden sm:inline">Edit Tool Library</span>
                  <span className="sm:hidden">Tools</span>
                </Button>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  {existingProfile.owned_tools?.length
                    ? `${existingProfile.owned_tools.length} tool${existingProfile.owned_tools.length !== 1 ? 's' : ''} in library`
                    : "No tools specified"}
                </p>
                <div className="mt-2">
                  <div className="flex flex-wrap gap-x-1 gap-y-2">
                    {(existingProfile.owned_tools || []).slice(0, 12).map((tool: any, index: number) => {
                      const toolId = tool?.id;
                      const toolName = toolDisplayName(tool as Record<string, unknown>);
                      const photoUrl =
                        typeof tool?.user_photo_url === 'string' && tool.user_photo_url.trim() !== ''
                          ? tool.user_photo_url
                          : (typeof tool?.photo_url === 'string' && tool.photo_url.trim() !== ''
                              ? tool.photo_url
                              : undefined);
                      const quantity = typeof tool?.quantity === 'number' ? tool.quantity : undefined;
                      const label = toolName ?? 'Tool';

                      return (
                        <div
                          key={toolId ?? toolName ?? String(index)}
                          className="flex w-[4rem] sm:w-[4.25rem] flex-col items-center gap-0.5 flex-shrink-0"
                        >
                          <div className="relative h-9 w-9 shrink-0" title={label}>
                            <div className="h-full w-full overflow-hidden rounded-md border bg-background flex items-center justify-center">
                              {photoUrl ? (
                                <img src={photoUrl} alt={label} className="h-full w-full object-cover" />
                              ) : (
                                <Wrench className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            {typeof quantity === 'number' && quantity > 1 && (
                              <div className="pointer-events-none absolute -right-1 -top-1 z-10 min-w-[1.125rem] rounded-full border border-primary/30 bg-primary px-1 py-0 text-center text-[10px] font-medium leading-none text-primary-foreground">
                                {quantity}
                              </div>
                            )}
                          </div>
                          <span className="line-clamp-2 w-full px-0.5 text-center text-[9px] leading-tight text-muted-foreground sm:text-[10px]">
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {existingProfile.owned_tools && existingProfile.owned_tools.length > 12 && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                      +{existingProfile.owned_tools.length - 12} more
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
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
            Your profile helps us customize your project to fit your tools, skillset, and build style.
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
                Your profile helps us customize your project to fit your tools, skillset, and build style.
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
        initialData={{
          skillLevel: existingProfile?.skill_level || "",
          physicalCapability: existingProfile?.physical_capability || "",
          homeOwnership: existingProfile?.home_ownership || "",
          homeBuildYear: existingProfile?.home_build_year || "",
          homeState: existingProfile?.home_state || "",
          projectFocus: existingProfile?.project_focus ?? undefined,
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