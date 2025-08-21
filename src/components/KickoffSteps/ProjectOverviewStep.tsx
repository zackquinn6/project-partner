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
  const { currentProjectRun, updateProjectRun } = useProject();
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
          <CardTitle className="flex items-center justify-between">
            Project Details
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Review and customize your project information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div>
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="project-description">Project Description</Label>
                <Textarea
                  id="project-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Project Name</Label>
                <p className="text-lg font-medium mt-1">{currentProjectRun.name}</p>
              </div>
              <div>
                <Label>Description</Label>
                <p className="mt-1 text-muted-foreground">{currentProjectRun.description}</p>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t">
            <div>
              <Label>Category</Label>
              <p className="font-medium">{currentProjectRun.category || 'Not specified'}</p>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Badge variant="outline">{currentProjectRun.difficulty || 'Not specified'}</Badge>
            </div>
            <div>
              <Label>Estimated Time</Label>
              <p className="font-medium">{currentProjectRun.estimatedTime || 'Not specified'}</p>
            </div>
            <div>
              <Label>Project Leader</Label>
              <p className="font-medium">{currentProjectRun.projectLeader || 'Not specified'}</p>
            </div>
          </div>

          {!isCompleted && !isEditing && (
            <Button onClick={onComplete} className="w-full mt-6 bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Project Overview Complete
            </Button>
          )}
          
          {isCompleted && (
            <div className="w-full mt-6 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 font-medium">Project Overview Completed ✓</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};