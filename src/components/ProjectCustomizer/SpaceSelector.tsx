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
  name: string;
  spaceType: string;
  homeSpaceId?: string;
  scaleValue?: number;
  scaleUnit?: string;
  isFromHome: boolean;
  priority?: number; // Lower number = higher priority (1 is highest)
}

export interface SpaceSelectorProps {
  projectRunId: string;
  projectRunHomeId?: string;
  selectedSpaces: ProjectSpace[];
  onSpacesChange: (spaces: ProjectSpace[]) => void;
  projectScaleUnit?: string;
}

export const SpaceSelector: React.FC<SpaceSelectorProps> = ({
  projectRunId,
  projectRunHomeId,
  selectedSpaces,
  onSpacesChange,
  projectScaleUnit = 'square foot'
}) => {
  const [homeSpaces, setHomeSpaces] = useState<any[]>([]);
  const [showCustomSpaceForm, setShowCustomSpaceForm] = useState(false);
  const [customSpaceName, setCustomSpaceName] = useState('');
  const [customSpaceType, setCustomSpaceType] = useState('');
  const [customScaleValue, setCustomScaleValue] = useState<number | undefined>();

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

        const loadedSpaces: ProjectSpace[] = (spacesData || []).map(space => {
          const relationalSizing = sizingMap.get(space.id) || {};
          // Use relational data if available, otherwise fall back to legacy columns
          const primarySizing = Object.keys(relationalSizing).length > 0 
            ? relationalSizing 
            : (space.scale_value && space.scale_unit ? { [space.scale_unit]: space.scale_value } : {});
          
          // Get primary scale value and unit (first entry in relational sizing, or legacy)
          const primaryUnit = Object.keys(primarySizing)[0] || space.scale_unit;
          const primaryValue = primarySizing[primaryUnit] || space.scale_value;

          return {
            id: space.id,
            name: space.space_name,
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

    const spaceId = `home-space-${homeSpace.id}`;
    
    if (selectedSpaces.find(s => s.id === spaceId)) {
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

      // Save to database
      const { data, error } = await supabase
        .from('project_run_spaces')
        .insert({
          project_run_id: projectRunId,
          home_space_id: homeSpace.id,
          space_name: homeSpace.space_name,
          space_type: homeSpace.space_type || 'room',
          scale_value: homeSpace.square_footage,
          scale_unit: projectScaleUnit,
          is_from_home: true,
          priority: nextPriority
        })
        .select()
        .single();

      if (error) throw error;

      // Get the next priority (highest number + 1, or 1 if no spaces exist)
      const nextPriority = selectedSpaces.length > 0 
        ? Math.max(...selectedSpaces.map(s => s.priority || 0)) + 1
        : 1;

      const newSpace: ProjectSpace = {
        id: data.id,
        name: data.space_name,
        spaceType: data.space_type,
        homeSpaceId: homeSpace.id,
        scaleValue: data.scale_value,
        scaleUnit: projectScaleUnit,
        isFromHome: true,
        priority: data.priority || nextPriority
      };

      onSpacesChange([...selectedSpaces, newSpace]);
      toast({
        title: "Space added",
        description: `${homeSpace.space_name} added to project`
      });
    } catch (error) {
      console.error('Error adding home space:', error);
      toast({
        title: "Error",
        description: "Failed to add space to project",
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

      // Get the next priority (highest number + 1, or 1 if no spaces exist)
      const nextPriority = selectedSpaces.length > 0 
        ? Math.max(...selectedSpaces.map(s => s.priority || 0)) + 1
        : 1;

      const newSpace: ProjectSpace = {
        id: data.id,
        name: data.space_name,
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
      // Get the space to find its scale_unit
      const space = selectedSpaces.find(s => s.id === spaceId);
      const scalingUnit = space?.scaleUnit || projectScaleUnit;

      // Update legacy column for backward compatibility
      const { error: updateError } = await supabase
        .from('project_run_spaces')
        .update({ scale_value: value })
        .eq('id', spaceId);

      if (updateError) throw updateError;

      // Update or insert in relational table
      if (scalingUnit) {
        const { error: sizingError } = await supabase
          .from('project_run_space_sizing')
          .upsert({
            space_id: spaceId,
            scaling_unit: scalingUnit,
            size_value: value
          }, {
            onConflict: 'space_id,scaling_unit'
          });

        if (sizingError) {
          console.error('Error updating sizing value:', sizingError);
          // Don't throw - legacy column was updated successfully
        }
      }

      onSpacesChange(
        selectedSpaces.map(s => 
          s.id === spaceId ? { ...s, scaleValue: value } : s
        )
      );
    } catch (error) {
      console.error('Error updating scale value:', error);
      toast({
        title: "Error",
        description: "Failed to update scale value",
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
                        <h4 className="font-medium text-sm">{space.name}</h4>
                        <Badge variant={space.isFromHome ? "default" : "secondary"} className="text-xs">
                          {space.isFromHome ? "From Home" : "Custom"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <Label className="text-xs text-muted-foreground">
                          Scale ({projectScaleUnit}):
                        </Label>
                        <Input
                          type="number"
                          value={space.scaleValue || ''}
                          onChange={(e) => handleUpdateScaleValue(space.id, parseFloat(e.target.value))}
                          placeholder={`Enter ${projectScaleUnit}`}
                          className="w-32 h-8 text-sm"
                        />
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

      {/* Home Spaces */}
      {projectRunHomeId && homeSpaces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="w-4 h-4" />
              Available Home Spaces
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {homeSpaces.map((homeSpace) => {
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
                    {isAdded ? "Added" : "Add"}
                  </Button>
                </div>
              );
            })}
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
                  <Label htmlFor="scale-value" className="text-xs">Scale ({projectScaleUnit})</Label>
                  <Input
                    id="scale-value"
                    type="number"
                    value={customScaleValue || ''}
                    onChange={(e) => setCustomScaleValue(parseFloat(e.target.value))}
                    placeholder="100"
                    className="h-8 text-sm"
                  />
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
