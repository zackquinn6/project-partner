import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Brain, 
  Eye, 
  Clock, 
  Target, 
  BookOpen, 
  Zap, 
  Settings,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  FileText,
  Video,
  Image as ImageIcon,
  List
} from 'lucide-react';
import { UserSkillProfile, PersonalizedProject } from '@/interfaces/AdvancedFeatures';
import { WorkflowStep } from '@/interfaces/Project';
import { useToast } from '@/components/ui/use-toast';

interface AdaptiveGuidanceEngineProps {
  skillProfile: UserSkillProfile;
  currentStep: WorkflowStep;
  projectId: string;
  onGuidanceAdjustment: (adjustment: any) => void;
}

export const AdaptiveGuidanceEngine: React.FC<AdaptiveGuidanceEngineProps> = ({
  skillProfile,
  currentStep,
  projectId,
  onGuidanceAdjustment
}) => {
  const { toast } = useToast();
  const [guidanceLevel, setGuidanceLevel] = useState<'minimal' | 'standard' | 'detailed' | 'comprehensive'>('standard');
  const [adaptiveMode, setAdaptiveMode] = useState(true);
  const [currentDifficulty, setCurrentDifficulty] = useState<'too-easy' | 'just-right' | 'too-hard'>('just-right');
  const [showVisualAids, setShowVisualAids] = useState(true);
  const [safetyReminders, setSafetyReminders] = useState(true);
  const [learningData, setLearningData] = useState({
    stepStartTime: Date.now(),
    questionsAsked: 0,
    mistakesMade: 0,
    timeSpent: 0
  });

  useEffect(() => {
    initializeGuidanceLevel();
    startStepTracking();
  }, [skillProfile, currentStep]);

  useEffect(() => {
    if (adaptiveMode) {
      adjustGuidanceBasedOnPerformance();
    }
  }, [learningData.timeSpent, learningData.questionsAsked, learningData.mistakesMade]);

  const initializeGuidanceLevel = () => {
    // Set initial guidance level based on skill profile
    const baseLevel = skillProfile.skillLevel;
    const confidence = skillProfile.confidence[currentStep.id] || 3;
    
    if (baseLevel === 'novice' || confidence < 2) {
      setGuidanceLevel('comprehensive');
      setShowVisualAids(true);
      setSafetyReminders(true);
    } else if (baseLevel === 'expert' && confidence > 4) {
      setGuidanceLevel('minimal');
      setShowVisualAids(false);
      setSafetyReminders(false);
    } else {
      setGuidanceLevel('standard');
    }
  };

  const startStepTracking = () => {
    setLearningData(prev => ({
      ...prev,
      stepStartTime: Date.now(),
      questionsAsked: 0,
      mistakesMade: 0,
      timeSpent: 0
    }));
  };

  const adjustGuidanceBasedOnPerformance = () => {
    const avgTimeForStep = skillProfile.completionTimes[currentStep.id] || 30;
    const currentTime = (Date.now() - learningData.stepStartTime) / (1000 * 60); // minutes
    
    // If user is taking much longer than expected
    if (currentTime > avgTimeForStep * 2 && guidanceLevel === 'minimal') {
      setGuidanceLevel('detailed');
      setShowVisualAids(true);
      toast({
        title: "Guidance Enhanced",
        description: "Added more detail based on your progress.",
      });
    }
    
    // If user is breezing through
    if (currentTime < avgTimeForStep * 0.5 && guidanceLevel === 'comprehensive') {
      setGuidanceLevel('standard');
      toast({
        title: "Guidance Streamlined",
        description: "Reduced detail since you're moving quickly.",
      });
    }

    // If user asks many questions
    if (learningData.questionsAsked > 2 && guidanceLevel !== 'comprehensive') {
      setGuidanceLevel('comprehensive');
      setShowVisualAids(true);
    }
  };

  const handleDifficultyFeedback = (difficulty: 'too-easy' | 'just-right' | 'too-hard') => {
    setCurrentDifficulty(difficulty);
    
    const adjustment = {
      stepId: currentStep.id,
      difficulty,
      timestamp: new Date().toISOString(),
      previousGuidanceLevel: guidanceLevel
    };

    // Adjust guidance based on feedback
    if (difficulty === 'too-hard') {
      setGuidanceLevel('comprehensive');
      setShowVisualAids(true);
      setSafetyReminders(true);
    } else if (difficulty === 'too-easy') {
      setGuidanceLevel('minimal');
      setShowVisualAids(false);
      setSafetyReminders(false);
    }

    onGuidanceAdjustment(adjustment);
    
    toast({
      title: "Feedback Recorded",
      description: "We've adjusted the guidance level for future steps.",
    });
  };

  const generateAdaptedInstructions = (): any => {
    const baseContent = currentStep.content;
    
    switch (guidanceLevel) {
      case 'minimal':
        return {
          type: 'checklist',
          content: generateChecklist(baseContent),
          showImages: false,
          showVideo: false,
          safetyNotes: false
        };
        
      case 'standard':
        return {
          type: 'standard',
          content: baseContent,
          showImages: showVisualAids,
          showVideo: false,
          safetyNotes: safetyReminders
        };
        
      case 'detailed':
        return {
          type: 'detailed',
          content: expandInstructions(baseContent),
          showImages: true,
          showVideo: true,
          safetyNotes: true,
          tips: generateTips()
        };
        
      case 'comprehensive':
        return {
          type: 'comprehensive',
          content: expandInstructions(baseContent),
          showImages: true,
          showVideo: true,
          safetyNotes: true,
          tips: generateTips(),
          troubleshooting: generateTroubleshooting(),
          qualityChecks: generateQualityChecks()
        };
    }
  };

  const generateChecklist = (content: string): string[] => {
    // Extract action items from content
    const sentences = content.split('.').filter(s => s.trim().length > 0);
    return sentences.map(s => s.trim()).slice(0, 5);
  };

  const expandInstructions = (content: string): string => {
    // Add more detail and explanations
    return content + "\n\n🔍 Pro Tip: Take your time with this step to ensure quality results.\n\n⚠️ Common Mistake: Rushing through this step often leads to issues later.";
  };

  const generateTips = (): string[] => {
    return [
      "Work in good lighting for better visibility",
      "Double-check measurements before cutting",
      "Keep tools clean and organized",
      "Take breaks if you feel frustrated"
    ];
  };

  const generateTroubleshooting = (): Array<{issue: string, solution: string}> => {
    return [
      {
        issue: "Material not fitting properly",
        solution: "Re-measure and adjust. Small gaps can often be filled with appropriate materials."
      },
      {
        issue: "Tool not working as expected",
        solution: "Check if tool is properly calibrated and clean. Review user manual if needed."
      }
    ];
  };

  const generateQualityChecks = (): string[] => {
    return [
      "All connections are secure",
      "No visible gaps or misalignments", 
      "Clean finish with no debris",
      "Functions as expected"
    ];
  };

  const adaptedInstructions = generateAdaptedInstructions();

  return (
    <div className="space-y-6">
      {/* Guidance Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Guidance Engine
          </CardTitle>
          <CardDescription>
            Personalized instructions adapted to your skill level and learning style
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="adaptive-mode">Adaptive Mode</Label>
                <Switch
                  id="adaptive-mode"
                  checked={adaptiveMode}
                  onCheckedChange={setAdaptiveMode}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="visual-aids">Visual Aids</Label>
                <Switch
                  id="visual-aids"
                  checked={showVisualAids}
                  onCheckedChange={setShowVisualAids}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="safety-reminders">Safety Reminders</Label>
                <Switch
                  id="safety-reminders"
                  checked={safetyReminders}
                  onCheckedChange={setSafetyReminders}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label>Current Skill Level</Label>
                <Badge variant="outline" className="ml-2">
                  {skillProfile.skillLevel}
                </Badge>
              </div>
              <div>
                <Label>Guidance Level</Label>
                <Badge className="ml-2">
                  {guidanceLevel}
                </Badge>
              </div>
              <div>
                <Label>Learning Style</Label>
                <Badge variant="secondary" className="ml-2">
                  {skillProfile.learningStyle}
                </Badge>
              </div>
            </div>
          </div>

          {/* Difficulty Feedback */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium">How is this step feeling?</Label>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant={currentDifficulty === 'too-easy' ? 'default' : 'outline'}
                onClick={() => handleDifficultyFeedback('too-easy')}
              >
                😴 Too Easy
              </Button>
              <Button
                size="sm"
                variant={currentDifficulty === 'just-right' ? 'default' : 'outline'}
                onClick={() => handleDifficultyFeedback('just-right')}
              >
                👍 Just Right
              </Button>
              <Button
                size="sm"
                variant={currentDifficulty === 'too-hard' ? 'default' : 'outline'}
                onClick={() => handleDifficultyFeedback('too-hard')}
              >
                😰 Too Hard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adapted Instructions Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {adaptedInstructions.type === 'checklist' && <List className="h-5 w-5" />}
            {adaptedInstructions.type === 'standard' && <FileText className="h-5 w-5" />}
            {adaptedInstructions.type === 'detailed' && <BookOpen className="h-5 w-5" />}
            {adaptedInstructions.type === 'comprehensive' && <Target className="h-5 w-5" />}
            {currentStep.step}
          </CardTitle>
          <CardDescription>
            Adapted for {skillProfile.skillLevel} level • {guidanceLevel} guidance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Instructions */}
          <div className="prose prose-sm max-w-none">
            {adaptedInstructions.type === 'checklist' ? (
              <div className="space-y-2">
                {adaptedInstructions.content.map((item: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="whitespace-pre-line">
                {adaptedInstructions.content}
              </div>
            )}
          </div>

          {/* Visual Aids */}
          {adaptedInstructions.showImages && currentStep.image && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="h-4 w-4" />
                <span className="font-medium">Visual Guide</span>
              </div>
              <img 
                src={currentStep.image} 
                alt={currentStep.step}
                className="w-full max-w-md rounded border"
              />
            </div>
          )}

          {/* Video */}
          {adaptedInstructions.showVideo && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Video className="h-4 w-4" />
                <span className="font-medium">Video Tutorial</span>
              </div>
              <div className="bg-muted rounded p-8 text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Video tutorial would appear here</p>
              </div>
            </div>
          )}

          {/* Safety Notes */}
          {adaptedInstructions.safetyNotes && (
            <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-800">Safety Reminder</span>
              </div>
              <p className="text-sm text-orange-700">
                Always wear appropriate safety equipment and work in a well-ventilated area.
              </p>
            </div>
          )}

          {/* Tips */}
          {adaptedInstructions.tips && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">Pro Tips</span>
              </div>
              <ul className="space-y-1">
                {adaptedInstructions.tips.map((tip: string, index: number) => (
                  <li key={index} className="text-sm text-blue-700 flex items-start gap-1">
                    <span className="text-blue-600">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Troubleshooting */}
          {adaptedInstructions.troubleshooting && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4" />
                <span className="font-medium">Troubleshooting</span>
              </div>
              <div className="space-y-3">
                {adaptedInstructions.troubleshooting.map((item: any, index: number) => (
                  <div key={index} className="border-l-2 border-gray-300 pl-3">
                    <div className="font-medium text-sm">{item.issue}</div>
                    <div className="text-sm text-muted-foreground">{item.solution}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quality Checks */}
          {adaptedInstructions.qualityChecks && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Quality Checklist</span>
              </div>
              <ul className="space-y-1">
                {adaptedInstructions.qualityChecks.map((check: string, index: number) => (
                  <li key={index} className="text-sm text-green-700 flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Learning Progress
          </CardTitle>
          <CardDescription>
            Your improvement over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {skillProfile.completionTimes[currentStep.id] || 30}
              </div>
              <div className="text-sm text-muted-foreground">Avg. Minutes per Step</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {Math.round((skillProfile.confidence[currentStep.id] || 3) * 20)}%
              </div>
              <div className="text-sm text-muted-foreground">Confidence Level</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};