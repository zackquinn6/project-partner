import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Project, Phase } from '../../interfaces/Project';
import { Search, Package, Clock, Filter, X } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';

interface PhaseBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableProjects: Project[];
  onSelectPhases: (phases: Phase[], insertAfterPhaseId?: string) => void;
  currentProjectId: string;
}

interface PhaseWithProject extends Phase {
  projectName: string;
  projectId: string;
  category: string;
}

export const PhaseBrowser: React.FC<PhaseBrowserProps> = ({
  open,
  onOpenChange,
  availableProjects,
  onSelectPhases,
  currentProjectId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPhases, setSelectedPhases] = useState<PhaseWithProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Get available projects (excluding current project)
  const availableProjectsList = useMemo(() => {
    return availableProjects.filter(p => 
      p.id !== currentProjectId && p.publishStatus !== 'draft'
    );
  }, [availableProjects, currentProjectId]);

  // Get all phases from all projects (excluding current project)
  const allAvailablePhases = useMemo(() => {
    const phases: PhaseWithProject[] = [];
    
    availableProjects.forEach(project => {
      if (project.id === currentProjectId || project.publishStatus === 'draft') return;
      
      project.phases?.forEach(phase => {
        // Hide standard phases (kickoff, planning, ordering, close)
        const phaseLower = phase.name.toLowerCase();
        if (phaseLower.includes('kickoff') || 
            phaseLower.includes('planning') ||
            phaseLower.includes('ordering') ||
            phaseLower.includes('close')) {
          return;
        }
        
        phases.push({
          ...phase,
          projectName: project.name,
          projectId: project.id,
          category: project.category || 'Other'
        });
      });
    });
    
    return phases;
  }, [availableProjects, currentProjectId]);

  // Filter and search phases
  const filteredPhases = useMemo(() => {
    let filtered = allAvailablePhases;
    
    // Filter by selected project first
    if (selectedProject) {
      filtered = filtered.filter(phase => phase.projectId === selectedProject);
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(phase => 
        phase.name.toLowerCase().includes(searchLower) ||
        phase.description?.toLowerCase().includes(searchLower) ||
        phase.projectName.toLowerCase().includes(searchLower)
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(phase => phase.category === selectedCategory);
    }
    
    return filtered;
  }, [allAvailablePhases, searchTerm, selectedCategory, selectedProject]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(allAvailablePhases.map(phase => phase.category));
    return Array.from(cats).sort();
  }, [allAvailablePhases]);

  const handlePhaseToggle = (phase: PhaseWithProject, checked: boolean) => {
    if (checked) {
      setSelectedPhases(prev => [...prev, phase]);
    } else {
      setSelectedPhases(prev => prev.filter(p => p.id !== phase.id));
    }
  };

  const handleAddSelectedPhases = () => {
    if (selectedPhases.length > 0) {
      // Convert back to regular phases and add unique IDs to avoid conflicts
      const phasesToAdd: Phase[] = selectedPhases.map(phase => ({
        ...phase,
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        // Remove the extra properties we added
        projectName: undefined as any,
        projectId: undefined as any,
        category: undefined as any
      }));
      
      onSelectPhases(phasesToAdd);
      setSelectedPhases([]);
      onOpenChange(false);
    }
  };

  const isPhaseSelected = (phase: PhaseWithProject) => {
    return selectedPhases.some(p => p.id === phase.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[90vw] !h-[90vh] !max-w-[90vw] !max-h-[90vh] p-0 [&>button]:hidden overflow-hidden flex flex-col !fixed !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Package className="w-5 h-5" />
                Browse Available Phases
              </DialogTitle>
              <DialogDescription className="mt-2 text-base">
                Select phases from other projects to add to your workflow. These are conventional, tested phases.
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="ml-2">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 px-6 pb-6">
          {/* Search and Filter Controls */}
          <div className="flex flex-col gap-3 mb-4 flex-shrink-0">
            {/* Project Selector */}
            <div className="flex gap-3">
              <Select value={selectedProject || 'all'} onValueChange={(val) => setSelectedProject(val === 'all' ? null : val)}>
                <SelectTrigger className="flex-1">
                  <Package className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {availableProjectsList.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search phases by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Phase List */}
          <div className="flex-1 min-h-0 mb-4 overflow-hidden">
            <div className="h-full overflow-y-auto pr-2">
            {filteredPhases.length === 0 ? (
              <Card>
                <CardContent className={`text-center ${isMobile ? 'py-6' : 'py-8'}`}>
                  <Package className={`text-muted-foreground mx-auto mb-4 ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}`} />
                  <h3 className={`font-semibold mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>No Phases Found</h3>
                  <p className="text-muted-foreground text-sm">
                    {searchTerm || selectedCategory !== 'all' 
                      ? 'Try adjusting your search or filter criteria.'
                      : 'No compatible phases are available from other projects.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
                {filteredPhases.map((phase) => (
                  <Card 
                    key={`${phase.projectId}-${phase.id}`} 
                    className={`cursor-pointer transition-colors ${
                      isPhaseSelected(phase) ? 'bg-primary/5 border-primary' : ''
                    } ${isMobile ? 'touch-manipulation' : ''}`}
                    onClick={() => handlePhaseToggle(phase, !isPhaseSelected(phase))}
                  >
                    <CardHeader className={isMobile ? 'pb-2' : 'pb-2'}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className={`flex items-center gap-3 ${isMobile ? 'text-sm' : 'text-base'}`}>
                            <Checkbox
                              checked={isPhaseSelected(phase)}
                              onCheckedChange={(checked) => handlePhaseToggle(phase, checked as boolean)}
                              className={isMobile ? 'scale-110' : ''}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="flex-1 min-w-0 truncate">{phase.name}</span>
                          </CardTitle>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {phase.projectName}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {phase.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className={`text-muted-foreground mb-3 ${isMobile ? 'text-sm line-clamp-3' : 'text-sm'}`}>
                        {phase.description}
                      </p>
                      <div className={`flex items-center gap-4 text-xs text-muted-foreground ${isMobile ? 'flex-wrap' : ''}`}>
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {phase.operations?.length || 0} operations
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Est. time varies
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="border-t pt-4 pb-0 flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {selectedPhases.length > 0 
                  ? `${selectedPhases.length} phase${selectedPhases.length === 1 ? '' : 's'} selected`
                  : 'Select phases to add to your project'
                }
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedPhases([])}
                  disabled={selectedPhases.length === 0}
                  size="default"
                >
                  Clear Selection
                </Button>
                <Button 
                  onClick={handleAddSelectedPhases}
                  disabled={selectedPhases.length === 0}
                  size="default"
                >
                  Add {selectedPhases.length} Phase{selectedPhases.length === 1 ? '' : 's'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};