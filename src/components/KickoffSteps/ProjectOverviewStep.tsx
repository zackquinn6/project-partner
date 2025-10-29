import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Edit3, Save, X, Target, XCircle } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const { currentProjectRun, updateProjectRun, currentProject, deleteProjectRun } = useProject();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: currentProjectRun?.name || '',
    description: currentProjectRun?.description || ''
  });

  // CRITICAL FIX: Delete project instead of just marking cancelled
  // This ensures cancelled projects don't appear in stats or get reopened
  const handleCancelProject = async () => {
    if (!currentProjectRun) return;
    
    try {
      // Delete the project run entirely from database
      deleteProjectRun(currentProjectRun.id);
      
      toast.success('Project removed');
      // Navigate to projects catalog page
      navigate('/projects');
    } catch (error) {
      console.error('Error removing project:', error);
      toast.error('Failed to remove project');
    }
  };

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
          <CardTitle>Make sure this project is right for you</CardTitle>
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
            <p className="mt-1 text-muted-foreground whitespace-pre-line">
              {currentProjectRun?.diyLengthChallenges || currentProject?.diyLengthChallenges || 'None specified'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t">
            <div>
              <Label>Category</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(() => {
                  const categories: any = currentProjectRun?.category || currentProject?.category;
                  if (!categories) return <Badge variant="outline" className="text-sm">Not specified</Badge>;
                  
                  // Handle array or string format
                  let categoryArray: string[] = [];
                  if (Array.isArray(categories)) {
                    categoryArray = categories;
                  } else if (typeof categories === 'string') {
                    categoryArray = categories.split(',').map((c: string) => c.trim()).filter(Boolean);
                  } else {
                    categoryArray = [String(categories)];
                  }
                  
                  return categoryArray.map((cat, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {cat}
                    </Badge>
                  ));
                })()}
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

          <div className="sticky bottom-0 bg-background pt-4 border-t mt-4">
            {!isCompleted && (
              <div className="flex gap-2">
                <Button 
                  onClick={handleCancelProject} 
                  variant="outline"
                  className="w-1/4 border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  This isn't a good match
                </Button>
                <Button onClick={onComplete} className="flex-1 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Let's Go - Continue
                </Button>
              </div>
            )}
            
            {isCompleted && (
              <div className="w-full p-2 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-green-800 text-sm">Project Overview Completed ✓</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};