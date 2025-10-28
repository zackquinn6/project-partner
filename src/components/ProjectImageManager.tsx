import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, X, Check } from 'lucide-react';

interface ProjectImageManagerProps {
  projectId?: string;
  onImageUpdated?: () => void;
}

export const ProjectImageManager = ({ projectId, onImageUpdated }: ProjectImageManagerProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string>('');

  useEffect(() => {
    if (projectId) {
      fetchProjectImages();
    }
  }, [projectId]);

  const fetchProjectImages = async () => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from('projects')
      .select('images, cover_image')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setImages(data?.images || []);
    setCoverImage(data?.cover_image || '');
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

      // Add to images array
      const newImages = [...images, publicUrl];
      
      // If this is the first image, set it as cover
      const newCoverImage = images.length === 0 ? publicUrl : coverImage;

      // Update project with new images array and cover image
      const { error: updateError } = await supabase
        .from('projects')
        .update({ 
          images: newImages,
          cover_image: newCoverImage
        })
        .eq('id', projectId);

      if (updateError) throw updateError;

      toast.success('Image uploaded successfully!');
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl('');
      setImages(newImages);
      setCoverImage(newCoverImage);
      
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

  const handleSetCover = async (imageUrl: string) => {
    if (!projectId) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ cover_image: imageUrl })
        .eq('id', projectId);

      if (error) throw error;

      toast.success('Cover image updated');
      setCoverImage(imageUrl);
      
      if (onImageUpdated) {
        onImageUpdated();
      }

    } catch (error: any) {
      console.error('Set cover error:', error);
      toast.error('Failed to set cover image');
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!projectId) return;

    try {
      const newImages = images.filter(img => img !== imageUrl);
      const newCoverImage = coverImage === imageUrl ? (newImages[0] || null) : coverImage;

      const { error } = await supabase
        .from('projects')
        .update({ 
          images: newImages,
          cover_image: newCoverImage
        })
        .eq('id', projectId);

      if (error) throw error;

      toast.success('Image deleted');
      setImages(newImages);
      setCoverImage(newCoverImage || '');
      
      if (onImageUpdated) {
        onImageUpdated();
      }

    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete image');
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
      {/* Uploaded Images Gallery */}
      {images.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Project Images ({images.length})</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative group border rounded-lg overflow-hidden">
                <img 
                  src={img} 
                  alt={`Project image ${idx + 1}`}
                  className="w-full h-32 object-cover"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={coverImage === img ? "default" : "secondary"}
                    onClick={() => handleSetCover(img)}
                    className="text-xs"
                  >
                    {coverImage === img ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Cover
                      </>
                    ) : (
                      'Set as Cover'
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteImage(img)}
                    className="text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
                {/* Cover badge */}
                {coverImage === img && (
                  <Badge className="absolute top-2 left-2 bg-primary text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Cover
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Requirements Warning */}
      <div className="bg-muted p-3 rounded-lg border border-border text-sm">
        <p className="font-medium mb-1">Image Requirements:</p>
        <ul className="text-muted-foreground space-y-1">
          <li>• File type: JPG, PNG, GIF, or other image formats</li>
          <li>• Maximum size: 5MB</li>
        </ul>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {images.length === 0 ? 'Upload First Image' : 'Add More Images'}
        </Label>
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
          Max size: 5MB per image. Formats: JPG, PNG, WebP
          {images.length === 0 && ' • First image will be set as cover'}
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
            {images.length === 0 ? 'Upload First Image' : 'Add Image'}
          </>
        )}
      </Button>
    </div>
  );
};
