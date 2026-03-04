import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Home, CheckCircle, Plus, Target, DollarSign, Calendar, Ruler, ChevronUp, ChevronDown } from 'lucide-react';
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

/** Return YYYY-MM-DD for the Sunday of the week containing the given date string. */
function getSundayOfWeek(dateStr: string): string {
  if (!dateStr?.trim()) return dateStr;
  const d = new Date(dateStr + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
}

/** Add n weeks to the given date string; result is the Sunday of that week (YYYY-MM-DD). */
function addWeeks(dateStr: string, n: number): string {
  if (!dateStr?.trim()) return dateStr;
  const sunday = new Date(getSundayOfWeek(dateStr) + 'T12:00:00');
  sunday.setDate(sunday.getDate() + n * 7);
  return sunday.toISOString().split('T')[0];
}

/** Add n days to the given date string (YYYY-MM-DD). */
function addDays(dateStr: string, n: number): string {
  if (!dateStr?.trim()) return dateStr;
  const d = new Date(dateStr + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
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
  
  // Get template project to access scaling unit and item type
  const templateProject = currentProjectRun?.templateId 
    ? projects.find(p => p.id === currentProjectRun.templateId)
    : null;
  
  // Fetch scaling_unit and item_type directly from database since they may not be in the transformed Project interface
  const [scalingUnit, setScalingUnit] = useState<string>('per item');
  const [itemType, setItemType] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchScalingUnitAndItemType = async () => {
      // CRITICAL FIX: Use templateProject.id if available, otherwise use currentProjectRun.templateId directly
      // This ensures we can fetch even if projects array hasn't loaded yet
      const templateId = templateProject?.id || currentProjectRun?.templateId;
      
      
      if (templateId) {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('scaling_unit, item_type')
            .eq('id', templateId)
            .single();
          
          if (!error && data) {
            // Use scaling_unit from database, fallback to templateProject.scalingUnit, then currentProjectRun.scalingUnit, then 'per item'
            const fetchedScalingUnit = data.scaling_unit || templateProject?.scalingUnit || (currentProjectRun as any)?.scalingUnit || 'per item';
            // CRITICAL: Ensure item_type is properly extracted - check both snake_case and camelCase
            const fetchedItemType = data.item_type || (data as any).itemType || null;
            
            
            setScalingUnit(fetchedScalingUnit);
            setItemType(fetchedItemType);
            
          } else if (error) {
            console.error('❌ Error fetching scaling_unit and item_type:', error);
            // Fallback to templateProject values if database fetch fails
            const fallbackScalingUnit = templateProject?.scalingUnit || (currentProjectRun as any)?.scalingUnit || 'per item';
            const fallbackItemType = (templateProject as any)?.itemType || (templateProject as any)?.item_type || null;
            setScalingUnit(fallbackScalingUnit);
            setItemType(fallbackItemType);
          }
        } catch (error) {
          console.error('❌ Exception fetching scaling_unit and item_type:', error);
          // Fallback to templateProject values if database fetch fails
          const fallbackScalingUnit = templateProject?.scalingUnit || (currentProjectRun as any)?.scalingUnit || 'per item';
          const fallbackItemType = (templateProject as any)?.itemType || (templateProject as any)?.item_type || null;
          setScalingUnit(fallbackScalingUnit);
          setItemType(fallbackItemType);
        }
      } else {
        // No template ID available, use currentProjectRun values or fallback
        const fallbackScalingUnit = (currentProjectRun as any)?.scalingUnit || 'per item';
        const fallbackItemType = (currentProjectRun as any)?.itemType || (currentProjectRun as any)?.item_type || null;
        setScalingUnit(fallbackScalingUnit);
        setItemType(fallbackItemType);
      }
    };
    
    if (currentProjectRun?.templateId || templateProject?.id) {
      fetchScalingUnitAndItemType();
    }
  }, [templateProject?.id, currentProjectRun?.templateId, currentProjectRun, projects]);

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
    
    console.log('🚀 ProjectProfileStep.handleSave: Starting save with form data:', {
      customProjectName: projectForm.customProjectName,
      initialSizing: projectForm.initialSizing,
      initialTimeline: projectForm.initialTimeline,
      initialBudget: projectForm.initialBudget,
      selectedHomeId,
      homesCount: homes.length
    });
    
    // REQUIREMENT 4: Only require home selection if user has multiple homes
    if (homes.length > 1 && !selectedHomeId) {
      toast.error('Please select a home for this project');
      return;
    }

    if (!projectForm.customProjectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      // Prepare values for saving
      const budgetValue = projectForm.initialBudget?.trim() || '';
      const finalBudgetValue = budgetValue === '' ? null : budgetValue;
      const sizingValue = projectForm.initialSizing?.trim() || '';
      const finalSizingValue = sizingValue === '' ? null : sizingValue;
      
      // REQUIREMENT 1 & 3: Ensure home exists - use selected home or first home or create default
      let homeId = selectedHomeId || homes[0]?.id || null;
      
      // If no home exists, create default home
      if (!homeId && user) {
        const { data: newHome, error: homeCreateError } = await supabase
          .from('homes')
          .insert({
            user_id: user.id,
            name: 'My Home',
            is_primary: true,
            home_ownership: 'own'
          })
          .select('id')
          .single();

        if (homeCreateError) {
          console.error('Error creating default home:', homeCreateError);
          toast.error('Failed to create default home');
          return;
        }

        homeId = newHome.id;
        setSelectedHomeId(homeId);
        // Refresh homes list
        await fetchHomes();
      }

      // REQUIREMENT 3: Don't proceed without a home
      if (!homeId) {
        toast.error('A home is required to start a project. Please create a home first.');
        return;
      }

      // Update project run in database with new fields
      // First update: fields that don't trigger space_sizing creation
      // STEP 1: Update home_id first (must be set before creating spaces)
      if (homeId !== currentProjectRun.home_id) {
        const { error: homeError } = await supabase
          .from('project_runs')
          .update({ home_id: homeId, updated_at: new Date().toISOString() })
          .eq('id', currentProjectRun.id);
        
        if (homeError) throw homeError;
      }

      // STEP 2: Ensure "Room 1" space exists BEFORE saving any initial_sizing data
      // CRITICAL: Room 1 MUST exist before we can save initial_sizing to project_runs
      // because there may be a database trigger that requires a space_id
      const { data: existingSpaces, error: spacesCheckError } = await supabase
        .from('project_run_spaces')
        .select('id, space_name')
        .eq('project_run_id', currentProjectRun.id);

      if (spacesCheckError) {
        console.error('Error checking spaces:', spacesCheckError);
        throw spacesCheckError;
      }

      let room1SpaceId: string | null = null;
      const room1Exists = existingSpaces?.some(space => space.space_name === 'Room 1');

      if (!room1Exists) {
        // REQUIREMENT 5: Create "Room 1" space
        const { data: newSpace, error: spaceCreateError } = await supabase
          .from('project_run_spaces')
          .insert({
            project_run_id: currentProjectRun.id,
            space_name: 'Room 1',
            space_type: 'general',
            is_from_home: false
          })
          .select('id')
          .single();

        if (spaceCreateError) {
          console.error('Error creating Room 1 space:', spaceCreateError);
          throw spaceCreateError;
        }

        room1SpaceId = newSpace.id;
      } else {
        // Find existing Room 1 space
        room1SpaceId = existingSpaces?.find(space => space.space_name === 'Room 1')?.id || null;
      }

      // REQUIREMENT 3: Validate Room 1 exists before proceeding
      if (!room1SpaceId) {
        toast.error('Failed to create Room 1 space. Please try again.');
        return;
      }

      // STEP 3A: First save sizing to space-specific tables
      // CRITICAL: This MUST happen BEFORE saving to project_runs
      // The database trigger on project_runs.initial_sizing requires space records to exist first
      if (finalSizingValue && room1SpaceId) {
        const parsedSizing = parseFloat(finalSizingValue);
        if (!isNaN(parsedSizing) && parsedSizing > 0) {
          const projectScaleUnit = scalingUnit || 'per item';
          
          console.log('💾 ProjectProfileStep: FIRST saving sizing to Room 1 space tables:', {
            room1SpaceId,
            size: parsedSizing,
            unit: projectScaleUnit
          });
          console.log('📝 Note: Space tables MUST be saved FIRST, then project_runs (for database trigger)');
          
          // Update Room 1 space with sizing
          const { error: spaceUpdateError } = await supabase
            .from('project_run_spaces')
            .update({ 
              scale_value: parsedSizing,
              scale_unit: projectScaleUnit,
              updated_at: new Date().toISOString()
            })
            .eq('id', room1SpaceId);

          if (spaceUpdateError) {
            console.error('❌ Error updating Room 1 sizing:', spaceUpdateError);
            throw spaceUpdateError;
          }
          
          console.log('✅ Sizing saved to project_run_spaces');
          
          // Also save to project_run_space_sizing table
          const { error: sizingError } = await supabase
            .from('project_run_space_sizing')
            .upsert({
              space_id: room1SpaceId,
              scaling_unit: projectScaleUnit,
              size_value: parsedSizing
            }, {
              onConflict: 'space_id,scaling_unit'
            });
          
          if (sizingError) {
            console.error('❌ Error saving to project_run_space_sizing:', sizingError);
            throw sizingError;
          }
          
          console.log('✅ Sizing saved to project_run_space_sizing');
        }
      }
      
      // STEP 3B: NOW save ALL fields to project_runs (including initial_sizing)
      // CRITICAL: Space tables are saved first, so the database trigger can find them
      const mainUpdateData: any = {
        custom_project_name: projectForm.customProjectName.trim(),
        initial_timeline: projectForm.initialTimeline || null,
        initial_budget: finalBudgetValue,
        initial_sizing: finalSizingValue,  // NOW safe to save because space records exist
        updated_at: new Date().toISOString()
      };
      
      console.log('💾 ProjectProfileStep: Saving ALL 3 fields to project_runs (after space tables created):', {
        projectRunId: currentProjectRun.id,
        initial_budget: finalBudgetValue,
        initial_timeline: projectForm.initialTimeline || null,
        initial_sizing: finalSizingValue,
        room1Exists: !!room1SpaceId
      });
      
      const { error: mainError, data: mainUpdateResult } = await supabase
        .from('project_runs')
        .update(mainUpdateData)
        .eq('id', currentProjectRun.id)
        .select('id, initial_budget, custom_project_name, initial_timeline, initial_sizing');

      if (mainError) {
        console.error('❌ ProjectProfileStep: Error saving to project_runs:', mainError);
        throw mainError;
      }
      
      if (mainUpdateResult && mainUpdateResult.length > 0) {
        console.log('✅ ALL 3 fields saved to project_runs (canonical source):', {
          initial_budget: mainUpdateResult[0].initial_budget,
          initial_timeline: mainUpdateResult[0].initial_timeline,
          initial_sizing: mainUpdateResult[0].initial_sizing
        });
      }

      // CRITICAL: Final verification - fetch the saved values from database
      const { data: verificationData, error: verificationError } = await supabase
        .from('project_runs')
        .select('initial_budget, initial_timeline, initial_sizing')
        .eq('id', currentProjectRun.id)
        .single();
      
      if (!verificationError && verificationData) {
        console.log('✅ ProjectProfileStep: Final verification - ALL 3 fields in project_runs:', {
          initial_budget: verificationData.initial_budget,
          initial_timeline: verificationData.initial_timeline,
          initial_sizing: verificationData.initial_sizing
        });
        console.log('📝 Note: initial_sizing is ALSO stored in project_run_spaces/project_run_space_sizing (dual storage)');
        
        // Check for mismatches
        if (verificationData.initial_budget !== finalBudgetValue) {
          console.error('❌ initial_budget mismatch:', { expected: finalBudgetValue, actual: verificationData.initial_budget });
        }
        // Normalize timeline comparison: database returns ISO timestamp, form has date string
        const expectedTimeline = projectForm.initialTimeline || null;
        const actualTimeline = verificationData.initial_timeline;
        
        // Normalize both values for comparison
        // Extract date part from ISO timestamp if present (handles '2025-12-24T00:00:00+00:00' -> '2025-12-24')
        const normalizeDate = (dateValue: string | Date | null | undefined): string | null => {
          if (!dateValue) return null;
          
          // Handle Date objects
          if (dateValue instanceof Date) {
            const year = dateValue.getFullYear();
            const month = String(dateValue.getMonth() + 1).padStart(2, '0');
            const day = String(dateValue.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          
          // Handle string values
          const dateStr = typeof dateValue === 'string' ? dateValue : String(dateValue);
          
          // Handle ISO timestamp format: extract just the date part before 'T'
          if (dateStr.includes('T')) {
            return dateStr.split('T')[0].trim();
          }
          
          // Handle date strings with timezone offset (e.g., '2025-12-24+00:00')
          if (dateStr.includes('+') && !dateStr.includes('T')) {
            return dateStr.split('+')[0].trim();
          }
          
          // Already a date string, just trim it
          return dateStr.trim();
        };
        
        const normalizedExpected = normalizeDate(expectedTimeline);
        const normalizedActual = normalizeDate(actualTimeline);
        
        // Compare normalized values
        if (normalizedActual !== normalizedExpected) {
          console.error('❌ initial_timeline mismatch:', { 
            expected: expectedTimeline, 
            actual: actualTimeline, 
            normalizedExpected,
            normalizedActual,
            types: {
              expectedType: typeof expectedTimeline,
              actualType: typeof actualTimeline
            }
          });
        } else {
          console.log('✅ initial_timeline verified:', { 
            expected: expectedTimeline, 
            actual: actualTimeline, 
            normalized: normalizedActual 
          });
        }
        if (verificationData.initial_sizing !== finalSizingValue) {
          console.error('❌ initial_sizing mismatch:', { expected: finalSizingValue, actual: verificationData.initial_sizing });
        }
      } else if (verificationError) {
        console.error('❌ ProjectProfileStep: Error verifying saved values:', verificationError);
      }

      // STEP 4: Update context so other components can read these values
      const contextUpdatedRun = {
        ...currentProjectRun,
        customProjectName: projectForm.customProjectName.trim(),
        home_id: homeId,
        initial_budget: finalBudgetValue,
        initial_timeline: projectForm.initialTimeline || null,
        initial_sizing: finalSizingValue,
        updatedAt: new Date()
      };
      
      console.log('🔄 ProjectProfileStep: Updating context with ALL saved values:', {
        initial_budget: contextUpdatedRun.initial_budget,
        initial_timeline: contextUpdatedRun.initial_timeline,
        initial_sizing: contextUpdatedRun.initial_sizing
      });
      
      // Update context (this won't trigger another database save since we already saved above)
      await updateProjectRun(contextUpdatedRun);
      
      console.log('✅ ProjectProfileStep.handleSave: COMPLETED SUCCESSFULLY - all 3 fields saved to database');
      toast.success('Project profile saved successfully');
      
      // CRITICAL: Don't call onComplete() here - let the parent component (KickoffWorkflow) handle step completion
      // This prevents double-calling handleStepComplete and ensures proper sequencing
      // The parent will call handleStepComplete after this save completes
    } catch (error) {
      console.error('❌ ProjectProfileStep.handleSave: FAILED with error:', error);
      toast.error('Failed to save project profile');
      throw error; // Re-throw so KickoffWorkflow knows the save failed
    }
  }, [currentProjectRun, selectedHomeId, projectForm, homes, updateProjectRun, onComplete, user, scalingUnit, fetchHomes]);

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
        <CardHeader className="p-2 sm:p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Home className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Scope & Specs</span>
                {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Setup your project goals
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-2 sm:p-3">
          <div className="space-y-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] text-muted-foreground">1 of 3</span>
                <label className="text-xs font-medium">Name your project</label>
              </div>
              <Input
                value={projectForm.customProjectName}
                onChange={(e) => setProjectForm(prev => ({
                  ...prev,
                  customProjectName: e.target.value
                }))}
                placeholder="Enter your custom project name"
                className="text-xs h-9"
              />
            </div>

            {/* Header for Quick Project Goals */}
            <div className="mt-3 mb-1.5">
              <h3 className="text-xs sm:text-sm font-medium text-foreground">
                Quick project goals - you can edit these later
              </h3>
            </div>

            {/* Three column layout for Project Size, Timeline, Budget - Single column on mobile, centered */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 max-w-md md:max-w-none mx-auto md:mx-0">
              {/* Project Size */}
              <div className="flex flex-col items-center text-center">
                <Label className="text-xs font-medium mb-0.5 flex items-center gap-1 justify-center">
                  <Ruler className="w-3 h-3" />
                  Project Size
                </Label>
                <p className="text-[10px] text-muted-foreground mb-1">How much work are you doing?</p>
                <div className="flex items-center gap-1 w-full justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    aria-label="Decrease by 25"
                    onClick={() => {
                      const n = Math.max(0, (parseFloat(projectForm.initialSizing) || 0) - 25);
                      setProjectForm(prev => ({ ...prev, initialSizing: String(n) }));
                    }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    aria-label="Decrease by 1"
                    onClick={() => {
                      const n = Math.max(0, (parseFloat(projectForm.initialSizing) || 0) - 1);
                      setProjectForm(prev => ({ ...prev, initialSizing: String(n) }));
                    }}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <Input
                    type="number"
                    value={projectForm.initialSizing}
                    onChange={(e) => {
                      setProjectForm(prev => ({ ...prev, initialSizing: e.target.value }));
                    }}
                    placeholder="0"
                    className="text-xs h-9 w-[80px]"
                    step="1"
                    min="0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    aria-label="Increase by 1"
                    onClick={() => {
                      const n = (parseFloat(projectForm.initialSizing) || 0) + 1;
                      setProjectForm(prev => ({ ...prev, initialSizing: String(n) }));
                    }}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    aria-label="Increase by 25"
                    onClick={() => {
                      const n = (parseFloat(projectForm.initialSizing) || 0) + 25;
                      setProjectForm(prev => ({ ...prev, initialSizing: String(n) }));
                    }}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-0.5">
                    {(() => {
                      // Standard scaling units
                      const normalizedScalingUnit = scalingUnit?.toLowerCase().trim() || '';
                      
                      if (normalizedScalingUnit === 'per square feet' || normalizedScalingUnit === 'per square foot') return 'sq ft';
                      if (normalizedScalingUnit === 'per 10x10 room') return 'rooms';
                      if (normalizedScalingUnit === 'per linear feet' || normalizedScalingUnit === 'per linear foot') return 'linear ft';
                      if (normalizedScalingUnit === 'per cubic yard') return 'cu yd';
                      
                      // For "per item", use item_type if available, otherwise use "per item"
                      if (normalizedScalingUnit === 'per item') {
                        // Check if itemType exists and is not empty
                        // Also check state directly in case of timing issues
                        const currentItemType = itemType || (templateProject as any)?.item_type || (templateProject as any)?.itemType;
                        const validItemType = currentItemType && typeof currentItemType === 'string' && currentItemType.trim().length > 0;
                        
                        if (validItemType) {
                          const displayValue = currentItemType.trim().toLowerCase();
                          return displayValue;
                        }
                        
                        // No item_type available, using "per item"
                        return 'per item';
                      }
                      
                      // If scalingUnit is a custom value (not one of the standard ones), use it directly
                      // This handles cases like "per toilet(s)" as a custom scaling unit
                      return scalingUnit;
                    })()}
                  </span>
                </div>
              </div>

              {/* Timeline - one week at a time ending Sunday; large = ±1 week, small = ±1 day */}
              <div className="flex flex-col items-center text-center">
                <Label className="text-xs font-medium mb-0.5 flex items-center gap-1 justify-center">
                  <Calendar className="w-3 h-3" />
                  Timeline
                </Label>
                <p className="text-[10px] text-muted-foreground mb-1">When do you want this done?</p>
                <div className="flex items-center gap-1 w-full justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    aria-label="Move back one week (previous Sunday)"
                    onClick={() => {
                      const next = addWeeks(projectForm.initialTimeline || new Date().toISOString().split('T')[0], -1);
                      setProjectForm(prev => ({ ...prev, initialTimeline: next }));
                    }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    aria-label="Move back one day"
                    onClick={() => {
                      const next = addDays(projectForm.initialTimeline || new Date().toISOString().split('T')[0], -1);
                      setProjectForm(prev => ({ ...prev, initialTimeline: next }));
                    }}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <Input
                    type="date"
                    value={projectForm.initialTimeline}
                    onChange={(e) => {
                      setProjectForm(prev => ({ ...prev, initialTimeline: e.target.value }));
                    }}
                    className="text-xs h-9 w-auto min-w-[120px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    aria-label="Move forward one day"
                    onClick={() => {
                      const next = addDays(projectForm.initialTimeline || new Date().toISOString().split('T')[0], 1);
                      setProjectForm(prev => ({ ...prev, initialTimeline: next }));
                    }}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    aria-label="Move forward one week (next Sunday)"
                    onClick={() => {
                      const next = addWeeks(projectForm.initialTimeline || new Date().toISOString().split('T')[0], 1);
                      setProjectForm(prev => ({ ...prev, initialTimeline: next }));
                    }}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Budget */}
              <div className="flex flex-col items-center text-center">
                <Label className="text-xs font-medium mb-0.5 flex items-center gap-1 justify-center">
                  <DollarSign className="w-3 h-3" />
                  Budget
                </Label>
                <p className="text-[10px] text-muted-foreground mb-1">How much do you want to spend?</p>
                <div className="flex items-center gap-1 w-full justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    aria-label="Decrease by $100"
                    onClick={() => {
                      const n = Math.max(0, (parseFloat(projectForm.initialBudget.replace(/[^0-9.-]/g, '')) || 0) - 100);
                      setProjectForm(prev => ({ ...prev, initialBudget: String(n) }));
                    }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    aria-label="Decrease by $1"
                    onClick={() => {
                      const n = Math.max(0, (parseFloat(projectForm.initialBudget.replace(/[^0-9.-]/g, '')) || 0) - 1);
                      setProjectForm(prev => ({ ...prev, initialBudget: String(n) }));
                    }}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <Input
                      value={projectForm.initialBudget}
                      onChange={(e) => {
                        setProjectForm(prev => ({ ...prev, initialBudget: e.target.value }));
                      }}
                      placeholder="0"
                      className="text-xs h-9 pl-7 w-[100px]"
                      type="number"
                      step="1"
                      min="0"
                      max="999999"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    aria-label="Increase by $1"
                    onClick={() => {
                      const n = (parseFloat(projectForm.initialBudget.replace(/[^0-9.-]/g, '')) || 0) + 1;
                      setProjectForm(prev => ({ ...prev, initialBudget: String(n) }));
                    }}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    aria-label="Increase by $100"
                    onClick={() => {
                      const n = (parseFloat(projectForm.initialBudget.replace(/[^0-9.-]/g, '')) || 0) + 100;
                      setProjectForm(prev => ({ ...prev, initialBudget: String(n) }));
                    }}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Primary home selection - show whenever user has at least one home (Scope & Specs step) */}
            {homes.length >= 1 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] text-muted-foreground">2 of 3</span>
                  <label className="text-xs font-medium">Primary home for this project</label>
                </div>
                {loading ? (
                  <div className="text-xs sm:text-sm text-muted-foreground">Loading homes...</div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Select a home for this project" />
                      </SelectTrigger>
                      <SelectContent>
                        {homes.map((home) => (
                          <SelectItem key={home.id} value={home.id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{home.name}</span>
                              {home.is_primary && (
                                <Badge variant="secondary" className="text-[10px] flex-shrink-0">Primary</Badge>
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
                      className="h-9 w-9 flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
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