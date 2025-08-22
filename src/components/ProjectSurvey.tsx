import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Send, Star } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';

interface ProjectSurveyProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onComplete: () => void;
}

interface SurveyData {
  satisfaction: number;
  confidenceChallenges: string;
  improvementSuggestions: string;
}

export const ProjectSurvey: React.FC<ProjectSurveyProps> = ({
  isOpen,
  onClose,
  projectName,
  onComplete
}) => {
  const { currentProjectRun, updateProjectRun } = useProject();
  const [surveyData, setSurveyData] = useState<SurveyData>({
    satisfaction: 0,
    confidenceChallenges: '',
    improvementSuggestions: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSatisfactionRating = (rating: number) => {
    setSurveyData(prev => ({ ...prev, satisfaction: rating }));
  };

  const handleSubmit = async () => {
    if (!currentProjectRun) return;
    
    setIsSubmitting(true);
    
    try {
      // Add survey data to the project run
      const updatedProjectRun = {
        ...currentProjectRun,
        survey_data: {
          satisfaction: surveyData.satisfaction,
          confidenceChallenges: surveyData.confidenceChallenges,
          improvementSuggestions: surveyData.improvementSuggestions,
          submittedAt: new Date().toISOString()
        },
        updatedAt: new Date()
      };
      
      await updateProjectRun(updatedProjectRun);
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error submitting survey:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  const getSatisfactionEmoji = (rating: number) => {
    switch (rating) {
      case 1: return '😞';
      case 2: return '😕';
      case 3: return '😐';
      case 4: return '😊';
      case 5: return '😃';
      default: return '😐';
    }
  };

  const getSatisfactionLabel = (rating: number) => {
    switch (rating) {
      case 1: return 'Very Dissatisfied';
      case 2: return 'Dissatisfied';
      case 3: return 'Neutral';
      case 4: return 'Satisfied';
      case 5: return 'Very Satisfied';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Project Feedback Survey</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Help us improve your DIY experience</h3>
            <p className="text-muted-foreground">
              Your feedback helps us make future projects even better for "{projectName}"
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. How satisfied are you with this project?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleSatisfactionRating(rating)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        surveyData.satisfaction === rating
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-3xl mb-1">{getSatisfactionEmoji(rating)}</div>
                      <div className="text-xs font-medium">{rating}</div>
                    </button>
                  ))}
                </div>
                
                {surveyData.satisfaction > 0 && (
                  <div className="text-center">
                    <p className="text-lg font-medium text-blue-600">
                      {getSatisfactionLabel(surveyData.satisfaction)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                2. Our goal is to maintain confidence in the project throughout the journey - where was the confidence tested?
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                In other words, where, if any, did you start to doubt the success of this project?
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={surveyData.confidenceChallenges}
                onChange={(e) => setSurveyData(prev => ({ 
                  ...prev, 
                  confidenceChallenges: e.target.value 
                }))}
                placeholder="Describe any moments where you felt uncertain about the project's success..."
                className="min-h-24"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                3. Where could project enablers be improved?
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Consider tools, materials, workflow, and coaches.
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={surveyData.improvementSuggestions}
                onChange={(e) => setSurveyData(prev => ({ 
                  ...prev, 
                  improvementSuggestions: e.target.value 
                }))}
                placeholder="Share your suggestions for improving tools, materials, workflow, or coaching support..."
                className="min-h-24"
              />
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleSkip}
              className="flex-1"
              disabled={isSubmitting}
            >
              Skip Survey
            </Button>
            <Button 
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={surveyData.satisfaction === 0 || isSubmitting}
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};