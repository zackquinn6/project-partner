import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Sparkles, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import OwnedToolsEditor from "./OwnedToolsEditor";

interface DIYSurveyPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'new' | 'verify';
  initialData?: {
    skillLevel?: string;
    avoidProjects?: string[];
    physicalCapability?: string;
    homeOwnership?: string;
    homeBuildYear?: string;
    homeState?: string;
    preferredLearningMethods?: string[];
    ownedTools?: any[];
    fullName?: string;
    nickname?: string;
  };
}

export default function DIYSurveyPopup({ open, onOpenChange, mode = 'new', initialData }: DIYSurveyPopupProps) {
  const [currentStep, setCurrentStep] = useState(mode === 'verify' ? 0 : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showOwnedToolsEditor, setShowOwnedToolsEditor] = useState(false);
  const { toast } = useToast();
  const [answers, setAnswers] = useState({
    skillLevel: initialData?.skillLevel || "",
    avoidProjects: initialData?.avoidProjects || [] as string[],
    physicalCapability: initialData?.physicalCapability || "",
    homeOwnership: initialData?.homeOwnership || "",
    homeBuildYear: initialData?.homeBuildYear || "",
    homeState: initialData?.homeState || "",
    preferredLearningMethods: initialData?.preferredLearningMethods || [] as string[],
    ownedTools: initialData?.ownedTools || [] as any[],
    fullName: initialData?.fullName || "",
    nickname: initialData?.nickname || ""
  });

  const totalSteps = mode === 'verify' ? 7 : 6;
  const progress = (currentStep / totalSteps) * 100;

  const usStates = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", 
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", 
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", 
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", 
    "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", 
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", 
    "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
  ];

  const buildYears = [
    "2020+", "2010-2019", "2000-2009", "1990-1999", "1980-1989", 
    "1970-1979", "1960-1969", "1950-1959", "1940-1949", "Pre-1940", "Not Available"
  ];

  const handleNext = async () => {
    if (mode === 'verify' && currentStep === 0) {
      if (isEditing) {
        setCurrentStep(1);
        setIsEditing(false);
      } else {
        onOpenChange(false);
      }
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSubmitting(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('profiles')
            .update({
              full_name: answers.fullName,
              nickname: answers.nickname,
              skill_level: answers.skillLevel,
              avoid_projects: answers.avoidProjects,
              physical_capability: answers.physicalCapability,
              home_ownership: answers.homeOwnership,
              home_build_year: answers.homeBuildYear,
              home_state: answers.homeState,
              preferred_learning_methods: answers.preferredLearningMethods,
              owned_tools: answers.ownedTools,
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

  const handleLearningMethodChange = (method: string, checked: boolean) => {
    if (checked) {
      setAnswers(prev => ({
        ...prev,
        preferredLearningMethods: [...prev.preferredLearningMethods, method]
      }));
    } else {
      setAnswers(prev => ({
        ...prev,
        preferredLearningMethods: prev.preferredLearningMethods.filter(m => m !== method)
      }));
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true; // Verify step
      case 1: return answers.fullName.trim() !== ""; // Name step - require full name
      case 2: return answers.skillLevel !== "" && answers.physicalCapability !== "";
      case 3: return true; // Can proceed even with no selections
      case 4: return answers.homeOwnership !== "";
      case 5: return answers.preferredLearningMethods.length > 0;
      case 6: return true; // Owned tools is optional
      default: return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold">🔍 Update Your DIY Profile</h3>
              <p className="text-muted-foreground">Here's what we have on file. Look good?</p>
            </div>
            
            <div className="space-y-4">
              <Card className="p-4">
                <div className="space-y-3">
                  <div><strong>Skill Level:</strong> {answers.skillLevel || 'Not specified'}</div>
                  <div><strong>Projects to Avoid:</strong> {answers.avoidProjects.length > 0 ? answers.avoidProjects.join(', ') : 'None specified'}</div>
                  <div><strong>Physical Capability:</strong> {answers.physicalCapability || 'Not specified'}</div>
                  <div><strong>Home Ownership:</strong> {answers.homeOwnership || 'Not specified'}</div>
                  <div><strong>Home Build Year:</strong> {answers.homeBuildYear || 'Not specified'}</div>
                  <div><strong>Home State:</strong> {answers.homeState || 'Not specified'}</div>
                  <div><strong>Learning Methods:</strong> {answers.preferredLearningMethods.length > 0 ? answers.preferredLearningMethods.join(', ') : 'None specified'}</div>
                  <div><strong>Owned Tools:</strong> {answers.ownedTools.length} tools</div>
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
              <h3 className="text-2xl font-bold">👋 Tell us about yourself!</h3>
              <p className="text-muted-foreground">Let's start with the basics</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="text-base font-semibold">Full Name *</Label>
                <Input
                  id="fullName"
                  value={answers.fullName}
                  onChange={(e) => setAnswers(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter your full name"
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="nickname" className="text-base font-semibold">Project Nickname</Label>
                <Input
                  id="nickname"
                  value={answers.nickname}
                  onChange={(e) => setAnswers(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="Choose a fun name like 'The Great One' or 'Prime Time'"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2 italic">
                  💡 Choose a fun project name like "The Great One" or "Prime Time" to make your DIY journey more exciting!
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">🧠 Experience & Capabilities</h3>
              <p className="text-muted-foreground">Help us understand your background</p>
            </div>
            
            {/* Experience Level */}
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-lg font-semibold">What's your experience level?</h4>
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

            {/* Physical Capability */}
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-lg font-semibold">What's your physical capability?</h4>
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
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">🚫 What types of projects do you avoid (for now)?</h3>
              <p className="text-muted-foreground">Check all that apply:</p>
              <p className="text-sm text-muted-foreground">This helps us get a feel for what you aren't so comfortable with. We'll use this while helping you plan out your projects</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                "Demo & heavy lifting",
                "Drywall finishing",
                "Painting",
                "Electrical",
                "Plumbing",
                "Precision & high patience: tiling, trim",
                "Permit-required stuff",
                "High heights / ladders"
              ].map((project) => (
                <Card key={project} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id={project}
                        checked={answers.avoidProjects.includes(project)}
                        onCheckedChange={(checked) => handleAvoidProjectChange(project, checked as boolean)}
                      />
                      <Label htmlFor={project} className="cursor-pointer font-medium text-sm">
                        {project}
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">🏡 Home details</h3>
              <p className="text-muted-foreground">Help us provide personalized guidance</p>
            </div>
            
            <div className="space-y-4">
              {/* Rent vs Own */}
              <div>
                <Label className="text-base font-semibold">Do you rent or own?</Label>
                <RadioGroup 
                  value={answers.homeOwnership} 
                  onValueChange={(value) => setAnswers(prev => ({ ...prev, homeOwnership: value }))}
                  className="mt-3"
                >
                  <div className="flex gap-4">
                    <Card className="flex-1 hover:border-primary/50 transition-colors cursor-pointer">
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="rent" id="rent" />
                          <Label htmlFor="rent" className="cursor-pointer font-medium">Rent</Label>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="flex-1 hover:border-primary/50 transition-colors cursor-pointer">
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="own" id="own" />
                          <Label htmlFor="own" className="cursor-pointer font-medium">Own</Label>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </RadioGroup>
              </div>

              {/* Home Build Year */}
              <div>
                <Label className="text-base font-semibold">Home build year</Label>
                <Select value={answers.homeBuildYear} onValueChange={(value) => setAnswers(prev => ({ ...prev, homeBuildYear: value }))}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select build year range" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Home State */}
              <div>
                <Label className="text-base font-semibold">Home state</Label>
                <Select value={answers.homeState} onValueChange={(value) => setAnswers(prev => ({ ...prev, homeState: value }))}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent>
                    {usStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              Home details enable personalized guidance for building regulations and warnings for project conditions like hazardous materials. Home build years can be found by searching on sites like Zillow.
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">📚 How do you prefer to learn?</h3>
              <p className="text-muted-foreground">Check all that apply:</p>
            </div>
            <div className="space-y-3">
              {[
                "Videos",
                "Written guides & photos", 
                "Realtime guidance via phone or video calls"
              ].map((method) => (
                <Card key={method} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id={method}
                        checked={answers.preferredLearningMethods.includes(method)}
                        onCheckedChange={(checked) => handleLearningMethodChange(method, checked as boolean)}
                      />
                      <Label htmlFor={method} className="cursor-pointer font-medium">
                        {method}
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">🔧 Your owned tools</h3>
              <p className="text-muted-foreground">Let us know what tools you already have</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Tool Library</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowOwnedToolsEditor(true)}
                  className="flex items-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  Edit Tool Library
                </Button>
              </div>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">
                  {answers.ownedTools.length > 0 
                    ? `${answers.ownedTools.length} tool${answers.ownedTools.length !== 1 ? 's' : ''} in your library`
                    : "No tools added yet. Click 'Edit Tool Library' to get started."
                  }
                </div>
                {answers.ownedTools.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {answers.ownedTools.slice(0, 5).map((tool: any) => (
                      <span key={tool.id} className="text-xs bg-muted px-2 py-1 rounded">
                        {tool.item}
                      </span>
                    ))}
                    {answers.ownedTools.length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{answers.ownedTools.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <DialogTitle className="text-2xl font-bold gradient-text">
                {mode === 'verify' ? "Update Your Profile" : "Build Your Profile"}
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

      <OwnedToolsEditor
        open={showOwnedToolsEditor}
        onOpenChange={setShowOwnedToolsEditor}
        ownedTools={answers.ownedTools}
        onSave={(tools) => setAnswers(prev => ({ ...prev, ownedTools: tools }))}
      />
    </>
  );
}