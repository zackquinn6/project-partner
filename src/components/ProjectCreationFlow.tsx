import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, ArrowRight, Star, Plus } from 'lucide-react';
import { HomeManager } from './HomeManager';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectCreationFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProject: any;
  onProjectStart: (homeId: string) => void;
}

interface Home {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  home_type?: string;
  build_year?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export const ProjectCreationFlow: React.FC<ProjectCreationFlowProps> = ({
  open,
  onOpenChange,
  selectedProject,
  onProjectStart
}) => {
  const { user } = useAuth();
  const [homes, setHomes] = useState<Home[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showHomeManager, setShowHomeManager] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchHomes();
    }
  }, [open, user]);

  const fetchHomes = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: homesData, error } = await supabase
        .from('homes')
        .select('id, user_id, name, notes, is_primary, photos, created_at, updated_at, ZIP_code')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      const homeIds = (homesData || []).map((h) => h.id);
      const { data: detailsData } = homeIds.length
        ? await supabase.from('home_details').select('home_id, address, city, state, home_type, build_year').in('home_id', homeIds)
        : { data: [] };
      const detailsByHomeId = new Map((detailsData || []).map((d) => [d.home_id, d]));
      const merged = (homesData || []).map((h) => {
        const d = detailsByHomeId.get(h.id);
        return { ...h, address: d?.address, city: d?.city, state: d?.state, home_type: d?.home_type, build_year: d?.build_year };
      });
      setHomes(merged);
      
      // Auto-select primary home if exists
      const primaryHome = merged?.find(home => home.is_primary);
      if (primaryHome) {
        setSelectedHomeId(primaryHome.id);
      }
    } catch (error) {
      console.error('Error fetching homes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartProject = () => {
    if (!selectedHomeId) {
      return;
    }
    
    onProjectStart(selectedHomeId);
    onOpenChange(false);
  };

  const handleHomeManagerClose = (open: boolean) => {
    setShowHomeManager(open);
    if (!open) {
      // Refresh homes when home manager closes
      fetchHomes();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              Start Project: {selectedProject?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Why choose a home?</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Each project is associated with a specific home location. This helps us customize the project based on your home's characteristics like age, type, and location-specific requirements.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Select Home for This Project</h3>
              
              {loading ? (
                <div className="text-center py-8">Loading your homes...</div>
              ) : homes.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Home className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No homes added yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Add your first home to start this project.
                    </p>
                    <Button onClick={() => setShowHomeManager(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Home
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {homes.map((home) => (
                    <Card 
                      key={home.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedHomeId === home.id ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedHomeId(home.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{home.name}</h3>
                              {home.is_primary && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  Primary
                                </Badge>
                              )}
                            </div>
                            
                            <div className="text-sm text-muted-foreground space-y-1">
                              {home.address && (
                                <div>{home.address}</div>
                              )}
                              {home.city && home.state && (
                                <div>{home.city}, {home.state}</div>
                              )}
                              {home.home_type && (
                                <div>Type: {home.home_type}</div>
                              )}
                              {home.build_year && (
                                <div>Built: {home.build_year}</div>
                              )}
                            </div>
                          </div>
                          
                          {selectedHomeId === home.id && (
                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setShowHomeManager(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Home
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleStartProject}
                disabled={!selectedHomeId}
              >
                Start Project
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <HomeManager 
        open={showHomeManager}
        onOpenChange={handleHomeManagerClose}
      />
    </>
  );
};