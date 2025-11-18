import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, CheckCircle, Plus, Target } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HomeManager } from '../HomeManager';

interface ProjectProfileStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  checkedOutputs?: Set<string>;
  onOutputToggle?: (outputId: string) => void;
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
}

export const ProjectProfileStep: React.FC<ProjectProfileStepProps> = ({ onComplete, isCompleted, checkedOutputs = new Set(), onOutputToggle }) => {
  const { currentProjectRun, updateProjectRun } = useProject();
  const { user } = useAuth();
  const [homes, setHomes] = useState<Home[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string>('');
  const [projectForm, setProjectForm] = useState({
    customProjectName: '',
    description: ''
  });
  const [loading, setLoading] = useState(true);
  const [showHomeManager, setShowHomeManager] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHomes();
    }
    
    if (currentProjectRun) {
      setProjectForm({
        customProjectName: currentProjectRun.customProjectName || currentProjectRun.name || '',
        description: '' // Always start with blank notes field
      });
      
      if (currentProjectRun.home_id) {
        setSelectedHomeId(currentProjectRun.home_id);
      }
    }
  }, [user, currentProjectRun]);

  const fetchHomes = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('homes')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setHomes(data || []);
      
      // Auto-select primary home if no home is selected yet
      if (!selectedHomeId) {
        const primaryHome = data?.find(home => home.is_primary);
        if (primaryHome) {
          setSelectedHomeId(primaryHome.id);
        }
      }
    } catch (error) {
      console.error('Error fetching homes:', error);
      toast.error('Failed to load homes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!currentProjectRun) return;
    
    if (!selectedHomeId) {
      toast.error('Please select a home for this project');
      return;
    }

    if (!projectForm.customProjectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      const updatedProjectRun = {
        ...currentProjectRun,
        customProjectName: projectForm.customProjectName.trim(),
        description: projectForm.description.trim(),
        home_id: selectedHomeId,
        updatedAt: new Date()
      };

      await updateProjectRun(updatedProjectRun);
      
      // CRITICAL FIX: Call onComplete to mark step 3 as complete
      console.log('🎯 ProjectProfileStep: Calling onComplete after save');
      onComplete();
    } catch (error) {
      console.error('Error saving project profile:', error);
      toast.error('Failed to save project profile');
    }
  }, [currentProjectRun, selectedHomeId, projectForm, updateProjectRun, onComplete]);

  // Expose handleSave via window for parent component
  useEffect(() => {
    (window as any).__projectProfileStepSave = handleSave;
    return () => {
      delete (window as any).__projectProfileStepSave;
    };
  }, [handleSave]);

  const handleHomeManagerClose = (open: boolean) => {
    if (!open) {
      setShowHomeManager(false);
      // Debounce the homes refresh to prevent rapid re-renders
      setTimeout(() => {
        if (user) {
          fetchHomes();
        }
      }, 100);
    }
  };

  if (!currentProjectRun) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>No project selected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Home className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                  <span className="truncate">Project Profile</span>
                  {isCompleted && <Badge variant="secondary" className="flex-shrink-0 text-xs">Complete</Badge>}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Set up your project details and team
                </CardDescription>
              </div>
            </div>
            <div className="bg-muted/50 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg flex-shrink-0 self-start sm:self-auto">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">
                <strong>Template:</strong>
              </p>
              <p className="text-[10px] sm:text-xs font-medium truncate max-w-[120px] sm:max-w-none">
                {currentProjectRun.name}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-xs text-muted-foreground">1 of 3</span>
                <label className="text-xs sm:text-sm font-medium">Name your project</label>
              </div>
              <Input
                value={projectForm.customProjectName}
                onChange={(e) => setProjectForm(prev => ({
                  ...prev,
                  customProjectName: e.target.value
                }))}
                placeholder="Enter your custom project name"
                className="text-xs sm:text-sm h-9 sm:h-10"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-xs text-muted-foreground">2 of 3</span>
                <label className="text-xs sm:text-sm font-medium">Describe your project</label>
              </div>
              {/* Admin-created description (readonly) */}
              {currentProjectRun?.name && (
                <div className="mb-3 p-3 bg-muted/50 rounded-md border border-muted">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Template Description:</p>
                  <p className="text-xs text-foreground">{currentProjectRun.description || 'No template description available'}</p>
                </div>
              )}
              {/* User description field */}
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2">Add your own notes about this project (optional)</p>
              <Textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                placeholder=""
                rows={3}
                className="text-xs sm:text-sm resize-none"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-xs text-muted-foreground">3 of 3</span>
                <label className="text-xs sm:text-sm font-medium">Select Home</label>
              </div>
              {loading ? (
                <div className="text-xs sm:text-sm text-muted-foreground">Loading homes...</div>
              ) : homes.length === 0 ? (
                <div className="text-center p-3 sm:p-4 border rounded-lg">
                  <Home className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">No homes added yet</p>
                  <Button onClick={() => setShowHomeManager(true)} size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    Add Your First Home
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
                    <SelectTrigger className="text-xs sm:text-sm h-9 sm:h-10">
                      <SelectValue placeholder="Select a home for this project" />
                    </SelectTrigger>
                    <SelectContent>
                      {homes.map((home) => (
                        <SelectItem key={home.id} value={home.id} className="text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{home.name}</span>
                            {home.is_primary && (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">Primary</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setShowHomeManager(true)}
                    className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

        </CardContent>
      </Card>

      <HomeManager 
        open={showHomeManager}
        onOpenChange={handleHomeManagerClose}
      />
    </>
  );
};