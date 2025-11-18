import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload, X, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeInput } from '@/utils/inputSanitization';

/**
 * PhotoUpload Component
 * 
 * Security & Privacy Implementation:
 * - Personal photos: Stored with encryption at rest (AES-256 via Supabase Storage)
 * - Storage path includes user ID for namespace isolation
 * - RLS policies enforce privacy levels at database and storage levels
 * - Personal photos: Only user can access (enforced via RLS)
 * - Project Partner photos: User + admins (for QC/troubleshooting)
 * - Public photos: All authenticated users (for community sharing)
 * - File size limited to 5MB
 * - Only image formats allowed (JPEG, PNG, WEBP, GIF)
 */

interface PhotoUploadProps {
  projectRunId: string;
  templateId: string | null;
  stepId: string;
  stepName: string;
  phaseId?: string;
  phaseName?: string;
  operationId?: string;
  operationName?: string;
  onPhotoUploaded?: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export function PhotoUpload({ 
  projectRunId, 
  templateId, 
  stepId, 
  stepName,
  phaseId,
  phaseName,
  operationId,
  operationName,
  onPhotoUploaded 
}: PhotoUploadProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [caption, setCaption] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<'personal' | 'project_partner' | 'public'>('project_partner');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, WEBP, or GIF images.');
      return;
    }

    setSelectedFile(file);
    
    // Set photo name to filename without extension
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    setPhotoName(fileNameWithoutExt);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      // SECURITY: Validate file extension against allowed types
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      if (!fileExt || !allowedExtensions.includes(fileExt)) {
        toast.error('Invalid file type. Only image files are allowed.');
        setUploading(false);
        return;
      }

      // SECURITY: Sanitize filename to prevent path traversal attacks
      const sanitizedOriginalName = sanitizeInput(selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
      
      // Generate unique filename with sanitized extension
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      // SECURITY: Validate path components to prevent directory traversal
      const sanitizedUserId = user.id.replace(/[^a-zA-Z0-9-]/g, '');
      const sanitizedProjectRunId = projectRunId.replace(/[^a-zA-Z0-9-]/g, '');
      const filePath = `${sanitizedUserId}/${sanitizedProjectRunId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // SECURITY: Sanitize all user inputs before database insertion
      const sanitizedCaption = caption ? sanitizeInput(caption.trim()) : null;
      const sanitizedPhotoName = photoName ? sanitizeInput(photoName.trim()) : null;
      const sanitizedStepName = sanitizeInput(stepName);
      const sanitizedPhaseName = phaseName ? sanitizeInput(phaseName) : null;
      const sanitizedOperationName = operationName ? sanitizeInput(operationName) : null;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('project_photos')
        .insert({
          user_id: user.id,
          project_run_id: projectRunId,
          template_id: templateId,
          step_id: stepId,
          step_name: sanitizedStepName,
          phase_id: phaseId || null,
          phase_name: sanitizedPhaseName,
          operation_id: operationId || null,
          operation_name: sanitizedOperationName,
          storage_path: filePath,
          file_name: sanitizedOriginalName,
          file_size: selectedFile.size,
          privacy_level: privacyLevel,
          caption: sanitizedCaption,
          photo_name: sanitizedPhotoName
        } as any);

      if (dbError) throw dbError;

      toast.success('Photo uploaded successfully');
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setPhotoName('');
      setCaption('');
      setPrivacyLevel('project_partner');
      setOpen(false);
      
      if (onPhotoUploaded) {
        onPhotoUploaded();
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPhotoName('');
    setCaption('');
    setPrivacyLevel('project_partner');
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Camera className="w-4 h-4" />
        Add Photo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Progress Photo</DialogTitle>
            <DialogDescription>
              Add a photo for: {stepName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Upload Area */}
            <div>
              <Label>Photo (Max 5MB)</Label>
              <div className="mt-2">
                {previewUrl ? (
                  <div className="relative">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setPhotoName('');
                      }}
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {selectedFile?.name} ({(selectedFile!.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Select Photo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG, WEBP, or GIF (max 5MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Photo Name */}
            {selectedFile && (
              <div>
                <Label htmlFor="photoName">Photo Name</Label>
                <Input
                  id="photoName"
                  value={photoName}
                  onChange={(e) => setPhotoName(e.target.value)}
                  placeholder="Enter photo name"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Defaults to the filename without extension
                </p>
              </div>
            )}

            {/* Caption */}
            <div>
              <Label htmlFor="caption">Caption (Optional)</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a description or notes about this photo..."
                rows={3}
                className="mt-2"
              />
            </div>

            {/* Privacy Level */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Privacy</Label>
                <span className="text-[11px] text-muted-foreground">Defaults to Project Partner</span>
              </div>
              <Select
                value={privacyLevel}
                onValueChange={(value) => setPrivacyLevel(value as 'personal' | 'project_partner' | 'public')}
              >
                <SelectTrigger className="h-9 text-xs bg-muted/40 border border-muted-foreground/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="project_partner">
                    Project Partner (Recommended)
                  </SelectItem>
                  <SelectItem value="personal">Personal (Only Me)</SelectItem>
                  <SelectItem value="public">Public (Shareable)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Adjust only if you need extra privacy or plan to share publicly.
              </p>
            </div>

            {/* Warning for personal photos */}
            {privacyLevel === 'personal' && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-xs text-yellow-800">
                  Personal photos use encrypted storage and cannot be accessed by Project Partner staff, 
                  even for troubleshooting purposes.
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

