import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Home, Calendar, CheckCircle, Camera, MapPin, Star, X, AlertTriangle, Info, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

  useEffect(() => {
    if (open && home && user) {
      fetchHomeData();
      fetchHomeRisks();
      fetchRiskMitigations();
      setNotesValue(home.notes || '');
    }
  }, [open, home, user, refreshTrigger]);

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

  if (!home) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            {home.name}
            {home.is_primary && (
              <Badge variant="secondary" className="text-xs">
                <Star className="w-3 h-3 mr-1" />
                Primary
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details & Photos</TabsTrigger>
            <TabsTrigger value="projects">Home Projects</TabsTrigger>
            <TabsTrigger value="maintenance">Home Maintenance</TabsTrigger>
            <TabsTrigger value="risks">Home Risks</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Home Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Home Information</CardTitle>
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

              {/* Photos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Home Photos
                    <div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
                        className="hidden"
                        id="photo-upload"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                        disabled={uploading}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Add Photos'}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {home.photos && home.photos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {home.photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={photo} 
                            alt={`${home.name} photo ${index + 1}`}
                            className="w-full h-32 object-cover rounded border"
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
                      <p className="text-muted-foreground">No photos uploaded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          <TabsContent value="risks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Potential Home Risks</CardTitle>
                <CardDescription>
                  Based on your home's build year ({home.build_year || 'Unknown'}), here are potential construction risks to be aware of:
                </CardDescription>
              </CardHeader>
              <CardContent>
                 {homeRisks.length > 0 ? (
                   <div className="space-y-4">
                     {homeRisks.map((risk) => {
                       const mitigation = riskMitigations.find(m => m.risk_id === risk.id);
                       const isMitigated = mitigation?.is_mitigated || false;
                       
                       return (
                         <Card key={risk.id} className={`border ${getRiskColor(risk.risk_level, isMitigated)}`}>
                           <CardContent className="p-4">
                             <div className="flex items-start gap-3">
                               {getRiskIcon(risk.risk_level, isMitigated)}
                               <div className="flex-1">
                                 <div className="flex items-center justify-between mb-2">
                                   <h4 className="font-semibold">{risk.material_name}</h4>
                                   <div className="flex items-center gap-2">
                                     {isMitigated && (
                                       <Badge variant="secondary" className="bg-green-100 text-green-800">
                                         MITIGATED
                                       </Badge>
                                     )}
                                     <Badge variant={risk.risk_level === 'critical' ? 'destructive' : 'secondary'}>
                                       {risk.risk_level.toUpperCase()}
                                     </Badge>
                                   </div>
                                 </div>
                                 <p className="text-sm text-muted-foreground mb-2">
                                   Common in homes built {risk.start_year}
                                   {risk.end_year ? `-${risk.end_year}` : '+'}
                                 </p>
                                 <p className="text-sm mb-3">{risk.description}</p>
                                 
                                 {isMitigated && mitigation?.mitigation_notes && (
                                   <div className="mb-3 p-2 bg-green-50 rounded border-l-2 border-green-200">
                                     <p className="text-sm font-medium text-green-800 mb-1">Mitigation Notes:</p>
                                     <p className="text-sm text-green-700">{mitigation.mitigation_notes}</p>
                                   </div>
                                 )}
                                 
                                 <div className="flex gap-2">
                                   <Button
                                     variant={isMitigated ? "outline" : "default"}
                                     size="sm"
                                     onClick={() => {
                                       const notes = prompt(
                                         isMitigated 
                                           ? 'Update mitigation notes:' 
                                           : 'Add notes about how this risk was mitigated:',
                                         mitigation?.mitigation_notes || ''
                                       );
                                       if (notes !== null) {
                                         handleRiskMitigation(risk.id, true, notes);
                                       }
                                     }}
                                   >
                                     {isMitigated ? 'Update Mitigation' : 'Mark as Mitigated'}
                                   </Button>
                                   {isMitigated && (
                                     <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => handleRiskMitigation(risk.id, false)}
                                     >
                                       Remove Mitigation
                                     </Button>
                                   )}
                                 </div>
                               </div>
                             </div>
                           </CardContent>
                         </Card>
                       );
                      })}
                  </div>
                ) : home.build_year ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p className="text-muted-foreground">
                      No known construction risks identified for homes built in {home.build_year}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Add a build year to see potential construction risks
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading completed projects...</div>
            ) : completedProjects.length > 0 ? (
              <div className="space-y-4">
                {completedProjects.map((project) => (
                  <Card key={project.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <Badge variant="secondary">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {project.category && (
                          <div>
                            <span className="font-medium">Category: </span>
                            <span className="capitalize">{project.category}</span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Completed: </span>
                          <span>
                            {project.end_date 
                              ? new Date(project.end_date).toLocaleDateString()
                              : 'Date not recorded'
                            }
                          </span>
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

          <TabsContent value="maintenance" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading completed maintenance...</div>
            ) : completedMaintenance.length > 0 ? (
              <div className="space-y-4">
                {completedMaintenance.map((maintenance) => (
                  <Card key={maintenance.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">
                        {maintenance.user_maintenance_tasks.title}
                      </CardTitle>
                      <CardDescription>
                        {maintenance.user_maintenance_tasks.category}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium">Completed: </span>
                          <span>{new Date(maintenance.completed_at).toLocaleDateString()}</span>
                        </div>
                        {maintenance.notes && (
                          <div>
                            <span className="font-medium">Notes: </span>
                            <span>{maintenance.notes}</span>
                          </div>
                        )}
                        {maintenance.photo_url && (
                          <div className="mt-3">
                            <img 
                              src={maintenance.photo_url} 
                              alt="Maintenance completion photo"
                              className="w-32 h-32 object-cover rounded border"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No completed maintenance for this home yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};