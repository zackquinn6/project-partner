import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Phase } from "@/interfaces/Project";
interface PhaseIncorporationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIncorporatePhase: (phase: Phase & {
    sourceProjectId: string;
    sourceProjectName: string;
    incorporatedRevision: number;
  }) => void;
}
interface PublishedProject {
  id: string;
  name: string;
  description: string;
  phases: any; // Will be parsed as Phase[] after fetching
  revision_number: number;
  category?: string;
}
export const PhaseIncorporationDialog: React.FC<PhaseIncorporationDialogProps> = ({
  open,
  onOpenChange,
  onIncorporatePhase
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<PublishedProject[]>([]);
  const [allProjects, setAllProjects] = useState<PublishedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<PublishedProject | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const standardPhaseNames = ['Kickoff', 'Planning', 'Ordering', 'Close Project'];

  // Load all published projects when dialog opens
  useEffect(() => {
    if (open) {
      loadAllProjects();
    }
  }, [open]);

  // Filter projects based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = allProjects.filter(project => 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setProjects(filtered);
    } else {
      setProjects(allProjects);
    }
  }, [searchQuery, allProjects]);

  const loadAllProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, phases, revision_number, category')
        .eq('publish_status', 'published')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Parse phases as JSON and create proper PublishedProject objects
      const processedProjects = (data || [])
        .map(project => ({
          ...project,
          phases: typeof project.phases === 'string' ? JSON.parse(project.phases) : project.phases || []
        }))
        .filter(project => project.name.toLowerCase() !== 'manual project template');
      
      setAllProjects(processedProjects);
      setProjects(processedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load projects. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project || null);
    setSelectedPhase(null);
  };
  const handlePhaseSelect = (phaseId: string) => {
    const phase = selectedProject?.phases.find(p => p.id === phaseId);
    setSelectedPhase(phase || null);
  };
  const handleIncorporate = () => {
    if (!selectedProject || !selectedPhase) {
      toast({
        title: "Selection Required",
        description: "Please select both a project and a phase to incorporate.",
        variant: "destructive"
      });
      return;
    }
    const incorporatedPhase = {
      ...selectedPhase,
      sourceProjectId: selectedProject.id,
      sourceProjectName: selectedProject.name,
      incorporatedRevision: selectedProject.revision_number,
      isLinked: true
    };
    onIncorporatePhase(incorporatedPhase);

    // Reset dialog state
    setSearchQuery('');
    setProjects([]);
    setSelectedProject(null);
    setSelectedPhase(null);
    onOpenChange(false);
    toast({
      title: "Phase Incorporated",
      description: `Phase "${selectedPhase.name}" from project "${selectedProject.name}" has been incorporated.`
    });
  };

  // Filter out standard phases
  const availablePhases = selectedProject?.phases.filter(phase => !standardPhaseNames.includes(phase.name)) || [];
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Incorporate Phase from Another Project</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Project Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Projects</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Filter projects by name or description..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Projects Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading projects...</div>
          ) : projects.length > 0 ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Project ({projects.length} available)</label>
              <div className="border rounded-md max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map(project => (
                      <TableRow 
                        key={project.id} 
                        className={`cursor-pointer ${selectedProject?.id === project.id ? 'bg-primary/10' : ''}`}
                        onClick={() => handleProjectSelect(project.id)}
                      >
                        <TableCell className="font-medium">{project.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No published projects found.
            </div>
          )}

          {/* Phase Selection */}
          {selectedProject && <div className="space-y-2">
              <label className="text-sm font-medium">Select Phase</label>
              {availablePhases.length > 0 ? <Select onValueChange={handlePhaseSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a phase to incorporate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePhases.map(phase => <SelectItem key={phase.id} value={phase.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{phase.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {phase.operations?.length || 0} operations
                          </span>
                        </div>
                      </SelectItem>)}
                  </SelectContent>
                </Select> : <p className="text-sm text-muted-foreground py-2">
                  No incorporable phases found in this project. Only non-standard phases can be incorporated.
                </p>}
            </div>}

          {/* Phase Preview */}
          {selectedPhase && <div className="space-y-2">
              <label className="text-sm font-medium">Phase Preview</label>
              <Card>
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{selectedPhase.name}</h4>
                      <Button variant="ghost" size="sm" onClick={() => window.open(`/project/${selectedProject?.id}`, '_blank')}>
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Source
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedPhase.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{selectedPhase.operations?.length || 0} operations</span>
                      <span>
                        {selectedPhase.operations?.reduce((total, op) => total + (op.steps?.length || 0), 0) || 0} steps
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleIncorporate} disabled={!selectedProject || !selectedPhase}>
              Add to Project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};