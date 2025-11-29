import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GitBranch, Plus, Edit, Archive, Eye, CheckCircle, Clock, ArrowRight, AlertTriangle, Settings, Save, X, RefreshCw, Lock, Trash2, ChevronDown, Sparkles, Shield, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { useButtonTracker } from '@/hooks/useButtonTracker';
import { ProjectOwnershipSelector } from '@/components/ProjectOwnershipSelector';
import { ProjectImageManager } from '@/components/ProjectImageManager';
import { AIProjectGenerator } from '@/components/AIProjectGenerator';
import { PFMEAManagement } from '@/components/PFMEAManagement';
import { DeleteProjectDialog } from '@/components/DeleteProjectDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateProjectTimeEstimate, formatScalingUnit } from '@/utils/projectTimeEstimation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Alphabetically sorted project categories
const PROJECT_CATEGORIES = ['Appliances', 'Bathroom', 'Ceilings', 'Decks & Patios', 'Doors & Windows', 'Electrical', 'Exterior Carpentry', 'Flooring', 'General Repairs & Maintenance', 'HVAC & Ventilation', 'Insulation & Weatherproofing', 'Interior Carpentry', 'Kitchen', 'Landscaping & Outdoor Projects', 'Lighting & Electrical', 'Masonry & Concrete', 'Painting & Finishing', 'Plumbing', 'Roofing', 'Safety & Security', 'Smart Home & Technology', 'Storage & Organization', 'Tile', 'Walls & Drywall'];
interface Project {
  id: string;
  name: string;
  description: string;
  publish_status: 'draft' | 'beta-testing' | 'published' | 'archived';
  revision_number: number;
  parent_project_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  beta_released_at: string | null;
  archived_at: string | null;
  release_notes: string | null;
  revision_notes: string | null;
  is_current_version: boolean;
  category: string[] | null;
  effort_level: string | null;
  skill_level: string | null;
  estimated_time: string | null;
  estimated_total_time: string | null;
  typical_project_size: number | null;
  scaling_unit: string | null;
  item_type: string | null;
  project_challenges: string | null;
  project_type?: 'primary' | 'secondary';
  created_by: string;
  owner_id: string | null;
  phases?: any; // JSON field for phases
  images?: string[]; // Array of image URLs
  cover_image?: string | null; // URL of cover image
}
interface UnifiedProjectManagementProps {
  onEditWorkflow?: () => void;
}
export function UnifiedProjectManagement({
  onEditWorkflow
}: UnifiedProjectManagementProps = {}) {
  const navigate = useNavigate();
  const {
    setCurrentProject
  } = useProject();
  const {
    trackClick
  } = useButtonTracker();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectRevisions, setProjectRevisions] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [activeView, setActiveView] = useState<'details' | 'revisions'>('details');
  const [projectSearch, setProjectSearch] = useState('');

  // Calculate time estimates reactively - recalculates when phases, time estimates, or scaling unit change
  // Using JSON.stringify for phases to detect deep changes in time estimates within steps
  const projectTimeEstimate = useMemo(() => {
    if (!selectedProject || !selectedProject.phases || selectedProject.phases.length === 0) {
      return null;
    }
    return calculateProjectTimeEstimate(selectedProject);
  }, [
    selectedProject?.id, // Recalculate when project changes
    selectedProject?.scaling_unit, // Recalculate when scaling unit changes
    // Stringify phases to detect changes in nested time estimates
    // This ensures recalculation when time estimates in steps change
    selectedProject?.phases ? JSON.stringify(selectedProject.phases) : null
  ]);

  // Dialog states
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [createRevisionDialogOpen, setCreateRevisionDialogOpen] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [resetRevisionsDialogOpen, setResetRevisionsDialogOpen] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<Project | null>(null);
  const [newStatus, setNewStatus] = useState<'beta-testing' | 'published'>('beta-testing');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [newProject, setNewProject] = useState<{
    item: string;
    action: string;
    actionCustom: string;
    description: string;
    categories: string[];
    effort_level: string;
    skill_level: string;
    estimated_time: string;
    scaling_unit: string;
    item_type: string;
    project_type: 'primary' | 'secondary';
  }>({
    item: '',
    action: '',
    actionCustom: '',
    description: '',
    categories: [],
    effort_level: 'Medium',
    skill_level: 'Intermediate',
    estimated_time: '',
    scaling_unit: '',
    item_type: '',
    project_type: 'primary'
  });
  const [aiProjectGeneratorOpen, setAiProjectGeneratorOpen] = useState(false);
  const [pfmeaOpen, setPfmeaOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const ProjectTypeTooltip = () => (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex items-center justify-center rounded-full p-1 cursor-help text-muted-foreground hover:text-foreground">
            <Info className="w-4 h-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          <p className="font-semibold mb-1">Primary vs Secondary Projects</p>
          <p>Primary projects can stand on their own (e.g., build a deck, paint a room, install tile flooring).</p>
          <p className="mt-2">Secondary projects typically support other work (e.g., demo tile floors, install baseboard, apply self-leveling concrete).</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
  useEffect(() => {
    fetchProjects();
  }, []);
  useEffect(() => {
    if (selectedProject) {
      fetchProjectRevisions();
    }
  }, [selectedProject]);
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from('projects').select('*').is('parent_project_id', null).order('updated_at', {
        ascending: false
      });
      if (error) throw error;
      
      // Map diy_length_challenges to project_challenges for consistency
      // This handles the case where the migration hasn't been applied yet
      const mappedData = (data || []).map((project: any) => ({
        ...project,
        project_challenges: project.project_challenges ?? project.diy_length_challenges ?? null,
        project_type: project.project_type || 'primary'
      }));
      
      setProjects(mappedData as Project[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };
  const fetchProjectRevisions = async () => {
    if (!selectedProject) return;
    try {
      const parentId = selectedProject.parent_project_id || selectedProject.id;
      const {
        data: allRevisions,
        error
      } = await supabase.from('projects').select('*').or(`parent_project_id.eq.${parentId},id.eq.${parentId}`).order('revision_number', {
        ascending: false
      });
      if (error) throw error;
      setProjectRevisions((allRevisions || []) as Project[]);
    } catch (error) {
      console.error('Error fetching project revisions:', error);
      toast.error("Failed to load project revisions");
    }
  };
  const handleProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project || null);
    setEditingProject(false);
    setEditedProject({});
  };
  const startProjectEdit = () => {
    if (selectedProject) {
      // Ensure category is an array when starting edit
      // Include estimated_total_time and typical_project_size
      setEditedProject({
        ...selectedProject,
        category: selectedProject.category || [],
        project_type: selectedProject.project_type || 'primary',
        estimated_total_time: selectedProject.estimated_total_time || null,
        typical_project_size: selectedProject.typical_project_size || null
      });
      setEditingProject(true);
    }
  };
  const saveProjectEdit = async () => {
    if (!selectedProject || !editedProject) return;
    try {
      // Only send editable database columns (not computed or joined fields)
      const updateData: any = {
        name: editedProject.name || selectedProject.name,
        description: editedProject.description !== undefined ? editedProject.description : selectedProject.description,
        category: editedProject.category || [],
        effort_level: editedProject.effort_level !== undefined ? editedProject.effort_level : selectedProject.effort_level,
        skill_level: editedProject.skill_level !== undefined ? editedProject.skill_level : selectedProject.skill_level,
        estimated_time: editedProject.estimated_time !== undefined ? editedProject.estimated_time : selectedProject.estimated_time,
        estimated_total_time: editedProject.estimated_total_time !== undefined ? editedProject.estimated_total_time : selectedProject.estimated_total_time,
        typical_project_size: editedProject.typical_project_size !== undefined ? editedProject.typical_project_size : selectedProject.typical_project_size,
        scaling_unit: editedProject.scaling_unit !== undefined ? editedProject.scaling_unit : selectedProject.scaling_unit,
        item_type: editedProject.item_type !== undefined ? editedProject.item_type : selectedProject.item_type,
        project_type: editedProject.project_type || selectedProject.project_type || 'primary',
        updated_at: new Date().toISOString(),
        // Always include project_challenges - determine value below
        project_challenges: null
      };

      // Include images and cover_image - ALWAYS preserve existing values if not explicitly changed
      // ProjectImageManager updates these directly, but we should preserve them on save
      // Always include images (even if empty array) to preserve what's in the database
      if (editedProject.images !== undefined) {
        updateData.images = editedProject.images;
      } else if (selectedProject.images !== undefined) {
        // Preserve existing images array (even if empty)
        updateData.images = selectedProject.images || [];
      } else {
        // If not set, default to empty array to avoid null
        updateData.images = [];
      }
      
      // Always include cover_image if it exists
      if (editedProject.cover_image !== undefined) {
        updateData.cover_image = editedProject.cover_image;
      } else if (selectedProject.cover_image !== undefined && selectedProject.cover_image !== null) {
        updateData.cover_image = selectedProject.cover_image;
      }
      // If cover_image is null/undefined, don't include it in update (preserve existing)

      // Set project_challenges - ALWAYS include it in the update
      // If user edited it, use that value (even if empty string)
      // Otherwise preserve existing value
      if (editedProject.hasOwnProperty('project_challenges')) {
        // User has edited the field - preserve the exact value (even if empty string)
        updateData.project_challenges = editedProject.project_challenges ?? null;
        console.log('📝 Using project_challenges from editedProject:', editedProject.project_challenges, '→', updateData.project_challenges);
      } else if (selectedProject.project_challenges !== undefined && selectedProject.project_challenges !== null) {
        // Preserve existing value if not being edited
        updateData.project_challenges = selectedProject.project_challenges;
        console.log('📝 Using project_challenges from selectedProject:', selectedProject.project_challenges);
      } else {
        // Keep as null (already set above)
        console.log('📝 Keeping project_challenges as null (no existing value)');
      }

      // Note: estimated_total_time and typical_project_size are already set in updateData above
      // This duplicate logic is removed since they're handled in the initial updateData object

      console.log('💾 Saving project edit:', {
        projectId: selectedProject.id,
        fields: Object.keys(updateData),
        changes: updateData
      });

      const {
        error,
        data
      } = await supabase.from('projects').update(updateData).eq('id', selectedProject.id).select();
      
      if (error) {
        // If error is about project_challenges column not existing, try with old column name
        if (error.message && error.message.includes('project_challenges')) {
          console.log('⚠️ project_challenges column not found, trying with diy_length_challenges');
          const fallbackValue = updateData.project_challenges;
          delete updateData.project_challenges;
          if (fallbackValue !== undefined) {
            updateData.diy_length_challenges = fallbackValue;
          }
          
          const { error: retryError, data: retryData } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', selectedProject.id)
            .select();
          
          if (retryError) {
            console.error('❌ Save error (retry):', retryError);
            throw retryError;
          }
          
          console.log('✅ Project saved successfully (with fallback):', retryData);
          
          // Clear edited state BEFORE refreshing to prevent showing unsaved data
          setEditingProject(false);
          setEditedProject({});
          
          // Refresh projects to show updated data
          await fetchProjects();
          
          // Re-fetch the specific project to ensure we have all fields
          // Map diy_length_challenges to project_challenges for consistency
          const { data: freshData, error: fetchError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', selectedProject.id)
            .single();
          
          if (!fetchError && freshData) {
            // Map diy_length_challenges to project_challenges if needed
            const mappedData = {
              ...freshData,
              project_challenges: freshData.project_challenges ?? null
            };
            console.log('🔄 Fresh project data (fallback):', mappedData);
            setSelectedProject(mappedData as Project);
            toast.success("Project updated successfully!");
          } else if (retryData && retryData[0]) {
            // Fallback: map the retry data
            const mappedRetryData = {
              ...retryData[0],
              project_challenges: retryData[0].project_challenges ?? null
            };
            setSelectedProject(mappedRetryData as Project);
            toast.success("Project updated successfully!");
          } else {
            toast.error("Project saved but failed to refresh. Please reload the page.");
          }
          return;
        }
        
        console.error('❌ Save error:', error);
        throw error;
      }
      
      console.log('✅ Project saved successfully:', data);
      console.log('📋 Saved project_challenges value:', data?.[0]?.project_challenges);
      
      // Clear edited state BEFORE refreshing to prevent showing unsaved data
      setEditingProject(false);
      setEditedProject({});

      // Refresh projects to show updated data
      await fetchProjects();

      // Update selectedProject with new data - ensure we get the latest from database
      // Re-fetch the specific project to ensure we have all fields including project_challenges
      const { data: freshData, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', selectedProject.id)
        .single();
      
      if (!fetchError && freshData) {
        // Map diy_length_challenges to project_challenges for consistency
        const mappedData = {
          ...freshData,
          project_challenges: freshData.project_challenges ?? null
        };
        console.log('🔄 Fresh project data after save:', mappedData);
        console.log('🔄 Fresh project_challenges:', mappedData.project_challenges);
        setSelectedProject(mappedData as Project);
        toast.success("Project updated successfully!");
      } else if (data && data[0]) {
        // Fallback to data from update response - map columns
        const mappedData = {
          ...data[0],
          project_challenges: data[0].project_challenges ?? null
        };
        console.log('⚠️ Using update response data as fallback:', mappedData);
        setSelectedProject(mappedData as Project);
        toast.success("Project updated successfully!");
      } else {
        toast.error("Project saved but failed to refresh. Please reload the page.");
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error("Failed to update project");
      
      // On error, clear edited state and refresh from database to show actual state
      setEditingProject(false);
      setEditedProject({});
      
      // Re-fetch the project from database to ensure UI shows actual database state
      if (selectedProject) {
        const { data: freshData, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', selectedProject.id)
          .single();
        
        if (!fetchError && freshData) {
          // Map diy_length_challenges to project_challenges for consistency
          const mappedData = {
            ...freshData,
            project_challenges: freshData.project_challenges ?? null
          };
          setSelectedProject(mappedData as Project);
        }
      }
    }
  };
  const cancelProjectEdit = async () => {
    setEditingProject(false);
    setEditedProject({});
    
    // Re-fetch the project from database to ensure UI shows actual database state
    if (selectedProject) {
      const { data: freshData, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', selectedProject.id)
        .single();
      
      if (!fetchError && freshData) {
        // Map diy_length_challenges to project_challenges for consistency
        const mappedData = {
          ...freshData,
          project_challenges: freshData.project_challenges ?? null
        };
        setSelectedProject(mappedData as Project);
      }
    }
  };
  const handleStatusChange = async (revision: Project, status: 'beta-testing' | 'published') => {
    console.log('🎯 handleStatusChange called:', {
      revision: revision.id,
      status,
      revisionNumber: revision.revision_number
    });
    setSelectedRevision(revision);
    setNewStatus(status);

    // For revision 1, automatically set "Initial Release" and bypass dialog
    if (revision.revision_number === 1) {
      setReleaseNotes('Initial Release');
      // Call confirmStatusChange directly without opening dialog
      await confirmStatusChangeDirect(revision, status, 'Initial Release');
    } else {
      // For revision 2+, show dialog and require notes
      setReleaseNotes('');
      setPublishDialogOpen(true);
    }
  };
  // Validation function for production release
  const validateProjectForProduction = (project: Project): { isValid: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];
    const isValidField = (value: any): boolean => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        // Empty string is invalid
        if (trimmed === '') return false;
        // Allow "-", "N/A", "NA" as valid values (case insensitive)
        const upperTrimmed = trimmed.toUpperCase();
        if (['-', 'N/A', 'NA'].includes(upperTrimmed)) return true;
        // Any other non-empty string is valid
        return true;
      }
      if (typeof value === 'number') return true;
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(value);
    };

    // Check all required project information fields
    if (!isValidField(project.name)) missingFields.push('Project Name');
    if (!isValidField(project.description)) missingFields.push('Description');
    if (!isValidField(project.category) || (Array.isArray(project.category) && project.category.length === 0)) {
      missingFields.push('Category');
    }
    if (!isValidField(project.effort_level)) missingFields.push('Effort Level');
    if (!isValidField(project.skill_level)) missingFields.push('Skill Level');
    if (!isValidField(project.estimated_time)) missingFields.push('Estimated Time');
    if (!isValidField(project.scaling_unit)) missingFields.push('Scaling Unit');
    if (!isValidField(project.estimated_total_time)) missingFields.push('Estimated Total Time');
    if (!isValidField(project.typical_project_size)) missingFields.push('Typical Project Size');
    if (!isValidField(project.project_challenges)) missingFields.push('Project Challenges');
    
    // If scaling unit is "per item", item_type is required
    if (project.scaling_unit === 'per item' && !isValidField(project.item_type)) {
      missingFields.push('Item Type');
    }

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  };

  const confirmStatusChangeDirect = async (revision: Project, status: 'beta-testing' | 'published', notes: string) => {
    console.log('🎯 confirmStatusChangeDirect called:', {
      revisionId: revision.id,
      status,
      notes
    });
    if (!notes.trim()) {
      console.error('❌ No release notes provided');
      toast.error("Release notes are required");
      return;
    }

    // Validate project fields before allowing production release (not for beta)
    if (status === 'published') {
      const validation = validateProjectForProduction(revision);
      if (!validation.isValid) {
        console.error('❌ Project validation failed:', validation.missingFields);
        toast.error(
          `Cannot publish to production. Missing or empty fields: ${validation.missingFields.join(', ')}. ` +
          `Please ensure all project information fields are filled. You can use "-" or "N/A" if a field is not applicable.`
        );
        return;
      }
    }

    try {
      console.log('🚀 Updating project status...');
      const {
        error
      } = await supabase.from('projects').update({
        publish_status: status,
        release_notes: notes
      }).eq('id', revision.id);
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      console.log('✅ Project status updated successfully');
      toast.success(`Project ${status === 'beta-testing' ? 'released to Beta' : 'published'}!`);
      setPublishDialogOpen(false);
      setReleaseNotes('');
      fetchProjects();
      if (selectedProject) {
        fetchProjectRevisions();
      }
    } catch (error) {
      console.error('❌ Error updating project status:', error);
      toast.error("Failed to update project status");
    }
  };
  const confirmStatusChange = async () => {
    console.log('🎯 confirmStatusChange called:', {
      hasRevision: !!selectedRevision,
      revisionId: selectedRevision?.id,
      newStatus,
      releaseNotes
    });
    if (!selectedRevision) {
      console.error('❌ No selected revision');
      return;
    }
    if (!releaseNotes.trim()) {
      console.error('❌ No release notes provided');
      toast.error("Release notes are required");
      return;
    }
    // Use the direct function
    await confirmStatusChangeDirect(selectedRevision, newStatus, releaseNotes);
  };
  const createNewRevision = async () => {
    if (!selectedProject) {
      toast.error("No project selected");
      return;
    }

    // Determine the next revision number for validation
    // Get all revisions for this project family
    const parentId = selectedProject.parent_project_id || selectedProject.id;
    const allRevisions = projectRevisions.length > 0 
      ? projectRevisions 
      : (selectedProject.revision_number !== null && selectedProject.revision_number !== undefined 
          ? [selectedProject] 
          : []);
    
    const maxRevisionNumber = allRevisions.length > 0
      ? Math.max(...allRevisions.map(r => r.revision_number || 0))
      : 0;
    const nextRevisionNumber = maxRevisionNumber + 1;

    // Revision notes are optional for draft creation - only required on release
    // For revision 1, automatically use "Initial Release" if notes are empty (for consistency)
    let notesToUse = revisionNotes.trim();
    if (nextRevisionNumber === 1 && !notesToUse) {
      notesToUse = 'Initial Release';
      setRevisionNotes('Initial Release');
    }

    const loadingToast = toast.loading("Creating revision...");
    try {
      // Use revision function that properly handles project_phases architecture
      const {
        data,
        error
      } = await supabase.rpc('create_project_revision_v2', {
        source_project_id: selectedProject.id,
        revision_notes_text: notesToUse || null
      });
      if (error) {
        console.error('Revision creation error:', error);
        throw error;
      }
      const newRevisionId = data;

      // Fetch the newly created revision with all related data
      const {
        data: newRevision,
        error: fetchError
      } = await supabase.from('projects').select(`
          id, 
          name, 
          phases, 
          description, 
          created_at, 
          updated_at, 
          publish_status,
          revision_number
        `).eq('id', newRevisionId).single();
      if (fetchError) {
        console.error('Error fetching new revision:', fetchError);
        throw fetchError;
      }
      console.log('🔍 New revision created:', {
        id: newRevision.id,
        name: newRevision.name,
        revisionNumber: newRevision.revision_number,
        phaseCount: Array.isArray(newRevision.phases) ? newRevision.phases.length : 0,
        phases: newRevision.phases
      });

      // If phases are empty, try to rebuild (this should rarely happen as the function does this)
      if (!newRevision.phases || Array.isArray(newRevision.phases) && newRevision.phases.length === 0) {
        console.warn('⚠️ New revision has no phases, attempting to rebuild...');
        const {
          data: rebuiltPhases,
          error: rebuildError
        } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
          p_project_id: newRevisionId
        });
        if (rebuildError) {
          console.error('Error rebuilding phases:', rebuildError);
        } else if (rebuiltPhases && Array.isArray(rebuiltPhases) && rebuiltPhases.length > 0) {
          // Update the revision with rebuilt phases
          await supabase.from('projects').update({
            phases: rebuiltPhases
          }).eq('id', newRevisionId);
          console.log('✅ Successfully rebuilt phases:', rebuiltPhases.length);
        }
      }
      toast.dismiss(loadingToast);
      toast.success("Revision created successfully! Custom phases and workflow preserved.");
      setCreateRevisionDialogOpen(false);
      setRevisionNotes('');

      // Refresh both lists to show the new revision
      await Promise.all([fetchProjects(), fetchProjectRevisions()]);
    } catch (error: any) {
      console.error('❌ Error creating revision:', error);
      toast.dismiss(loadingToast);
      toast.error(`Failed to create revision: ${error.message || 'Unknown error'}`);
    }
  };
  const handleDeleteProjectClick = (projectId: string, projectName: string) => {
    setProjectToDelete({ id: projectId, name: projectName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    try {
      // Get all project IDs (parent and all revisions) to delete
      const {
        data: allProjects
      } = await supabase.from('projects').select('id').or(`id.eq.${projectToDelete.id},parent_project_id.eq.${projectToDelete.id}`);
      if (!allProjects || allProjects.length === 0) {
        toast.error("Project not found");
        return;
      }
      const projectIds = allProjects.map(p => p.id);

      // Delete all related data for each project
      for (const pid of projectIds) {
        // Delete template_steps via template_operations
        const {
          data: operations
        } = await supabase.from('template_operations').select('id').eq('project_id', pid);
        if (operations && operations.length > 0) {
          const operationIds = operations.map(op => op.id);
          await supabase.from('template_steps').delete().in('operation_id', operationIds);
        }

        // Delete template_operations
        await supabase.from('template_operations').delete().eq('project_id', pid);

        // Delete project_phases (new architecture)
        await supabase.from('project_phases').delete().eq('project_id', pid);

        // Delete project_runs that reference this template
        await supabase.from('project_runs').delete().eq('template_id', pid);
      }

      // Finally delete all projects (parent and revisions)
      const {
        error: deleteError
      } = await supabase.from('projects').delete().in('id', projectIds);
      if (deleteError) throw deleteError;
      toast.success("Project deleted successfully");
      setSelectedProject(null);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error("Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };
  const deleteDraftRevision = async (revisionId: string, revisionNumber: number) => {
    if (revisionNumber === 0) {
      return;
    }
    if (!confirm(`Are you sure you want to delete this draft revision? This action cannot be undone.`)) {
      return;
    }
    try {
      // First try to delete related template data
      const {
        data: operations
      } = await supabase.from('template_operations').select('id').eq('project_id', revisionId);
      if (operations && operations.length > 0) {
        const operationIds = operations.map(op => op.id);

        // Delete template steps first
        await supabase.from('template_steps').delete().in('operation_id', operationIds);

        // Delete template operations
        await supabase.from('template_operations').delete().eq('project_id', revisionId);
      }

      // Now delete the project
      const {
        error
      } = await supabase.from('projects').delete().eq('id', revisionId);
      if (error) {
        console.error('Error deleting revision:', error);
        toast.error("Failed to delete revision");
        return;
      }
      toast.success("Revision deleted successfully");

      // Refresh data without closing the window
      fetchProjects();
      if (selectedProject) {
        fetchProjectRevisions();
      }
    } catch (error) {
      console.error('Error deleting revision:', error);
      toast.error("Failed to delete revision");
    }
  };
  const resetRevisions = async () => {
    if (!selectedProject) {
      toast.error("No project selected");
      setResetRevisionsDialogOpen(false);
      return;
    }

    const loadingToast = toast.loading("Resetting revisions...");
    try {
      console.log('🔄 Starting reset revisions for project:', selectedProject.id, selectedProject.name);
      
      // Get all revisions for this project family
      const parentId = selectedProject.parent_project_id || selectedProject.id;
      console.log('🔍 Looking for revisions with parent_id:', parentId);
      
      // Query all revisions that match parent or are the parent itself
      const { data: allRevisions, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .or(`parent_project_id.eq.${parentId},id.eq.${parentId}`)
        .order('revision_number', { ascending: false });

      if (fetchError) {
        console.error('❌ Error fetching revisions:', fetchError);
        throw fetchError;
      }

      console.log('📋 Found revisions:', allRevisions?.length || 0, allRevisions);

      if (!allRevisions || allRevisions.length === 0) {
        toast.dismiss(loadingToast);
        toast.error("No revisions found for this project");
        setResetRevisionsDialogOpen(false);
        return;
      }

      // Find the latest revision (current version or highest revision number)
      const latestRevision = allRevisions.find(r => r.is_current_version) || allRevisions[0];
      if (!latestRevision) {
        toast.dismiss(loadingToast);
        toast.error("Could not find latest revision");
        setResetRevisionsDialogOpen(false);
        return;
      }

      console.log('✅ Latest revision found:', latestRevision.id, 'Rev', latestRevision.revision_number);

      // Get all other revision IDs to delete
      const otherRevisionIds = allRevisions.filter(r => r.id !== latestRevision.id).map(r => r.id);
      console.log('🗑️ Deleting', otherRevisionIds.length, 'other revisions:', otherRevisionIds);

      // IMPORTANT: First, update the latest revision to remove parent_project_id reference
      // This must be done BEFORE deleting other revisions to avoid foreign key constraint violations
      if (latestRevision.parent_project_id) {
        console.log('🔄 Removing parent_project_id from latest revision before deletion');
        const { error: updateParentError } = await supabase
          .from('projects')
          .update({ parent_project_id: null })
          .eq('id', latestRevision.id);
        
        if (updateParentError) {
          console.error('❌ Error removing parent_project_id:', updateParentError);
          throw updateParentError;
        }
        console.log('✅ Removed parent_project_id from latest revision');
      }

      // Delete all other revisions first (to avoid name conflicts)
      if (otherRevisionIds.length > 0) {
        for (const revisionId of otherRevisionIds) {
          console.log('🗑️ Deleting revision:', revisionId);
          
          // Delete related template data
          const { data: operations, error: opsError } = await supabase
            .from('template_operations')
            .select('id')
            .eq('project_id', revisionId);
          
          if (opsError) {
            console.error('Error fetching operations for deletion:', opsError);
            throw opsError;
          }
          
          if (operations && operations.length > 0) {
            const operationIds = operations.map(op => op.id);
            console.log('🗑️ Deleting', operationIds.length, 'operations and their steps');
            
            // Delete template steps first
            const { error: stepsError } = await supabase
              .from('template_steps')
              .delete()
              .in('operation_id', operationIds);
            
            if (stepsError) {
              console.error('Error deleting template steps:', stepsError);
              throw stepsError;
            }
            
            // Delete template operations
            const { error: opsDeleteError } = await supabase
              .from('template_operations')
              .delete()
              .eq('project_id', revisionId);
            
            if (opsDeleteError) {
              console.error('Error deleting template operations:', opsDeleteError);
              throw opsDeleteError;
            }
          }
          
          // Delete project_phases
          const { error: phasesError } = await supabase
            .from('project_phases')
            .delete()
            .eq('project_id', revisionId);
          
          if (phasesError) {
            console.error('Error deleting project_phases:', phasesError);
            throw phasesError;
          }
          
          // Delete project_runs that reference this template
          const { error: runsError } = await supabase
            .from('project_runs')
            .delete()
            .eq('template_id', revisionId);
          
          if (runsError) {
            console.error('Error deleting project_runs:', runsError);
            throw runsError;
          }
        }

        // Delete all other projects
        console.log('🗑️ Deleting projects:', otherRevisionIds);
        const { error: deleteError } = await supabase
          .from('projects')
          .delete()
          .in('id', otherRevisionIds);
        
        if (deleteError) {
          console.error('❌ Error deleting revisions:', deleteError);
          throw deleteError;
        }
        
        console.log('✅ All other revisions deleted');
      }

      // CRITICAL: Preserve all project information (name, description, etc.) from the latest revision
      // Find the parent project to preserve its information if it exists
      let parentProjectInfo: any = null;
      if (latestRevision.parent_project_id) {
        const { data: parentData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', latestRevision.parent_project_id)
          .single();
        
        if (parentData) {
          parentProjectInfo = parentData;
          console.log('📋 Found parent project to preserve info:', parentData.name);
        }
      }
      
      // Use parent project info if available, otherwise use latest revision info
      // This ensures project name and other metadata are preserved
      const projectInfoToPreserve = parentProjectInfo || latestRevision;
      
      // Update the latest revision to be revision 1, draft, with no parent
      // BUT preserve all project information (name, description, etc.)
      console.log('🔄 Updating latest revision to revision 1, preserving project info:', latestRevision.id);
      const updateData: any = {
        revision_number: 1,
        parent_project_id: null,
        publish_status: 'draft',
        is_current_version: true,
        revision_notes: null,
        release_notes: null,
        published_at: null,
        beta_released_at: null,
        archived_at: null,
        created_from_revision: null,
        // PRESERVE all project information fields
        name: projectInfoToPreserve.name, // CRITICAL: Preserve project name
        description: projectInfoToPreserve.description || latestRevision.description,
        category: projectInfoToPreserve.category || latestRevision.category,
        effort_level: projectInfoToPreserve.effort_level || latestRevision.effort_level,
        skill_level: projectInfoToPreserve.skill_level || latestRevision.skill_level,
        estimated_time: projectInfoToPreserve.estimated_time || latestRevision.estimated_time,
        estimated_total_time: projectInfoToPreserve.estimated_total_time || latestRevision.estimated_total_time,
        typical_project_size: projectInfoToPreserve.typical_project_size || latestRevision.typical_project_size,
        scaling_unit: projectInfoToPreserve.scaling_unit || latestRevision.scaling_unit,
        item_type: projectInfoToPreserve.item_type || latestRevision.item_type,
        project_challenges: projectInfoToPreserve.project_challenges || projectInfoToPreserve.diy_length_challenges || latestRevision.project_challenges || latestRevision.diy_length_challenges,
        project_type: projectInfoToPreserve.project_type || latestRevision.project_type,
        owner_id: projectInfoToPreserve.owner_id || latestRevision.owner_id,
        created_by: projectInfoToPreserve.created_by || latestRevision.created_by,
        // Preserve images
        images: projectInfoToPreserve.images || latestRevision.images,
        cover_image: projectInfoToPreserve.cover_image || latestRevision.cover_image
      };
      
      const { error: updateError } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', latestRevision.id);

      if (updateError) {
        console.error('❌ Error updating revision:', updateError);
        throw updateError;
      }

      console.log('✅ Revision reset complete');
      
      // Refresh projects list first
      await fetchProjects();
      
      // Fetch the updated revision (now revision 1) from database
      const { data: updatedProject, error: selectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', latestRevision.id)
        .single();
      
      if (selectError) {
        console.error('❌ Error fetching updated project:', selectError);
        throw selectError;
      }
      
      if (!updatedProject) {
        console.error('❌ Updated project not found');
        throw new Error('Updated project not found');
      }
      
      // Update selected project with the new revision 1 data
      const mappedProject = {
        ...updatedProject,
        project_challenges: updatedProject.project_challenges ?? updatedProject.diy_length_challenges ?? null,
        project_type: updatedProject.project_type || 'primary',
        images: updatedProject.images || [],
        cover_image: updatedProject.cover_image || null
      } as Project;
      
      setSelectedProject(mappedProject);
      
      // Refresh project revisions list (should now only show revision 1)
      await fetchProjectRevisions();
      
      toast.dismiss(loadingToast);
      toast.success("Revisions reset successfully. Latest revision is now revision 1 (draft).");
      setResetRevisionsDialogOpen(false);
    } catch (error: any) {
      console.error('❌ Error resetting revisions:', error);
      toast.dismiss(loadingToast);
      toast.error(`Failed to reset revisions: ${error.message || 'Unknown error'}`);
    }
  };
  const handleEditStandardProject = async () => {
    try {
      // Fetch standard project using RPC
      const {
        data: standardData,
        error: rpcError
      } = await supabase.rpc('get_standard_project_template');
      if (rpcError) throw rpcError;
      if (!standardData || standardData.length === 0) throw new Error('Standard Project not found');
      const projectData = standardData[0];
      const parsedPhases = Array.isArray(projectData.phases) ? projectData.phases : typeof projectData.phases === 'string' ? JSON.parse(projectData.phases) : [];
      setCurrentProject({
        id: projectData.project_id,
        name: projectData.project_name,
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        publishStatus: 'draft' as const,
        phases: parsedPhases,
        isStandardTemplate: true,
        category: []
      });

      // Navigate to edit workflow view using Index.tsx view state management
      navigate('/', {
        state: {
          view: 'editWorkflow'
        }
      });
    } catch (error) {
      console.error('Error loading standard project:', error);
      toast.error("Failed to load Standard Project Foundation");
    }
  };
  const createProject = async () => {
    if (!newProject.item.trim()) {
      toast.error("Item is required");
      return;
    }

    if (!newProject.action && !newProject.actionCustom.trim()) {
      toast.error("Action is required");
      return;
    }

    // Combine item and action into project name
    const actionValue = newProject.action === 'custom' ? newProject.actionCustom.trim() : newProject.action;
    const projectName = `${newProject.item.trim()} ${actionValue}`.trim();

    // Check for unique project name
    const normalizedName = projectName.toLowerCase().trim();
    const existingProject = projects.find(p => p.name.toLowerCase().trim() === normalizedName);
    if (existingProject) {
      toast.error("A project with this name already exists. Please choose a unique name.");
      return;
    }

    try {
      console.log('🔨 Creating project:', { ...newProject, name: projectName });

      // Use backend function to create project with standard foundation
      const {
        data,
        error
      } = await supabase.rpc('create_project_with_standard_foundation_v2', {
        p_project_name: projectName,
        p_project_description: newProject.description || '',
        p_category: newProject.categories.length > 0 ? newProject.categories[0] : 'general'
      });
      if (error) {
        console.error('❌ Create project error:', error);
        throw error;
      }

      // Update project with additional fields
      if (data) {
        await supabase
          .from('projects')
          .update({
            category: newProject.categories,
            effort_level: newProject.effort_level,
            skill_level: newProject.skill_level,
            estimated_time: newProject.estimated_time || null,
            scaling_unit: newProject.scaling_unit || null,
            item_type: newProject.item_type || null,
            project_type: newProject.project_type || 'primary'
          })
          .eq('id', data);
      }

      console.log('✅ Project created:', data);
      toast.success("New project created with standard phases!");
      setCreateProjectDialogOpen(false);
      setNewProject({
        item: '',
        action: '',
        actionCustom: '',
        description: '',
        categories: [],
        effort_level: 'Medium',
        skill_level: 'Intermediate',
        estimated_time: '',
        scaling_unit: '',
        item_type: '',
        project_type: 'primary'
      });
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  const getStatusBadge = (status: string, isCurrentVersion: boolean) => {
    const baseClasses = "font-medium";
    const currentIndicator = isCurrentVersion ? " (Current)" : "";
    switch (status) {
      case 'published':
        return <Badge className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`}>
          <CheckCircle className="w-3 h-3 mr-1" />
          Published{currentIndicator}
        </Badge>;
      case 'beta':
        return <Badge className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`}>
          <Eye className="w-3 h-3 mr-1" />
          Beta{currentIndicator}
        </Badge>;
      case 'draft':
        return <Badge className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`}>
          <Clock className="w-3 h-3 mr-1" />
          Draft{currentIndicator}
        </Badge>;
      case 'archived':
        return <Badge className={`${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`}>
          <Archive className="w-3 h-3 mr-1" />
          Archived
        </Badge>;
      default:
        return <Badge variant="outline">{status}{currentIndicator}</Badge>;
    }
  };
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return <>
      <div className="space-y-6 h-full flex flex-col min-h-0">
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Project Management & Revision Control
              </CardTitle>
              <div className="flex gap-2">
                <Button onClick={handleEditStandardProject} variant="outline" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Edit Standard
                </Button>
                <Button onClick={() => setAiProjectGeneratorOpen(true)} variant="outline" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Generator
                </Button>
                <Button onClick={() => setPfmeaOpen(true)} variant="outline" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  PFMEA
                </Button>
                <Button onClick={fetchProjects} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 enhanced-scroll">
            {/* Project Selector */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Label htmlFor="project-select">Select Project</Label>
                <Select value={selectedProject?.id || ''} onValueChange={handleProjectSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project to manage..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2 border-b">
                      <Input placeholder="Search projects..." value={projectSearch} onChange={e => setProjectSearch(e.target.value)} className="h-8" onClick={e => e.stopPropagation()} />
                    </div>
                    {projects.filter(project => project.id !== '00000000-0000-0000-0000-000000000000' &&
                  // Hide manual log template
                  project.id !== '00000000-0000-0000-0000-000000000001' &&
                  // Hide Standard Project Foundation
                  project.name.toLowerCase().includes(projectSearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)).map(project => <SelectItem key={project.id} value={project.id}>
                        <span>{project.name}</span>
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setCreateProjectDialogOpen(true)} className="flex items-center gap-2 self-end">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </div>

            {selectedProject && <div className="space-y-6">
                {/* Project Details Section */}
                <Tabs value={activeView} onValueChange={value => setActiveView(value as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">Project Details</TabsTrigger>
                    <TabsTrigger value="revisions">Revision Control</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-6">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Project Information</CardTitle>
                          <div className="flex gap-2">
                            {editingProject ? <>
                                <Button onClick={saveProjectEdit} size="icon" variant="outline">
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button onClick={cancelProjectEdit} variant="outline" size="icon">
                                  <X className="w-4 h-4" />
                                </Button>
                              </> : <>
                                <Button onClick={startProjectEdit} className="flex items-center gap-1">
                                  <Edit className="w-4 h-4" />
                                  Edit Project
                                </Button>
                                <Button onClick={() => handleDeleteProjectClick(selectedProject.id, selectedProject.name)} variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-sm">Project Name</Label>
                            {editingProject ? <Input value={editedProject.name || ''} onChange={e => setEditedProject(prev => ({
                          ...prev,
                          name: e.target.value
                        }))} className="text-sm" /> : <div className="space-y-2">
                                <div className="p-2 bg-muted rounded text-sm">{selectedProject.name}</div>
                                {selectedProject.phases && Array.isArray(selectedProject.phases)}
                              </div>}
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-sm">Status</Label>
                            <div className="p-2 text-sm">
                              {(() => {
                            if (!projectRevisions || projectRevisions.length === 0) return 'No revisions';
                            const latestRevision = projectRevisions.find(r => r.is_current_version) || projectRevisions[0];
                            const statusText = latestRevision.publish_status === 'published' ? 'Production' : latestRevision.publish_status === 'beta-testing' ? 'Beta' : latestRevision.publish_status === 'draft' ? 'Draft' : 'Archived';
                            return `Revision ${latestRevision.revision_number} - ${statusText}`;
                          })()}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm">Categories</Label>
                            {editingProject ? <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="w-full justify-between text-sm h-auto min-h-[40px] py-2">
                                    <span className="text-left truncate flex-1 min-w-0">
                                      {(() => {
                                        const categories = editedProject.category || [];
                                        if (categories.length === 0) return 'Select categories...';
                                        // Show first category, and count if more
                                        if (categories.length === 1) return categories[0];
                                        return `${categories[0]}${categories.length > 1 ? ` +${categories.length - 1} more` : ''}`;
                                      })()}
                                    </span>
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0 bg-background" align="start">
                                <div className="max-h-[300px] overflow-y-auto p-4 space-y-2 pr-2">
                                  {PROJECT_CATEGORIES.map(cat => (
                                    <div key={cat} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`edit-cat-${cat}`}
                                        checked={editedProject.category?.includes(cat) || false}
                                        onCheckedChange={checked => {
                                          const currentCategories = editedProject.category || [];
                                          const newCategories = checked ? [...currentCategories, cat] : currentCategories.filter(c => c !== cat);
                                          setEditedProject(prev => ({
                                            ...prev,
                                            category: newCategories
                                          }));
                                        }}
                                      />
                                      <label htmlFor={`edit-cat-${cat}`} className="text-sm cursor-pointer">
                                        {cat}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </PopoverContent>
                              </Popover> : <div className="p-2 bg-muted rounded text-sm break-words">
                                {(() => {
                                  const categories = selectedProject.category || [];
                                  if (categories.length === 0) return 'Not specified';
                                  if (categories.length === 1) return categories[0];
                                  return `${categories[0]}${categories.length > 1 ? ` +${categories.length - 1} more` : ''}`;
                                })()}
                              </div>}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Project Type</Label>
                              <ProjectTypeTooltip />
                            </div>
                            {editingProject ? (
                              <Select value={editedProject.project_type || 'primary'} onValueChange={value => setEditedProject(prev => ({
                                ...prev,
                                project_type: value as 'primary' | 'secondary'
                              }))}>
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Select project type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="primary">Primary</SelectItem>
                                  <SelectItem value="secondary">Secondary</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="p-2 bg-muted rounded text-sm">
                                {selectedProject.project_type === 'secondary' ? 'Secondary' : 'Primary'}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm">Effort Level</Label>
                            {editingProject ? <Select value={editedProject.effort_level || ''} onValueChange={value => setEditedProject(prev => ({
                          ...prev,
                          effort_level: value
                        }))}>
                                <SelectTrigger className="text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Low">Low</SelectItem>
                                  <SelectItem value="Medium">Medium</SelectItem>
                                  <SelectItem value="High">High</SelectItem>
                                </SelectContent>
                              </Select> : <div className="p-2 bg-muted rounded capitalize text-sm">{selectedProject.effort_level || 'Not specified'}</div>}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm">Skill Level</Label>
                            {editingProject ? <Select value={editedProject.skill_level || ''} onValueChange={value => setEditedProject(prev => ({
                          ...prev,
                          skill_level: value
                        }))}>
                                <SelectTrigger className="text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Beginner">Beginner</SelectItem>
                                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                                  <SelectItem value="Advanced">Advanced</SelectItem>
                                </SelectContent>
                              </Select> : <div className="p-2 bg-muted rounded capitalize text-sm">{selectedProject.skill_level || 'Not specified'}</div>}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm">Estimated Time</Label>
                            {editingProject ? <Input value={editedProject.estimated_time || ''} onChange={e => setEditedProject(prev => ({
                          ...prev,
                          estimated_time: e.target.value
                        }))} className="text-sm" placeholder="e.g., 0.5-1 hours per sqft" /> : <div className="p-2 bg-muted rounded text-sm">{selectedProject.estimated_time || 'Not specified'}</div>}
                            <p className="text-xs text-muted-foreground">Time per scaling unit</p>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm">Scaling Unit</Label>
                            {editingProject ? <Select value={editedProject.scaling_unit || ''} onValueChange={value => setEditedProject(prev => ({
                          ...prev,
                          scaling_unit: value
                        }))}>
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Select scaling unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="per square foot">per square foot</SelectItem>
                                  <SelectItem value="per 10x10 room">per 10x10 room</SelectItem>
                                  <SelectItem value="per linear foot">per linear foot</SelectItem>
                                  <SelectItem value="per cubic yard">per cubic yard</SelectItem>
                                  <SelectItem value="per item">per item</SelectItem>
                                </SelectContent>
                              </Select> : <div className="p-2 bg-muted rounded text-sm">{selectedProject.scaling_unit || 'Not specified'}</div>}
                          </div>

                          {/* Estimated Total Time and Typical Project Size */}
                          <div className="space-y-1">
                            <Label className="text-sm">Estimated Total Time</Label>
                            {editingProject ? <Input value={editedProject.estimated_total_time || ''} onChange={e => setEditedProject(prev => ({
                          ...prev,
                          estimated_total_time: e.target.value
                        }))} className="text-sm" placeholder="e.g., 40-60 hours" /> : <div className="p-2 bg-muted rounded text-sm">{selectedProject.estimated_total_time || 'Not specified'}</div>}
                            <p className="text-xs text-muted-foreground">Total time for typical project size</p>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm">Typical Project Size</Label>
                            {editingProject ? <Input type="number" value={editedProject.typical_project_size || ''} onChange={e => setEditedProject(prev => ({
                          ...prev,
                          typical_project_size: e.target.value ? parseFloat(e.target.value) : null
                        }))} className="text-sm" placeholder="e.g., 100" /> : <div className="p-2 bg-muted rounded text-sm">{selectedProject.typical_project_size || 'Not specified'}</div>}
                            <p className="text-xs text-muted-foreground">Size used for estimated total time</p>
                          </div>

                          {(editingProject ? editedProject.scaling_unit : selectedProject.scaling_unit) === 'per item' && (
                            <div className="space-y-1">
                              <Label className="text-sm">Item Type</Label>
                              {editingProject ? <Input value={editedProject.item_type || ''} onChange={e => setEditedProject(prev => ({
                                ...prev,
                                item_type: e.target.value
                              }))} className="text-sm" placeholder="e.g., Door, Window, Fixture" /> : <div className="p-2 bg-muted rounded text-sm">{selectedProject.item_type || 'Not specified'}</div>}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm">Description</Label>
                          {editingProject ? <Textarea value={editedProject.description || ''} onChange={e => setEditedProject(prev => ({
                        ...prev,
                        description: e.target.value
                      }))} rows={3} className="text-sm" /> : <div className="p-2 bg-muted rounded min-h-[60px] text-sm">
                              {selectedProject.description || 'No description provided'}
                            </div>}
                        </div>

                         <div className="space-y-1">
                           <Label className="text-sm">Project Challenges</Label>
                           {editingProject ? <Textarea value={editedProject.project_challenges || ''} onChange={e => setEditedProject(prev => ({
                        ...prev,
                        project_challenges: e.target.value
                      }))} rows={3} className="text-sm" placeholder="Describe any project challenges or considerations..." /> : <div className="p-2 bg-muted rounded min-h-[60px] text-sm">
                               {selectedProject.project_challenges || 'No project challenges specified'}
                             </div>}
                         </div>

                         {/* Time Estimate Section */}
                         <Separator className="my-4" />
                         <div className="space-y-4">
                           <div className="flex items-center gap-2">
                             <Label className="text-sm font-semibold">Time Estimate</Label>
                             <TooltipProvider delayDuration={100}>
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                                 </TooltipTrigger>
                                 <TooltipContent className="max-w-xs text-xs">
                                   <div className="space-y-1">
                                     <p className="font-semibold">Time Estimate Ranges:</p>
                                     <p>• <strong>Medium</strong> = Expected / average time</p>
                                     <p>• <strong>Low</strong> = 10th percentile (best case)</p>
                                     <p>• <strong>High</strong> = 90th percentile (worst case)</p>
                                   </div>
                                 </TooltipContent>
                               </Tooltip>
                             </TooltipProvider>
                           </div>

                           {/* Calculated Fields */}
                           {projectTimeEstimate && (() => {
                             const timeEstimate = projectTimeEstimate;
                             const scalingUnitDisplay = formatScalingUnit(selectedProject.scaling_unit);
                             
                             return (
                               <div className="space-y-3">
                                 <Label className="text-xs font-medium">Calculated from Workflow Steps</Label>
                                 
                                 {/* Main Project Time Estimates */}
                                 <div className="p-3 border rounded-md bg-background">
                                   <div className="space-y-2">
                                     <div className="text-xs font-medium text-muted-foreground">Main Project</div>
                                     
                                     {/* Fixed Time */}
                                     {(timeEstimate.fixedTime.low > 0 || timeEstimate.fixedTime.medium > 0 || timeEstimate.fixedTime.high > 0) && (
                                       <div className="space-y-1">
                                         <Label className="text-xs">Fixed Time (hours)</Label>
                                         <div className="grid grid-cols-3 gap-2 text-xs">
                                           <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                                             <div className="text-green-700 dark:text-green-300 font-medium">Low</div>
                                             <div className="text-green-900 dark:text-green-100 font-semibold">{timeEstimate.fixedTime.low.toFixed(1)}</div>
                                           </div>
                                           <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                             <div className="text-blue-700 dark:text-blue-300 font-medium">Medium</div>
                                             <div className="text-blue-900 dark:text-blue-100 font-semibold">{timeEstimate.fixedTime.medium.toFixed(1)}</div>
                                           </div>
                                           <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                                             <div className="text-red-700 dark:text-red-300 font-medium">High</div>
                                             <div className="text-red-900 dark:text-red-100 font-semibold">{timeEstimate.fixedTime.high.toFixed(1)}</div>
                                           </div>
                                         </div>
                                       </div>
                                     )}
                                     
                                     {/* Scaled Time Per Unit */}
                                     {(timeEstimate.scaledTimePerUnit.low > 0 || timeEstimate.scaledTimePerUnit.medium > 0 || timeEstimate.scaledTimePerUnit.high > 0) && (
                                       <div className="space-y-1">
                                         <Label className="text-xs">Time per {scalingUnitDisplay} (hours)</Label>
                                         <div className="grid grid-cols-3 gap-2 text-xs">
                                           <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                                             <div className="text-green-700 dark:text-green-300 font-medium">Low</div>
                                             <div className="text-green-900 dark:text-green-100 font-semibold">{timeEstimate.scaledTimePerUnit.low.toFixed(2)}</div>
                                           </div>
                                           <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                             <div className="text-blue-700 dark:text-blue-300 font-medium">Medium</div>
                                             <div className="text-blue-900 dark:text-blue-100 font-semibold">{timeEstimate.scaledTimePerUnit.medium.toFixed(2)}</div>
                                           </div>
                                           <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                                             <div className="text-red-700 dark:text-red-300 font-medium">High</div>
                                             <div className="text-red-900 dark:text-red-100 font-semibold">{timeEstimate.scaledTimePerUnit.high.toFixed(2)}</div>
                                           </div>
                                         </div>
                                       </div>
                                     )}
                                   </div>
                                 </div>

                                 {/* Incorporated Phases */}
                                 {timeEstimate.incorporatedPhases.length > 0 && (
                                   <div className="space-y-2">
                                     <Label className="text-xs font-medium">Incorporated Phases</Label>
                                     <div className="space-y-2">
                                       {timeEstimate.incorporatedPhases.map((phase, index) => {
                                         const phaseScalingUnit = formatScalingUnit(phase.scalingUnit);
                                         return (
                                           <div key={index} className="p-3 border rounded-md bg-background">
                                             <div className="text-xs font-medium mb-2">
                                               {phase.phaseName}
                                               {phase.sourceProjectName && (
                                                 <span className="text-muted-foreground ml-1">
                                                   (from {phase.sourceProjectName})
                                                 </span>
                                               )}
                                             </div>
                                             
                                             {/* Fixed Time for Incorporated Phase */}
                                             {(phase.fixedTime.low > 0 || phase.fixedTime.medium > 0 || phase.fixedTime.high > 0) && (
                                               <div className="space-y-1 mb-2">
                                                 <Label className="text-xs">Fixed Time (hours)</Label>
                                                 <div className="grid grid-cols-3 gap-2 text-xs">
                                                   <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                                                     <div className="text-green-700 dark:text-green-300 font-medium">Low</div>
                                                     <div className="text-green-900 dark:text-green-100 font-semibold">{phase.fixedTime.low.toFixed(1)}</div>
                                                   </div>
                                                   <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                                     <div className="text-blue-700 dark:text-blue-300 font-medium">Medium</div>
                                                     <div className="text-blue-900 dark:text-blue-100 font-semibold">{phase.fixedTime.medium.toFixed(1)}</div>
                                                   </div>
                                                   <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                                                     <div className="text-red-700 dark:text-red-300 font-medium">High</div>
                                                     <div className="text-red-900 dark:text-red-100 font-semibold">{phase.fixedTime.high.toFixed(1)}</div>
                                                   </div>
                                                 </div>
                                               </div>
                                             )}
                                             
                                             {/* Scaled Time Per Unit for Incorporated Phase */}
                                             {(phase.scaledTimePerUnit.low > 0 || phase.scaledTimePerUnit.medium > 0 || phase.scaledTimePerUnit.high > 0) && (
                                               <div className="space-y-1">
                                                 <Label className="text-xs">Time per {phaseScalingUnit} (hours)</Label>
                                                 <div className="grid grid-cols-3 gap-2 text-xs">
                                                   <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                                                     <div className="text-green-700 dark:text-green-300 font-medium">Low</div>
                                                     <div className="text-green-900 dark:text-green-100 font-semibold">{phase.scaledTimePerUnit.low.toFixed(2)}</div>
                                                   </div>
                                                   <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                                     <div className="text-blue-700 dark:text-blue-300 font-medium">Medium</div>
                                                     <div className="text-blue-900 dark:text-blue-100 font-semibold">{phase.scaledTimePerUnit.medium.toFixed(2)}</div>
                                                   </div>
                                                   <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                                                     <div className="text-red-700 dark:text-red-300 font-medium">High</div>
                                                     <div className="text-red-900 dark:text-red-100 font-semibold">{phase.scaledTimePerUnit.high.toFixed(2)}</div>
                                                   </div>
                                                 </div>
                                               </div>
                                             )}
                                           </div>
                                         );
                                       })}
                                     </div>
                                   </div>
                                 )}
                               </div>
                             );
                           })()}
                         </div>

                         {/* Project Ownership Section */}
                         <Separator className="my-4" />
                         <ProjectOwnershipSelector projectId={selectedProject.id} onOwnersChange={() => {
                      // Optionally refresh project data
                    }} disabled={editingProject} />

                          {/* Image Management Section */}
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">Project Images</Label>
                            {editingProject ? <ProjectImageManager projectId={selectedProject.id} onImageUpdated={async () => {
                        // Refresh project data
                        await fetchProjects();
                        // Also refresh the selected project to show updated images
                        if (selectedProject) {
                          const { data, error } = await supabase
                            .from('projects')
                            .select('*')
                            .eq('id', selectedProject.id)
                            .single();
                          if (!error && data) {
                            const updatedProject = {
                              ...data,
                              project_challenges: data.project_challenges ?? data.diy_length_challenges ?? null,
                              project_type: data.project_type || 'primary',
                              images: data.images || [],
                              cover_image: data.cover_image || null
                            } as Project;
                            setSelectedProject(updatedProject);
                            // Also update editedProject to preserve images when saving
                            setEditedProject(prev => ({
                              ...prev,
                              images: updatedProject.images,
                              cover_image: updatedProject.cover_image
                            }));
                          }
                        }
                      }} /> : <div>
                                {selectedProject.images && selectedProject.images.length > 0 ? <div className="space-y-2">
                                    <div className="text-xs text-muted-foreground">
                                      {selectedProject.images.length} image{selectedProject.images.length !== 1 ? 's' : ''} uploaded
                                    </div>
                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                      {selectedProject.images.map((img: string, idx: number) => <div key={idx} className="relative border rounded-lg overflow-hidden">
                                          <img src={img} alt={`Project image ${idx + 1}`} className="w-full h-24 object-cover" />
                                          {selectedProject.cover_image === img && <Badge className="absolute top-1 left-1 bg-primary text-xs">
                                              Cover
                                            </Badge>}
                                        </div>)}
                                    </div>
                                  </div> : <div className="p-4 bg-muted rounded text-sm text-muted-foreground">
                                    No images uploaded
                                  </div>}
                              </div>}
                          </div>

                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">Created:</span> {formatDate(selectedProject.created_at)}
                          </div>
                          <div>
                            <span className="font-medium">Updated:</span> {formatDate(selectedProject.updated_at)}
                          </div>
                          {selectedProject.published_at && <div>
                              <span className="font-medium">Published:</span> {formatDate(selectedProject.published_at)}
                            </div>}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="revisions" className="mt-6">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Revision Control</CardTitle>
                          <div className="flex gap-2">
                            <Button onClick={async () => {
                          console.log('🔵 Create Revision button clicked', {
                            hasSelectedProject: !!selectedProject,
                            projectId: selectedProject?.id,
                            projectName: selectedProject?.name
                          });
                          
                          if (!selectedProject) {
                            toast.error("No project selected");
                            return;
                          }

                          // Determine the next revision number
                          // Get all revisions for this project family
                          const parentId = selectedProject.parent_project_id || selectedProject.id;
                          const allRevisions = projectRevisions.length > 0 
                            ? projectRevisions 
                            : (selectedProject.revision_number !== null && selectedProject.revision_number !== undefined 
                                ? [selectedProject] 
                                : []);
                          
                          const maxRevisionNumber = allRevisions.length > 0
                            ? Math.max(...allRevisions.map(r => r.revision_number || 0))
                            : 0;
                          const nextRevisionNumber = maxRevisionNumber + 1;

                          // If this will be revision 1, automatically create with "Initial Release"
                          if (nextRevisionNumber === 1) {
                            setRevisionNotes('Initial Release');
                            await createNewRevision();
                          } else {
                            // For revision 2+, show dialog and require notes
                            setRevisionNotes('');
                            setCreateRevisionDialogOpen(true);
                          }
                        }} variant="outline" className="flex items-center gap-2">
                              <GitBranch className="w-4 h-4" />
                              Create Revision
                            </Button>
                            <Button onClick={() => setResetRevisionsDialogOpen(true)} variant="outline" className="flex items-center gap-2">
                              <RefreshCw className="w-4 h-4" />
                              Reset Revisions
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loading ? <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div> : <div className="space-y-4">
                            {projectRevisions.map(revision => <Card key={revision.id} className="border-l-4 border-l-primary/20">
                                <CardContent className="pt-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-medium">Revision {revision.revision_number}</h4>
                                        {getStatusBadge(revision.publish_status, revision.is_current_version)}
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-3">
                                        <div>
                                          <span className="font-medium">Created:</span> {formatDate(revision.created_at)}
                                        </div>
                                        {revision.beta_released_at && <div>
                                            <span className="font-medium">Beta Release:</span> {formatDate(revision.beta_released_at)}
                                          </div>}
                                        {revision.published_at && <div>
                                            <span className="font-medium">Published:</span> {formatDate(revision.published_at)}
                                          </div>}
                                        {revision.archived_at && <div>
                                            <span className="font-medium">Archived:</span> {formatDate(revision.archived_at)}
                                          </div>}
                                      </div>

                                      {revision.revision_notes && <div className="mb-2">
                                          <span className="font-medium text-sm">Revision Notes:</span>
                                          <p className="text-sm text-muted-foreground mt-1">{revision.revision_notes}</p>
                                        </div>}

                                      {revision.release_notes && <div>
                                          <span className="font-medium text-sm">Release Notes:</span>
                                          <p className="text-sm text-muted-foreground mt-1">{revision.release_notes}</p>
                                        </div>}
                                    </div>

                     <div className="flex flex-col gap-2 ml-4">
                      {revision.publish_status === 'draft' && <Button size="sm" variant="outline" onClick={() => {
                                // Parse phases
                                let parsedPhases = [];
                                try {
                                  let phases = revision.phases;
                                  if (typeof phases === 'string') {
                                    phases = JSON.parse(phases);
                                  }
                                  if (typeof phases === 'string') {
                                    console.warn('Phases double-encoded in UnifiedProjectManagement');
                                    phases = JSON.parse(phases);
                                  }
                                  parsedPhases = phases || [];
                                  console.log('🔍 Setting current project for edit:', {
                                    revisionId: revision.id,
                                    revisionName: revision.name,
                                    revisionNumber: revision.revision_number,
                                    phaseCount: Array.isArray(parsedPhases) ? parsedPhases.length : 0,
                                    phases: parsedPhases.map((p: any) => ({
                                      id: p.id,
                                      name: p.name,
                                      isStandard: p.isStandard,
                                      isLinked: p.isLinked,
                                      operationCount: p.operations?.length || 0
                                    }))
                                  });
                                } catch (e) {
                                  console.error('Failed to parse phases for revision:', revision.id, e);
                                  parsedPhases = [];
                                }
                                setCurrentProject({
                                  id: revision.id,
                                  name: revision.name,
                                  description: revision.description || '',
                                  createdAt: new Date(revision.created_at),
                                  updatedAt: new Date(revision.updated_at),
                                  publishStatus: revision.publish_status as 'draft' | 'published' | 'beta-testing',
                                  phases: parsedPhases,
                                  category: Array.isArray(revision.category) ? revision.category : (revision.category ? [revision.category] : [])
                                });

                                // Open workflow editor
                                if (onEditWorkflow) {
                                  onEditWorkflow();
                                } else {
                                  toast.info('Project selected. Use the "Edit Standard" button in the Admin Panel to edit the workflow.');
                                }
                              }} className="flex items-center gap-1">
                          <Edit className="w-3 h-3" />
                          Edit Workflow
                        </Button>}
                                      {revision.publish_status === 'draft' && <>
                                          <Button size="sm" variant="outline" onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🎯 Beta button clicked');
                                  handleStatusChange(revision, 'beta-testing');
                                }} className="flex items-center gap-1">
                                            <ArrowRight className="w-3 h-3" />
                                            Release to Beta
                                          </Button>
                                           <Button size="sm" onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🎯 Production button clicked');
                                  handleStatusChange(revision, 'published');
                                }} className="flex items-center gap-1">
                                             <ArrowRight className="w-3 h-3" />
                                             Release to Production
                                           </Button>
                                           {revision.revision_number > 0 && <Button size="sm" variant="destructive" onClick={() => deleteDraftRevision(revision.id, revision.revision_number)} className="flex items-center gap-1">
                                               <X className="w-3 h-3" />
                                               Delete Draft
                                             </Button>}
                                        </>}
                                      {revision.publish_status === 'beta-testing' && <Button size="sm" onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('🎯 Promote to Production button clicked');
                                handleStatusChange(revision, 'published');
                              }} className="flex items-center gap-1">
                                           <ArrowRight className="w-3 h-3" />
                                           Release to Production
                                         </Button>}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>)}
                          </div>}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>}

            {!selectedProject && !loading && <div className="text-center py-12 text-muted-foreground">
                <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
                <p>Select a project from the dropdown above to view and edit its details, or create a new project.</p>
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* Publish Confirmation Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Confirm {newStatus === 'beta-testing' ? 'Beta Release' : 'Publication'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {newStatus === 'beta-testing' ? 'This will release the project to beta testing. Beta projects are visible to users but marked as experimental.' : 'This will publish the project for all users. This action will archive all previous versions.'}
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="release-notes">Release Notes *</Label>
              <Textarea id="release-notes" placeholder={`Describe what's new in this ${newStatus} release...`} value={releaseNotes} onChange={e => setReleaseNotes(e.target.value)} rows={4} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🎯 Confirm button clicked in dialog');
              confirmStatusChange();
            }} disabled={!releaseNotes.trim()} className={newStatus === 'published' ? 'bg-green-600 hover:bg-green-700' : ''}>
                {newStatus === 'beta-testing' ? 'Release to Beta' : 'Publish'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Revision Dialog */}
      <Dialog open={createRevisionDialogOpen} onOpenChange={open => {
      console.log('🟡 Create Revision Dialog open state changed:', open);
      setCreateRevisionDialogOpen(open);
    }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Create New Revision
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a new draft revision based on the current project. The new revision will start in draft status.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="revision-notes">Revision Notes (Optional)</Label>
              <Textarea id="revision-notes" placeholder="Describe the purpose of this revision (optional - can be added later on release)..." value={revisionNotes} onChange={e => setRevisionNotes(e.target.value)} rows={3} />
              <p className="text-xs text-muted-foreground">Revision notes are optional for draft creation. They will be required when releasing to beta or production.</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setCreateRevisionDialogOpen(false);
                setRevisionNotes('');
              }}>
                Cancel
              </Button>
              <Button onClick={async () => {
              console.log('🟢 Create Draft Revision button (inside dialog) clicked');
              await createNewRevision();
              // Dialog will be closed in createNewRevision on success
            }}>
                Create Draft Revision
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Revisions Warning Dialog */}
      <Dialog open={resetRevisionsDialogOpen} onOpenChange={setResetRevisionsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Reset Revisions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Warning: This action cannot be undone!</p>
              <p className="text-sm text-muted-foreground">
                This will:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                <li>Delete all archived and old revisions</li>
                <li>Set the latest version (draft, beta, or published) back to draft</li>
                <li>Reset the revision number to 1</li>
                <li>Remove all revision history</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-3">
                <strong>Note:</strong> The content of the latest revision will be preserved. Only the revision history will be cleared.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetRevisionsDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={async () => {
                await resetRevisions();
                // Dialog will be closed in resetRevisions on success
              }}>
                Reset Revisions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={createProjectDialogOpen} onOpenChange={setCreateProjectDialogOpen}>
        <DialogContent className="w-[85vw] max-w-[85vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Project Name: Item + Action. e.g. "Tile Flooring Installation"
              </p>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="project-item" className="h-5 flex items-center">Item *</Label>
                  <Input 
                    id="project-item" 
                    placeholder="e.g., Tile Flooring" 
                    value={newProject.item || ''} 
                    onChange={e => setNewProject(prev => ({
                      ...prev,
                      item: e.target.value
                    }))} 
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 h-5">
                    <Label htmlFor="project-action" className="flex items-center">Action *</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full"
                            aria-label="Action selection guide"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          <ul className="list-disc list-inside space-y-1">
                            <li>If removal + installation: use "Replacement"</li>
                            <li>If new install only: use "Installation"</li>
                            <li>If maintenance or fix: use "Repair"</li>
                            <li>If liquid/slurry, non-cosmetic: use "Application"</li>
                            <li>If cosmetic: use "Painting", "Refinishing", "Finishing", "Staining", etc.</li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex gap-2">
                    <Select value={newProject.action || ''} onValueChange={value => setNewProject(prev => ({
                      ...prev,
                      action: value
                    }))}>
                      <SelectTrigger className="flex-1 h-10">
                        <SelectValue placeholder="Select action..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Application">Application</SelectItem>
                        <SelectItem value="Repair">Repair</SelectItem>
                        <SelectItem value="Installation">Installation</SelectItem>
                        <SelectItem value="Painting">Painting</SelectItem>
                        <SelectItem value="Finishing">Finishing</SelectItem>
                        <SelectItem value="Refinishing">Refinishing</SelectItem>
                        <SelectItem value="Staining">Staining</SelectItem>
                        <SelectItem value="Replacement">Replacement</SelectItem>
                        <SelectItem value="custom">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                    {newProject.action === 'custom' && (
                      <Input
                        placeholder="Enter custom action"
                        value={newProject.actionCustom || ''}
                        onChange={e => setNewProject(prev => ({
                          ...prev,
                          actionCustom: e.target.value
                        }))}
                        className="flex-1 h-10"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea id="project-description" placeholder="Describe the project..." value={newProject.description || ''} onChange={e => setNewProject(prev => ({
              ...prev,
              description: e.target.value
            }))} rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-categories">Categories</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-auto min-h-[40px] py-2">
                      <span className="text-left text-sm truncate flex-1 mr-2">
                        {newProject.categories.length > 0 
                          ? (newProject.categories.length <= 2 
                              ? newProject.categories.join(', ')
                              : `${newProject.categories.slice(0, 2).join(', ')} +${newProject.categories.length - 2} more`)
                          : 'Select categories...'}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 bg-background" align="start">
                    <div className="max-h-[300px] overflow-y-auto p-4 space-y-2 pr-2">
                      {PROJECT_CATEGORIES.map(cat => (
                        <div key={cat} className="flex items-center space-x-2">
                          <Checkbox
                            id={`new-cat-${cat}`}
                            checked={newProject.categories.includes(cat)}
                            onCheckedChange={checked => {
                              const newCategories = checked ? [...newProject.categories, cat] : newProject.categories.filter(c => c !== cat);
                              setNewProject(prev => ({
                                ...prev,
                                categories: newCategories
                              }));
                            }}
                          />
                          <label htmlFor={`new-cat-${cat}`} className="text-sm cursor-pointer">
                            {cat}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Project Type</Label>
                  <ProjectTypeTooltip />
                </div>
                <Select value={newProject.project_type} onValueChange={value => setNewProject(prev => ({
                  ...prev,
                  project_type: value as 'primary' | 'secondary'
                }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-effort">Effort Level</Label>
                <Select value={newProject.effort_level || 'Medium'} onValueChange={value => setNewProject(prev => ({
                  ...prev,
                  effort_level: value
                }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-skill">Skill Level</Label>
                <Select value={newProject.skill_level || 'Intermediate'} onValueChange={value => setNewProject(prev => ({
                  ...prev,
                  skill_level: value
                }))}>
                  <SelectTrigger className="w-full min-w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[220px]">
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-time">Estimated Time</Label>
                <Input id="project-time" placeholder="e.g., 2-4 hours" value={newProject.estimated_time || ''} onChange={e => setNewProject(prev => ({
                ...prev,
                estimated_time: e.target.value
              }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-scaling">Scaling Unit</Label>
                <Select value={newProject.scaling_unit || ''} onValueChange={value => setNewProject(prev => ({
                ...prev,
                scaling_unit: value
              }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select scaling unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per square foot">per square foot</SelectItem>
                    <SelectItem value="per 10x10 room">per 10x10 room</SelectItem>
                    <SelectItem value="per linear foot">per linear foot</SelectItem>
                    <SelectItem value="per cubic yard">per cubic yard</SelectItem>
                    <SelectItem value="per item">per item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newProject.scaling_unit === 'per item' && (
              <div className="space-y-2">
                <Label htmlFor="project-item-type">Item Type</Label>
                <Input id="project-item-type" placeholder="e.g., Door, Window, Fixture" value={newProject.item_type || ''} onChange={e => setNewProject(prev => ({
                  ...prev,
                  item_type: e.target.value
                }))} />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateProjectDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createProject} disabled={!newProject.item?.trim() || (!newProject.action && !newProject.actionCustom?.trim())}>
                Create Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Project Generator Dialog */}
      <AIProjectGenerator
        open={aiProjectGeneratorOpen}
        onOpenChange={setAiProjectGeneratorOpen}
        onProjectCreated={(projectId) => {
          toast.success('Project created successfully!');
          fetchProjects();
        }}
      />

      {/* PFMEA Dialog */}
      <Dialog open={pfmeaOpen} onOpenChange={setPfmeaOpen}>
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg md:text-xl font-bold">Process FMEA</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPfmeaOpen(false)} 
                className="h-7 px-2 text-[9px] md:text-xs"
              >
                Close
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
            <PFMEAManagement />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <DeleteProjectDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        projectName={projectToDelete?.name || ''}
        onConfirm={handleDeleteProject}
        isDeleting={isDeleting}
        includeRevisions={true}
      />
    </>;
}