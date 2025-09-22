import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Edit3, Save, X } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';

interface ProjectOverviewStepProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const ProjectOverviewStep: React.FC<ProjectOverviewStepProps> = ({
  onComplete,
  isCompleted
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
          {currentProject?.diyLengthChallenges && (
            <div>
              <Label>DIY Challenges</Label>
              <p className="mt-1 text-muted-foreground">{currentProject.diyLengthChallenges}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t">
            <div>
              <Label>Category</Label>
               <Badge variant="outline" className="mt-1 text-sm">
                 {currentProject?.category || 'Not specified'}
               </Badge>
            </div>
            <div>
              <Label>Effort Level</Label>
              <Badge 
                variant="outline" 
                className={
                  `mt-1 text-sm ${
                     currentProject?.effortLevel === 'Low' ? 'bg-blue-100 text-blue-800' :
                     currentProject?.effortLevel === 'Medium' ? 'bg-orange-100 text-orange-800' :
                     currentProject?.effortLevel === 'High' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`
                }
              >
                {currentProject?.effortLevel || 'Not specified'}
              </Badge>
            </div>
            <div>
              <Label>Skill Level</Label>
              <Badge 
                variant="outline" 
                className={
                  `mt-1 text-sm ${
                     currentProject?.skillLevel === 'Beginner' ? 'bg-green-100 text-green-800' :
                     currentProject?.skillLevel === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                     currentProject?.skillLevel === 'Advanced' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`
                }
              >
                {currentProject?.skillLevel || 'Not specified'}
              </Badge>
            </div>
            <div>
              <Label>Estimated Time</Label>
               <Badge variant="outline" className="mt-1 text-sm">
                 {currentProject?.estimatedTime || 'Not specified'}
               </Badge>
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
        </CardContent>
      </Card>
    </div>
  );
};