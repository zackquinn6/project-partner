import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Download, Trash2, Image as ImageIcon, Calendar, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PhotoUpload } from './PhotoUpload';

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
  project_run_name?: string | null;
  template_id: string | null;
  step_id: string;
  step_name?: string | null;
  phase_id?: string | null;
  phase_name?: string | null;
  operation_id?: string | null;
  operation_name?: string | null;
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
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [availableSteps, setAvailableSteps] = useState<Array<{ id: string; step: string; phaseName?: string; operationName?: string }>>([]);

  useEffect(() => {
    if (open) {
      fetchAvailableProjects();
      fetchPhotos();
      if (projectRunId) {
        fetchAvailableSteps();
      }
    }
  }, [open, projectRunId, templateId, projectFilter, dateFilter]);
  
  const fetchAvailableSteps = async () => {
    if (!projectRunId) return;
    
    try {
      const { data: projectRun, error } = await supabase
        .from('project_runs')
        .select('phases')
        .eq('id', projectRunId)
        .single();
      
      if (error) throw error;
      
      if (projectRun?.phases && Array.isArray(projectRun.phases)) {
        const steps: Array<{ id: string; step: string; phaseName?: string; operationName?: string }> = [];
        
        projectRun.phases.forEach((phase: any) => {
          if (phase.operations && Array.isArray(phase.operations)) {
            phase.operations.forEach((operation: any) => {
              if (operation.steps && Array.isArray(operation.steps)) {
                operation.steps.forEach((step: any) => {
                  steps.push({
                    id: step.id,
                    step: step.step || '',
                    phaseName: phase.name,
                    operationName: operation.name
                  });
                });
              }
            });
          }
        });
        
        setAvailableSteps(steps);
      }
    } catch (error) {
      console.error('Error fetching available steps:', error);
    }
  };

  const fetchAvailableProjects = async () => {
    if (!user || projectRunId) return; // Don't fetch if filtering by specific project

    try {
      // Get all unique project runs that have photos
      const { data: projectRuns, error } = await supabase
        .from('project_runs')
        .select('id, name, custom_project_name')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      const projects = (projectRuns || []).map(run => ({
        id: run.id,
        name: run.custom_project_name || run.name
      }));

      setAvailableProjects(projects);
    } catch (error) {
      console.error('Error fetching available projects:', error);
    }
  };

  const fetchPhotos = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Build query
      let query = supabase
        .from('project_photos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Filter by specific project run if provided
      if (projectRunId) {
        query = query.eq('project_run_id', projectRunId);
      } else if (templateId) {
        query = query.eq('template_id', templateId);
      }

      // Apply project filter
      if (projectFilter !== 'all' && !projectRunId) {
        query = query.eq('project_run_id', projectFilter);
      }

      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch project run names for all unique project_run_ids
      const projectRunIds = [...new Set((data || []).map((p: any) => p.project_run_id))];
      const { data: projectRunsData } = await supabase
        .from('project_runs')
        .select('id, name, custom_project_name')
        .in('id', projectRunIds);
      
      const projectRunMap = new Map(
        (projectRunsData || []).map((run: any) => [
          run.id,
          run.custom_project_name || run.name
        ])
      );
      
      // Map the data to include project run name
      const fetchedPhotos: Photo[] = (data || []).map((photo: any) => ({
        ...photo,
        project_run_name: projectRunMap.get(photo.project_run_id) || null
      }));
      
      setPhotos(fetchedPhotos);
      
      // Load thumbnail URLs for all photos
      const thumbnailPromises = fetchedPhotos.map(async (photo) => {
        try {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('project-photos')
            .createSignedUrl(photo.storage_path, 3600);
          
          if (urlError) throw urlError;
          return { id: photo.id, url: urlData.signedUrl };
        } catch (error) {
          console.error(`Error loading thumbnail for photo ${photo.id}:`, error);
          return { id: photo.id, url: null };
        }
      });
      
      const thumbnailResults = await Promise.all(thumbnailPromises);
      const thumbnailMap: Record<string, string> = {};
      thumbnailResults.forEach(({ id, url }) => {
        if (url) thumbnailMap[id] = url;
      });
      setThumbnailUrls(thumbnailMap);
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
            {/* Filters - only show when viewing all photos (not filtered by specific project) */}
            {!projectRunId && !templateId && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {availableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Add Photo Button - Always visible */}
            {projectRunId && (
              <div className="mb-4 flex justify-end">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowPhotoUpload(true)}
                  className="h-8 px-4 text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Photo
                </Button>
              </div>
            )}

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
              <div className="flex flex-wrap gap-2">
                {photos.map((photo) => (
                  <Card 
                    key={photo.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow w-[75px]"
                    onClick={() => handlePhotoClick(photo)}
                  >
                    <CardContent className="p-1">
                      <div className="aspect-square bg-muted rounded overflow-hidden mb-1">
                        {thumbnailUrls[photo.id] ? (
                          <img 
                            src={thumbnailUrls[photo.id]} 
                            alt={photo.file_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="text-[9px] text-muted-foreground truncate text-center" title={photo.file_name}>
                        {photo.file_name}
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
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedPhoto.file_name}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex gap-4">
              {/* Photo on the left */}
              <div className="flex-1">
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
              </div>

              {/* Info on the right */}
              <div className="w-64 space-y-4 flex flex-col">
                {selectedPhoto.project_run_name && (
                  <div>
                    <Label className="text-sm font-medium">Project</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedPhoto.project_run_name}</p>
                  </div>
                )}

                {(selectedPhoto.phase_name || selectedPhoto.operation_name || selectedPhoto.step_name) && (
                  <div>
                    <Label className="text-sm font-medium">Project Location</Label>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      {selectedPhoto.phase_name && (
                        <div><span className="font-medium">Phase:</span> {selectedPhoto.phase_name}</div>
                      )}
                      {selectedPhoto.operation_name && (
                        <div><span className="font-medium">Operation:</span> {selectedPhoto.operation_name}</div>
                      )}
                      {selectedPhoto.step_name && (
                        <div><span className="font-medium">Step:</span> {selectedPhoto.step_name}</div>
                      )}
                    </div>
                  </div>
                )}

                {selectedPhoto.caption && (
                  <div>
                    <Label className="text-sm font-medium">Caption</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedPhoto.caption}</p>
                  </div>
                )}

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(selectedPhoto.created_at), 'PPp')}
                  </div>
                  <div>
                    {(selectedPhoto.file_size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(selectedPhoto)}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  {mode === 'user' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePhoto(selectedPhoto.id, selectedPhoto.storage_path)}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Photo Upload Dialog */}
      {projectRunId && templateId && (
        <PhotoUpload
          projectRunId={projectRunId}
          templateId={templateId}
          availableSteps={availableSteps}
          showButton={false}
          open={showPhotoUpload}
          onOpenChange={setShowPhotoUpload}
          onPhotoUploaded={() => {
            fetchPhotos();
            setShowPhotoUpload(false);
          }}
        />
      )}
    </>
  );
}

