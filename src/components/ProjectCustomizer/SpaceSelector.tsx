import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Home, X, Edit2, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface ProjectSpace {
  id: string;
  space_name: string; // Changed from 'name' to 'space_name' for clarity and consistency with database
  spaceType: string;
  homeSpaceId?: string;
  scaleValue?: number;
  scaleUnit?: string;
  isFromHome: boolean;
  priority?: number; // Lower number = higher priority (1 is highest) - used for display order in workflow navigation
}

export interface SpaceSelectorProps {
  projectRunId: string;
  projectRunHomeId?: string;
  selectedSpaces: ProjectSpace[];
  onSpacesChange: (spaces: ProjectSpace[]) => void;
  projectScaleUnit?: string;
  currentProjectName?: string;
  phases?: any[]; // Phases from project run to extract incorporated phases
  initialSizing?: string; // Initial sizing from project kickoff
}

export const SpaceSelector: React.FC<SpaceSelectorProps> = ({
  projectRunId,
  projectRunHomeId,
  selectedSpaces,
  onSpacesChange,
  projectScaleUnit = 'item',
  currentProjectName = 'Current Project',
  phases = [],
  initialSizing
}) => {
  const [homeSpaces, setHomeSpaces] = useState<any[]>([]);
  const [showCustomSpaceForm, setShowCustomSpaceForm] = useState(false);
  const [customSpaceName, setCustomSpaceName] = useState('');
  const [customSpaceType, setCustomSpaceType] = useState('');
  const [customScaleValue, setCustomScaleValue] = useState<number | undefined>();
  const [spaceSizingData, setSpaceSizingData] = useState<Map<string, Record<string, number>>>(new Map());

  // Extract unique incorporated phases with their scaling units
  const incorporatedPhases = React.useMemo(() => {
    const uniquePhases = new Map<string, { projectName: string; scalingUnit: string }>();
    
    phases.forEach((phase: any) => {
      if (phase.isLinked && phase.sourceProjectName && phase.sourceScalingUnit) {
        // Only add if not already in map (unique by project name)
        if (!uniquePhases.has(phase.sourceProjectName)) {
          // Normalize scaling unit (remove "per " prefix if present)
          const normalizedUnit = phase.sourceScalingUnit.startsWith('per ') 
            ? phase.sourceScalingUnit.replace('per ', '')
            : phase.sourceScalingUnit;
          
          uniquePhases.set(phase.sourceProjectName, {
            projectName: phase.sourceProjectName,
            scalingUnit: normalizedUnit
          });
        }
      }
    });
    
    return Array.from(uniquePhases.values());
  }, [phases]);

  // Load sizing data for all spaces
  useEffect(() => {
    const loadSizingData = async () => {
      if (selectedSpaces.length === 0) return;
      
      const spaceIds = selectedSpaces.map(s => s.id);
      const { data, error } = await supabase
        .from('project_run_space_sizing')
        .select('space_id, scaling_unit, size_value')
        .in('space_id', spaceIds);

      if (error) {
        console.error('Error loading sizing data:', error);
        return;
      }

      const sizingMap = new Map<string, Record<string, number>>();
      (data || []).forEach(sizing => {
        if (!sizingMap.has(sizing.space_id)) {
          sizingMap.set(sizing.space_id, {});
        }
        sizingMap.get(sizing.space_id)![sizing.scaling_unit] = sizing.size_value;
      });

      setSpaceSizingData(sizingMap);
    };

    loadSizingData();
  }, [selectedSpaces.map(s => s.id).join(',')]);

  useEffect(() => {
    if (projectRunHomeId) {
      fetchHomeSpaces();
    }
  }, [projectRunHomeId]);

  // Load spaces from database with priority when component mounts or projectRunId changes
  useEffect(() => {
    if (!projectRunId) return;

    const loadSpaces = async () => {
      try {
        // Load spaces
        const { data: spacesData, error: spacesError } = await supabase
          .from('project_run_spaces')
          .select('*')
          .eq('project_run_id', projectRunId)
          .order('priority', { ascending: true, nullsLast: true });

        if (spacesError) throw spacesError;

        // Load sizing values from relational table
        const spaceIds = (spacesData || []).map(s => s.id);
        let sizingData: any[] = [];
        if (spaceIds.length > 0) {
          const { data, error: sizingError } = await supabase
            .from('project_run_space_sizing')
            .select('space_id, scaling_unit, size_value')
            .in('space_id', spaceIds);

          if (sizingError) {
            console.error('Error loading sizing values:', sizingError);
          } else {
            sizingData = data || [];
          }
        }

        // Build sizing map from relational data
        const sizingMap = new Map<string, Record<string, number>>();
        sizingData.forEach(sizing => {
          if (!sizingMap.has(sizing.space_id)) {
            sizingMap.set(sizing.space_id, {});
          }
          sizingMap.get(sizing.space_id)![sizing.scaling_unit] = sizing.size_value;
        });

        const loadedSpaces: ProjectSpace[] = (spacesData || []).map((space, index) => {
          const relationalSizing = sizingMap.get(space.id) || {};
          // Use relational data if available, otherwise fall back to legacy columns
          const primarySizing = Object.keys(relationalSizing).length > 0 
            ? relationalSizing 
            : (space.scale_value && space.scale_unit ? { [space.scale_unit]: space.scale_value } : {});
          
          // Get primary scale value and unit (prefer project scale unit, then first entry, then legacy)
          const primaryUnit = primarySizing[projectScaleUnit] !== undefined 
            ? projectScaleUnit 
            : (Object.keys(primarySizing)[0] || space.scale_unit || projectScaleUnit);
          let primaryValue = primarySizing[primaryUnit] || space.scale_value || 0;
          
          // If this is the first space (index 0) and it has no sizing value, inherit from initial_sizing
          if (index === 0 && (primaryValue === 0 || primaryValue === null || primaryValue === undefined) && initialSizing) {
            const parsedInitial = parseFloat(initialSizing);
            if (!isNaN(parsedInitial) && parsedInitial > 0) {
              primaryValue = parsedInitial;
              // Update the space in database with initial sizing (async, don't await)
              // CRITICAL: Only do this if space.id exists and is valid
              if (space.id) {
                (async () => {
                  try {
                    await supabase
                      .from('project_run_spaces')
                      .update({ scale_value: parsedInitial })
                      .eq('id', space.id);
                    
                    // CRITICAL: Ensure space_id is not null before upserting
                    if (space.id && projectScaleUnit) {
                      await supabase
                        .from('project_run_space_sizing')
                        .upsert({
                          space_id: space.id,
                          scaling_unit: projectScaleUnit,
                          size_value: parsedInitial
                        }, {
                          onConflict: 'space_id,scaling_unit'
                        });
                    }
                  } catch (error) {
                    console.error('Error inheriting initial sizing:', error);
                  }
                })();
              }
            }
          }

          return {
            id: space.id,
            space_name: space.space_name,
            spaceType: space.space_type,
            homeSpaceId: space.home_space_id || undefined,
            scaleValue: primaryValue || undefined,
            scaleUnit: primaryUnit || undefined,
            isFromHome: space.is_from_home || false,
            priority: space.priority || undefined
          };
        });

        // Only update if we have spaces from database and current selectedSpaces is empty or different
        if (loadedSpaces.length > 0 && (
          selectedSpaces.length === 0 || 
          selectedSpaces.length !== loadedSpaces.length ||
          !selectedSpaces.every(s => loadedSpaces.some(ls => ls.id === s.id))
        )) {
          onSpacesChange(loadedSpaces);
        }
      } catch (error) {
        console.error('Error loading spaces:', error);
      }
    };

    loadSpaces();
  }, [projectRunId]);

  const fetchHomeSpaces = async () => {
    if (!projectRunHomeId) return;

    const { data, error } = await supabase
      .from('home_spaces')
      .select('*')
      .eq('home_id', projectRunHomeId);

    if (error) {
      console.error('Error fetching home spaces:', error);
      return;
    }

    setHomeSpaces(data || []);
  };

  const handleAddHomeSpace = async (homeSpace: any) => {
    if (!projectRunId) {
      toast({
        title: "Error",
        description: "No project run ID available",
        variant: "destructive"
      });
      return;
    }

    // Check if this home space is already added to the project
    if (selectedSpaces.find(s => s.homeSpaceId === homeSpace.id)) {
      toast({
        title: "Space already added",
        description: `${homeSpace.space_name} is already in this project`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Get the next priority (highest number + 1, or 1 if no spaces exist)
      const nextPriority = selectedSpaces.length > 0 
        ? Math.max(...selectedSpaces.map(s => s.priority || 0)) + 1
        : 1;

      // Save to database - this creates a reference to the home space, not a copy
      // The home_space_id links to the home_spaces table, but we don't modify home_spaces
      const { data, error } = await supabase
        .from('project_run_spaces')
        .insert({
          project_run_id: projectRunId,
          home_space_id: homeSpace.id, // Reference to home space, not a copy
          space_name: homeSpace.space_name,
          space_type: homeSpace.space_type || 'room',
          scale_value: homeSpace.square_footage, // Legacy column
          scale_unit: projectScaleUnit, // Legacy column
          is_from_home: true, // Mark as imported from home
          priority: nextPriority
        })
        .select()
        .single();

      if (error) throw error;

      // Insert sizing value into relational table if square_footage exists
      if (data.id && homeSpace.square_footage !== null && homeSpace.square_footage !== undefined && projectScaleUnit) {
        const { error: sizingError } = await supabase
          .from('project_run_space_sizing')
          .insert({
            space_id: data.id,
            scaling_unit: projectScaleUnit,
            size_value: homeSpace.square_footage
          });

        if (sizingError) {
          console.error('Error inserting sizing value for home space:', sizingError);
          // Don't throw - space was created successfully, sizing can be added later
        }
      }

      const newSpace: ProjectSpace = {
        id: data.id,
        space_name: data.space_name,
        spaceType: data.space_type,
        homeSpaceId: homeSpace.id, // Keep reference to original home space
        scaleValue: data.scale_value || homeSpace.square_footage,
        scaleUnit: projectScaleUnit,
        isFromHome: true,
        priority: data.priority || nextPriority
      };

      onSpacesChange([...selectedSpaces, newSpace]);
      toast({
        title: "Space added",
        description: `${homeSpace.space_name} imported from home spaces`
      });
    } catch (error) {
      console.error('Error adding home space:', error);
      toast({
        title: "Error",
        description: "Failed to import space from home",
        variant: "destructive"
      });
    }
  };

  const handleAddCustomSpace = async () => {
    if (!customSpaceName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the space",
        variant: "destructive"
      });
      return;
    }

    if (!projectRunId) {
      toast({
        title: "Error",
        description: "No project run ID available",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get the next priority (highest number + 1, or 1 if no spaces exist)
      const nextPriority = selectedSpaces.length > 0 
        ? Math.max(...selectedSpaces.map(s => s.priority || 0)) + 1
        : 1;

      // Save to database
      const { data, error } = await supabase
        .from('project_run_spaces')
        .insert({
          project_run_id: projectRunId,
          space_name: customSpaceName,
          space_type: customSpaceType || 'custom',
          scale_value: customScaleValue, // Legacy column for backward compatibility
          scale_unit: projectScaleUnit, // Legacy column for backward compatibility
          is_from_home: false,
          priority: nextPriority
        })
        .select()
        .single();

      if (error) throw error;

      // Insert sizing value into relational table
      if (data.id && customScaleValue !== undefined && customScaleValue !== null && projectScaleUnit) {
        const { error: sizingError } = await supabase
          .from('project_run_space_sizing')
          .insert({
            space_id: data.id,
            scaling_unit: projectScaleUnit,
            size_value: customScaleValue
          });

        if (sizingError) {
          console.error('Error inserting sizing value:', sizingError);
          // Don't throw - space was created successfully, sizing can be added later
        }
      }

      const newSpace: ProjectSpace = {
        id: data.id,
        space_name: data.space_name,
        spaceType: data.space_type,
        scaleValue: data.scale_value,
        scaleUnit: projectScaleUnit,
        isFromHome: false,
        priority: data.priority || nextPriority
      };

      onSpacesChange([...selectedSpaces, newSpace]);
      setCustomSpaceName('');
      setCustomSpaceType('');
      setCustomScaleValue(undefined);
      setShowCustomSpaceForm(false);
      
      toast({
        title: "Custom space added",
        description: `${customSpaceName} added to project`
      });
    } catch (error) {
      console.error('Error adding custom space:', error);
      toast({
        title: "Error",
        description: "Failed to add custom space",
        variant: "destructive"
      });
    }
  };

  const handleRemoveSpace = async (spaceId: string) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from('project_run_spaces')
        .delete()
        .eq('id', spaceId);

      if (error) throw error;

      onSpacesChange(selectedSpaces.filter(s => s.id !== spaceId));
      toast({
        title: "Space removed",
        description: "Space removed from project"
      });
    } catch (error) {
      console.error('Error removing space:', error);
      toast({
        title: "Error",
        description: "Failed to remove space",
        variant: "destructive"
      });
    }
  };

  const handleUpdateScaleValue = async (spaceId: string, value: number) => {
    try {
      // Update legacy column for backward compatibility
      const { error: updateError } = await supabase
        .from('project_run_spaces')
        .update({ scale_value: value })
        .eq('id', spaceId);

      if (updateError) throw updateError;

      // Update or insert in relational table for current project scaling unit
      const { error: sizingError } = await supabase
        .from('project_run_space_sizing')
        .upsert({
          space_id: spaceId,
          scaling_unit: projectScaleUnit,
          size_value: value
        }, {
          onConflict: 'space_id,scaling_unit'
        });

      if (sizingError) {
        console.error('Error updating sizing value:', sizingError);
        // Don't throw - legacy column was updated successfully
      }

      onSpacesChange(
        selectedSpaces.map(s => 
          s.id === spaceId ? { ...s, scaleValue: value, scaleUnit: projectScaleUnit } : s
        )
      );
    } catch (error) {
      console.error('Error updating scale value:', error);
      toast({
        title: "Error",
        description: "Failed to update sizing value",
        variant: "destructive"
      });
    }
  };

  const handleUpdateSizingValue = async (spaceId: string, scalingUnit: string, value: number) => {
    try {
      // Update or insert in relational table
      const { error: sizingError } = await supabase
        .from('project_run_space_sizing')
        .upsert({
          space_id: spaceId,
          scaling_unit: scalingUnit,
          size_value: value
        }, {
          onConflict: 'space_id,scaling_unit'
        });

      if (sizingError) throw sizingError;

      // Reload sizing data for this space
      const { data: sizingData } = await supabase
        .from('project_run_space_sizing')
        .select('scaling_unit, size_value')
        .eq('space_id', spaceId);

      if (sizingData) {
        const newSizingMap = new Map(spaceSizingData);
        const spaceSizing: Record<string, number> = {};
        sizingData.forEach(s => {
          spaceSizing[s.scaling_unit] = s.size_value;
        });
        newSizingMap.set(spaceId, spaceSizing);
        setSpaceSizingData(newSizingMap);

        // Update the primary scale value if it matches the project scale unit
        const primarySizing = sizingData.find(s => s.scaling_unit === projectScaleUnit);
        if (primarySizing) {
          onSpacesChange(
            selectedSpaces.map(s => 
              s.id === spaceId 
                ? { ...s, scaleValue: primarySizing.size_value, scaleUnit: projectScaleUnit }
                : s
            )
          );
        }
      }
    } catch (error) {
      console.error('Error updating sizing value:', error);
      toast({
        title: "Error",
        description: "Failed to update sizing value",
        variant: "destructive"
      });
    }
  };

  const handlePriorityChange = async (spaceId: string, direction: 'up' | 'down') => {
    // Sort spaces by priority (lower number = higher priority)
    const sortedSpaces = [...selectedSpaces].sort((a, b) => {
      const priorityA = a.priority || 999;
      const priorityB = b.priority || 999;
      return priorityA - priorityB;
    });

    const currentIndex = sortedSpaces.findIndex(s => s.id === spaceId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sortedSpaces.length) return;

    // Swap priorities
    const currentSpace = sortedSpaces[currentIndex];
    const targetSpace = sortedSpaces[newIndex];
    
    const tempPriority = currentSpace.priority;
    const newPriority = targetSpace.priority;

    try {
      // Update both spaces in database
      const updates = [
        supabase
          .from('project_run_spaces')
          .update({ priority: newPriority })
          .eq('id', currentSpace.id),
        supabase
          .from('project_run_spaces')
          .update({ priority: tempPriority })
          .eq('id', targetSpace.id)
      ];

      await Promise.all(updates.map(u => u.then(({ error }) => {
        if (error) throw error;
      })));

      // Update local state
      const updatedSpaces = selectedSpaces.map(s => {
        if (s.id === currentSpace.id) return { ...s, priority: newPriority };
        if (s.id === targetSpace.id) return { ...s, priority: tempPriority };
        return s;
      });

      onSpacesChange(updatedSpaces);
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: "Error",
        description: "Failed to update priority order",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Define Project Spaces</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select spaces from your home or add custom spaces for this project. 
          Each space will have its own customization decisions.
        </p>
      </div>

      {/* Selected Spaces */}
      {selectedSpaces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selected Spaces ({selectedSpaces.length})</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Set priority order: higher priority spaces (lower numbers) are completed first. Use arrows to reorder.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...selectedSpaces]
              .sort((a, b) => {
                const priorityA = a.priority || 999;
                const priorityB = b.priority || 999;
                return priorityA - priorityB;
              })
              .map((space, index, sortedArray) => {
                const isFirst = index === 0;
                const isLast = index === sortedArray.length - 1;
                const priorityNumber = space.priority || index + 1;
                
                return (
                  <div key={space.id} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    {/* Priority Controls */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handlePriorityChange(space.id, 'up')}
                        disabled={isFirst}
                        title="Increase priority (move up)"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <div className="text-xs text-center font-semibold text-primary min-w-[20px]">
                        {priorityNumber}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handlePriorityChange(space.id, 'down')}
                        disabled={isLast}
                        title="Decrease priority (move down)"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{space.space_name}</h4>
                        {space.isFromHome && (
                          <Badge variant="default" className="text-xs">
                            From Home
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        {/* Current Project Sizing */}
                        <div>
                          <Label className="text-xs font-medium mb-1 block">
                            {currentProjectName}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={space.scaleValue || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || (val.length <= 6 && /^\d*\.?\d*$/.test(val))) {
                                  handleUpdateScaleValue(space.id, val === '' ? 0 : parseFloat(val));
                                }
                              }}
                              placeholder="0"
                              className="w-20 h-8 text-sm text-center"
                              maxLength={6}
                            />
                            <span className="text-xs text-muted-foreground">{projectScaleUnit}</span>
                          </div>
                        </div>
                        
                        {/* Incorporated Phases Sizing */}
                        {incorporatedPhases.map((phase) => {
                          const sizingKey = phase.scalingUnit;
                          const spaceSizing = spaceSizingData.get(space.id) || {};
                          const currentValue = spaceSizing[sizingKey];
                          
                          return (
                            <div key={phase.projectName}>
                              <Label className="text-xs font-medium mb-1 block">
                                {phase.projectName}
                              </Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={currentValue || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || (val.length <= 6 && /^\d*\.?\d*$/.test(val))) {
                                      handleUpdateSizingValue(space.id, sizingKey, val === '' ? 0 : parseFloat(val));
                                    }
                                  }}
                                  placeholder="0"
                                  className="w-20 h-8 text-sm text-center"
                                  maxLength={6}
                                />
                                <span className="text-xs text-muted-foreground">{phase.scalingUnit}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSpace(space.id)}
                      title="Remove space"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Home Spaces - Show if home is selected, even if no spaces exist yet */}
      {projectRunHomeId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="w-4 h-4" />
              Import from Home Spaces
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Import spaces defined for your home. These will be linked to your home spaces but saved separately for this project.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {homeSpaces.length > 0 ? (
              homeSpaces.map((homeSpace) => {
                const isAdded = selectedSpaces.some(s => s.homeSpaceId === homeSpace.id);
                return (
                  <div key={homeSpace.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{homeSpace.space_name}</p>
                      {homeSpace.square_footage && (
                        <p className="text-xs text-muted-foreground">
                          {homeSpace.square_footage} {projectScaleUnit}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddHomeSpace(homeSpace)}
                      disabled={isAdded}
                    >
                      {isAdded ? "Added" : "Import"}
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No spaces defined for this home yet. You can add project-specific spaces below.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Custom Space */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Custom Space
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showCustomSpaceForm ? (
            <Button
              variant="outline"
              onClick={() => setShowCustomSpaceForm(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Project-Specific Space
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="space-name" className="text-xs">Space Name *</Label>
                  <Input
                    id="space-name"
                    value={customSpaceName}
                    onChange={(e) => setCustomSpaceName(e.target.value)}
                    placeholder="e.g., Guest Bath"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="space-type" className="text-xs">Space Type</Label>
                  <Select value={customSpaceType} onValueChange={setCustomSpaceType}>
                    <SelectTrigger id="space-type" className="h-8 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bedroom">Bedroom</SelectItem>
                      <SelectItem value="bathroom">Bathroom</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="scale-value" className="text-xs">Sizing</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="scale-value"
                      type="number"
                      value={customScaleValue || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || (val.length <= 6 && /^\d*\.?\d*$/.test(val))) {
                          setCustomScaleValue(val === '' ? undefined : parseFloat(val));
                        }
                      }}
                      placeholder="0"
                      className="h-8 text-sm text-center w-20"
                      maxLength={6}
                    />
                    <span className="text-xs text-muted-foreground">{projectScaleUnit}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCustomSpace} className="flex-1 h-8 text-sm">
                  Add Space
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCustomSpaceForm(false);
                    setCustomSpaceName('');
                    setCustomSpaceType('');
                    setCustomScaleValue(undefined);
                  }}
                  className="h-8 text-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
