import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Camera, X, Download, Trash2, Lock, Users, Globe, Image as ImageIcon, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

/**
 * PhotoGallery Component
 * 
 * Security & Encryption:
 * - Personal photos: Stored in Supabase Storage with encryption at rest (AES-256)
 * - Access controlled via RLS policies - personal photos only accessible by owner
 * - Project Partner photos: Accessible to admins for QC/troubleshooting
 * - Public photos: Accessible to all authenticated users for community sharing
 * - All storage access uses signed URLs with expiration for additional security
 */

interface Photo {
  id: string;
  user_id: string;
  project_run_id: string;
  template_id: string | null;
  step_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  privacy_level: 'personal' | 'project_partner' | 'public';
  caption: string | null;
  created_at: string;
}

interface PhotoGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectRunId?: string;
  templateId?: string;
  mode?: 'user' | 'admin';
  title?: string;
}

export function PhotoGallery({ 
  open, 
  onOpenChange, 
  projectRunId,
  templateId,
  mode = 'user',
  title = 'Project Photos'
}: PhotoGalleryProps) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [filterPrivacy, setFilterPrivacy] = useState<string>('all');
  const [stepFilter, setStepFilter] = useState<string>('all');

  useEffect(() => {
    if (open) {
      fetchPhotos();
    }
  }, [open, projectRunId, templateId, filterPrivacy]);

  const fetchPhotos = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('project_photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectRunId) {
        query = query.eq('project_run_id', projectRunId);
      } else if (templateId) {
        query = query.eq('template_id', templateId);
      } else if (mode === 'user') {
        // Show all user's photos
        query = query.eq('user_id', user.id);
      }

      if (filterPrivacy !== 'all') {
        query = query.eq('privacy_level', filterPrivacy);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const loadPhotoUrl = async (photo: Photo) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-photos')
        .createSignedUrl(photo.storage_path, 3600); // 1 hour expiry

      if (error) throw error;
      setPhotoUrl(data.signedUrl);
    } catch (error) {
      console.error('Error loading photo:', error);
      toast.error('Failed to load photo');
    }
  };

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
    loadPhotoUrl(photo);
  };

  const handleDeletePhoto = async (photoId: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-photos')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('project_photos')
        .delete()
        .eq('id', photoId);

      if (dbError) throw dbError;

      toast.success('Photo deleted');
      fetchPhotos();
      setSelectedPhoto(null);
      setPhotoUrl(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
  };

  const handleDownload = async (photo: Photo) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-photos')
        .download(photo.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Photo downloaded');
    } catch (error) {
      console.error('Error downloading photo:', error);
      toast.error('Failed to download photo');
    }
  };

  const getPrivacyIcon = (level: string) => {
    switch (level) {
      case 'personal':
        return <Lock className="w-3 h-3" />;
      case 'project_partner':
        return <Users className="w-3 h-3" />;
      case 'public':
        return <Globe className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getPrivacyBadge = (level: string) => {
    const variants: Record<string, string> = {
      personal: 'bg-red-100 text-red-800',
      project_partner: 'bg-blue-100 text-blue-800',
      public: 'bg-green-100 text-green-800'
    };

    const labels: Record<string, string> = {
      personal: 'Personal',
      project_partner: 'Project Partner',
      public: 'Public'
    };

    return (
      <Badge className={`text-xs ${variants[level] || ''}`}>
        {getPrivacyIcon(level)}
        <span className="ml-1">{labels[level] || level}</span>
      </Badge>
    );
  };

  // Get unique step IDs for filtering
  const uniqueSteps = Array.from(new Set(photos.map(p => p.step_id)));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
                <Camera className="w-5 h-5" />
                {title}
              </DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onOpenChange(false)} 
                className="h-7 px-2 text-[9px] md:text-xs"
              >
                Close
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
            {/* Filters */}
            <div className="flex gap-2 mb-4">
              <Select value={filterPrivacy} onValueChange={setFilterPrivacy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Privacy Levels</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="project_partner">Project Partner</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : photos.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Photos Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Photos will appear here as you upload them during your project workflow.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <Card 
                    key={photo.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handlePhotoClick(photo)}
                  >
                    <CardContent className="p-2">
                      <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                        <ImageIcon className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-medium truncate">{photo.file_name}</div>
                        <div className="flex items-center justify-between">
                          {getPrivacyBadge(photo.privacy_level)}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(photo.created_at), 'MMM d')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Detail View */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => {
          setSelectedPhoto(null);
          setPhotoUrl(null);
        }}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedPhoto.file_name}</span>
                {getPrivacyBadge(selectedPhoto.privacy_level)}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt={selectedPhoto.file_name}
                  className="w-full rounded-lg"
                />
              ) : (
                <div className="flex items-center justify-center py-12 bg-muted rounded-lg">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {selectedPhoto.caption && (
                <div>
                  <Label className="text-sm font-medium">Caption</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedPhoto.caption}</p>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(selectedPhoto.created_at), 'PPp')}
                </div>
                <div>
                  {(selectedPhoto.file_size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedPhoto)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                {mode === 'user' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeletePhoto(selectedPhoto.id, selectedPhoto.storage_path)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

