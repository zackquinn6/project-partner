import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VariationManager } from './VariationManager';
import { AlternatesEditor } from './AlternatesEditor';
import { MultiContentEditor } from './MultiContentEditor';
import type { ContentSection } from '@/interfaces/Project';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

interface LibraryItemFormProps {
  type: 'tools' | 'materials';
  item?: any;
  onSave: () => void;
  onCancel: () => void;
}

function parseInstructions(value: unknown): ContentSection[] {
  if (Array.isArray(value)) return value as ContentSection[];
  if (typeof value === 'string') {
    try { return (JSON.parse(value || '[]') as ContentSection[]); } catch { return []; }
  }
  return [];
}

export function LibraryItemForm({ type, item, onSave, onCancel }: LibraryItemFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    unit: item?.unit || '', // for materials
    alternates: item?.alternates || '', // JSON string of alternates
    category: typeof item?.category === 'string' ? item.category : '',
  });
  const [instructions, setInstructions] = useState<ContentSection[]>(() => parseInstructions(item?.instructions));
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(item?.photo_url || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInstructions(parseInstructions(item?.instructions));
  }, [item?.id, item?.instructions]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/png')) {
      toast.error('Please select a JPG or PNG image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      if (!user?.id) {
        toast.error('You must be logged in to upload photos');
        return null;
      }
      const fileExt = file.name.split('.').pop();
      // Use flat object keys (no folder prefix) to match existing working library upload pattern.
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('library-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('library-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as any).message)
          : 'Failed to upload photo';
      toast.error(message);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Item name is required');
      return;
    }

    setUploading(true);

    try {
      // Never persist browser blob preview URLs to the database.
      let finalPhotoUrl =
        typeof photoUrl === 'string' && photoUrl.startsWith('blob:')
          ? (item?.photo_url || '')
          : photoUrl;
      
      // Upload new photo if one was selected
      if (photoFile) {
        const uploadedUrl = await uploadPhoto(photoFile);
        if (!uploadedUrl) {
          toast.error('Photo upload failed. Tool was not updated.');
          return;
        }
        finalPhotoUrl = uploadedUrl;
      }

      const dataToSave = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        photo_url: finalPhotoUrl || null,
        alternates: formData.alternates || null,
        category: formData.category.trim()
          ? formData.category.trim()
          : (typeof item?.category === 'string' && item.category.trim() ? item.category.trim() : null),
        ...(type === 'materials' && {
          unit: formData.unit.trim() || null
        }),
        ...(type === 'tools' && { instructions: instructions.length > 0 ? instructions : [] }),
      };

      if (item) {
        // Update existing item
        const { error } = await supabase
          .from(type)
          .update(dataToSave)
          .eq('id', item.id);
        
        if (error) throw error;
      } else {
        if (!user?.id) {
          toast.error('You must be logged in to create library items');
          return;
        }
        // Create new item
        console.log(`💾 Creating new ${type} item:`, dataToSave);
        const { error } = await supabase
          .from(type)
          .insert({
            ...dataToSave,
            created_by: user.id
          });
        
        if (error) {
          console.error(`❌ Error creating ${type}:`, error);
          if (error.code === '23505') { // Unique constraint violation
            toast.error(`A ${type === 'tools' ? 'tool' : 'material'} with the name "${formData.name}" already exists in the library. Please use a different name or edit the existing item.`);
            return;
          }
          throw error;
        }
        console.log(`✅ Successfully created new ${type} item`);
      }

      onSave();
    } catch (error) {
      console.error('Error saving item:', error);
      const message = error instanceof Error ? error.message : 'Failed to save item';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="basic">Core Tool</TabsTrigger>
        <TabsTrigger value="variations" disabled={!item?.id}>
          Variations {!item?.id && '(Save item first)'}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="basic" className="space-y-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
          <div>
            <Label htmlFor="name">
              {type === 'tools' ? 'Tool' : 'Material'} Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={`Enter ${type === 'tools' ? 'tool' : 'material'} name`}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={`Describe the ${type === 'tools' ? 'tool' : 'material'}...`}
              rows={3}
            />
          </div>

          {type === 'materials' && (
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., 2x4x8ft, 1 gallon, per sq ft"
              />
            </div>
          )}

          <div>
            <AlternatesEditor
              value={formData.alternates}
              onChange={(value) => setFormData({ ...formData, alternates: value })}
              itemType={type === 'tools' ? 'tool' : 'material'}
            />
          </div>

          <div>
            <Label>Photo</Label>
            <div className="space-y-2">
              {photoUrl && (
                <div className="relative inline-block">
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-md border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => {
                      setPhotoUrl('');
                      setPhotoFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {photoUrl ? 'Change Photo' : 'Upload Photo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG or PNG, max 5MB
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label>Category / Type</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent className="z-[1000]">
                {type === 'tools' ? (
                  <>
                    <SelectItem value="PPE">PPE</SelectItem>
                    <SelectItem value="Hand Tool">Hand Tool</SelectItem>
                    <SelectItem value="Power Tool">Power Tool</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="PPE">PPE</SelectItem>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Consumable">Consumable</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={uploading} className="flex-1">
              {uploading ? 'Saving...' : (item ? 'Update' : 'Add')} {type === 'tools' ? 'Tool' : 'Material'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </TabsContent>

      {type === 'tools' && (
        <TabsContent value="instructions" className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Tool instructions</CardTitle>
              <CardDescription>Text, videos, photos, and links shown when users open instructions for this tool in the workflow.</CardDescription>
            </CardHeader>
            <CardContent>
              <MultiContentEditor sections={instructions} onChange={setInstructions} />
            </CardContent>
          </Card>
          <div className="flex gap-2 pt-4">
            <Button type="button" onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)} disabled={uploading}>
              {uploading ? 'Saving...' : 'Save tool & instructions'}
            </Button>
          </div>
        </TabsContent>
      )}

      <TabsContent value="variations">
        {item?.id && (
          <VariationManager
            coreItemId={item.id}
            itemType={type}
            coreItemName={item.name}
            onVariationUpdate={() => {
              // Optionally refresh or notify parent component
            }}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}