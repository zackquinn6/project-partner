import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Project, Phase } from '../../interfaces/Project';
import { Search, Package, Clock, Plus, ChevronDown } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';

interface PhaseBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableProjects: Project[];
  onSelectPhases: (phases: Phase[], insertAfterPhaseId?: string) => void;
  currentProjectId: string;
  onAddCustomWork?: () => void;
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
  currentProjectId,
  onAddCustomWork
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPhases, setSelectedPhases] = useState<PhaseWithProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showPhaseSelector, setShowPhaseSelector] = useState(false);
  const isMobile = useIsMobile();

  // Get available projects (excluding current project, drafts, Manual Project Template, and showing only latest revisions)
  const availableProjectsList = useMemo(() => {
    // Filter out drafts, current project, and Manual Project Template
    const filtered = availableProjects.filter(p => 
      p.id !== currentProjectId && 
      p.publishStatus !== 'draft' &&
      p.name !== 'Manual Project Template'
    );
    
    // Group projects by their base ID (parentProjectId or own id if no parent)
    const projectGroups = new Map<string, Project[]>();
    
    filtered.forEach(project => {
      const baseId = project.parentProjectId || project.id;
      if (!projectGroups.has(baseId)) {
        projectGroups.set(baseId, []);
      }
      projectGroups.get(baseId)!.push(project);
    });
    
    // For each group, keep only the latest revision
    const latestRevisions: Project[] = [];
    projectGroups.forEach(group => {
      // Sort by revision number (highest first), then by updatedAt date as fallback
      const sorted = group.sort((a, b) => {
        const revA = a.revisionNumber ?? 0;
        const revB = b.revisionNumber ?? 0;
        if (revA !== revB) return revB - revA;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      latestRevisions.push(sorted[0]);
    });
    
    return latestRevisions;
  }, [availableProjects, currentProjectId]);

  // Get phases for selected project only
  const projectPhases = useMemo(() => {
    if (!selectedProject) return [];
    
    const project = availableProjects.find(p => p.id === selectedProject);
    if (!project) return [];
    
    const phases: PhaseWithProject[] = [];
    project.phases?.forEach(phase => {
      // Hide standard phases (use isStandard flag instead of hardcoded names)
      if (phase.isStandard === true && !phase.isLinked) {
        return;
      }
      
      phases.push({
        ...phase,
        projectName: project.name,
        projectId: project.id,
        category: Array.isArray(project.category) ? project.category[0] || 'Other' : (project.category || 'Other')
      });
    });
    
    return phases;
  }, [selectedProject, availableProjects]);

  // Filter and search projects
  const filteredProjects = useMemo(() => {
    let filtered = availableProjectsList;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(project => {
        const categoryStr = Array.isArray(project.category) 
          ? project.category.join(' ') 
          : (project.category || '');
        return project.name.toLowerCase().includes(searchLower) ||
          project.description?.toLowerCase().includes(searchLower) ||
          categoryStr.toLowerCase().includes(searchLower);
      });
    }
    
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((project) => {
        const cats = Array.isArray(project.category)
          ? project.category
          : project.category
            ? [project.category]
            : [];
        return cats.some((c) => selectedCategories.includes(c));
      });
    }

    return filtered;
  }, [availableProjectsList, searchTerm, selectedCategories]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    availableProjectsList.forEach(p => {
      if (Array.isArray(p.category)) {
        p.category.forEach(cat => cats.add(cat));
      } else if (p.category) {
        cats.add(p.category);
      }
    });
    return Array.from(cats).sort();
  }, [availableProjectsList]);

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

  const handleProjectClick = (projectId: string) => {
    setSelectedProject(projectId);
    setShowPhaseSelector(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!w-[90vw] !h-[90vh] !max-w-[90vw] !max-h-[90vh] p-0 [&>button]:hidden overflow-hidden flex flex-col !fixed !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <Package className="w-5 h-5" />
                  Browse Available Projects
                </DialogTitle>
                <DialogDescription className="mt-2 text-base">
                  Select a project to view and add its phases to your workflow.
                </DialogDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="ml-2">
                Close
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 px-6 pb-6">
            {/* Search and Filter Controls */}
            <div className="flex flex-col gap-3 mb-4 flex-shrink-0">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {categories.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5">
                      Categories
                      {selectedCategories.length > 0 ? (
                        <span className="text-muted-foreground">({selectedCategories.length})</span>
                      ) : null}
                      <ChevronDown className="h-4 w-4 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto" align="start">
                    <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {categories.map((category) => (
                      <DropdownMenuCheckboxItem
                        key={category}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => {
                          setSelectedCategories((prev) =>
                            prev.includes(category)
                              ? prev.filter((c) => c !== category)
                              : [...prev, category]
                          );
                        }}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {category}
                      </DropdownMenuCheckboxItem>
                    ))}
                    {selectedCategories.length > 0 ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => setSelectedCategories([])}
                        >
                          Clear categories
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              {/* Add Custom Work Button */}
              {onAddCustomWork && (
                <Card className="border-sky-200 bg-sky-50/80 dark:border-sky-800 dark:bg-sky-950/40">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-sky-950 dark:text-sky-100">Add Custom Work</h4>
                        <p className="text-xs text-sky-800 dark:text-sky-200/90 mt-0.5">
                          Use this when you can&apos;t find work content in our catalog
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          onAddCustomWork();
                          onOpenChange(false);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-sky-300 text-sky-900 hover:bg-sky-100 dark:border-sky-600 dark:text-sky-100 dark:hover:bg-sky-900/50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Custom
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Project List - Table Format */}
            <div className="flex-1 min-h-0 mb-4 overflow-hidden border rounded-lg">
              <div className="h-full overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="text-muted-foreground mx-auto mb-4 w-12 h-12" />
                  <h3 className="font-semibold mb-2 text-lg">No Projects Found</h3>
                  <p className="text-muted-foreground text-sm">
                    {searchTerm || selectedCategories.length > 0
                      ? 'Try adjusting your search or filter criteria.'
                      : 'No compatible projects are available.'
                    }
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[min(22%,11rem)] max-w-[11rem] whitespace-nowrap">
                        Project name
                      </TableHead>
                      <TableHead className="min-w-0">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow
                        key={project.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => handleProjectClick(project.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleProjectClick(project.id);
                          }
                        }}
                      >
                        <TableCell className="max-w-[11rem] truncate font-medium align-top">
                          {project.name}
                        </TableCell>
                        <TableCell className="min-w-0 text-sm text-muted-foreground align-top">
                          <span className="line-clamp-4 sm:line-clamp-6">
                            {project.description || 'No description available'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Phase Selector Dialog */}
      <Dialog open={showPhaseSelector} onOpenChange={setShowPhaseSelector}>
        <DialogContent className="!w-[90vw] !h-[90vh] !max-w-[90vw] !max-h-[90vh] p-0 [&>button]:hidden overflow-hidden flex flex-col !fixed !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <Package className="w-5 h-5" />
                  Select Phases
                </DialogTitle>
                <DialogDescription className="mt-2 text-base">
                  {selectedProject && `From: ${availableProjects.find(p => p.id === selectedProject)?.name}`}
                </DialogDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowPhaseSelector(false)} className="ml-2">
                Close
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 px-6 pb-6">
            {/* Phase List */}
            <div className="flex-1 min-h-0 mb-4 overflow-hidden">
              <div className="h-full overflow-y-auto pr-2">
                {projectPhases.length === 0 ? (
                  <Card>
                    <CardContent className={`text-center ${isMobile ? 'py-6' : 'py-8'}`}>
                      <Package className={`text-muted-foreground mx-auto mb-4 ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}`} />
                      <h3 className={`font-semibold mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>No Phases Available</h3>
                      <p className="text-muted-foreground text-sm">
                        This project has no phases available to add.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
                    {projectPhases.map((phase) => (
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
    </>
  );
};