import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  Award, 
  Compass, 
  Shield, 
  Clock, 
  Target, 
  BookOpen, 
  Video, 
  Wrench, 
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DIYStyleQuizProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Answer {
  id: string;
  icon: any;
  title: string;
  description: string;
}

interface Question {
  id: string;
  question: string;
  answers: Answer[];
}

interface Archetype {
  name: string;
  icon: any;
  color: string;
  description: string;
  traits: string[];
  systemPersonalization: string[];
}

const questions: Question[] = [
  {
    id: "speed",
    question: "Speed and rhythm",
    answers: [
      {
        id: "tight",
        icon: Zap,
        title: "Tight schedule",
        description: "I want a clear timeline with milestones and reminders; finishing fast energizes me."
      },
      {
        id: "lifestyle",
        icon: Clock,
        title: "Lifestyle pace",
        description: "I prefer flexible pacing with gentle nudges; progress should fit around life, not dominate it."
      }
    ]
  },
  {
    id: "quality",
    question: "Quality bar",
    answers: [
      {
        id: "good-enough",
        icon: CheckCircle2,
        title: "Good-enough quality",
        description: "I'm not a pro and don't need to pretend; function over perfection, clean finish where it matters."
      },
      {
        id: "beyond-pro",
        icon: Award,
        title: "Beyond-pro care",
        description: "I want craftsmanship and durability that exceeds typical pro standards, even if it takes longer."
      }
    ]
  },
  {
    id: "learning",
    question: "Learning style",
    answers: [
      {
        id: "bullet-point",
        icon: Target,
        title: "Bullet-point guidance",
        description: "Give me the key steps and constraints; I'll improvise and figure out the rest."
      },
      {
        id: "step-by-step",
        icon: BookOpen,
        title: "Step-by-step walkthrough",
        description: "I want sequential instructions with checkpoints; show me exactly what to do and when."
      }
    ]
  },
  {
    id: "format",
    question: "Delivery format",
    answers: [
      {
        id: "text-images",
        icon: BookOpen,
        title: "Text and images",
        description: "Diagrams, annotated photos, and concise text work best for me."
      },
      {
        id: "video",
        icon: Video,
        title: "Video-led",
        description: "Short, chaptered videos with close-ups and voiceover help me most."
      }
    ]
  },
  {
    id: "tooling",
    question: "Tooling philosophy",
    answers: [
      {
        id: "comprehensive",
        icon: Wrench,
        title: "Comprehensive toolkits",
        description: "I prefer the right tool for the job and complete kits to avoid compromises."
      },
      {
        id: "make-it-work",
        icon: Sparkles,
        title: "Make-it-work",
        description: "I'm comfortable adapting with minimal tools and clever workarounds."
      }
    ]
  },
  {
    id: "risk",
    question: "Risk and oversight",
    answers: [
      {
        id: "guardrails",
        icon: Shield,
        title: "Guardrails on",
        description: "I want safety callouts, material checks, and quality gates embedded throughout."
      },
      {
        id: "loose",
        icon: Compass,
        title: "Loose but aware",
        description: "Light safety reminders are fine; I'd rather keep momentum than stop for frequent checks."
      }
    ]
  }
];

const archetypes: Record<string, Archetype> = {
  "sprint-builder": {
    name: "The Sprint Builder",
    icon: Zap,
    color: "bg-orange-500",
    description: "Pragmatic, efficient, thrives on momentum. They want a project plan that's lean, time-boxed, and optimized for rapid wins.",
    traits: [
      "Speed: Tight schedule, milestone-driven",
      "Quality: 'Good enough' is fine—function over polish",
      "Learning: Prefers bullet points, quick cues",
      "Delivery: Text + images for fast scanning",
      "Tooling: Make-it-work improviser"
    ],
    systemPersonalization: [
      "Auto-generate short checklists",
      "Emphasize deadlines and progress bars",
      "Offer substitution tips for tools/materials"
    ]
  },
  "master-crafter": {
    name: "The Master Crafter",
    icon: Award,
    color: "bg-purple-500",
    description: "Perfectionist, detail-oriented, motivated by craftsmanship. They want to savor the process and produce heirloom-quality results.",
    traits: [
      "Speed: Willing to take time, sees DIY as a lifestyle",
      "Quality: Wants results that rival or exceed pros",
      "Learning: Step-by-step, detailed walkthroughs",
      "Delivery: Video-rich, with close-ups and demonstrations",
      "Tooling: Prefers comprehensive kits"
    ],
    systemPersonalization: [
      "Provide advanced tutorials and premium material options",
      "Embed quality checkpoints",
      "Suggest pro-level tool bundles"
    ]
  },
  "explorer": {
    name: "The Explorer",
    icon: Compass,
    color: "bg-blue-500",
    description: "Curious, playful, and motivated by learning. They enjoy the journey as much as the outcome.",
    traits: [
      "Speed: Flexible, lifestyle pace",
      "Quality: Balanced—wants things to look good but not obsessive",
      "Learning: Bullet points with room to experiment",
      "Delivery: Text + images, with optional deep dives",
      "Tooling: Mix of improvisation and occasional full kits"
    ],
    systemPersonalization: [
      "Offer 'choose your own path' flows",
      "Highlight creative alternatives",
      "Provide optional 'pro tips' without forcing them"
    ]
  },
  "guided-achiever": {
    name: "The Guided Achiever",
    icon: Shield,
    color: "bg-green-500",
    description: "Motivated by clarity and reassurance. They want to feel supported and confident they're 'doing it right.'",
    traits: [
      "Speed: Likes structure but not frantic—steady progress",
      "Quality: Wants care and polish, but not perfectionism",
      "Learning: Step-by-step instructions for confidence",
      "Delivery: Prefers video or hybrid formats",
      "Tooling: Leans toward comprehensive kits for reliability"
    ],
    systemPersonalization: [
      "Provide structured project timelines with checkpoints",
      "Embed safety and quality guardrails",
      "Recommend curated tool bundles with minimal decision fatigue"
    ]
  }
};

export default function DIYStyleQuiz({ open, onOpenChange }: DIYStyleQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswer = (questionId: string, answerId: string) => {
    const newAnswers = { ...answers, [questionId]: answerId };
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate result
      const archetypeResult = calculateArchetype(newAnswers);
      setResult(archetypeResult);
      
      // Save to local storage
      localStorage.setItem('diyStyleArchetype', archetypeResult);
      localStorage.setItem('diyStyleAnswers', JSON.stringify(newAnswers));
      
      toast({
        title: "Quiz Complete!",
        description: "Your DIY style has been identified.",
      });
    }
  };

  const calculateArchetype = (answers: Record<string, string>): string => {
    const scoring = {
      "sprint-builder": 0,
      "master-crafter": 0,
      "explorer": 0,
      "guided-achiever": 0
    };

    // Speed
    if (answers.speed === "tight") {
      scoring["sprint-builder"] += 2;
      scoring["guided-achiever"] += 2;
    } else {
      scoring["master-crafter"] += 2;
      scoring["explorer"] += 2;
    }

    // Quality
    if (answers.quality === "good-enough") {
      scoring["sprint-builder"] += 2;
      scoring["explorer"] += 2;
    } else {
      scoring["master-crafter"] += 2;
      scoring["guided-achiever"] += 2;
    }

    // Learning
    if (answers.learning === "bullet-point") {
      scoring["sprint-builder"] += 2;
      scoring["explorer"] += 2;
    } else {
      scoring["master-crafter"] += 2;
      scoring["guided-achiever"] += 2;
    }

    // Format
    if (answers.format === "text-images") {
      scoring["sprint-builder"] += 2;
      scoring["explorer"] += 2;
    } else {
      scoring["master-crafter"] += 2;
      scoring["guided-achiever"] += 2;
    }

    // Tooling
    if (answers.tooling === "comprehensive") {
      scoring["master-crafter"] += 2;
      scoring["guided-achiever"] += 2;
    } else {
      scoring["sprint-builder"] += 2;
      scoring["explorer"] += 2;
    }

    // Risk
    if (answers.risk === "guardrails") {
      scoring["master-crafter"] += 2;
      scoring["guided-achiever"] += 2;
    } else {
      scoring["sprint-builder"] += 2;
      scoring["explorer"] += 2;
    }

    // Find highest score
    let maxScore = 0;
    let resultArchetype = "sprint-builder";
    
    Object.entries(scoring).forEach(([archetype, score]) => {
      if (score > maxScore) {
        maxScore = score;
        resultArchetype = archetype;
      }
    });

    return resultArchetype;
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setResult(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setCurrentQuestion(0);
      setAnswers({});
      setResult(null);
    }, 300);
  };

  if (result) {
    const archetype = archetypes[result];
    const ArchetypeIcon = archetype.icon;

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Your DIY Style</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className={`${archetype.color} text-white p-8 rounded-lg text-center`}>
              <ArchetypeIcon className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">{archetype.name}</h2>
              <p className="text-lg opacity-90">{archetype.description}</p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Your Traits
                  </h3>
                  <ul className="space-y-2">
                    {archetype.traits.map((trait, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{trait}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    How We'll Personalize Your Experience
                  </h3>
                  <ul className="space-y-2">
                    {archetype.systemPersonalization.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleRestart} variant="outline" className="flex-1">
                Retake Quiz
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const question = questions[currentQuestion];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Discover Your DIY Style
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">{question.question}</h3>
            <p className="text-sm text-muted-foreground">Choose the option that best describes you</p>
          </div>

          <div className="space-y-3">
            {question.answers.map((answer) => {
              const AnswerIcon = answer.icon;
              return (
                <Card 
                  key={answer.id}
                  className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
                  onClick={() => handleAnswer(question.id, answer.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <AnswerIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold mb-1">{answer.title}</h4>
                        <p className="text-sm text-muted-foreground">{answer.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
