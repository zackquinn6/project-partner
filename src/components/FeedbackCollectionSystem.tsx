import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle, 
  Clock, 
  Lightbulb,
  Target,
  Send,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FeedbackCollectionSystemProps {
  stepId: string;
  phaseId: string;
  phaseName: string;
  stepName: string;
  onFeedbackSubmit: (feedback: any) => void;
}

export const FeedbackCollectionSystem: React.FC<FeedbackCollectionSystemProps> = ({
  stepId,
  phaseId,
  phaseName,
  stepName,
  onFeedbackSubmit
}) => {
  const { toast } = useToast();
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false);
  const [quickRating, setQuickRating] = useState<number | null>(null);
  const [feedbackType, setFeedbackType] = useState<'issue' | 'suggestion' | 'praise' | null>(null);
  const [feedbackData, setFeedbackData] = useState({
    clarity: 5,
    difficulty: 3,
    timeEstimate: 3,
    issues: [] as string[],
    suggestions: '',
    overallRating: 5
  });

  const issueOptions = [
    { id: 'unclear-instructions', label: 'Instructions unclear' },
    { id: 'missing-info', label: 'Missing information' },
    { id: 'wrong-time-estimate', label: 'Time estimate was wrong' },
    { id: 'tool-issues', label: 'Tool problems' },
    { id: 'material-issues', label: 'Material problems' },
    { id: 'safety-concerns', label: 'Safety concerns' },
    { id: 'quality-issues', label: 'Quality issues' },
    { id: 'too-difficult', label: 'Step too difficult' },
    { id: 'missing-visuals', label: 'Need more visuals' },
    { id: 'other', label: 'Other issue' }
  ];

  const handleQuickFeedback = (rating: number, type?: 'issue' | 'suggestion' | 'praise') => {
    setQuickRating(rating);
    setFeedbackType(type || null);

    const quickFeedback = {
      stepId,
      phaseId,
      phaseName,
      stepName,
      type: 'quick',
      rating,
      feedbackType: type,
      timestamp: new Date().toISOString()
    };

    onFeedbackSubmit(quickFeedback);

    
    // If it's a low rating, prompt for detailed feedback
    if (rating <= 2) {
      setShowDetailedFeedback(true);
    }
  };

  const handleDetailedFeedback = () => {
    const detailedFeedback = {
      stepId,
      phaseId,
      phaseName,
      stepName,
      type: 'detailed',
      ...feedbackData,
      timestamp: new Date().toISOString()
    };

    onFeedbackSubmit(detailedFeedback);
    setShowDetailedFeedback(false);

      };

  const handleIssueToggle = (issueId: string, checked: boolean) => {
    setFeedbackData(prev => ({
      ...prev,
      issues: checked 
        ? [...prev.issues, issueId]
        : prev.issues.filter(id => id !== issueId)
    }));
  };

  const StarRating = ({ rating, onRatingChange, size = "w-6 h-6" }: { 
    rating: number, 
    onRatingChange: (rating: number) => void,
    size?: string 
  }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onRatingChange(star)}
          className={`${size} transition-colors ${
            star <= rating ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          <Star className="w-full h-full fill-current" />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Quick Feedback Bar */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">How was this step?</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={quickRating === 1 ? "default" : "outline"}
                onClick={() => handleQuickFeedback(1, 'issue')}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={quickRating === 3 ? "default" : "outline"}
                onClick={() => handleQuickFeedback(3)}
              >
                👍 OK
              </Button>
              <Button
                size="sm"
                variant={quickRating === 5 ? "default" : "outline"}
                onClick={() => handleQuickFeedback(5, 'praise')}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Dialog open={showDetailedFeedback} onOpenChange={setShowDetailedFeedback}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Detailed Feedback - {stepName}</DialogTitle>
                  </DialogHeader>
                  <DetailedFeedbackForm />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Type Specific Follow-up */}
      {feedbackType && (
        <Card>
          <CardContent className="p-4">
            {feedbackType === 'issue' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">What went wrong?</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {issueOptions.slice(0, 6).map(option => (
                    <Button
                      key={option.id}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Record specific issue
                        const issueReport = {
                          stepId,
                          phaseId,
                          phaseName,
                          stepName,
                          issueType: option.id,
                          timestamp: new Date().toISOString()
                        };
                        onFeedbackSubmit(issueReport);
                        setFeedbackType(null);
                      }}
                      className="justify-start"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {feedbackType === 'suggestion' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Share your suggestion</span>
                </div>
                <Textarea 
                  placeholder="How could this step be improved?"
                  className="min-h-[80px]"
                />
                <Button size="sm">
                  <Send className="h-3 w-3 mr-1" />
                  Submit Suggestion
                </Button>
              </div>
            )}

            {feedbackType === 'praise' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">What worked well?</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Clear instructions', 'Good visuals', 'Accurate time', 'Easy to follow'].map(praise => (
                    <Badge key={praise} variant="secondary" className="cursor-pointer">
                      {praise}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  function DetailedFeedbackForm() {
    return (
      <div className="space-y-6 p-4">
        {/* Overall Rating */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Overall Rating</Label>
          <div className="flex items-center gap-3">
            <StarRating 
              rating={feedbackData.overallRating}
              onRatingChange={(rating) => setFeedbackData(prev => ({ ...prev, overallRating: rating }))}
            />
            <span className="text-sm text-muted-foreground">
              {feedbackData.overallRating}/5 stars
            </span>
          </div>
        </div>

        {/* Specific Ratings */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4" />
                Instruction Clarity
              </Label>
              <StarRating 
                rating={feedbackData.clarity}
                onRatingChange={(rating) => setFeedbackData(prev => ({ ...prev, clarity: rating }))}
                size="w-5 h-5"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" />
                Difficulty Level
              </Label>
              <RadioGroup 
                value={feedbackData.difficulty.toString()} 
                onValueChange={(value) => setFeedbackData(prev => ({ ...prev, difficulty: parseInt(value) }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="diff-1" />
                  <Label htmlFor="diff-1" className="text-sm">Too Easy</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="diff-2" />
                  <Label htmlFor="diff-2" className="text-sm">Easy</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="diff-3" />
                  <Label htmlFor="diff-3" className="text-sm">Just Right</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4" id="diff-4" />
                  <Label htmlFor="diff-4" className="text-sm">Hard</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="5" id="diff-5" />
                  <Label htmlFor="diff-5" className="text-sm">Too Hard</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" />
                Time Estimate
              </Label>
              <RadioGroup 
                value={feedbackData.timeEstimate.toString()} 
                onValueChange={(value) => setFeedbackData(prev => ({ ...prev, timeEstimate: parseInt(value) }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="time-1" />
                  <Label htmlFor="time-1" className="text-sm">Much too long</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="time-2" />
                  <Label htmlFor="time-2" className="text-sm">Too long</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="time-3" />
                  <Label htmlFor="time-3" className="text-sm">About right</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4" id="time-4" />
                  <Label htmlFor="time-4" className="text-sm">Too short</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="5" id="time-5" />
                  <Label htmlFor="time-5" className="text-sm">Much too short</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>

        {/* Issues Encountered */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Issues Encountered</Label>
          <div className="grid grid-cols-2 gap-2">
            {issueOptions.map(option => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={feedbackData.issues.includes(option.id)}
                  onCheckedChange={(checked) => handleIssueToggle(option.id, checked as boolean)}
                />
                <Label htmlFor={option.id} className="text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions */}
        <div className="space-y-2">
          <Label htmlFor="suggestions" className="text-base font-semibold">
            Suggestions for Improvement
          </Label>
          <Textarea
            id="suggestions"
            placeholder="How could this step be improved? What would have made it easier?"
            value={feedbackData.suggestions}
            onChange={(e) => setFeedbackData(prev => ({ ...prev, suggestions: e.target.value }))}
            className="min-h-[100px]"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button onClick={handleDetailedFeedback} className="flex-1">
            <Send className="h-4 w-4 mr-2" />
            Submit Feedback
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowDetailedFeedback(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }
};