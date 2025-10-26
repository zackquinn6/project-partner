import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Plus, Home, X, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface ProjectSpace {
  id: string;
  name: string;
  spaceType: string;
  homeSpaceId?: string;
  scaleValue?: number;
  scaleUnit?: string;
  isFromHome: boolean;
}

interface SpaceSelectorProps {
  projectRunHomeId?: string;
  selectedSpaces: ProjectSpace[];
  onSpacesChange: (spaces: ProjectSpace[]) => void;
  projectScaleUnit?: string;
}

export const SpaceSelector: React.FC<SpaceSelectorProps> = ({
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

  const handleAddHomeSpace = (homeSpace: any) => {
    const spaceId = `home-space-${homeSpace.id}`;
    
    if (selectedSpaces.find(s => s.id === spaceId)) {
      toast({
        title: "Space already added",
        description: `${homeSpace.space_name} is already in this project`,
        variant: "destructive"
      });
      return;
    }

    const newSpace: ProjectSpace = {
      id: spaceId,
      name: homeSpace.space_name,
      spaceType: homeSpace.space_type || 'room',
      homeSpaceId: homeSpace.id,
      scaleValue: homeSpace.square_footage,
      scaleUnit: projectScaleUnit,
      isFromHome: true
    };

    onSpacesChange([...selectedSpaces, newSpace]);
    toast({
      title: "Space added",
      description: `${homeSpace.space_name} added to project`
    });
  };

  const handleAddCustomSpace = () => {
    if (!customSpaceName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the space",
        variant: "destructive"
      });
      return;
    }

    const spaceId = `custom-space-${Date.now()}`;
    const newSpace: ProjectSpace = {
      id: spaceId,
      name: customSpaceName,
      spaceType: customSpaceType || 'custom',
      scaleValue: customScaleValue,
      scaleUnit: projectScaleUnit,
      isFromHome: false
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
  };

  const handleRemoveSpace = (spaceId: string) => {
    onSpacesChange(selectedSpaces.filter(s => s.id !== spaceId));
  };

  const handleUpdateScaleValue = (spaceId: string, value: number) => {
    onSpacesChange(
      selectedSpaces.map(s => 
        s.id === spaceId ? { ...s, scaleValue: value } : s
      )
    );
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
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedSpaces.map((space) => (
              <div key={space.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
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
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
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
            <div className="space-y-4">
              <div>
                <Label htmlFor="space-name">Space Name *</Label>
                <Input
                  id="space-name"
                  value={customSpaceName}
                  onChange={(e) => setCustomSpaceName(e.target.value)}
                  placeholder="e.g., Guest Bathroom, Kitchen"
                />
              </div>
              <div>
                <Label htmlFor="space-type">Space Type</Label>
                <Input
                  id="space-type"
                  value={customSpaceType}
                  onChange={(e) => setCustomSpaceType(e.target.value)}
                  placeholder="e.g., bathroom, bedroom"
                />
              </div>
              <div>
                <Label htmlFor="scale-value">Scale Value ({projectScaleUnit})</Label>
                <Input
                  id="scale-value"
                  type="number"
                  value={customScaleValue || ''}
                  onChange={(e) => setCustomScaleValue(parseFloat(e.target.value))}
                  placeholder={`Enter ${projectScaleUnit}`}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCustomSpace} className="flex-1">
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
