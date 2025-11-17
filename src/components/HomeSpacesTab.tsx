import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface HomeSpace {
  id: string;
  home_id: string;
  space_name: string;
  space_type: string;
  floor_plan_image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface HomeDetails {
  bedrooms: number | null;
  bathrooms: number | null;
}

interface HomeSpacesTabProps {
  homeId: string;
}

export const HomeSpacesTab: React.FC<HomeSpacesTabProps> = ({ homeId }) => {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<HomeSpace[]>([]);
  const [homeDetails, setHomeDetails] = useState<HomeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSpace, setEditingSpace] = useState<HomeSpace | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    space_name: '',
    space_type: 'custom',
    notes: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (homeId && user) {
      fetchSpaces();
      fetchHomeDetails();
    }
  }, [homeId, user]);

  const fetchSpaces = async () => {
    try {
      const { data, error } = await supabase
        .from('home_spaces')
        .select('*')
        .eq('home_id', homeId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSpaces(data || []);
    } catch (error) {
      console.error('Error fetching spaces:', error);
      toast.error('Failed to load spaces');
    } finally {
      setLoading(false);
    }
  };

  const fetchHomeDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('home_details')
        .select('bedrooms, bathrooms')
        .eq('home_id', homeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setHomeDetails(data);
    } catch (error) {
      console.error('Error fetching home details:', error);
    }
  };

  const handleAutoGenerate = async () => {
    if (!homeDetails || !user) return;

    const newSpaces: Array<{ home_id: string; space_name: string; space_type: string }> = [];

    // Generate bedroom spaces
    if (homeDetails.bedrooms) {
      for (let i = 1; i <= homeDetails.bedrooms; i++) {
        newSpaces.push({
          home_id: homeId,
          space_name: i === 1 ? 'Primary Bedroom' : `Bedroom ${i}`,
          space_type: 'bedroom'
        });
      }
    }

    // Generate bathroom spaces
    if (homeDetails.bathrooms) {
      const fullBaths = Math.floor(homeDetails.bathrooms);
      const hasHalfBath = homeDetails.bathrooms % 1 !== 0;

      for (let i = 1; i <= fullBaths; i++) {
        newSpaces.push({
          home_id: homeId,
          space_name: i === 1 ? 'Primary Bathroom' : `Bathroom ${i}`,
          space_type: 'bathroom'
        });
      }

      if (hasHalfBath) {
        newSpaces.push({
          home_id: homeId,
          space_name: 'Half Bathroom',
          space_type: 'half-bathroom'
        });
      }
    }

    try {
      const { error } = await supabase
        .from('home_spaces')
        .insert(newSpaces);

      if (error) throw error;
      toast.success(`Auto-generated ${newSpaces.length} spaces!`);
      fetchSpaces();
    } catch (error) {
      console.error('Error auto-generating spaces:', error);
      toast.error('Failed to auto-generate spaces');
    }
  };

  const uploadFloorPlan = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${homeId}/floor-plans/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('home-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('home-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading floor plan:', error);
      toast.error('Failed to upload floor plan');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUploading(true);
    try {
      let floorPlanUrl = editingSpace?.floor_plan_image_url || null;

      // Upload new floor plan if selected
      if (selectedFile) {
        const uploadedUrl = await uploadFloorPlan(selectedFile);
        if (uploadedUrl) {
          floorPlanUrl = uploadedUrl;
        }
      }

      const spaceData = {
        home_id: homeId,
        space_name: formData.space_name,
        space_type: formData.space_type,
        floor_plan_image_url: floorPlanUrl,
        notes: formData.notes || null
      };

      if (editingSpace) {
        // Update existing space
        const { error } = await supabase
          .from('home_spaces')
          .update(spaceData)
          .eq('id', editingSpace.id);

        if (error) throw error;
        toast.success('Space updated successfully');
      } else {
        // Create new space
        const { error } = await supabase
          .from('home_spaces')
          .insert(spaceData);

        if (error) throw error;
        toast.success('Space added successfully');
      }

      setShowForm(false);
      setEditingSpace(null);
      setFormData({ space_name: '', space_type: 'custom', notes: '' });
      setSelectedFile(null);
      fetchSpaces();
    } catch (error) {
      console.error('Error saving space:', error);
      toast.error('Failed to save space');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (space: HomeSpace) => {
    setEditingSpace(space);
    setFormData({
      space_name: space.space_name,
      space_type: space.space_type,
      notes: space.notes || ''
    });
    setSelectedFile(null);
    setShowForm(true);
  };

  const handleDelete = async (spaceId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('home_spaces')
        .delete()
        .eq('id', spaceId);

      if (error) throw error;
      toast.success('Space deleted successfully');
      fetchSpaces();
    } catch (error) {
      console.error('Error deleting space:', error);
      toast.error('Failed to delete space');
    }
  };

  const getSpaceTypeLabel = (type: string) => {
    switch (type) {
      case 'bedroom': return 'Bedroom';
      case 'bathroom': return 'Bathroom';
      case 'half-bathroom': return 'Half Bath';
      case 'custom': return 'Custom';
      default: return type;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading spaces...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold">Home Spaces</h3>
          <p className="text-sm text-muted-foreground">
            Manage individual rooms and spaces in your home
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {homeDetails && (homeDetails.bedrooms || homeDetails.bathrooms) && spaces.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoGenerate}
            >
              Auto-Generate Spaces
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              setShowForm(true);
              setEditingSpace(null);
              setFormData({ space_name: '', space_type: 'custom', notes: '' });
              setSelectedFile(null);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Space
          </Button>
        </div>
      </div>

      {/* Spaces table or empty state */}
      {spaces.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No spaces added yet</h3>
            <p className="text-muted-foreground mb-4">
              Add individual rooms and spaces to organize your home better.
            </p>
            {homeDetails && (homeDetails.bedrooms || homeDetails.bathrooms) ? (
              <div className="flex justify-center gap-2">
                <Button onClick={handleAutoGenerate} variant="outline">
                  Auto-Generate from Home Details
                </Button>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manually
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Space
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Space Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Floor Plan</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spaces.map((space) => (
                  <TableRow key={space.id}>
                    <TableCell className="font-medium">{space.space_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getSpaceTypeLabel(space.space_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {space.floor_plan_image_url ? (
                        <img 
                          src={space.floor_plan_image_url} 
                          alt="Floor plan"
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">No image</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {space.notes || <span className="text-muted-foreground text-sm">No notes</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(space)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(space.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingSpace ? 'Edit Space' : 'Add New Space'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="space_name">Space Name *</Label>
                  <Input
                    id="space_name"
                    value={formData.space_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, space_name: e.target.value }))}
                    placeholder="e.g., Master Bedroom, Kitchen"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="space_type">Type</Label>
                  <Select
                    value={formData.space_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, space_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bedroom">Bedroom</SelectItem>
                      <SelectItem value="bathroom">Bathroom</SelectItem>
                      <SelectItem value="half-bathroom">Half Bathroom</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor_plan">Floor Plan Image</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="floor_plan"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  {editingSpace?.floor_plan_image_url && !selectedFile && (
                    <img 
                      src={editingSpace.floor_plan_image_url} 
                      alt="Current floor plan"
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes about this space..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingSpace(null);
                    setFormData({ space_name: '', space_type: 'custom', notes: '' });
                    setSelectedFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? 'Saving...' : editingSpace ? 'Update Space' : 'Add Space'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};