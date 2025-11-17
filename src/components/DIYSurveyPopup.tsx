import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, ArrowLeft, Sparkles, Wrench, CheckCircle2, Trophy, Target, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useTempQuiz } from "@/contexts/TempQuizContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProjectSkillsWindow } from "@/components/ProjectSkillsWindow";

interface DIYSurveyPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'new' | 'verify' | 'personality';
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

interface PersonalityTraits {
  planner: number;
  improviser: number;
  outcome: number;
  process: number;
  highRisk: number;
  lowRisk: number;
  perfectionist: number;
  functionFirst: number;
  solo: number;
  social: number;
}

interface PersonalityProfile {
  name: string;
  tagline: string;
  description: string;
  traits: PersonalityTraits;
}

export default function DIYSurveyPopup({ open, onOpenChange, mode = 'new', initialData }: DIYSurveyPopupProps) {
  const [currentStep, setCurrentStep] = useState(mode === 'verify' ? 0 : (mode === 'personality' ? -1 : 1));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [personalityAnswers, setPersonalityAnswers] = useState<number[]>(Array(10).fill(0));
  const [personalityProfile, setPersonalityProfile] = useState<PersonalityProfile | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { saveTempPersonalityProfile, saveTempProfileAnswers } = useTempQuiz();
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
  const [showProjectSkillsWindow, setShowProjectSkillsWindow] = useState(false);

  const totalSteps = mode === 'verify' ? 6 : (mode === 'personality' ? 12 : 4);
  const progress = mode === 'personality' && currentStep >= 0 ? 
    ((currentStep + 1) / 11) * 100 : 
    (currentStep / totalSteps) * 100;

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

  const personalityQuestions = [
    {
      question: "When starting a new project, I typically:",
      options: [
        "Sketch out a detailed plan or make a step-by-step list",
        "Look for similar projects online for inspiration",
        "Ask friends or family for advice first",
        "Just jump in and figure it out as I go"
      ]
    },
    {
      question: "If I'm missing a part mid-project, I usually:",
      options: [
        "Stop and buy the exact part I need",
        "Find something else that might work instead",
        "Rework my plan to work around the missing piece",
        "Ask online communities for quick solutions"
      ]
    },
    {
      question: "What makes me most proud about my DIY projects:",
      options: [
        "Saving money compared to hiring someone",
        "Learning new skills along the way", 
        "Finishing faster than I expected",
        "Getting compliments from others who see it"
      ]
    },
    {
      question: "When I encounter a new tool I've never used:",
      options: [
        "I'm cautious and research it thoroughly first",
        "I'm confident I can figure it out myself",
        "I get excited about learning something new",
        "I feel nervous and prefer sticking to tools I know"
      ]
    },
    {
      question: "I prefer projects that involve:",
      options: [
        "Fixing something that's broken",
        "Creating something entirely new",
        "A mix of both fixing and creating",
        "Modifying existing things to work better"
      ]
    },
    {
      question: "When I need to learn a new technique, I prefer to:",
      options: [
        "Try different approaches until something works",
        "Ask someone experienced to show me",
        "Watch video tutorials step-by-step",
        "Follow detailed written instructions"
      ]
    },
    {
      question: "How important is it that my projects look perfect when finished:",
      options: [
        "Very important - I want it to look professional",
        "Somewhat important - it should look good",
        "Depends on who's going to see it",
        "Not as important as it working properly"
      ]
    },
    {
      question: "I prefer to schedule my project work:",
      options: [
        "In longer weekend or evening sessions",
        "A little bit each day consistently",
        "Whenever I feel inspired to work on it",
        "Around my regular work schedule"
      ]
    },
    {
      question: "When working on projects, I prefer to:",
      options: [
        "Work alone and maintain full control",
        "Collaborate with friends or family",
        "Depends on the project complexity",
        "Ask for help only when I get stuck"
      ]
    },
    {
      question: "When project instructions are unclear, I:",
      options: [
        "Improvise and make my best guess",
        "Figure it out through trial and error",
        "Search for clearer instructions elsewhere",
        "Get frustrated and sometimes stop"
      ]
    }
  ];

  const calculatePersonalityProfile = (answers: number[]): PersonalityProfile => {
    const traits: PersonalityTraits = {
      planner: 0, improviser: 0, outcome: 0, process: 0, highRisk: 0,
      lowRisk: 0, perfectionist: 0, functionFirst: 0, solo: 0, social: 0
    };

    // Q1 - Project start approach
    if (answers[0] === 0) traits.planner += 1;
    if (answers[0] === 1) traits.planner += 1; 
    if (answers[0] === 2) { traits.planner += 1; traits.social += 1; }
    if (answers[0] === 3) traits.improviser += 1;

    // Q2 - Missing part scenario
    if (answers[1] === 0) traits.planner += 1;
    if (answers[1] === 1) { traits.improviser += 1; traits.highRisk += 1; }
    if (answers[1] === 2) { traits.planner += 1; traits.improviser += 1; }
    if (answers[1] === 3) { traits.improviser += 1; traits.social += 1; }

    // Q3 - Pride source  
    if (answers[2] === 0) traits.outcome += 1;
    if (answers[2] === 1) traits.process += 1;
    if (answers[2] === 2) traits.outcome += 1;
    if (answers[2] === 3) { traits.outcome += 1; traits.social += 1; }

    // Q4 - New tool comfort
    if (answers[3] === 0) traits.lowRisk += 1;
    if (answers[3] === 1) traits.highRisk += 1;
    if (answers[3] === 2) { traits.highRisk += 1; traits.process += 1; }
    if (answers[3] === 3) traits.lowRisk += 1;

    // Q5 - Fix vs create
    if (answers[4] === 0) traits.outcome += 1;
    if (answers[4] === 1) traits.process += 1;
    if (answers[4] === 2) { traits.outcome += 1; traits.process += 1; }
    if (answers[4] === 3) traits.process += 1;

    // Q6 - Learning style
    if (answers[5] === 0) { traits.improviser += 1; traits.highRisk += 1; }
    if (answers[5] === 1) { traits.planner += 1; traits.social += 1; }
    if (answers[5] === 2) traits.planner += 1;
    if (answers[5] === 3) traits.planner += 1;

    // Q7 - Finish importance
    if (answers[6] === 0) traits.perfectionist += 1;
    if (answers[6] === 1) traits.perfectionist += 1;
    if (answers[6] === 2) { traits.perfectionist += 1; traits.functionFirst += 1; }
    if (answers[6] === 3) traits.functionFirst += 1;

    // Q8 - Scheduling style
    if (answers[7] === 0) traits.planner += 1;
    if (answers[7] === 1) traits.planner += 1;
    if (answers[7] === 2) traits.improviser += 1;
    if (answers[7] === 3) traits.planner += 1;

    // Q9 - Work alone or with others
    if (answers[8] === 0) traits.solo += 1;
    if (answers[8] === 1) traits.social += 1;
    if (answers[8] === 2) { traits.social += 1; traits.solo += 1; }
    if (answers[8] === 3) traits.social += 1;

    // Q10 - Unclear instructions
    if (answers[9] === 0) { traits.improviser += 1; traits.highRisk += 1; }
    if (answers[9] === 1) traits.highRisk += 1;
    if (answers[9] === 2) traits.planner += 1;
    if (answers[9] === 3) traits.lowRisk += 1;

    // Determine dominant traits
    const plannerScore = traits.planner;
    const improviserScore = traits.improviser;
    const outcomeScore = traits.outcome;
    const processScore = traits.process;
    const highRiskScore = traits.highRisk;
    const lowRiskScore = traits.lowRisk;
    const perfectionistScore = traits.perfectionist;
    const functionFirstScore = traits.functionFirst;
    const soloScore = traits.solo;
    const socialScore = traits.social;

    const isPlanner = plannerScore >= improviserScore;
    const isOutcome = outcomeScore >= processScore;
    const isHighRisk = highRiskScore >= lowRiskScore;
    const isPerfectionist = perfectionistScore >= functionFirstScore;
    const isSocial = socialScore >= soloScore;

    // Determine profile
    let profile = { name: "", tagline: "", description: "" };
    
    if (isPlanner && isPerfectionist && !isSocial) {
      profile = {
        name: "Precision Planner",
        tagline: "Every cut measured twice, every detail dialed in.",
        description: "Methodical, detail-oriented, prefers control and careful execution."
      };
    } else if (!isPlanner && isHighRisk && isSocial) {
      profile = {
        name: "Bold Innovator", 
        tagline: "Turns challenges into creative wins with friends.",
        description: "Thrives on spontaneity, embraces challenges, and loves collaboration."
      };
    } else if (isPlanner && !isOutcome && isSocial) {
      profile = {
        name: "Collaborative Maker",
        tagline: "Loves the journey, thrives in shared builds.",
        description: "Enjoys learning and building with others, values the process as much as the result."
      };
    } else if (!isPlanner && isOutcome && !isSocial) {
      profile = {
        name: "Practical Doer",
        tagline: "Gets it done fast, no fuss, no frills.",
        description: "Focused on efficiency and results, works independently, adapts quickly."
      };
    } else if (isHighRisk && isPerfectionist && isOutcome) {
      profile = {
        name: "Fearless Finisher",
        tagline: "Takes on anything, delivers pro-level results.",
        description: "Confident with tools, driven to achieve high-quality outcomes under pressure."
      };
    } else {
      // Default balanced profile
      profile = {
        name: "Balanced Builder",
        tagline: "Adapts approach to match the project needs.",
        description: "Flexible in style, balances planning with improvisation based on what works best."
      };
    }

    return { ...profile, traits };
  };

  const handlePersonalityAnswer = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...personalityAnswers];
    newAnswers[questionIndex] = answerIndex;
    setPersonalityAnswers(newAnswers);
  };

  const handleNext = async () => {
    if (mode === 'personality' && currentStep === -1) {
      setCurrentStep(0);
      return;
    }

    if (mode === 'personality' && currentStep >= 0 && currentStep <= 9) {
      if (currentStep === 9) {
        // Calculate personality profile
        const profile = calculatePersonalityProfile(personalityAnswers);
        setPersonalityProfile(profile);
        setCurrentStep(10);
      } else {
        setCurrentStep(currentStep + 1);
      }
      return;
    }

    if (mode === 'personality' && currentStep === 10) {
      // Save personality profile and close
      setIsSubmitting(true);
      try {
        if (user && personalityProfile) {
          // User is signed in - save to database
          const { error } = await supabase
            .from('profiles')
            .upsert({
              user_id: user.id,
              personality_profile: personalityProfile,
              updated_at: new Date().toISOString()
            });

          if (error) {
            console.error('Error saving personality profile:', error);
            toast({
              title: "Error saving profile",
              description: "Please try again later.",
              variant: "destructive"
            });
            setIsSubmitting(false);
            return;
          }

        } else if (personalityProfile) {
          // User is not signed in - save temporarily
          saveTempPersonalityProfile(personalityProfile);
          // Removed toast notification during kickoff to prevent distraction
        }
      } catch (error) {
        console.error('Error saving personality profile:', error);
        toast({
          title: "Error saving profile",
          description: "Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsSubmitting(false);
        onOpenChange(false);
      }
      return;
    }

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
        if (user) {
          // User is signed in - save to database
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

        } else {
          // User is not signed in - save temporarily
          saveTempProfileAnswers(answers);
          // Removed toast notification during kickoff to prevent distraction
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
    if (mode === 'personality' && currentStep === 0) {
      setCurrentStep(-1);
    } else if (mode === 'personality' && currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (mode === 'verify' && currentStep === 1) {
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
    if (mode === 'personality') {
      if (currentStep === -1) return true; // Opener screen
      if (currentStep >= 0 && currentStep <= 9) {
        return personalityAnswers[currentStep] !== undefined;
      }
      if (currentStep === 10) return true; // Results screen
      return false;
    }
    
    switch (currentStep) {
      case 0: return true; // Verify step
      case 1: return answers.fullName.trim() !== ""; // Name step - require full name
      case 2: return answers.skillLevel !== "" && answers.physicalCapability !== "";
      case 3: return answers.preferredLearningMethods.length > 0;
      case 4: return true; // Owned tools is optional
      default: return false;
    }
  };

  const renderStep = () => {
    if (mode === 'personality') {
      if (currentStep === -1) {
        return (
          <div className="space-y-8 text-center">
            <div className="space-y-4">
              <h3 className="text-3xl font-bold">Find Your DIY Builder Profile 🛠️</h3>
              <div className="max-w-2xl mx-auto space-y-4 text-left">
                <p className="text-lg text-muted-foreground">
                  Take our quick 2‑minute quiz to discover your unique DIY personality — how you plan, problem‑solve, and bring projects to life.
                </p>
                
                <div className="bg-secondary/50 rounded-lg p-6 space-y-3">
                  <h4 className="font-semibold text-lg">Your results unlock:</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Tailored tool recommendations that match your style and skill</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Project tips designed for how you actually work</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Exclusive starter perks to kick off your next build with confidence</span>
                    </li>
                  </ul>
                </div>
                
                <p className="text-muted-foreground italic">
                  Whether you're a precision planner, bold improviser, or somewhere in between, you'll walk away with insights (and offers) that make your next project smoother, faster, and more fun.
                </p>
              </div>
            </div>
            
            <div>
              <Button size="lg" onClick={handleNext} className="px-8 py-4 text-lg">
                Start the Quiz — Build Smarter
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        );
      }
      
      if (currentStep >= 0 && currentStep <= 9) {
        const question = personalityQuestions[currentStep];
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
                <h3 className="text-2xl font-bold">DIY Builder Quiz</h3>
              </div>
              <p className="text-sm text-muted-foreground">Question {currentStep + 1} of 10</p>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-center">{question.question}</h4>
              
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <Card 
                    key={index} 
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      personalityAnswers[currentStep] === index ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handlePersonalityAnswer(currentStep, index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 mt-1 flex-shrink-0 ${
                          personalityAnswers[currentStep] === index 
                            ? 'bg-primary border-primary' 
                            : 'border-muted-foreground'
                        }`} />
                        <span className="text-sm">{option}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );
      }
      
      if (currentStep === 10 && personalityProfile) {
        return (
          <div className="space-y-8 text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Trophy className="w-8 h-8 text-primary" />
                <h3 className="text-3xl font-bold">Your DIY Builder Profile</h3>
              </div>
              
              <Card className="max-w-2xl mx-auto bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-2xl font-bold text-primary">{personalityProfile.name}</h4>
                    <p className="text-lg italic text-muted-foreground">"{personalityProfile.tagline}"</p>
                  </div>
                  
                  <p className="text-base leading-relaxed">{personalityProfile.description}</p>
                  
                  <div className="space-y-3 text-left">
                    <h5 className="font-semibold">Your Trait Breakdown:</h5>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Planning: {personalityProfile.traits.planner} | Improvising: {personalityProfile.traits.improviser}</div>
                      <div>Outcome-Focused: {personalityProfile.traits.outcome} | Process-Focused: {personalityProfile.traits.process}</div>
                      <div>High Risk Tolerance: {personalityProfile.traits.highRisk} | Low Risk: {personalityProfile.traits.lowRisk}</div>
                      <div>Perfectionist: {personalityProfile.traits.perfectionist} | Function-First: {personalityProfile.traits.functionFirst}</div>
                      <div>Solo Worker: {personalityProfile.traits.solo} | Social Builder: {personalityProfile.traits.social}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="bg-secondary/50 rounded-lg p-6 max-w-2xl mx-auto">
                <h5 className="font-semibold mb-3">🎁 Your Profile Unlocks:</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-2">
                    <Wrench className="w-6 h-6 text-primary mx-auto" />
                    <p className="font-medium">Custom Tool Recs</p>
                    <p className="text-muted-foreground">Gear that fits your style</p>
                  </div>
                  <div className="space-y-2">
                    <Target className="w-6 h-6 text-primary mx-auto" />
                    <p className="font-medium">Tailored Tips</p>
                    <p className="text-muted-foreground">Guidance for how you work</p>
                  </div>
                  <div className="space-y-2">
                    <Star className="w-6 h-6 text-primary mx-auto" />
                    <p className="font-medium">Starter Perks</p>
                    <p className="text-muted-foreground">Exclusive project offers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }
    }

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
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Skill Level</Label>
                      <span className="text-sm font-semibold">
                        {answers.skillLevel === "newbie" ? "🔰 Newbie" : 
                         answers.skillLevel === "confident" ? "🧰 Confident-ish" : 
                         answers.skillLevel === "hero" ? "🛠️ Hands-on Hero" : 
                         "Select your level"}
                      </span>
                    </div>
                    <Slider
                      value={[
                        answers.skillLevel === "newbie" ? 0 : 
                        answers.skillLevel === "confident" ? 1 : 
                        answers.skillLevel === "hero" ? 2 : 0
                      ]}
                      onValueChange={(value) => {
                        const levelMap = ["newbie", "confident", "hero"];
                        setAnswers(prev => ({ ...prev, skillLevel: levelMap[value[0]] }));
                      }}
                      min={0}
                      max={2}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <div className="text-center">
                        <div className="font-medium">🔰 Newbie</div>
                        <div className="text-[10px]">Just getting started</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">🧰 Confident-ish</div>
                        <div className="text-[10px]">Done a few projects</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">🛠️ Hands-on Hero</div>
                        <div className="text-[10px]">Tackled big stuff</div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowProjectSkillsWindow(true)}
                    className="w-full"
                  >
                    Optional: Define Project Skills
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Physical Capability / Effort Level */}
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-lg font-semibold">What's your physical capability / effort level?</h4>
              </div>
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Effort Level</Label>
                      <span className="text-sm font-semibold">
                        {answers.physicalCapability === "light" ? "Light-duty only" : 
                         answers.physicalCapability === "medium" ? "Medium-duty" : 
                         answers.physicalCapability === "heavy" ? "Heavy-duty" : 
                         "Select your level"}
                      </span>
                    </div>
                    <Slider
                      value={[
                        answers.physicalCapability === "light" ? 0 : 
                        answers.physicalCapability === "medium" ? 1 : 
                        answers.physicalCapability === "heavy" ? 2 : 0
                      ]}
                      onValueChange={(value) => {
                        const levelMap = ["light", "medium", "heavy"];
                        setAnswers(prev => ({ ...prev, physicalCapability: levelMap[value[0]] }));
                      }}
                      min={0}
                      max={2}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <div className="text-center">
                        <div className="font-medium">Light-duty only</div>
                        <div className="text-[10px]">Short sessions</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">Medium-duty</div>
                        <div className="text-[10px]">60lb+, 1/2-day projects</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">Heavy-duty</div>
                        <div className="text-[10px]">Full-day, heavy lifting</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">📚 How do you prefer to learn?</h3>
              <p className="text-muted-foreground">Check all that apply:</p>
            </div>
            <div className="space-y-2 md:space-y-3">
              {[
                "Videos",
                "Written guides & photos", 
                "Realtime guidance via phone or video calls"
              ].map((method) => (
                <Card key={method} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-2.5 md:p-4">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <Checkbox 
                        id={method}
                        checked={answers.preferredLearningMethods.includes(method)}
                        onCheckedChange={(checked) => handleLearningMethodChange(method, checked as boolean)}
                        className="h-4 w-4 shrink-0"
                      />
                      <Label htmlFor={method} className="cursor-pointer font-medium text-sm md:text-base">
                        {method}
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
              <h3 className="text-2xl font-bold">🔧 Your owned tools</h3>
              <p className="text-muted-foreground">Let us know what tools you already have</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Tool Library</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('show-tools-library-grid'))}
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

  const handleProjectSkillsSave = (avoidProjects: string[], projectSkills?: Record<string, number>) => {
    setAnswers(prev => ({
      ...prev,
      avoidProjects
    }));
    // Note: projectSkills could be stored separately if needed in the future
  };

  return (
    <>
      <ProjectSkillsWindow
        open={showProjectSkillsWindow}
        onOpenChange={setShowProjectSkillsWindow}
        initialAvoidProjects={answers.avoidProjects}
        onSave={handleProjectSkillsSave}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogOverlay className="z-[100]" />
          <DialogContent className="w-full h-screen max-w-full max-h-full md:w-[90vw] md:max-w-4xl md:h-[85vh] md:rounded-lg flex flex-col z-[101]">
            <DialogHeader className="text-center space-y-2 md:space-y-4 flex-shrink-0 px-4 pt-4">
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              <DialogTitle className="text-xl md:text-2xl font-bold gradient-text">
                {mode === 'verify' ? "Update Your Profile" : (mode === 'personality' ? 'DIY Builder Profile' : "Build Your Profile")}
              </DialogTitle>
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            {(currentStep > 0 || (mode === 'personality' && currentStep >= 0)) && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  {mode === 'personality' && currentStep >= 0 ? 
                    (currentStep <= 9 ? `Question ${currentStep + 1} of 10` : 'Your Results') : 
                    `Step ${currentStep} of ${mode === 'verify' ? totalSteps - 1 : totalSteps}`
                  }
                </p>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-6">
            {renderStep()}
          </div>

          {(currentStep > 0 || (mode === 'personality' && currentStep >= 0)) && (
            <div className="flex justify-between px-3 py-3 md:px-6 md:pt-6 border-t flex-shrink-0 gap-2">
              {((currentStep > 1 && mode !== 'verify') || (mode === 'personality' && currentStep >= 0) || (mode === 'verify' && currentStep === 1)) && (
                <Button variant="outline" onClick={handleBack} size="sm" className="md:h-10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {mode === 'verify' && currentStep === 1 ? 'Back to Overview' : 'Back'}
                </Button>
              )}
              
              <div className="flex-1 flex justify-end">
                <Button 
                  onClick={handleNext} 
                  disabled={!canProceed() || isSubmitting}
                  size="sm"
                  className="flex items-center space-x-2 gradient-primary text-white md:h-10"
                >
                  <span>
                    {isSubmitting ? "Saving..." : (
                      mode === 'personality' && currentStep === 10 ? "Save Profile" :
                      mode === 'personality' && currentStep === -1 ? "Start Quiz" :
                      mode === 'verify' ? (currentStep === totalSteps - 1 ? "Complete" : "Next") :
                      (currentStep === totalSteps ? "Complete" : "Next")
                    )}
                  </span>
                  {!isSubmitting && !(mode === 'personality' && currentStep === 10) && (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
}