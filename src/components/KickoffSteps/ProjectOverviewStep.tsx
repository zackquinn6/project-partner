import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Edit3, Save, X, Target, XCircle, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProject } from '@/contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { RiskManagementWindow } from '@/components/RiskManagementWindow';
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
  const {
    currentProjectRun,
    updateProjectRun,
    currentProject,
    deleteProjectRun,
    projects
  } = useProject();
  const {
    user
  } = useAuth();
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
  const [riskManagementOpen, setRiskManagementOpen] = useState(false);

  // Load user profile for comparison
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);
  const loadUserProfile = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('skill_level, physical_capability').eq('user_id', user?.id).maybeSingle();
      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }
      setUserProfile(data || null);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };
  const templateProject = currentProject || projects.find(project => project.id === currentProjectRun?.templateId) || null;
  
  // Fetch from database as backup if templateProject doesn't have the fields
  const [fetchedProjectInfo, setFetchedProjectInfo] = useState<{
    skillLevel?: string | null;
    effortLevel?: string | null;
    projectChallenges?: string | null;
    estimatedTime?: string | null;
    estimatedTotalTime?: string | null;
    typicalProjectSize?: number | null;
    scalingUnit?: string | null;
    itemType?: string | null;
  } | null>(null);
  
  // Handle both camelCase (from transformed Project interface) and snake_case (from raw database)
  // estimated_total_time is the "Total time for typical project size" field from project info editor
  // Check for both null/undefined and empty string, and handle string trimming
  // Priority: templateProject (transformed) > fetchedProjectInfo (from DB) > currentProjectRun
  const rawEstimatedTotalTime = templateProject?.estimatedTotalTime ?? fetchedProjectInfo?.estimatedTotalTime ?? (templateProject as any)?.estimated_total_time ?? (currentProjectRun as any)?.estimatedTotalTime;
  const displayEstimatedTotalTime = rawEstimatedTotalTime && typeof rawEstimatedTotalTime === 'string' 
    ? (rawEstimatedTotalTime.trim() || null)
    : (rawEstimatedTotalTime || null);
  const rawTypicalProjectSize = templateProject?.typicalProjectSize ?? fetchedProjectInfo?.typicalProjectSize ?? (templateProject as any)?.typical_project_size ?? (currentProjectRun as any)?.typicalProjectSize;
  const displayTypicalProjectSize = rawTypicalProjectSize != null ? rawTypicalProjectSize : null;

  useEffect(() => {
    const fetchIfNeeded = async () => {
      // Only fetch if templateProject exists but doesn't have the required fields
      const needsFetch = templateProject && 
        (!templateProject.skillLevel || 
         !templateProject.effortLevel || 
         !templateProject.projectChallenges || 
         !templateProject.estimatedTime ||
         !templateProject.estimatedTotalTime ||
         !templateProject.typicalProjectSize ||
         !templateProject.scalingUnit);
      
      if (needsFetch && templateProject.id) {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('skill_level, effort_level, project_challenges, estimated_time, estimated_total_time, typical_project_size, scaling_unit, item_type')
            .eq('id', templateProject.id)
            .maybeSingle();
          
          if (!error && data) {
            setFetchedProjectInfo({
              skillLevel: data.skill_level,
              effortLevel: data.effort_level,
              projectChallenges: data.project_challenges,
              estimatedTime: data.estimated_time,
              estimatedTotalTime: data.estimated_total_time,
              typicalProjectSize: data.typical_project_size,
              scalingUnit: data.scaling_unit,
              itemType: data.item_type
            });
          } else if (error) {
            console.error('Error fetching project info:', error);
          }
        } catch (error) {
          console.error('Error fetching project info:', error);
        }
      }
    };
    
    fetchIfNeeded();
  }, [templateProject?.id, templateProject?.skillLevel, templateProject?.effortLevel, templateProject?.projectChallenges, templateProject?.estimatedTime, templateProject?.estimatedTotalTime, templateProject?.typicalProjectSize, templateProject?.scalingUnit]);

  // Use templateProject fields first (already transformed), then fetched info, then currentProjectRun
  const displayScalingUnit = templateProject?.scalingUnit ?? fetchedProjectInfo?.scalingUnit ?? (currentProjectRun as any)?.scalingUnit;
  const displayProjectChallenges = templateProject?.projectChallenges ?? fetchedProjectInfo?.projectChallenges ?? (currentProjectRun as any)?.projectChallenges;
  const displaySkillLevel = templateProject?.skillLevel ?? fetchedProjectInfo?.skillLevel ?? (currentProjectRun as any)?.skillLevel;
  const displayEstimatedTime = templateProject?.estimatedTime ?? fetchedProjectInfo?.estimatedTime ?? (currentProjectRun as any)?.estimatedTime;
  const displayEffortLevel = templateProject?.effortLevel ?? fetchedProjectInfo?.effortLevel ?? (currentProjectRun as any)?.effortLevel;
  
  // Debug logging to help diagnose missing fields
  useEffect(() => {
    console.log('📊 ProjectOverviewStep - Display Values:', {
      hasTemplateProject: !!templateProject,
      templateProjectId: templateProject?.id,
      templateProjectName: templateProject?.name,
      displaySkillLevel,
      templateSkillLevel: templateProject?.skillLevel,
      displayEffortLevel,
      templateEffortLevel: templateProject?.effortLevel,
      displayProjectChallenges,
      templateProjectChallenges: templateProject?.projectChallenges,
      // All 4 estimated time fields
      displayEstimatedTime, // Field 1: Estimated time per unit
      displayScalingUnit, // Field 2: Unit (scaling unit)
      displayEstimatedTotalTime, // Field 3: Total time per typical size
      displayTypicalProjectSize, // Field 4: Typical project size (number of units)
      templateEstimatedTime: templateProject?.estimatedTime,
      templateEstimatedTotalTime: templateProject?.estimatedTotalTime,
      templateTypicalProjectSize: templateProject?.typicalProjectSize,
      templateScalingUnit: templateProject?.scalingUnit,
      fetchedProjectInfo,
      currentProjectRunEstimatedTime: (currentProjectRun as any)?.estimatedTime
    });
  }, [templateProject, displaySkillLevel, displayEffortLevel, displayProjectChallenges, displayEstimatedTime, displayScalingUnit, displayEstimatedTotalTime, displayTypicalProjectSize, fetchedProjectInfo, currentProjectRun]);

  // Helper function to get skill level comparison
  const getSkillLevelComparison = () => {
    const projectSkill = (displaySkillLevel || '').toLowerCase();
    const userSkill = (userProfile?.skill_level || '').toLowerCase();
    if (!projectSkill || !userSkill) return null;
    const levels = ['beginner', 'intermediate', 'advanced'];
    const projectIndex = levels.indexOf(projectSkill);
    const userIndex = levels.indexOf(userSkill);
    if (projectIndex === -1 || userIndex === -1) return null;
    if (userIndex >= projectIndex) {
      return {
        type: 'success',
        message: 'Your skill level matches or exceeds the project requirements.'
      };
    } else if (projectSkill === 'intermediate' && userSkill === 'beginner') {
      return {
        type: 'warning',
        message: 'This project requires intermediate skills, but your skill level is beginner. Consider getting help or additional guidance.'
      };
    } else if (projectSkill === 'advanced' && userIndex < projectIndex) {
      return {
        type: 'error',
        message: 'This project requires advanced skills, but your skill level is below this. This project may be too challenging without significant experience or professional help.'
      };
    }
    return null;
  };

  // Helper function to get effort level comparison
  // Note: Using physical_capability as a proxy for effort level since user profile doesn't have effort_level
  const getEffortLevelComparison = () => {
    const projectEffort = (displayEffortLevel || '').toLowerCase();
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
      return {
        type: 'success',
        message: 'Your physical capability matches or exceeds the project effort requirements.'
      };
    } else if (projectEffort === 'medium' && userIndex < 1) {
      return {
        type: 'warning',
        message: 'This project requires medium effort, but your physical capability may be limited. Consider the physical demands before proceeding.'
      };
    } else if (projectEffort === 'high' && userIndex < 2) {
      return {
        type: 'error',
        message: 'This project requires high effort, but your physical capability may not be sufficient. This project may be too physically demanding.'
      };
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
        const cleaned = split.map(cat => cat.replace(/["']/g, '').replace(/^\{|\}$/g, '').trim()).filter(Boolean);
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
  const categories = parseCategories(currentProjectRun?.category || templateProject?.category);
  
  // Format scaling unit, using item_type if scaling unit is "per item"
  // Priority: templateProject > fetchedProjectInfo > currentProjectRun
  const itemType = (templateProject as any)?.item_type ?? (templateProject as any)?.itemType ?? fetchedProjectInfo?.itemType ?? (currentProjectRun as any)?.itemType;
  
  const formattedScalingUnit = displayScalingUnit ? (() => {
    const scalingUnitToUse = displayScalingUnit;
    const normalizedScalingUnit = scalingUnitToUse.toLowerCase().trim();
    
    // If scaling unit is "per item" and we have an item_type, use the item_type
    if (normalizedScalingUnit === 'per item') {
      if (itemType && typeof itemType === 'string' && itemType.trim().length > 0) {
        const displayValue = itemType.trim().toLowerCase();
        return displayValue;
      }
      return 'per item';
    }
    
    // For other scaling units, add "per " prefix if not already present
    return normalizedScalingUnit.startsWith('per ') ? scalingUnitToUse : `per ${scalingUnitToUse}`;
  })() : null;
  return <div className="space-y-3">
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            Project Overview
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Make sure this project is right for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-xs sm:text-sm">Project Name</Label>
              <p className="text-sm font-medium mt-0.5">{currentProjectRun.name}</p>
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs sm:text-sm">Description</Label>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{currentProjectRun.description}</p>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <Label className="text-xs sm:text-sm">Project Challenges</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRiskManagementOpen(true)}
                className="h-7 px-2.5 text-xs bg-muted/50 hover:bg-muted border-muted"
              >
                <Eye className="w-3 h-3 mr-1.5" />
                See All Potential Challenges
              </Button>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line mt-0.5">
              {displayProjectChallenges || 'None specified'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-3 pt-3 border-t">
            <div>
              <Label className="text-sm">Category</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.length > 0 ? categories.map((cat, idx) => <Badge key={idx} variant="outline" className="text-xs">
                      {cat}
                    </Badge>) : <Badge variant="outline" className="text-xs sm:text-sm">Not specified</Badge>}
              </div>
            </div>
            <div>
              <Label className="text-sm">Project Skill Level</Label>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Badge variant="outline" className={`text-xs sm:text-sm ${displaySkillLevel === 'Beginner' ? 'bg-green-100 text-green-800' : displaySkillLevel === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' : displaySkillLevel === 'Advanced' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                  {displaySkillLevel || 'Not specified'}
                </Badge>
                {userProfile?.skill_level && <>
                    <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">•</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">Your:</span>
                    <Badge variant="outline" className="text-xs sm:text-sm">
                      {userProfile.skill_level}
                    </Badge>
                  </>}
                {skillComparison && <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help flex-shrink-0">
                          {skillComparison.type === 'success' && <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />}
                          {skillComparison.type === 'warning' && <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />}
                          {skillComparison.type === 'error' && <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs sm:text-sm">{skillComparison.message}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>}
              </div>
            </div>
            <div>
              <Label className="text-sm">Project Effort Level</Label>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Badge variant="outline" className={`text-xs sm:text-sm ${displayEffortLevel === 'Low' ? 'bg-blue-100 text-blue-800' : displayEffortLevel === 'Medium' ? 'bg-orange-100 text-orange-800' : displayEffortLevel === 'High' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                  {displayEffortLevel || 'Not specified'}
                </Badge>
                {userProfile?.physical_capability && <>
                    <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">•</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">Your:</span>
                    <Badge variant="outline" className="text-xs sm:text-sm">
                      {userProfile.physical_capability}
                    </Badge>
                  </>}
                {effortComparison && <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help flex-shrink-0">
                          {effortComparison.type === 'success' && <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />}
                          {effortComparison.type === 'warning' && <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />}
                          {effortComparison.type === 'error' && <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs sm:text-sm">{effortComparison.message}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>}
              </div>
            </div>
            <div>
              <Label className="text-sm mb-3 block">Estimated Time</Label>
              <div className="mt-2 space-y-3">
                {/* Display all 4 fields with clear labels */}
                {/* Field 1: Estimated time per unit */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Time per Unit</Label>
                  <div className="p-2 bg-muted rounded text-sm">
                    {displayEstimatedTime || 'Not specified'}
                  </div>
                </div>
                
                {/* Field 2: Unit (scaling unit) */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Unit</Label>
                  <div className="p-2 bg-muted rounded text-sm">
                    {formattedScalingUnit ? (
                      <span className="capitalize">{formattedScalingUnit}</span>
                    ) : displayScalingUnit ? (
                      <span className="capitalize">
                        {displayScalingUnit.startsWith('per ') ? displayScalingUnit : `per ${displayScalingUnit}`}
                      </span>
                    ) : (
                      'Not specified'
                    )}
                  </div>
                </div>
                
                {/* Field 3: Total time per typical size */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Estimated Total Time</Label>
                  <div className="p-2 bg-muted rounded text-sm">
                    {displayEstimatedTotalTime || 'Not specified'}
                  </div>
                </div>
                
                {/* Field 4: Typical project size */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Typical Project Size</Label>
                  <div className="p-2 bg-muted rounded text-sm">
                    {displayTypicalProjectSize ? (
                      <span>
                        {displayTypicalProjectSize} {formattedScalingUnit ? formattedScalingUnit.replace('per ', '') : (displayScalingUnit ? displayScalingUnit.replace('per ', '') : 'units')}
                      </span>
                    ) : (
                      'Not specified'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Risk Management Window - Read Only */}
      {templateProject && (
        <RiskManagementWindow
          open={riskManagementOpen}
          onOpenChange={setRiskManagementOpen}
          projectId={templateProject.id}
          mode="template"
          readOnly={true}
        />
      )}
    </div>;
};