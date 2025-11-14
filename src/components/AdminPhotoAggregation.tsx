import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PhotoGallery } from './PhotoGallery';

interface ProjectPhotoStats {
  template_id: string;
  template_name: string;
  photo_count: number;
  public_count: number;
  project_partner_count: number;
  personal_count: number;
}

export function AdminPhotoAggregation() {
  const [stats, setStats] = useState<ProjectPhotoStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [photoGalleryOpen, setPhotoGalleryOpen] = useState(false);

  useEffect(() => {
    fetchPhotoStats();
  }, []);

  const fetchPhotoStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_photos_by_project_type');

      if (error) throw error;
      setStats((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching photo stats:', error);
      toast.error('Failed to load photo statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPhotos = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setPhotoGalleryOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Project Photos by Template
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Photo counts across all projects. Personal photos are not visible to admins.
          </p>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No photos have been uploaded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {stats.map((stat) => (
                <Card key={stat.template_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{stat.template_name}</h4>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            Total: {stat.photo_count}
                          </Badge>
                          {stat.public_count > 0 && (
                            <Badge className="text-xs bg-green-100 text-green-800">
                              Public: {stat.public_count}
                            </Badge>
                          )}
                          {stat.project_partner_count > 0 && (
                            <Badge className="text-xs bg-blue-100 text-blue-800">
                              PP: {stat.project_partner_count}
                            </Badge>
                          )}
                          {stat.personal_count > 0 && (
                            <Badge className="text-xs bg-gray-100 text-gray-600">
                              Personal: {stat.personal_count} (not accessible)
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPhotos(stat.template_id)}
                        disabled={stat.photo_count === 0}
                      >
                        View Photos
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Gallery for selected template */}
      {selectedTemplateId && (
        <PhotoGallery
          open={photoGalleryOpen}
          onOpenChange={setPhotoGalleryOpen}
          templateId={selectedTemplateId}
          mode="admin"
          title={`${stats.find(s => s.template_id === selectedTemplateId)?.template_name || 'Project'} Photos`}
        />
      )}
    </>
  );
}

