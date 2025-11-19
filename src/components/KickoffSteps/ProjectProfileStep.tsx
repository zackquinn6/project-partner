import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Home, CheckCircle, Plus, Target, DollarSign, Calendar, Ruler } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HomeManager } from '../HomeManager';
import { useProjectData } from '@/contexts/ProjectDataContext';

interface ProjectProfileStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  checkedOutputs?: Set<string>;
  onOutputToggle?: (outputId: string) => void;
}

interface Home {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  home_type?: string;
  build_year?: string;
  is_primary: boolean;
}

export const ProjectProfileStep: React.FC<ProjectProfileStepProps> = ({ onComplete, isCompleted, checkedOutputs = new Set(), onOutputToggle }) => {
  const { currentProjectRun, updateProjectRun } = useProject();
  const { projects } = useProjectData();
  const { user } = useAuth();
  const [homes, setHomes] = useState<Home[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string>('');
  const [projectForm, setProjectForm] = useState({
    customProjectName: '',
    initialSizing: '',
    initialTimeline: '',
    initialBudget: ''
  });
  const [loading, setLoading] = useState(true);
  const [showHomeManager, setShowHomeManager] = useState(false);
  
  // Get template project to access scaling unit
  const templateProject = currentProjectRun?.templateId 
    ? projects.find(p => p.id === currentProjectRun.templateId)
    : null;
  const scalingUnit = templateProject?.scalingUnit || currentProjectRun?.scalingUnit || 'per item';

  useEffect(() => {
    if (user) {
      fetchHomes();
    }
    
    if (currentProjectRun) {
      // Calculate default timeline (2 weeks from now)
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 14);
      const defaultDateString = defaultDate.toISOString().split('T')[0];
      
      setProjectForm({
        customProjectName: currentProjectRun.customProjectName || currentProjectRun.name || '',
        initialSizing: (currentProjectRun as any).initial_sizing || '',
        initialTimeline: (currentProjectRun as any).initial_timeline || defaultDateString,
        initialBudget: (currentProjectRun as any).initial_budget || ''
      });
      
      if (currentProjectRun.home_id) {
        setSelectedHomeId(currentProjectRun.home_id);
      }
    }
  }, [user, currentProjectRun]);

  const fetchHomes = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('homes')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setHomes(data || []);
      
      // Auto-select primary home if no home is selected yet
      if (!selectedHomeId) {
        const primaryHome = data?.find(home => home.is_primary);
        if (primaryHome) {
          setSelectedHomeId(primaryHome.id);
        }
      }
    } catch (error) {
      console.error('Error fetching homes:', error);
      toast.error('Failed to load homes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!currentProjectRun) return;
    
    // Only require home selection if user has multiple homes
    if (homes.length > 1 && !selectedHomeId) {
      toast.error('Please select a home for this project');
      return;
    }

    if (!projectForm.customProjectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      // Update project run in database with new fields
      const { error: dbError } = await supabase
        .from('project_runs')
        .update({
          custom_project_name: projectForm.customProjectName.trim(),
          home_id: selectedHomeId || homes[0]?.id || null,
          initial_sizing: projectForm.initialSizing.trim() || null,
          initial_timeline: projectForm.initialTimeline || null,
          initial_budget: projectForm.initialBudget.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentProjectRun.id);

      if (dbError) throw dbError;

      const updatedProjectRun = {
        ...currentProjectRun,
        customProjectName: projectForm.customProjectName.trim(),
        home_id: selectedHomeId || homes[0]?.id || null,
        initial_sizing: projectForm.initialSizing.trim() || null,
        initial_timeline: projectForm.initialTimeline || null,
        initial_budget: projectForm.initialBudget.trim() || null,
        updatedAt: new Date()
      };

      await updateProjectRun(updatedProjectRun);
      
      // CRITICAL FIX: Call onComplete to mark step 3 as complete
      console.log('🎯 ProjectProfileStep: Calling onComplete after save');
      onComplete();
    } catch (error) {
      console.error('Error saving project profile:', error);
      toast.error('Failed to save project profile');
    }
  }, [currentProjectRun, selectedHomeId, projectForm, homes, updateProjectRun, onComplete]);

  // Expose handleSave via window for parent component
  useEffect(() => {
    (window as any).__projectProfileStepSave = handleSave;
    return () => {
      delete (window as any).__projectProfileStepSave;
    };
  }, [handleSave]);

  const handleHomeManagerClose = (open: boolean) => {
    if (!open) {
      setShowHomeManager(false);
      // Debounce the homes refresh to prevent rapid re-renders
      setTimeout(() => {
        if (user) {
          fetchHomes();
        }
      }, 100);
    }
  };

  if (!currentProjectRun) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>No project selected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                <Home className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="truncate">Project Profile</span>
                {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Set up your project details and team
              </CardDescription>
            </div>
            <div className="bg-muted/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg flex-shrink-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">
                <strong>Template:</strong>
              </p>
              <p className="text-[10px] sm:text-xs font-medium truncate max-w-[120px] sm:max-w-none">
                {currentProjectRun.name}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-xs text-muted-foreground">1 of 3</span>
                <label className="text-xs sm:text-sm font-medium">Name your project</label>
              </div>
              <Input
                value={projectForm.customProjectName}
                onChange={(e) => setProjectForm(prev => ({
                  ...prev,
                  customProjectName: e.target.value
                }))}
                placeholder="Enter your custom project name"
                className="text-xs sm:text-sm h-9 sm:h-10"
              />
            </div>

            {/* Three column layout for Project Size, Timeline, Budget */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Project Size */}
              <div>
                <Label className="text-xs sm:text-sm font-medium mb-1 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5" />
                  Project Size
                </Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5">How much work are you doing?</p>
                <div className="flex items-center gap-2">
                  <Input
                    value={projectForm.initialSizing}
                    onChange={(e) => setProjectForm(prev => ({
                      ...prev,
                      initialSizing: e.target.value
                    }))}
                    placeholder="Enter size"
                    className="text-xs sm:text-sm h-9 sm:h-10 flex-1"
                  />
                  <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                    {scalingUnit === 'per square foot' ? 'sq ft' :
                     scalingUnit === 'per 10x10 room' ? 'rooms' :
                     scalingUnit === 'per linear foot' ? 'linear ft' :
                     scalingUnit === 'per cubic yard' ? 'cu yd' :
                     scalingUnit === 'per item' ? 'items' : 'units'}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <Label className="text-xs sm:text-sm font-medium mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Timeline
                </Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5">When do you want this done?</p>
                <Input
                  type="date"
                  value={projectForm.initialTimeline}
                  onChange={(e) => setProjectForm(prev => ({
                    ...prev,
                    initialTimeline: e.target.value
                  }))}
                  className="text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>

              {/* Budget */}
              <div>
                <Label className="text-xs sm:text-sm font-medium mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  Budget
                </Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5">How much do you want to spend?</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-muted-foreground">$</span>
                  <Input
                    value={projectForm.initialBudget}
                    onChange={(e) => setProjectForm(prev => ({
                      ...prev,
                      initialBudget: e.target.value
                    }))}
                    placeholder="0.00"
                    className="text-xs sm:text-sm h-9 sm:h-10 pl-7"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Home Selection - Only show if user has multiple homes */}
            {homes.length > 1 && (
              <div>
                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">2 of 3</span>
                  <label className="text-xs sm:text-sm font-medium">Select Home</label>
                </div>
                {loading ? (
                  <div className="text-xs sm:text-sm text-muted-foreground">Loading homes...</div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
                      <SelectTrigger className="text-xs sm:text-sm h-9 sm:h-10">
                        <SelectValue placeholder="Select a home for this project" />
                      </SelectTrigger>
                      <SelectContent>
                        {homes.map((home) => (
                          <SelectItem key={home.id} value={home.id} className="text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{home.name}</span>
                              {home.is_primary && (
                                <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">Primary</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setShowHomeManager(true)}
                      className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      <HomeManager 
        open={showHomeManager}
        onOpenChange={handleHomeManagerClose}
      />
    </>
  );
};