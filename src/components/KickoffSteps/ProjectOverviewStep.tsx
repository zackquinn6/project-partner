import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Edit3, Save, X, Target } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';

interface ProjectOverviewStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  checkedOutputs?: Set<string>;
  onOutputToggle?: (outputId: string) => void;
}

export const ProjectOverviewStep: React.FC<ProjectOverviewStepProps> = ({
  onComplete,
  isCompleted,
  checkedOutputs = new Set(),
  onOutputToggle
}) => {
  const { currentProjectRun, updateProjectRun, currentProject } = useProject();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: currentProjectRun?.name || '',
    description: currentProjectRun?.description || ''
  });

  const handleSave = async () => {
    if (!currentProjectRun) return;
    
    await updateProjectRun({
      ...currentProjectRun,
      name: editForm.name,
      description: editForm.description,
      updatedAt: new Date()
    });
    
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      name: currentProjectRun?.name || '',
      description: currentProjectRun?.description || ''
    });
    setIsEditing(false);
  };

  if (!currentProjectRun) {
    return <div>No project selected</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          Project Overview
          {isCompleted && <CheckCircle className="w-6 h-6 text-green-500" />}
        </h2>
        <Badge variant={isCompleted ? "default" : "secondary"}>
          {isCompleted ? "Completed" : "In Progress"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Review and customize your project information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Project Name</Label>
            <p className="text-lg font-medium mt-1">{currentProjectRun.name}</p>
          </div>
          <div>
            <Label>Description</Label>
            <p className="mt-1 text-muted-foreground">{currentProjectRun.description}</p>
          </div>
          <div>
            <Label>DIY Challenges</Label>
            <p className="mt-1 text-muted-foreground">
              {currentProjectRun?.diyLengthChallenges || currentProject?.diyLengthChallenges || 'None specified'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t">
            <div>
              <Label>Category</Label>
              <div className="mt-2">
                <Badge variant="outline" className="text-sm">
                  {currentProjectRun?.category || currentProject?.category || 'Not specified'}
                </Badge>
              </div>
            </div>
            <div>
              <Label>Effort Level</Label>
              <div className="mt-2">
                <Badge 
                  variant="outline" 
                  className={
                    `text-sm ${
                       (currentProjectRun?.effortLevel || currentProject?.effortLevel) === 'Low' ? 'bg-blue-100 text-blue-800' :
                       (currentProjectRun?.effortLevel || currentProject?.effortLevel) === 'Medium' ? 'bg-orange-100 text-orange-800' :
                       (currentProjectRun?.effortLevel || currentProject?.effortLevel) === 'High' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`
                  }
                >
                  {currentProjectRun?.effortLevel || currentProject?.effortLevel || 'Not specified'}
                </Badge>
              </div>
            </div>
            <div>
              <Label>Skill Level</Label>
              <div className="mt-2">
                <Badge 
                  variant="outline" 
                  className={
                    `text-sm ${
                       (currentProjectRun?.skillLevel || currentProject?.skillLevel) === 'Beginner' ? 'bg-green-100 text-green-800' :
                       (currentProjectRun?.skillLevel || currentProject?.skillLevel) === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                       (currentProjectRun?.skillLevel || currentProject?.skillLevel) === 'Advanced' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`
                  }
                >
                  {currentProjectRun?.skillLevel || currentProject?.skillLevel || 'Not specified'}
                </Badge>
              </div>
            </div>
            <div>
              <Label>Estimated Time</Label>
              <div className="mt-2">
                <Badge variant="outline" className="text-sm">
                  {currentProjectRun?.estimatedTime || currentProject?.estimatedTime || 'Not specified'}
                </Badge>
              </div>
            </div>
          </div>

          {!isCompleted && (
            <Button onClick={onComplete} className="w-full mt-6 bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              I'm Ready, Let's Go
            </Button>
          )}
          
          {isCompleted && (
            <div className="w-full mt-6 p-2 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-800 text-sm">Project Overview Completed ✓</p>
            </div>
          )}

          {/* Step Outputs */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Step Outputs</span>
            </div>
            <div className="space-y-2">
              <div 
                className="flex items-center gap-3 p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors cursor-pointer"
                onClick={() => onOutputToggle?.('overview-complete-output')}
              >
                <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${checkedOutputs.has('overview-complete-output') ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                  {checkedOutputs.has('overview-complete-output') && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Project Overview Review Complete</div>
                  <div className="text-xs text-muted-foreground">Project overview has been reviewed and confirmed</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};