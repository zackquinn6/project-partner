import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, User, Edit3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
interface ProfileManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
interface ProfileData {
  skill_level?: string;
  avoid_projects?: string[];
  physical_capability?: string;
  space_type?: string;
  current_goal?: string;
  survey_completed_at?: string;
}
export default function ProfileManager({
  open,
  onOpenChange
}: ProfileManagerProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [existingProfile, setExistingProfile] = useState<ProfileData | null>(null);
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const [answers, setAnswers] = useState({
    skillLevel: "",
    avoidProjects: [] as string[],
    physicalCapability: "",
    spaceType: "",
    currentGoal: ""
  });
  const totalSteps = 5;
  const progress = currentStep / totalSteps * 100;
  useEffect(() => {
    if (open && user) {
      loadExistingProfile();
    }
  }, [open, user]);
  const loadExistingProfile = async () => {
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('skill_level, avoid_projects, physical_capability, space_type, current_goal, survey_completed_at').eq('user_id', user?.id).maybeSingle();
      if (error) {
        console.error('Error loading profile:', error);
        setExistingProfile(null);
        setIsEditing(true);
      } else if (data && data.survey_completed_at) {
        setExistingProfile(data);
        setIsEditing(false);
        // Pre-fill form with existing data
        setAnswers({
          skillLevel: data.skill_level || "",
          avoidProjects: data.avoid_projects || [],
          physicalCapability: data.physical_capability || "",
          spaceType: data.space_type || "",
          currentGoal: data.current_goal || ""
        });
      } else {
        setExistingProfile(null);
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setExistingProfile(null);
      setIsEditing(true);
    } finally {
      setIsLoading(false);
    }
  };
  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Survey complete - save to database
      setIsSubmitting(true);
      try {
        const {
          error
        } = await supabase.from('profiles').update({
          skill_level: answers.skillLevel,
          avoid_projects: answers.avoidProjects,
          physical_capability: answers.physicalCapability,
          space_type: answers.spaceType,
          current_goal: answers.currentGoal,
          survey_completed_at: new Date().toISOString()
        }).eq('user_id', user?.id);
        if (error) {
          console.error('Error saving profile:', error);
          toast({
            title: "Error saving profile",
            description: "Please try again later.",
            variant: "destructive"
          });
          return;
        }

        // Reload profile data
        await loadExistingProfile();
        setCurrentStep(1); // Reset to step 1 for next time
      } catch (error) {
        console.error('Error saving profile:', error);
        toast({
          title: "Error saving profile",
          description: "Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  const handleStartEdit = () => {
    setIsEditing(true);
    setCurrentStep(1);
  };
  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentStep(1);
    // Reset to existing data
    if (existingProfile) {
      setAnswers({
        skillLevel: existingProfile.skill_level || "",
        avoidProjects: existingProfile.avoid_projects || [],
        physicalCapability: existingProfile.physical_capability || "",
        spaceType: existingProfile.space_type || "",
        currentGoal: existingProfile.current_goal || ""
      });
    }
  };
  const handleAvoidProjectChange = (project: string, checked: boolean) => {
    if (checked) {
      setAnswers(prev => ({
        ...prev,
        avoidProjects: [...prev.avoidProjects, project]
      }));
    } else {
      setAnswers(prev => ({
        ...prev,
        avoidProjects: prev.avoidProjects.filter(p => p !== project)
      }));
    }
  };
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return answers.skillLevel !== "";
      case 2:
        return true;
      // Can proceed even with no selections
      case 3:
        return answers.physicalCapability !== "";
      case 4:
        return answers.spaceType !== "";
      case 5:
        return answers.currentGoal !== "";
      default:
        return false;
    }
  };
  const renderProfileView = () => {
    if (!existingProfile) return null;
    return <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
            <User className="w-6 h-6" />
            Your DIY Profile
          </h3>
          <p className="text-muted-foreground">Your DIY Profile helps us match you with the right tools, guidance, and partners—
so every project starts with an advantage.</p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold">Skill Level</h4>
                  <p className="text-sm text-muted-foreground capitalize">{existingProfile.skill_level}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Projects to Avoid</h4>
                  <p className="text-sm text-muted-foreground">
                    {existingProfile.avoid_projects?.length ? existingProfile.avoid_projects.join(", ") : "Open to anything!"}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Physical Capability</h4>
                  <p className="text-sm text-muted-foreground capitalize">{existingProfile.physical_capability}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Living Situation</h4>
                  <p className="text-sm text-muted-foreground capitalize">{existingProfile.space_type}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Current Goal</h4>
                  <p className="text-sm text-muted-foreground capitalize">{existingProfile.current_goal}</p>
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
      </div>;
  };
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">🧠 What's your DIY skill level?</h3>
              <p className="text-muted-foreground">Select one:</p>
            </div>
            <RadioGroup value={answers.skillLevel} onValueChange={value => setAnswers(prev => ({
            ...prev,
            skillLevel: value
          }))}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="newbie" id="newbie" />
                    <Label htmlFor="newbie" className="flex-1 cursor-pointer">
                      <div className="font-semibold">🔰 Newbie</div>
                      <div className="text-sm text-muted-foreground">I'm just getting started—teach me everything.</div>
                    </Label>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="confident" id="confident" />
                    <Label htmlFor="confident" className="flex-1 cursor-pointer">
                      <div className="font-semibold">🧰 Confident-ish</div>
                      <div className="text-sm text-muted-foreground">I've done a few projects and want to level up.</div>
                    </Label>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="hero" id="hero" />
                    <Label htmlFor="hero" className="flex-1 cursor-pointer">
                      <div className="font-semibold">🛠️ Hands-on Hero</div>
                      <div className="text-sm text-muted-foreground">I've tackled big stuff and want to go further.</div>
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </RadioGroup>
          </div>;
      case 2:
        return <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">🚫 What types of projects do you avoid (for now)?</h3>
              <p className="text-muted-foreground">Check all that apply:</p>
            </div>
            <div className="space-y-3">
              {["Demo & heavy lifting", "Drywall finishing", "Painting", "Electrical", "Plumbing", "Precision & high patience: tiling, trim", "Permit-required stuff", "Open to anything!"].map(project => <Card key={project} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox id={project} checked={answers.avoidProjects.includes(project)} onCheckedChange={checked => handleAvoidProjectChange(project, checked as boolean)} />
                      <Label htmlFor={project} className="cursor-pointer font-medium">
                        {project}
                      </Label>
                    </div>
                  </CardContent>
                </Card>)}
            </div>
          </div>;
      case 3:
        return <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">💪 What's your physical capability?</h3>
              <p className="text-muted-foreground">Select one:</p>
            </div>
            <RadioGroup value={answers.physicalCapability} onValueChange={value => setAnswers(prev => ({
            ...prev,
            physicalCapability: value
          }))}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Light-duty only</div>
                      <div className="text-sm text-muted-foreground">I prefer short sessions - but hey every improvement counts!</div>
                    </Label>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Medium-duty</div>
                      <div className="text-sm text-muted-foreground">I can lift 60lb+ and enough stamina for 1/2-day projects</div>
                    </Label>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="heavy" id="heavy" />
                    <Label htmlFor="heavy" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Heavy-duty</div>
                      <div className="text-sm text-muted-foreground">I can run full-day projects with heavy lifting</div>
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </RadioGroup>
          </div>;
      case 4:
        return <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">🏡 Do you rent or own?</h3>
              <p className="text-muted-foreground">Select one:</p>
            </div>
            <RadioGroup value={answers.spaceType} onValueChange={value => setAnswers(prev => ({
            ...prev,
            spaceType: value
          }))}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="rent" id="rent" />
                    <Label htmlFor="rent" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Rent</div>
                    </Label>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="own" id="own" />
                    <Label htmlFor="own" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Own</div>
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </RadioGroup>
          </div>;
      case 5:
        return <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">🎯 What's your current DIY goal?</h3>
              <p className="text-muted-foreground">Select one:</p>
            </div>
            <RadioGroup value={answers.currentGoal} onValueChange={value => setAnswers(prev => ({
            ...prev,
            currentGoal: value
          }))}>
              {["Fix something broken", "Upgrade", "Renovate", "Maintain"].map(goal => <Card key={goal} className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={goal} id={goal} />
                      <Label htmlFor={goal} className="flex-1 cursor-pointer">
                        <div className="font-semibold">{goal}</div>
                      </Label>
                    </div>
                  </CardContent>
                </Card>)}
            </RadioGroup>
          </div>;
      default:
        return null;
    }
  };
  if (isLoading) {
    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">Loading profile...</div>
          </div>
        </DialogContent>
      </Dialog>;
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!isEditing && existingProfile ? <>
            <DialogHeader className="text-center">
              <DialogTitle className="text-2xl font-bold">My Profile</DialogTitle>
            </DialogHeader>
            <div className="py-6">
              {renderProfileView()}
            </div>
          </> : <>
            <DialogHeader className="text-center space-y-4">
              <DialogTitle className="text-2xl font-bold">
                {existingProfile ? "Update Your Profile" : "Complete Your Profile"}
              </DialogTitle>
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  Step {currentStep} of {totalSteps}
                </p>
              </div>
            </DialogHeader>

            <div className="py-6">
              {renderStep()}
            </div>

            <div className="flex justify-between pt-6 border-t">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="flex items-center space-x-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </Button>
                
                {existingProfile && <Button variant="outline" onClick={handleCancelEdit} className="flex items-center space-x-2">
                    Cancel
                  </Button>}
              </div>
              
              <Button onClick={handleNext} disabled={!canProceed() || isSubmitting} className="flex items-center space-x-2 gradient-primary text-white">
                <span>{isSubmitting ? "Saving..." : currentStep === totalSteps ? "Save Profile" : "Next"}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </>}
      </DialogContent>
    </Dialog>;
}