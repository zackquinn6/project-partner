import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Edit3, Save, X, Target, XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProject } from '@/contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: currentProjectRun?.name || '',
    description: currentProjectRun?.description || ''
  });
  const [userProfile, setUserProfile] = useState<{
    skill_level?: string;
    physical_capability?: string;
  } | null>(null);

  // Load user profile for comparison
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('skill_level, physical_capability')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      setUserProfile(data || null);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Helper function to get skill level comparison
  const getSkillLevelComparison = () => {
    const projectSkill = (currentProjectRun?.skillLevel || currentProject?.skillLevel || '').toLowerCase();
    const userSkill = (userProfile?.skill_level || '').toLowerCase();
    
    if (!projectSkill || !userSkill) return null;

    const levels = ['beginner', 'intermediate', 'advanced'];
    const projectIndex = levels.indexOf(projectSkill);
    const userIndex = levels.indexOf(userSkill);

    if (projectIndex === -1 || userIndex === -1) return null;

    if (userIndex >= projectIndex) {
      return { type: 'success', message: 'Your skill level matches or exceeds the project requirements.' };
    } else if (projectSkill === 'intermediate' && userSkill === 'beginner') {
      return { type: 'warning', message: 'This project requires intermediate skills, but your skill level is beginner. Consider getting help or additional guidance.' };
    } else if (projectSkill === 'advanced' && userIndex < projectIndex) {
      return { type: 'error', message: 'This project requires advanced skills, but your skill level is below this. This project may be too challenging without significant experience or professional help.' };
    }

    return null;
  };

  // Helper function to get effort level comparison
  // Note: Using physical_capability as a proxy for effort level since user profile doesn't have effort_level
  const getEffortLevelComparison = () => {
    const projectEffort = (currentProjectRun?.effortLevel || currentProject?.effortLevel || '').toLowerCase();
    const userCapability = (userProfile?.physical_capability || '').toLowerCase();
    
    if (!projectEffort || !userCapability) return null;

    // Map effort levels and physical capabilities
    const effortLevels = ['low', 'medium', 'high'];
    const capabilityLevels: Record<string, number> = {
      'limited': 0,
      'moderate': 1,
      'high': 2,
      'very high': 3
    };

    const projectIndex = effortLevels.indexOf(projectEffort);
    const userIndex = capabilityLevels[userCapability] ?? -1;

    if (projectIndex === -1 || userIndex === -1) return null;

    // Adjust comparison logic based on effort vs capability mapping
    if (userIndex >= projectIndex) {
      return { type: 'success', message: 'Your physical capability matches or exceeds the project effort requirements.' };
    } else if (projectEffort === 'medium' && userIndex < 1) {
      return { type: 'warning', message: 'This project requires medium effort, but your physical capability may be limited. Consider the physical demands before proceeding.' };
    } else if (projectEffort === 'high' && userIndex < 2) {
      return { type: 'error', message: 'This project requires high effort, but your physical capability may not be sufficient. This project may be too physically demanding.' };
    }

    return null;
  };

  // Helper function to parse categories (handles JSON strings and removes {} and "")
  const parseCategories = (categories: any): string[] => {
    if (!categories) return [];
    
    // If it's already an array, return unique values
    if (Array.isArray(categories)) {
      return Array.from(new Set(categories.filter(Boolean)));
    }
    
    // If it's a string, try to parse as JSON first
    if (typeof categories === 'string') {
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(categories);
        if (Array.isArray(parsed)) {
          return Array.from(new Set(parsed.filter(Boolean)));
        }
        // If parsed but not array, return as single item
        return [String(parsed)].filter(Boolean);
      } catch {
        // Not JSON, treat as comma-separated string
        const split = categories.split(',').map((c: string) => c.trim()).filter(Boolean);
        // Remove any JSON-like artifacts (quotes, braces)
        const cleaned = split.map(cat => 
          cat.replace(/["']/g, '').replace(/^\{|\}$/g, '').trim()
        ).filter(Boolean);
        return Array.from(new Set(cleaned));
      }
    }
    
    // For any other type, convert to string and clean
    const str = String(categories);
    const cleaned = str.replace(/["']/g, '').replace(/^\{|\}$/g, '').trim();
    return cleaned ? [cleaned] : [];
  };

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

  const skillComparison = getSkillLevelComparison();
  const effortComparison = getEffortLevelComparison();
  const categories = parseCategories(currentProjectRun?.category || currentProject?.category);

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
                {categories.length > 0 ? (
                  categories.map((cat, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {cat}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-sm">Not specified</Badge>
                )}
              </div>
            </div>
            <div>
              <Label>Project Skill Level</Label>
              <div className="mt-2 flex items-center gap-2">
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
                {userProfile?.skill_level && (
                  <>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">Your Skill Level:</span>
                    <Badge variant="outline" className="text-sm">
                      {userProfile.skill_level}
                    </Badge>
                  </>
                )}
                {skillComparison && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          {skillComparison.type === 'success' && (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          )}
                          {skillComparison.type === 'warning' && (
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                          )}
                          {skillComparison.type === 'error' && (
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{skillComparison.message}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            <div>
              <Label>Project Effort Level</Label>
              <div className="mt-2 flex items-center gap-2">
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
                {userProfile?.physical_capability && (
                  <>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">Your Capability:</span>
                    <Badge variant="outline" className="text-sm">
                      {userProfile.physical_capability}
                    </Badge>
                  </>
                )}
                {effortComparison && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          {effortComparison.type === 'success' && (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          )}
                          {effortComparison.type === 'warning' && (
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                          )}
                          {effortComparison.type === 'error' && (
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{effortComparison.message}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            <div>
              <Label>Estimated Time</Label>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {currentProjectRun?.estimatedTime || currentProject?.estimatedTime || 'Not specified'}
                </Badge>
                {currentProjectRun?.scalingUnit || currentProject?.scalingUnit ? (
                  <>
                    <span className="text-sm text-muted-foreground">•</span>
                    <Badge variant="outline" className="text-sm">
                      {currentProjectRun?.scalingUnit || currentProject?.scalingUnit}
                    </Badge>
                  </>
                ) : null}
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
                <Button onClick={() => {
                  console.log('🎯 ProjectOverviewStep: onComplete called');
                  onComplete();
                }} className="flex-1 bg-green-600 hover:bg-green-700">
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