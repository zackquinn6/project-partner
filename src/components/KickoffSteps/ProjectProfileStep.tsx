import React, { useState, useEffect } from 'react';
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
    projectLeader: '',
    accountabilityPartner: '',
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
        projectLeader: currentProjectRun.projectLeader || '',
        accountabilityPartner: currentProjectRun.accountabilityPartner || '',
        description: currentProjectRun.description || ''
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

  const handleSave = async () => {
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
        projectLeader: projectForm.projectLeader.trim(),
        accountabilityPartner: projectForm.accountabilityPartner.trim(),
        description: projectForm.description.trim(),
        home_id: selectedHomeId,
        updatedAt: new Date()
      };

      await updateProjectRun(updatedProjectRun);
      onComplete();
    } catch (error) {
      console.error('Error saving project profile:', error);
      toast.error('Failed to save project profile');
    }
  };

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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Project Profile
            {isCompleted && <Badge variant="secondary">Complete</Badge>}
          </CardTitle>
          <CardDescription>
            Set up your project details and team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Project Template:</strong>
            </p>
            <p className="text-sm font-medium">
              {currentProjectRun.name}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name your project</label>
              <Input
                value={projectForm.customProjectName}
                onChange={(e) => setProjectForm(prev => ({
                  ...prev,
                  customProjectName: e.target.value
                }))}
                placeholder="Enter your custom project name"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Describe your project</label>
              <p className="text-xs text-muted-foreground mb-2">A short summary of your unique project</p>
              <Textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                placeholder="Describe your project goals and any special considerations"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Project Leader</label>
              <Input
                value={projectForm.projectLeader}
                onChange={(e) => setProjectForm(prev => ({
                  ...prev,
                  projectLeader: e.target.value
                }))}
                placeholder="Who's leading this project?"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Accountability Partner</label>
              <Input
                value={projectForm.accountabilityPartner}
                onChange={(e) => setProjectForm(prev => ({
                  ...prev,
                  accountabilityPartner: e.target.value
                }))}
                placeholder="Who will help keep you on track?"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select Home</label>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading homes...</div>
              ) : homes.length === 0 ? (
                <div className="text-center p-4 border rounded-lg">
                  <Home className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">No homes added yet</p>
                  <Button onClick={() => setShowHomeManager(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Home
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a home for this project" />
                    </SelectTrigger>
                    <SelectContent>
                      {homes.map((home) => (
                        <SelectItem key={home.id} value={home.id}>
                          <div className="flex items-center gap-2">
                            <span>{home.name}</span>
                            {home.is_primary && (
                              <Badge variant="secondary" className="text-xs">Primary</Badge>
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
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 bg-background pt-4 border-t mt-4">
            {!isCompleted ? (
              <Button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Profile Complete - Continue
              </Button>
            ) : (
              <Button className="w-full bg-green-100 text-green-800 hover:bg-green-200" disabled>
                <CheckCircle className="w-4 h-4 mr-2" />
                Profile Complete - Continue
              </Button>
            )}
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