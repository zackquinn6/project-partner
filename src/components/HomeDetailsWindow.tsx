import React, { useState, useEffect } from 'react';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Home, Calendar, CheckCircle, Camera, MapPin, Star, X, AlertTriangle, Info, AlertCircle, Clock, Download, Bed, Bath, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ZillowSyncDialog } from './ZillowSyncDialog';
import { HomeSpacesTab } from './HomeSpacesTab';

interface Home {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  home_type?: string;
  build_year?: string;
  home_ownership?: string;
  purchase_date?: string;
  notes?: string;
  is_primary: boolean;
  photos?: string[];
  created_at: string;
  updated_at: string;
}

interface ProjectRun {
  id: string;
  name: string;
  status: string;
  end_date: string;
  category?: string;
  created_at: string;
}

interface CompletedMaintenance {
  id: string;
  task_id: string;
  completed_at: string;
  notes?: string;
  photo_url?: string;
  user_maintenance_tasks: {
    title: string;
    category: string;
  };
}

interface HomeRisk {
  id: string;
  material_name: string;
  description: string;
  start_year: number;
  end_year?: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

interface HomeRiskMitigation {
  id: string;
  risk_id: string;
  is_mitigated: boolean;
  mitigation_notes?: string;
}

interface HomeDetailsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  home: Home | null;
}

export const HomeDetailsWindow: React.FC<HomeDetailsWindowProps> = ({
  open,
  onOpenChange,
  home
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [completedProjects, setCompletedProjects] = useState<ProjectRun[]>([]);
  const [completedMaintenance, setCompletedMaintenance] = useState<CompletedMaintenance[]>([]);
  const [homeRisks, setHomeRisks] = useState<HomeRisk[]>([]);
  const [riskMitigations, setRiskMitigations] = useState<HomeRiskMitigation[]>([]);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showZillowSync, setShowZillowSync] = useState(false);
  const [homeDetails, setHomeDetails] = useState<{
    home_age: number | null;
    square_footage: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    last_synced_at: string | null;
  } | null>(null);

  useEffect(() => {
    if (open && home && user) {
      fetchHomeData();
      fetchHomeRisks();
      fetchRiskMitigations();
      fetchHomeDetails();
      setNotesValue(home.notes || '');
    }
  }, [open, home, user, refreshTrigger]);

  useEffect(() => {
    const handleZillowSync = (e: CustomEvent) => {
      if (e.detail?.homeId === home?.id) {
        setShowZillowSync(true);
      }
    };

    window.addEventListener('open-zillow-sync', handleZillowSync as EventListener);
    return () => {
      window.removeEventListener('open-zillow-sync', handleZillowSync as EventListener);
    };
  }, [home?.id]);

  const fetchHomeDetails = async () => {
    if (!home) return;
    
    try {
      const { data, error } = await supabase
        .from('home_details')
        .select('home_age, square_footage, bedrooms, bathrooms, last_synced_at')
        .eq('home_id', home.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setHomeDetails(data);
    } catch (error) {
      console.error('Error fetching home details:', error);
    }
  };

  const fetchHomeData = async () => {
    if (!home || !user) return;
    
    setLoading(true);
    try {
      // Fetch completed projects for this home
      const { data: projects, error: projectsError } = await supabase
        .from('project_runs')
        .select('id, name, status, end_date, category, created_at')
        .eq('user_id', user.id)
        .eq('home_id', home.id)
        .eq('status', 'completed')
        .order('end_date', { ascending: false });

      if (projectsError) throw projectsError;
      setCompletedProjects(projects || []);

      // Fetch completed maintenance for this home
      const { data: maintenance, error: maintenanceError } = await supabase
        .from('maintenance_completions')
        .select(`
          id,
          task_id,
          completed_at,
          notes,
          photo_url,
          user_maintenance_tasks!inner (
            title,
            category,
            home_id
          )
        `)
        .eq('user_id', user.id)
        .eq('user_maintenance_tasks.home_id', home.id)
        .order('completed_at', { ascending: false });

      if (maintenanceError) throw maintenanceError;
      setCompletedMaintenance(maintenance || []);

    } catch (error) {
      console.error('Error fetching home data:', error);
      toast.error('Failed to load home data');
    } finally {
      setLoading(false);
    }
  };

  const fetchHomeRisks = async () => {
    if (!home?.build_year) {
      setHomeRisks([]);
      return;
    }

    const buildYear = parseInt(home.build_year);
    
    try {
      const { data: risks, error } = await supabase
        .from('home_risks')
        .select('*')
        .lte('start_year', buildYear)
        .or(`end_year.gte.${buildYear},end_year.is.null`)
        .order('risk_level', { ascending: false })
        .order('material_name', { ascending: true });

      if (error) throw error;
      setHomeRisks((risks || []) as HomeRisk[]);
    } catch (error) {
      console.error('Error fetching home risks:', error);
    }
  };

  const fetchRiskMitigations = async () => {
    if (!home || !user) return;
    
    try {
      const { data: mitigations, error } = await supabase
        .from('home_risk_mitigations')
        .select('*')
        .eq('user_id', user.id)
        .eq('home_id', home.id);

      if (error) throw error;
      setRiskMitigations(mitigations || []);
    } catch (error) {
      console.error('Error fetching risk mitigations:', error);
    }
  };

  const handleNotesUpdate = async () => {
    if (!home || !user) return;
    
    try {
      const { error } = await supabase
        .from('homes')
        .update({ notes: notesValue })
        .eq('id', home.id)
        .eq('user_id', user.id);

      if (error) throw error;
      setEditingNotes(false);
      toast.success('Notes updated successfully');
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Failed to update notes');
    }
  };

  const handlePhotoDelete = async (photoUrl: string) => {
    if (!home || !user) return;
    
    try {
      const updatedPhotos = home.photos?.filter(url => url !== photoUrl) || [];
      const { error } = await supabase
        .from('homes')
        .update({ photos: updatedPhotos })
        .eq('id', home.id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Update the home object locally and trigger re-render
      Object.assign(home, { photos: updatedPhotos });
      setRefreshTrigger(prev => prev + 1);
      toast.success('Photo deleted successfully');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
  };

  const handlePhotoUpload = async (files: FileList) => {
    if (!home || !user || files.length === 0) return;
    
    setUploading(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${home.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('home-photos')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('home-photos')
          .getPublicUrl(fileName);
        
        uploadedUrls.push(publicUrl);
      }
      
      const updatedPhotos = [...(home.photos || []), ...uploadedUrls];
      const { error } = await supabase
        .from('homes')
        .update({ photos: updatedPhotos })
        .eq('id', home.id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Update the home object locally and trigger re-render
      Object.assign(home, { photos: updatedPhotos });
      setRefreshTrigger(prev => prev + 1);
      toast.success('Photos uploaded successfully');
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const handleRiskMitigation = async (riskId: string, isMitigated: boolean, notes?: string) => {
    if (!home || !user) return;
    
    try {
      const existingMitigation = riskMitigations.find(m => m.risk_id === riskId);
      
      if (existingMitigation) {
        const { error } = await supabase
          .from('home_risk_mitigations')
          .update({ is_mitigated: isMitigated, mitigation_notes: notes })
          .eq('id', existingMitigation.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('home_risk_mitigations')
          .insert({
            user_id: user.id,
            home_id: home.id,
            risk_id: riskId,
            is_mitigated: isMitigated,
            mitigation_notes: notes
          });
        
        if (error) throw error;
      }
      
      fetchRiskMitigations();
      toast.success('Risk mitigation updated successfully');
    } catch (error) {
      console.error('Error updating risk mitigation:', error);
      toast.error('Failed to update risk mitigation');
    }
  };

  const getRiskIcon = (level: string, isMitigated?: boolean) => {
    if (isMitigated) return <CheckCircle className="w-4 h-4 text-green-500" />;
    
    switch (level) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getRiskColor = (level: string, isMitigated?: boolean) => {
    if (isMitigated) return 'bg-green-50 border-green-200';
    
    switch (level) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'high': return 'bg-orange-50 border-orange-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  if (!home) return null;

  return (
    <>
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="content-large"
      title={`${home.name}${home.is_primary ? ' (Primary)' : ''}`}
    >
      <Tabs defaultValue="details" className="w-full flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="details">Details & Photos</TabsTrigger>
          <TabsTrigger value="spaces">Spaces</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Home Information Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Home Information</CardTitle>
                  {home.address && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowZillowSync(true)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Sync with Zillow
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {home.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {home.address}
                      {home.city && home.state && `, ${home.city}, ${home.state}`}
                    </span>
                  </div>
                )}
                
                {home.home_type && (
                  <div>
                    <span className="font-medium">Type: </span>
                    <span className="capitalize">{home.home_type.replace('-', ' ')}</span>
                  </div>
                )}

                {home.home_ownership && (
                  <div>
                    <span className="font-medium">Ownership: </span>
                    <span className="capitalize">{home.home_ownership}</span>
                  </div>
                )}
                
                {home.build_year && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Built in {home.build_year}</span>
                  </div>
                )}

                {home.purchase_date && (
                  <div>
                    <span className="font-medium">Purchase Date: </span>
                    <span>{new Date(home.purchase_date).toLocaleDateString()}</span>
                  </div>
                )}

                {homeDetails && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center justify-between">
                        <span>Zillow Data</span>
                        {homeDetails.last_synced_at && (
                          <span className="text-xs text-muted-foreground font-normal">
                            Last synced: {new Date(homeDetails.last_synced_at).toLocaleDateString()}
                          </span>
                        )}
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {homeDetails.bedrooms !== null && (
                          <div className="flex items-center gap-2">
                            <Bed className="w-4 h-4 text-muted-foreground" />
                            <span>{homeDetails.bedrooms} bedrooms</span>
                          </div>
                        )}
                        {homeDetails.bathrooms !== null && (
                          <div className="flex items-center gap-2">
                            <Bath className="w-4 h-4 text-muted-foreground" />
                            <span>{homeDetails.bathrooms} bathrooms</span>
                          </div>
                        )}
                        {homeDetails.square_footage !== null && (
                          <div className="flex items-center gap-2">
                            <Square className="w-4 h-4 text-muted-foreground" />
                            <span>{homeDetails.square_footage.toLocaleString()} sqft</span>
                          </div>
                        )}
                        {homeDetails.home_age !== null && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{homeDetails.home_age} years old</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Separator className="my-4" />
                
                {/* Home Notes Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Home Notes</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingNotes(!editingNotes)}
                    >
                      {editingNotes ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>
                  
                  {editingNotes ? (
                    <div className="space-y-4">
                      <Textarea
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        placeholder="Add notes about this home..."
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleNotesUpdate}>Save Notes</Button>
                        <Button variant="outline" onClick={() => {
                          setNotesValue(home.notes || '');
                          setEditingNotes(false);
                        }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="min-h-[60px]">
                      {home.notes ? (
                        <p className="whitespace-pre-wrap text-sm">{home.notes}</p>
                      ) : (
                        <p className="text-muted-foreground italic text-sm">No notes added yet</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Photos Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Photos</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.files) {
                          handlePhotoUpload(target.files);
                        }
                      };
                      input.click();
                    }}
                    disabled={uploading}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Add Photos'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {home.photos && home.photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {home.photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Home photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handlePhotoDelete(photo)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No photos added yet</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.files) {
                            handlePhotoUpload(target.files);
                          }
                        };
                        input.click();
                      }}
                      disabled={uploading}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Add First Photo'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="spaces" className="flex-1 overflow-y-auto">
          {home && <HomeSpacesTab homeId={home.id} />}
        </TabsContent>

        <TabsContent value="projects" className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading projects...</div>
            </div>
          ) : completedProjects.length > 0 ? (
            <div className="grid gap-4">
              {completedProjects.map(project => (
                <Card key={project.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{project.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Category: {project.category || 'Not specified'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">
                            Completed: {project.end_date 
                              ? new Date(project.end_date).toLocaleDateString()
                              : 'Date not recorded'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No completed projects for this home yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="maintenance" className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading maintenance...</div>
            </div>
          ) : completedMaintenance.length > 0 ? (
            <div className="grid gap-4">
              {completedMaintenance.map(maintenance => (
                <Card key={maintenance.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{maintenance.user_maintenance_tasks.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Category: {maintenance.user_maintenance_tasks.category}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">
                            Completed: {new Date(maintenance.completed_at).toLocaleDateString()}
                          </span>
                        </div>
                        {maintenance.notes && (
                          <p className="text-sm mt-2 p-2 bg-muted rounded">
                            {maintenance.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No completed maintenance for this home yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="risks" className="flex-1 overflow-y-auto">
          {homeRisks.length > 0 ? (
            <div className="grid gap-4">
              {homeRisks.map(risk => {
                const mitigation = riskMitigations.find(m => m.risk_id === risk.id);
                const isMitigated = mitigation?.is_mitigated || false;
                
                return (
                  <Card key={risk.id} className={`border-2 ${getRiskColor(risk.risk_level, isMitigated)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getRiskIcon(risk.risk_level, isMitigated)}
                        <div className="flex-1">
                          <h4 className="font-medium">{risk.material_name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {risk.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge 
                              variant={isMitigated ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {isMitigated ? "Mitigated" : risk.risk_level.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {risk.start_year}-{risk.end_year || 'present'}
                            </span>
                          </div>
                          {mitigation?.mitigation_notes && (
                            <p className="text-sm mt-2 p-2 bg-background rounded border">
                              Mitigation: {mitigation.mitigation_notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {home.build_year 
                    ? "No specific risks identified for this home's build year"
                    : "Add a build year to see potential home risks"
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </ResponsiveDialog>
    
    {home && home.address && (
      <ZillowSyncDialog
        open={showZillowSync}
        onOpenChange={setShowZillowSync}
        homeId={home.id}
        homeAddress={`${home.address}${home.city && home.state ? `, ${home.city}, ${home.state}` : ''}`}
        onSyncComplete={() => {
          fetchHomeDetails();
          setRefreshTrigger(prev => prev + 1);
        }}
      />
    )}
    </>
  );
};
