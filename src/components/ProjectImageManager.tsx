import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface ProjectImageManagerProps {
  projectId?: string;
  onImageUpdated?: () => void;
}

export const ProjectImageManager = ({ projectId, onImageUpdated }: ProjectImageManagerProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>('');

  useEffect(() => {
    if (projectId) {
      fetchProjectImage();
    }
  }, [projectId]);

  const fetchProjectImage = async () => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from('projects')
      .select('cover_image')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    if (data?.cover_image) {
      setCurrentImage(data.cover_image);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile || !projectId) {
      toast.error('Please select an image');
      return;
    }

    setUploading(true);

    try {
      // Create a unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${projectId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(filePath);

      // Update project with image URL
      const { error: updateError } = await supabase
        .from('projects')
        .update({ cover_image: publicUrl })
        .eq('id', projectId);

      if (updateError) throw updateError;

      toast.success('Image uploaded successfully!');
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl('');
      setCurrentImage(publicUrl);
      
      // Notify parent
      if (onImageUpdated) {
        onImageUpdated();
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!projectId) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ cover_image: null })
        .eq('id', projectId);

      if (error) throw error;

      toast.success('Image removed');
      setCurrentImage('');
      
      if (onImageUpdated) {
        onImageUpdated();
      }

    } catch (error: any) {
      console.error('Remove error:', error);
      toast.error('Failed to remove image');
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Image Display */}
      {currentImage && (
        <div className="space-y-2">
          <Label className="text-sm">Current Cover Image</Label>
          <div className="relative border rounded-lg p-2">
            <img 
              src={currentImage} 
              alt="Current project image" 
              className="w-full h-48 object-cover rounded"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-4 right-4"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      )}

      {/* File Upload */}
      <div className="space-y-2">
        <Label className="text-sm">Upload New Cover Image</Label>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={!projectId || uploading}
            className="flex-1"
          />
          {selectedFile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Max size: 5MB. Formats: JPG, PNG, WebP
        </p>
      </div>

      {/* Preview */}
      {previewUrl && (
        <div className="space-y-2">
          <Label className="text-sm">Preview</Label>
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-full h-48 object-cover rounded-lg border"
          />
        </div>
      )}

      {/* Upload Button */}
      <Button
        onClick={handleUpload}
        disabled={!selectedFile || !projectId || uploading}
        className="w-full"
      >
        {uploading ? (
          <>Processing...</>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload Cover Image
          </>
        )}
      </Button>
    </div>
  );
};
