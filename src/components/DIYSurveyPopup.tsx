import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

interface DIYSurveyPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DIYSurveyPopup({ open, onOpenChange }: DIYSurveyPopupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState({
    skillLevel: "",
    avoidProjects: [] as string[],
    physicalCapability: "",
    spaceType: "",
    currentGoal: ""
  });

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Survey complete
      onOpenChange(false);
      console.log("Survey completed:", answers);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
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
                "Plumbing",
                "Electrical", 
                "Heavy lifting / landscaping",
                "Precision work (tiling, trim)",
                "Permit/code-required stuff",
                "I'm open to anything with guidance"
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
                      <div className="text-sm text-muted-foreground">(short sessions - every improvement counts!)</div>
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
                      <div className="text-sm text-muted-foreground">(can lift 60+ lbs, moderate stamina)</div>
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
                      <div className="text-sm text-muted-foreground">(full-day projects, big tools—bring it on)</div>
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
              <h3 className="text-2xl font-bold">🏡 What kind of space are you working with?</h3>
              <p className="text-muted-foreground">Select one:</p>
            </div>
            <RadioGroup value={answers.spaceType} onValueChange={(value) => setAnswers(prev => ({ ...prev, spaceType: value }))}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="apartment" id="apartment" />
                    <Label htmlFor="apartment" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Apartment / condo</div>
                    </Label>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="owned" id="owned" />
                    <Label htmlFor="owned" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Owned home</div>
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
                "Upgrade a space I use often",
                "Build something from scratch", 
                "Learn a new skill",
                "Prep for seasonal tasks"
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
              🛠️ Toolio DIY Starter Pack
            </DialogTitle>
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
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
          <Button 
            variant="outline" 
            onClick={handleBack} 
            disabled={currentStep === 1}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          
          <Button 
            onClick={handleNext} 
            disabled={!canProceed()}
            className="flex items-center space-x-2 gradient-primary text-white"
          >
            <span>{currentStep === totalSteps ? "Complete" : "Next"}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}