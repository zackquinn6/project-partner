import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, X, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VariationManager } from './VariationManager';

interface LibraryItemFormProps {
  type: 'tools' | 'materials';
  item?: any;
  onSave: () => void;
  onCancel: () => void;
}

export function LibraryItemForm({ type, item, onSave, onCancel }: LibraryItemFormProps) {
  const [formData, setFormData] = useState({
    item: item?.item || '',
    description: item?.description || '',
    example_models: item?.example_models || '', // for tools
    unit_size: item?.unit_size || '', // for materials
  });
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(item?.photo_url || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const fileExt = file.name.split('.').pop();
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
      toast.error('Failed to upload photo');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.item.trim()) {
      toast.error('Item name is required');
      return;
    }

    setUploading(true);

    try {
      let finalPhotoUrl = photoUrl;
      
      // Upload new photo if one was selected
      if (photoFile) {
        const uploadedUrl = await uploadPhoto(photoFile);
        if (uploadedUrl) {
          finalPhotoUrl = uploadedUrl;
        }
      }

      const dataToSave = {
        item: formData.item.trim(),
        description: formData.description.trim() || null,
        photo_url: finalPhotoUrl || null,
        ...(type === 'tools' && { 
          example_models: formData.example_models.trim() || null 
        }),
        ...(type === 'materials' && { 
          unit_size: formData.unit_size.trim() || null 
        }),
      };

      if (item) {
        // Update existing item
        const { error } = await supabase
          .from(type)
          .update(dataToSave)
          .eq('id', item.id);
        
        if (error) throw error;
      } else {
        // Create new item
        const { error } = await supabase
          .from(type)
          .insert(dataToSave);
        
        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            toast.error('An item with this name already exists');
            return;
          }
          throw error;
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
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
            <Label htmlFor="item">
              {type === 'tools' ? 'Tool' : 'Material'} Name *
            </Label>
            <Input
              id="item"
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
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

          {type === 'tools' && (
            <div>
              <Label htmlFor="example_models">Variants</Label>
              <Input
                id="example_models"
                value={formData.example_models}
                onChange={(e) => setFormData({ ...formData, example_models: e.target.value })}
                placeholder="e.g., DeWalt DCD771C2, Ryobi P1813"
              />
            </div>
          )}

          {type === 'materials' && (
            <div>
              <Label htmlFor="unit_size">Unit Size</Label>
              <Input
                id="unit_size"
                value={formData.unit_size}
                onChange={(e) => setFormData({ ...formData, unit_size: e.target.value })}
                placeholder="e.g., 2x4x8ft, 1 gallon, per sq ft"
              />
            </div>
          )}

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

      <TabsContent value="variations">
        {item?.id && (
          <VariationManager
            coreItemId={item.id}
            itemType={type}
            coreItemName={item.item}
            onVariationUpdate={() => {
              // Optionally refresh or notify parent component
            }}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}