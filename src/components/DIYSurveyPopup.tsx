import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DIYSurveyPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'new' | 'verify';
  initialData?: {
    skillLevel?: string;
    avoidProjects?: string[];
    physicalCapability?: string;
    spaceType?: string;
    currentGoal?: string;
  };
}

export default function DIYSurveyPopup({ open, onOpenChange, mode = 'new', initialData }: DIYSurveyPopupProps) {
  const [currentStep, setCurrentStep] = useState(mode === 'verify' ? 0 : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const [answers, setAnswers] = useState({
    skillLevel: initialData?.skillLevel || "",
    avoidProjects: initialData?.avoidProjects || [] as string[],
    physicalCapability: initialData?.physicalCapability || "",
    spaceType: initialData?.spaceType || "",
    currentGoal: initialData?.currentGoal || ""
  });

  const totalSteps = mode === 'verify' ? 6 : 5;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = async () => {
    if (mode === 'verify' && currentStep === 0) {
      if (isEditing) {
        setCurrentStep(1);
        setIsEditing(false);
      } else {
        // User clicked "Looks Good" - proceed without changes
        onOpenChange(false);
      }
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Survey complete - save to database
      setIsSubmitting(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('profiles')
            .update({
              skill_level: answers.skillLevel,
              avoid_projects: answers.avoidProjects,
              physical_capability: answers.physicalCapability,
              space_type: answers.spaceType,
              current_goal: answers.currentGoal,
              survey_completed_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (error) {
            console.error('Error saving survey:', error);
            toast({
              title: "Error saving survey",
              description: "Please try again later.",
              variant: "destructive"
            });
            return;
          }

          toast({
            title: "Thanks for sharing!",
            description: "Your preferences have been saved.",
          });
        }
        onOpenChange(false);
      } catch (error) {
        console.error('Error completing survey:', error);
        toast({
          title: "Error saving survey",
          description: "Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setCurrentStep(1);
  };

  const handleBack = () => {
    if (mode === 'verify' && currentStep === 1) {
      setCurrentStep(0);
      setIsEditing(false);
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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
      case 0: return true; // Verify step
      case 1: return answers.skillLevel !== "";
      case 2: return true; // Can proceed even with no selections
      case 3: return answers.physicalCapability !== "";
      case 4: return answers.spaceType !== "";
      case 5: return answers.currentGoal !== "";
      default: return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold">🔍 Verify Your DIY Profile</h3>
              <p className="text-muted-foreground">Here's what we have on file. Look good?</p>
            </div>
            
            <div className="space-y-4">
              <Card className="p-4">
                <div className="space-y-3">
                  <div><strong>Skill Level:</strong> {answers.skillLevel || 'Not specified'}</div>
                  <div><strong>Projects to Avoid:</strong> {answers.avoidProjects.length > 0 ? answers.avoidProjects.join(', ') : 'None specified'}</div>
                  <div><strong>Physical Capability:</strong> {answers.physicalCapability || 'Not specified'}</div>
                  <div><strong>Living Situation:</strong> {answers.spaceType || 'Not specified'}</div>
                  <div><strong>Current Goal:</strong> {answers.currentGoal || 'Not specified'}</div>
                </div>
              </Card>
            </div>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={handleEdit}>
                Edit Profile
              </Button>
              <Button onClick={handleNext} className="gradient-primary text-white">
                Looks Good!
              </Button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">🧠 What's your DIY skill level?</h3>
              <p className="text-muted-foreground">Select one:</p>
            </div>
            <RadioGroup value={answers.skillLevel} onValueChange={(value) => setAnswers(prev => ({ ...prev, skillLevel: value }))}>
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
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">🚫 What types of projects do you avoid (for now)?</h3>
              <p className="text-muted-foreground">Check all that apply:</p>
            </div>
            <div className="space-y-3">
              {[
                "Demo & heavy lifting",
                "Drywall finishing",
                "Painting",
                "Electrical",
                "Plumbing",
                "Precision & high patience: tiling, trim",
                "Permit-required stuff",
                "Open to anything!"
              ].map((project) => (
                <Card key={project} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id={project}
                        checked={answers.avoidProjects.includes(project)}
                        onCheckedChange={(checked) => handleAvoidProjectChange(project, checked as boolean)}
                      />
                      <Label htmlFor={project} className="cursor-pointer font-medium">
                        {project}
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">💪 What's your physical capability?</h3>
              <p className="text-muted-foreground">Select one:</p>
            </div>
            <RadioGroup value={answers.physicalCapability} onValueChange={(value) => setAnswers(prev => ({ ...prev, physicalCapability: value }))}>
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
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">🏡 Do you rent or own?</h3>
              <p className="text-muted-foreground">Select one:</p>
            </div>
            <RadioGroup value={answers.spaceType} onValueChange={(value) => setAnswers(prev => ({ ...prev, spaceType: value }))}>
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
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">🎯 What's your current DIY goal?</h3>
              <p className="text-muted-foreground">Select one:</p>
            </div>
            <RadioGroup value={answers.currentGoal} onValueChange={(value) => setAnswers(prev => ({ ...prev, currentGoal: value }))}>
              {[
                "Fix something broken",
                "Upgrade",
                "Renovate",
                "Maintain"
              ].map((goal) => (
                <Card key={goal} className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={goal} id={goal} />
                      <Label htmlFor={goal} className="flex-1 cursor-pointer">
                        <div className="font-semibold">{goal}</div>
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <DialogTitle className="text-2xl font-bold gradient-text">
              {mode === 'verify' ? "Verify Your Profile" : "Let's get to know ya"}
            </DialogTitle>
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          {currentStep > 0 && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                Step {currentStep} of {mode === 'verify' ? totalSteps - 1 : totalSteps}
              </p>
            </div>
          )}
        </DialogHeader>

        <div className="py-6">
          {renderStep()}
        </div>

        {currentStep > 0 && (
          <div className="flex justify-between pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={handleBack} 
              disabled={(mode === 'new' && currentStep === 1) || (mode === 'verify' && currentStep === 1 && !isEditing)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            
            <Button 
              onClick={handleNext} 
              disabled={!canProceed() || isSubmitting}
              className="flex items-center space-x-2 gradient-primary text-white"
            >
              <span>{isSubmitting ? "Saving..." : (mode === 'verify' ? (currentStep === totalSteps - 1 ? "Complete" : "Next") : (currentStep === totalSteps ? "Complete" : "Next"))}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}