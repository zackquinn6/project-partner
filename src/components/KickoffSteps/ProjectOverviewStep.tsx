import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Edit3, Save, X, Target, XCircle, AlertTriangle, CheckCircle2, Eye, ArrowUp, HelpCircle } from 'lucide-react';
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
    budgetPerUnit?: string | null;
    budgetPerTypicalSize?: string | null;
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
    const fetchProjectInfo = async () => {
      if (templateProject && templateProject.id) {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('skill_level, effort_level, project_challenges, estimated_time, estimated_total_time, typical_project_size, scaling_unit, item_type, budget_per_unit, budget_per_typical_size')
            .eq('id', templateProject.id)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching project info:', error);
            return;
          }
          
          if (data) {
            setFetchedProjectInfo({
              skillLevel: data.skill_level,
              effortLevel: data.effort_level,
              projectChallenges: data.project_challenges,
              estimatedTime: data.estimated_time,
              estimatedTotalTime: data.estimated_total_time,
              typicalProjectSize: data.typical_project_size,
              scalingUnit: data.scaling_unit,
              itemType: data.item_type,
              budgetPerUnit: data.budget_per_unit,
              budgetPerTypicalSize: data.budget_per_typical_size
            });
          }
        } catch (error) {
          console.error('Error fetching project info:', error);
        }
      }
    };
    
    fetchProjectInfo();
  }, [templateProject?.id]);

  // Use templateProject fields first (already transformed), then fetched info, then currentProjectRun
  const displayScalingUnit = templateProject?.scalingUnit ?? fetchedProjectInfo?.scalingUnit ?? (currentProjectRun as any)?.scalingUnit;
  const displayProjectChallenges = templateProject?.projectChallenges ?? fetchedProjectInfo?.projectChallenges ?? (currentProjectRun as any)?.projectChallenges;
  const displaySkillLevel = templateProject?.skillLevel ?? fetchedProjectInfo?.skillLevel ?? (currentProjectRun as any)?.skillLevel;
  const displayEstimatedTime = templateProject?.estimatedTime ?? fetchedProjectInfo?.estimatedTime ?? (currentProjectRun as any)?.estimatedTime;
  const displayEffortLevel = templateProject?.effortLevel ?? fetchedProjectInfo?.effortLevel ?? (currentProjectRun as any)?.effortLevel;
  
  // Budget fields - handle both camelCase and snake_case
  const rawBudgetPerUnit = (templateProject as any)?.budgetPerUnit ?? (templateProject as any)?.budget_perUnit ?? fetchedProjectInfo?.budgetPerUnit ?? (currentProjectRun as any)?.budgetPerUnit ?? (currentProjectRun as any)?.budget_perUnit;
  const displayBudgetPerUnit = rawBudgetPerUnit && typeof rawBudgetPerUnit === 'string' 
    ? (rawBudgetPerUnit.trim() || null)
    : (rawBudgetPerUnit || null);
  
  const rawBudgetPerTypicalSize = (templateProject as any)?.budgetPerTypicalSize ?? (templateProject as any)?.budget_perTypicalsize ?? fetchedProjectInfo?.budgetPerTypicalSize ?? (currentProjectRun as any)?.budgetPerTypicalSize ?? (currentProjectRun as any)?.budget_perTypicalsize;
  const displayBudgetPerTypicalSize = rawBudgetPerTypicalSize && typeof rawBudgetPerTypicalSize === 'string' 
    ? (rawBudgetPerTypicalSize.trim() || null)
    : (rawBudgetPerTypicalSize || null);
  
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

  // Helper function to get position index for slider (0, 1, or 2)
  const getLevelPosition = (level: string | null | undefined, levels: string[]): number => {
    if (!level) return -1;
    const normalized = level.toLowerCase();
    const index = levels.findIndex(l => l.toLowerCase() === normalized);
    return index >= 0 ? index : -1;
  };

  // Helper function to render 3-step slider
  const renderLevelSlider = (currentLevel: string | null | undefined, levels: string[], labels: string[], userLevel?: string | null, comparison?: { type: string; message: string } | null) => {
    const position = getLevelPosition(currentLevel, levels);
    const hasValue = position >= 0;

    // Map position to center of section: 0 -> 16.66%, 1 -> 50%, 2 -> 83.33%
    const getArrowPosition = (pos: number): number => {
      if (pos === 0) return 16.66; // Center of first section (0-33.33%)
      if (pos === 1) return 50;    // Center of middle section (33.33-66.66%)
      if (pos === 2) return 83.33; // Center of third section (66.66-100%)
      return 50; // Default to middle
    };

    return (
      <div className="mt-2 relative pb-1">
        {/* Slider track with colored sections */}
        <div className="relative h-6 rounded-full flex items-center overflow-hidden">
          {/* Color blocks background - green, blue, black */}
          <div className="absolute inset-0 flex">
            <div className="w-1/3 bg-green-500"></div>
            <div className="w-1/3 bg-blue-500"></div>
            <div className="w-1/3 bg-black"></div>
          </div>
          {/* Three segments with labels */}
          {levels.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-full flex items-center justify-center border-r last:border-r-0 border-border/50 relative z-10"
            >
              <span className="text-[9px] text-white font-medium px-0.5 text-center drop-shadow-sm leading-tight">
                {labels[index]}
              </span>
            </div>
          ))}
        </div>
        
        {/* Arrow indicator - positioned below with "This project" text */}
        {hasValue && (
          <div
            className="absolute top-full left-0 flex flex-col items-center justify-center transition-all duration-200 z-10 mt-1"
            style={{
              left: `${getArrowPosition(position)}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <ArrowUp className="w-3.5 h-3.5 text-foreground drop-shadow-sm" />
            <span className="text-[9px] text-muted-foreground whitespace-nowrap mt-0.5">This project</span>
          </div>
        )}
        
        {!hasValue && (
          <p className="text-xs text-muted-foreground mt-1 text-center">Not specified</p>
        )}
        {/* User level comparison at bottom */}
        {userLevel && comparison && (
          <div className="mt-2 flex items-center gap-1.5">
            {comparison.type === 'error' && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
            {comparison.type === 'warning' && <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
            {comparison.type === 'success' && <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />}
            <span className={`text-xs ${comparison.type === 'error' ? 'text-red-600' : comparison.type === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
              Your level: {userLevel}
            </span>
          </div>
        )}
      </div>
    );
  };

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
      return 'item';
    }
    
    // Remove "per " prefix if present, return lowercase unit
    return normalizedScalingUnit.startsWith('per ') ? normalizedScalingUnit.replace('per ', '') : normalizedScalingUnit;
  })() : null;
  return <div className="space-y-3">
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            Project Overview: {currentProjectRun.name}
            {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Make sure this project is right for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-xs sm:text-sm">Description</Label>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{currentProjectRun.description || 'No description provided'}</p>
            </div>
            <div className="flex-1 min-w-0">
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
          </div>

          <div className="mt-3 pt-3 border-t">
            <div className="mb-3">
              <Label className="text-sm">Category</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.length > 0 ? categories.map((cat, idx) => <Badge key={idx} variant="outline" className="text-xs">
                      {cat}
                    </Badge>) : <Badge variant="outline" className="text-xs sm:text-sm">Not specified</Badge>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {/* Left Column */}
              <div>
                <div className="flex items-center gap-1.5 mb-0">
                  <Label className="text-sm">Project Skill Level</Label>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="p-0 border-0 bg-transparent cursor-help hover:opacity-70 transition-opacity focus:outline-none">
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs z-50">
                        <p className="text-sm">
                          <strong>Skill Level</strong> indicates the technical expertise required for this project:
                          <br /><br />
                          <strong>Beginner:</strong> Basic skills, minimal experience needed
                          <br />
                          <strong>Intermediate:</strong> Some experience or guidance recommended
                          <br />
                          <strong>Advanced:</strong> Significant experience or professional help may be needed
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {renderLevelSlider(displaySkillLevel, ['Beginner', 'Intermediate', 'Advanced'], ['Beginner', 'Intermediate', 'Advanced'], userProfile?.skill_level, skillComparison)}
              </div>

              {/* Right Column */}
              <div>
                <Label className="text-sm">Estimated Budget</Label>
                <div className="mt-2 space-y-2">
                  {/* Line 1: Budget per unit + unit */}
                  {displayBudgetPerUnit && formattedScalingUnit ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {displayBudgetPerUnit.startsWith('$') ? `(${displayBudgetPerUnit})` : `($${displayBudgetPerUnit})`}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">per</span>
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        ({formattedScalingUnit})
                      </Badge>
                    </div>
                  ) : null}
                  
                  {/* Line 2: Budget per typical project size */}
                  {displayBudgetPerTypicalSize && displayTypicalProjectSize && formattedScalingUnit ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {displayBudgetPerTypicalSize.startsWith('$') ? `(${displayBudgetPerTypicalSize})` : `($${displayBudgetPerTypicalSize})`}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">per</span>
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        ({displayTypicalProjectSize} {formattedScalingUnit})
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">typical project size</span>
                    </div>
                  ) : null}
                  
                  {!displayBudgetPerUnit && !displayBudgetPerTypicalSize && (
                    <span className="text-xs sm:text-sm text-muted-foreground">Not specified</span>
                  )}
                </div>
              </div>

              {/* Left Column - Second Row */}
              <div>
                <div className="flex items-center gap-1.5 mb-0">
                  <Label className="text-sm">Project Effort Level</Label>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="p-0 border-0 bg-transparent cursor-help hover:opacity-70 transition-opacity focus:outline-none">
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs z-50">
                        <p className="text-sm">
                          <strong>Effort Level</strong> indicates the physical intensity and time commitment required:
                          <br /><br />
                          <strong>Low:</strong> Minimal physical effort, quick completion
                          <br />
                          <strong>Medium:</strong> Moderate physical effort, moderate time commitment
                          <br />
                          <strong>High:</strong> Significant physical effort, extended time commitment
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {renderLevelSlider(displayEffortLevel, ['Low', 'Medium', 'High'], ['Low', 'Medium', 'High'], userProfile?.physical_capability, effortComparison)}
              </div>

              {/* Right Column - Second Row */}
              <div>
                <Label className="text-sm">Estimated Time</Label>
                <div className="mt-2 space-y-2">
                  {/* Line 1: Estimated time per unit + unit */}
                  {displayEstimatedTime && formattedScalingUnit ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        ({displayEstimatedTime})
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">per</span>
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        ({formattedScalingUnit})
                      </Badge>
                    </div>
                  ) : null}
                  
                  {/* Line 2: Total time + typical project size */}
                  {displayEstimatedTotalTime && displayTypicalProjectSize && formattedScalingUnit ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        ({displayEstimatedTotalTime})
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">per</span>
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        ({displayTypicalProjectSize} {formattedScalingUnit})
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">typical project size</span>
                    </div>
                  ) : null}
                  
                  {!displayEstimatedTime && !displayEstimatedTotalTime && (
                    <span className="text-xs sm:text-sm text-muted-foreground">Not specified</span>
                  )}
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