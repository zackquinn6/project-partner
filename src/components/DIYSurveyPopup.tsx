import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, ArrowLeft, ArrowUp, Sparkles, Wrench, CheckCircle2, Trophy, Target, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useTempQuiz } from "@/contexts/TempQuizContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEnhancedAchievements } from "@/hooks/useEnhancedAchievements";
import {
  ProjectSkillsForm,
  buildProjectSkillRows,
  type ProjectSkillRow,
} from "@/components/ProjectSkillsWindow";
import { type PMFocus, PM_FOCUS_OPTIONS } from "@/components/landing/OnboardingDialog";
import { cn } from "@/lib/utils";

interface DIYSurveyPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'new' | 'verify' | 'personality';
  initialData?: {
    skillLevel?: string;
    physicalCapability?: string;
    homeOwnership?: string;
    homeBuildYear?: string;
    homeState?: string;
    preferredLearningMethods?: string[];
    projectFocus?: PMFocus | null;
    ownedTools?: any[];
    fullName?: string;
    nickname?: string;
    projectSkills?: Record<string, number> | null;
    avoidProjects?: string[] | null;
  };
  /** My Profile editor: save on close (no separate Save), optional achievements entry. */
  enableProgressSave?: boolean;
  /** When true, profile host is still fetching row; show loading inside this dialog. */
  initialDataLoading?: boolean;
  onProfileSaved?: () => void;
  /** Optional control (e.g. open achievements from host). */
  onOpenAchievements?: () => void;
}

/** Numbered profile wizard steps (Build / Update profile, excluding verify overview). */
const PROFILE_MAX_STEP = 5;

const PROFILE_SECTIONS: { step: number; title: string; navLabel: string }[] = [
  { step: 1, title: "Tell us about yourself", navLabel: "About you" },
  { step: 2, title: "Experience & capabilities", navLabel: "Experience" },
  { step: 3, title: "Project skills", navLabel: "Project skills" },
  { step: 4, title: "Project priorities", navLabel: "Priorities" },
  { step: 5, title: "Your tools", navLabel: "Tools" },
];

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

export default function DIYSurveyPopup({
  open,
  onOpenChange,
  mode = 'new',
  initialData,
  enableProgressSave = false,
  initialDataLoading = false,
  onProfileSaved,
  onOpenAchievements,
}: DIYSurveyPopupProps) {
  const [currentStep, setCurrentStep] = useState(mode === 'verify' ? 0 : (mode === 'personality' ? -1 : 1));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [personalityAnswers, setPersonalityAnswers] = useState<number[]>(Array(10).fill(0));
  const [personalityProfile, setPersonalityProfile] = useState<PersonalityProfile | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { checkMilestoneUnlocks } = useEnhancedAchievements(user?.id);
  const { saveTempPersonalityProfile, saveTempProfileAnswers } = useTempQuiz();
  const [answers, setAnswers] = useState({
    skillLevel: initialData?.skillLevel || "",
    physicalCapability: initialData?.physicalCapability || "",
    homeOwnership: initialData?.homeOwnership || "",
    homeBuildYear: initialData?.homeBuildYear || "",
    homeState: initialData?.homeState || "",
    preferredLearningMethods: initialData?.preferredLearningMethods ? [...initialData.preferredLearningMethods] : [] as string[],
    projectFocus: initialData?.projectFocus ?? null as PMFocus | null,
    ownedTools: initialData?.ownedTools || [] as any[],
    fullName: initialData?.fullName || "",
    nickname: initialData?.nickname || ""
  });
  const [projectSkillRows, setProjectSkillRows] = useState<ProjectSkillRow[]>(() =>
    buildProjectSkillRows(initialData?.projectSkills ?? null, initialData?.avoidProjects ?? null)
  );
  const [quickAddTools, setQuickAddTools] = useState<Record<string, boolean>>({});
  const [quickAddToolsList, setQuickAddToolsList] = useState<Array<{ id: string; name: string; variant: string; core_item_id: string }>>([]);
  // Store continuous slider values separately to allow smooth movement without snapping
  const [skillLevelSliderValue, setSkillLevelSliderValue] = useState<number>(() => {
    if (initialData?.skillLevel === "newbie") return 0;
    if (initialData?.skillLevel === "confident") return 50;
    if (initialData?.skillLevel === "hero") return 100;
    return 0;
  });
  const [physicalCapabilitySliderValue, setPhysicalCapabilitySliderValue] = useState<number>(() => {
    if (initialData?.physicalCapability === "light") return 0;
    if (initialData?.physicalCapability === "medium") return 50;
    if (initialData?.physicalCapability === "heavy") return 100;
    return 0;
  });

  const openPrevRef = useRef(false);
  const loadingPrevRef = useRef(false);

  const validateRequiredProfileFields = (): string | null => {
    if (!answers.fullName.trim() || !answers.skillLevel || !answers.physicalCapability) {
      return "Add your full name, skill level, and physical capability before closing.";
    }
    return null;
  };

  const profileProgressPercent =
    mode === 'verify' && currentStep === 0
      ? 0
      : currentStep >= 1 && currentStep <= PROFILE_MAX_STEP
        ? (currentStep / PROFILE_MAX_STEP) * 100
        : 0;
  const progress = mode === 'personality' && currentStep >= 0 ? 
    ((currentStep + 1) / 11) * 100 : 
    (mode === 'personality' ? 0 : profileProgressPercent);

  // Fetch quick-add tools from database
  useEffect(() => {
    if (open && currentStep === 5) {
      const fetchQuickAddTools = async () => {
        try {
          // Fetch variation instances marked as quick_add for tools (from unified tool_variations)
          const { data: variations, error } = await supabase
            .from('tool_variations')
            .select('id, name, core_item_id')
            .eq('item_type', 'tools')
            .eq('quick_add', true)
            .order('name', { ascending: true });

          if (error) throw error;

          if (variations) {
            // Fetch core tool names for each variation
            const coreItemIds = [...new Set(variations.map((v: any) => v.core_item_id))];
            const { data: tools, error: toolsError } = await supabase
              .from('tools')
              .select('id, name')
              .in('id', coreItemIds);

            if (toolsError) throw toolsError;

            const toolsMap = new Map((tools || []).map((t: any) => [t.id, t.name]));

            const toolsList = variations.map((variation: any) => {
              // Extract tool name and variant from variation name
              // Variation name format is typically "Tool Name | Variant" or just "Tool Name"
              const parts = variation.name.split('|').map((s: string) => s.trim());
              const toolName = parts[0];
              const variant = parts.length > 1 ? parts[1] : '';
              const coreToolName = toolsMap.get(variation.core_item_id) || toolName;
              
              return {
                id: variation.id,
                name: coreToolName,
                variant: variant,
                core_item_id: variation.core_item_id
              };
            });
            setQuickAddToolsList(toolsList);
          }
        } catch (error) {
          console.error('Error fetching quick-add tools:', error);
        }
      };

      fetchQuickAddTools();
    }
  }, [open, currentStep]);

  useEffect(() => {
    const openNow = open;
    const loadNow = initialDataLoading;

    if (!openNow) {
      openPrevRef.current = false;
      loadingPrevRef.current = loadNow;
      return;
    }

    if (mode === "personality") {
      openPrevRef.current = true;
      loadingPrevRef.current = false;
      return;
    }

    if (loadNow) {
      loadingPrevRef.current = true;
      openPrevRef.current = true;
      return;
    }

    const finishedProfileFetch = loadingPrevRef.current && !loadNow;
    const justOpened = openNow && !openPrevRef.current;
    loadingPrevRef.current = false;
    openPrevRef.current = true;

    if (!justOpened && !finishedProfileFetch) return;

    const data = initialData;
    setAnswers({
      skillLevel: data?.skillLevel || "",
      physicalCapability: data?.physicalCapability || "",
      homeOwnership: data?.homeOwnership || "",
      homeBuildYear: data?.homeBuildYear || "",
      homeState: data?.homeState || "",
      preferredLearningMethods: data?.preferredLearningMethods ? [...data.preferredLearningMethods] : [],
      projectFocus: data?.projectFocus ?? null,
      ownedTools: data?.ownedTools || [],
      fullName: data?.fullName || "",
      nickname: data?.nickname || "",
    });
    setProjectSkillRows(
      buildProjectSkillRows(data?.projectSkills ?? null, data?.avoidProjects ?? null)
    );
    setSkillLevelSliderValue(
      data?.skillLevel === "newbie"
        ? 0
        : data?.skillLevel === "confident"
          ? 50
          : data?.skillLevel === "hero"
            ? 100
            : 0
    );
    setPhysicalCapabilitySliderValue(
      data?.physicalCapability === "light"
        ? 0
        : data?.physicalCapability === "medium"
          ? 50
          : data?.physicalCapability === "heavy"
            ? 100
            : 0
    );
    setQuickAddTools({});
    setCurrentStep(mode === "verify" ? 0 : 1);
  }, [open, initialDataLoading, initialData, mode]);

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

  /** Persist Build Profile wizard data (merge quick-add tools, upsert user_profiles). Caller closes the dialog when needed. */
  const persistBuildProfile = async (options?: { showSavedToast?: boolean }): Promise<boolean> => {
    const showSavedToast = options?.showSavedToast ?? false;
    setIsSubmitting(true);
    try {
      let finalOwnedTools = [...answers.ownedTools];

      if (Object.keys(quickAddTools).length > 0) {
        for (const [variationId, isChecked] of Object.entries(quickAddTools)) {
          if (!isChecked) continue;

          const { data: variation, error: variationError } = await supabase
            .from('tool_variations')
            .select('id, name, description, photo_url, sku, core_item_id')
            .eq('id', variationId)
            .eq('item_type', 'tools')
            .single();

          if (variationError || !variation) {
            console.error('Error fetching variation:', variationError);
            continue;
          }

          const { data: coreTool, error: toolError } = await supabase
            .from('tools')
            .select('id, name, description, photo_url')
            .eq('id', variation.core_item_id)
            .single();

          if (toolError || !coreTool) {
            console.error('Error fetching core tool:', toolError);
            continue;
          }

          const toolToAdd: any = {
            id: variation.id,
            name: variation.name,
            item: coreTool.name,
            description: variation.description || coreTool.description || null,
            photo_url: variation.photo_url || coreTool.photo_url || null,
            quantity: 1,
            model_name: variation.sku || '',
          };

          if (!finalOwnedTools.some((t) => t.id === toolToAdd.id)) {
            finalOwnedTools.push(toolToAdd);
          }
        }
      }

      const skillsPayload: Record<string, number> = {};
      const avoidPayload: string[] = [];
      for (const r of projectSkillRows) {
        skillsPayload[r.name] = r.skillLevel;
        if (r.avoid) avoidPayload.push(r.name);
      }
      const hasProjectSkillActivity = projectSkillRows.some((r) => r.skillLevel > 0 || r.avoid);

      if (user) {
        const { error } = await supabase.from('user_profiles').upsert(
          {
            user_id: user.id,
            full_name: answers.fullName,
            nickname: answers.nickname,
            skill_level: answers.skillLevel,
            physical_capability: answers.physicalCapability,
            home_ownership: answers.homeOwnership,
            home_build_year: answers.homeBuildYear,
            home_state: answers.homeState,
            project_focus: answers.projectFocus,
            owned_tools: finalOwnedTools,
            project_skills: hasProjectSkillActivity ? skillsPayload : null,
            avoid_projects: avoidPayload.length > 0 ? avoidPayload : null,
            survey_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (error) {
          console.error('Error saving survey:', error);
          toast({
            title: 'Error saving survey',
            description: 'Please try again later.',
            variant: 'destructive',
          });
          return false;
        }

        void checkMilestoneUnlocks();
      } else {
        saveTempProfileAnswers({
          ...answers,
          ownedTools: finalOwnedTools,
          project_skills: hasProjectSkillActivity ? skillsPayload : null,
          avoid_projects: avoidPayload.length > 0 ? avoidPayload : null,
        });
      }

      if (showSavedToast && user) {
        toast({
          title: 'Saved',
          description: 'Your profile was updated.',
        });
      }
      onProfileSaved?.();
      return true;
    } catch (error) {
      console.error('Error completing survey:', error);
      toast({
        title: 'Error saving survey',
        description: 'Please try again later.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestCloseProfile = async () => {
    if (!enableProgressSave) {
      onOpenChange(false);
      return;
    }
    if (initialDataLoading) {
      onOpenChange(false);
      return;
    }
    if (!user) {
      onOpenChange(false);
      return;
    }
    const missing = validateRequiredProfileFields();
    if (missing) {
      toast({
        title: "Not ready to close",
        description: missing,
        variant: "destructive",
      });
      return;
    }
    const ok = await persistBuildProfile();
    if (ok) {
      onOpenChange(false);
    }
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (enableProgressSave) {
      void requestCloseProfile();
      return;
    }
    onOpenChange(false);
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
            .from('user_profiles')
            .upsert({
              user_id: user.id,
              personality_profile: personalityProfile,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
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
    
    if (currentStep < PROFILE_MAX_STEP) {
      setCurrentStep(currentStep + 1);
      return;
    }

    const ok = await persistBuildProfile();
    if (ok) {
      onOpenChange(false);
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
      case 3: return true; // Project skills — optional detail (sliders / avoid)
      case 4: return answers.projectFocus != null;
      case 5: return true; // Owned tools is optional
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
                  <div><strong>Physical Capability:</strong> {answers.physicalCapability || 'Not specified'}</div>
                  <div><strong>Project focus:</strong> {answers.projectFocus != null ? PM_FOCUS_OPTIONS.find(o => o.value === answers.projectFocus)?.title ?? answers.projectFocus : 'Not specified'}</div>
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
                <Label htmlFor="nickname" className="text-base font-semibold">Nickname</Label>
                <Input
                  id="nickname"
                  value={answers.nickname}
                  onChange={(e) => setAnswers(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="Optional"
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold">🧠 Experience & Capabilities</h3>
              <p className="text-muted-foreground mt-2">Let's create your builder profile</p>
            </div>
            
            {/* Experience Level */}
            <div className="space-y-2">
              <div className="text-center">
                <h4 className="text-lg font-semibold">What's your general home improvement experience level?</h4>
              </div>
              <Card>
                <CardContent className="p-3 space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Skill Level</Label>
                    <div className="relative py-1.5">
                      {/* Color sections background - positioned to align with slider track */}
                      <div className="absolute top-1/2 left-0 right-0 flex h-2 -translate-y-1/2 rounded-full overflow-hidden pointer-events-none">
                        <div className="w-1/3 bg-green-500"></div>
                        <div className="w-1/3 bg-blue-500"></div>
                        <div className="w-1/3 bg-black"></div>
                      </div>
                      <Slider
                        value={[skillLevelSliderValue]}
                        onValueChange={(value) => {
                          // Store continuous value for smooth slider movement
                          const sliderValue = value[0];
                          setSkillLevelSliderValue(sliderValue);
                          
                          // Round to nearest step (0, 50, or 100) for the answer
                          let roundedValue: number;
                          if (sliderValue < 25) {
                            roundedValue = 0; // Beginner
                          } else if (sliderValue < 75) {
                            roundedValue = 50; // Intermediate
                          } else {
                            roundedValue = 100; // Advanced
                          }
                          const levelMap: Record<number, string> = { 0: "newbie", 50: "confident", 100: "hero" };
                          setAnswers(prev => ({ ...prev, skillLevel: levelMap[roundedValue] }));
                        }}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full relative z-10 [&_[role=slider]]:bg-background [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary [&>div>div]:bg-transparent"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground relative">
                      <div className="text-center" style={{ width: '33.33%' }}>
                        <div className="font-medium">🔰 Beginner</div>
                        <div className="text-[10px]">Just getting started</div>
                      </div>
                      <div className="text-center" style={{ width: '33.33%' }}>
                        <div className="font-medium">🧰 Intermediate</div>
                        <div className="text-[10px]">Done a few projects</div>
                      </div>
                      <div className="text-center" style={{ width: '33.33%' }}>
                        <div className="font-medium">🛠️ Advanced</div>
                        <div className="text-[10px]">Tackled big stuff</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Physical Capability / Effort Level */}
            <div className="space-y-2">
              <div className="text-center">
                <h4 className="text-lg font-semibold">What's your physical capability / effort level?</h4>
              </div>
              <Card>
                <CardContent className="p-3 space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Effort Level</Label>
                    <div className="relative py-1.5">
                      {/* Color sections background - positioned to align with slider track */}
                      <div className="absolute top-1/2 left-0 right-0 flex h-2 -translate-y-1/2 rounded-full overflow-hidden pointer-events-none">
                        <div className="w-1/3 bg-green-500"></div>
                        <div className="w-1/3 bg-blue-500"></div>
                        <div className="w-1/3 bg-black"></div>
                      </div>
                      <Slider
                        value={[physicalCapabilitySliderValue]}
                        onValueChange={(value) => {
                          // Store continuous value for smooth slider movement
                          const sliderValue = value[0];
                          setPhysicalCapabilitySliderValue(sliderValue);
                          
                          // Round to nearest step (0, 50, or 100) for the answer
                          let roundedValue: number;
                          if (sliderValue < 25) {
                            roundedValue = 0; // Light-duty
                          } else if (sliderValue < 75) {
                            roundedValue = 50; // Medium-duty
                          } else {
                            roundedValue = 100; // Heavy-duty
                          }
                          const levelMap: Record<number, string> = { 0: "light", 50: "medium", 100: "heavy" };
                          setAnswers(prev => ({ ...prev, physicalCapability: levelMap[roundedValue] }));
                        }}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full relative z-10 [&_[role=slider]]:bg-background [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary [&>div>div]:bg-transparent"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground relative">
                      <div className="text-center" style={{ width: '33.33%' }}>
                        <div className="font-medium">Light-duty only</div>
                        <div className="text-[10px]">Short sessions</div>
                      </div>
                      <div className="text-center" style={{ width: '33.33%' }}>
                        <div className="font-medium">Medium-duty</div>
                        <div className="text-[10px]">60lb+, 1/2-day projects</div>
                      </div>
                      <div className="text-center" style={{ width: '33.33%' }}>
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
              <h3 className="text-2xl font-bold">🎯 Step 3 — Project skills</h3>
              <p className="text-muted-foreground">Define project-specific experience</p>
            </div>
            <ProjectSkillsForm
              rows={projectSkillRows}
              onRowsChange={setProjectSkillRows}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">What is most important to you?</h3>
              <p className="text-muted-foreground">Pick your primary project management focus. This helps us prioritize guidance for your projects.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 py-2" role="group" aria-label="Project management focus">
              {PM_FOCUS_OPTIONS.map(({ value, title, description, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAnswers(prev => ({ ...prev, projectFocus: value }))}
                  className={`
                    flex items-start gap-3 p-4 rounded-xl border-2 text-left
                    transition-all duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                    ${answers.projectFocus === value
                      ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                      : 'border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-muted/40 text-foreground'
                    }
                  `}
                  aria-pressed={answers.projectFocus === value}
                  aria-label={`${title}: ${description}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/80">
                    <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">{title}</span>
                    <span className="text-sm text-muted-foreground">{description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">🔧 Your owned tools</h3>
              <p className="text-muted-foreground">Let us know what tools you already have</p>
            </div>
            
            <div className="space-y-4">
              {/* Quick Add Section */}
              {quickAddToolsList.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Quick Add Common Tools</Label>
                  <Card className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {quickAddToolsList.map((tool) => {
                        const toolKey = `${tool.id}`;
                        const displayName = tool.variant ? `${tool.name} | ${tool.variant}` : tool.name;
                        return (
                          <div key={toolKey} className="flex items-center space-x-2">
                            <Checkbox
                              id={`quick-add-${toolKey}`}
                              checked={quickAddTools[toolKey] || false}
                              onCheckedChange={(checked) => {
                                setQuickAddTools(prev => ({
                                  ...prev,
                                  [toolKey]: checked as boolean
                                }));
                              }}
                            />
                            <Label htmlFor={`quick-add-${toolKey}`} className="cursor-pointer text-sm">
                              {displayName}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              )}

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
                        {tool.name || tool.item}
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

  const showProfileWizardNav =
    !initialDataLoading &&
    (mode === 'new' || mode === 'verify') &&
    currentStep >= 1 &&
    currentStep <= PROFILE_MAX_STEP;

  return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogPortal>
          <DialogOverlay className="z-[100]" />
          <DialogContent className="w-full h-screen max-w-full max-h-full md:w-[92vw] md:max-w-5xl md:h-[85vh] md:rounded-lg flex flex-col z-[101]" aria-describedby="diy-survey-description">
            <DialogDescription id="diy-survey-description" className="sr-only">
              {mode === 'verify' ? "Update your DIY profile and preferences" : (mode === 'personality' ? 'DIY builder personality quiz' : "Set up your profile for project recommendations")}
            </DialogDescription>
            <DialogHeader className="relative text-center space-y-2 md:space-y-4 flex-shrink-0 px-4 pt-4">
            {enableProgressSave ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute right-1 top-1 z-10 md:right-3 md:top-3"
                disabled={isSubmitting}
                onClick={() => void requestCloseProfile()}
              >
                Close
              </Button>
            ) : null}
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              <DialogTitle className="text-xl md:text-2xl font-bold gradient-text">
                {mode === 'verify' ? "Update Your Profile" : (mode === 'personality' ? 'DIY Builder Profile' : "Build Your Profile")}
              </DialogTitle>
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            {(currentStep > 0 || (mode === 'personality' && currentStep >= 0)) &&
              !(initialDataLoading && enableProgressSave) && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  {mode === 'personality' && currentStep >= 0 ? 
                    (currentStep <= 9 ? `Question ${currentStep + 1} of 10` : 'Your Results') : 
                    `Step ${currentStep} of ${PROFILE_MAX_STEP}`
                  }
                </p>
              </div>
            )}
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row overflow-hidden">
            {showProfileWizardNav && (
              <>
                <nav
                  className="hidden md:flex w-52 shrink-0 flex-col gap-1 border-r border-border bg-muted/20 p-3 overflow-y-auto"
                  aria-label="Profile sections"
                >
                  {PROFILE_SECTIONS.map((s) => (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setCurrentStep(s.step)}
                      className={cn(
                        'rounded-md px-3 py-2 text-left text-sm transition-colors',
                        currentStep === s.step
                          ? 'bg-primary font-medium text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                        Step {s.step}
                      </span>
                      <span className="block leading-tight">{s.navLabel}</span>
                    </button>
                  ))}
                </nav>
                <div className="md:hidden shrink-0 border-b border-border bg-muted/10 px-2 py-2 overflow-x-auto">
                  <div className="flex gap-2 pb-0.5" role="tablist" aria-label="Profile sections">
                    {PROFILE_SECTIONS.map((s) => (
                      <button
                        key={s.step}
                        type="button"
                        role="tab"
                        aria-selected={currentStep === s.step}
                        onClick={() => setCurrentStep(s.step)}
                        className={cn(
                          'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                          currentStep === s.step
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/60'
                        )}
                      >
                        {s.navLabel}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-6">
              {initialDataLoading && enableProgressSave ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
                  <p className="text-sm">Loading profile…</p>
                </div>
              ) : (
                renderStep()
              )}
            </div>
          </div>

          {!(initialDataLoading && enableProgressSave) &&
            (currentStep > 0 || (mode === 'personality' && currentStep >= 0)) && (
            <div className="flex flex-shrink-0 flex-col gap-2 border-t px-3 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6 md:pt-6">
              <div className="flex flex-wrap items-center gap-2">
                {((currentStep > 1 && mode !== 'verify') || (mode === 'personality' && currentStep >= 0) || (mode === 'verify' && currentStep === 1)) && (
                  <Button variant="outline" onClick={handleBack} size="sm" className="md:h-10">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {mode === 'verify' && currentStep === 1 ? 'Back to Overview' : 'Back'}
                  </Button>
                )}
                {enableProgressSave && showProfileWizardNav && onOpenAchievements ? (
                  <Button type="button" variant="outline" size="sm" className="md:h-10" onClick={onOpenAchievements}>
                    <Trophy className="mr-1.5 h-4 w-4" />
                    Achievements
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-1 justify-end gap-2 sm:flex-initial">
                <Button
                  onClick={() => void handleNext()}
                  disabled={!canProceed() || isSubmitting}
                  size="sm"
                  className="flex items-center space-x-2 gradient-primary text-white md:h-10"
                >
                  <span>
                    {isSubmitting ? 'Saving...' : (
                      mode === 'personality' && currentStep === 10 ? 'Save Profile' :
                      mode === 'personality' && currentStep === -1 ? 'Start Quiz' :
                      mode === 'verify' ? (currentStep === PROFILE_MAX_STEP ? 'Complete' : 'Next') :
                      (currentStep === PROFILE_MAX_STEP ? 'Complete' : 'Next')
                    )}
                  </span>
                  {!isSubmitting && !(mode === 'personality' && currentStep === 10) && (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
        </DialogPortal>
      </Dialog>
  );
}