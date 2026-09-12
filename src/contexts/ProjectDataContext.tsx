import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { projectRunFromSupabaseRow } from '@/utils/projectRunFromSupabaseRow';
import { useDataFetch } from '@/hooks/useDataFetch';
import { useAuth } from './AuthContext';
import { useGuest } from './GuestContext';

interface ProjectDataContextType {
  projects: Project[];
  projectRuns: ProjectRun[];
  loading: boolean;
  error: Error | null;
  refetchProjects: () => Promise<void>;
  refetchProjectRuns: () => Promise<void>;
  updateProjectsCache: (projects: Project[]) => void;
  updateProjectRunsCache: (projectRuns: ProjectRun[]) => void;
}

const ProjectDataContext = createContext<ProjectDataContextType | undefined>(undefined);

export const useProjectData = () => {
  const context = useContext(ProjectDataContext);
  if (context === undefined) {
    throw new Error('useProjectData must be used within a ProjectDataProvider');
  }
  return context;
};

interface ProjectDataProviderProps {
  children: ReactNode;
}

// Known project categories for splitting malformed category strings
const KNOWN_CATEGORIES = ['Appliances', 'Bathroom', 'Ceilings', 'Decks & Patios', 'Doors & Windows', 'Electrical', 'Exterior Carpentry', 'Flooring', 'General Repairs & Maintenance', 'HVAC & Ventilation', 'Insulation & Weatherproofing', 'Interior Carpentry', 'Kitchen', 'Landscaping & Outdoor Projects', 'Lighting & Electrical', 'Masonry & Concrete', 'Painting & Finishing', 'Plumbing', 'Roofing', 'Safety & Security', 'Smart Home & Technology', 'Storage & Organization', 'Tile', 'Walls & Drywall'];

// Helper to split malformed category strings like "TileFlooring" into ["Tile", "Flooring"]
const normalizeCategories = (category: any): string[] => {
  if (Array.isArray(category)) {
    return category.filter(Boolean);
  }
  
  if (!category || typeof category !== 'string') {
    return [];
  }
  
  const trimmed = category.trim();
  if (!trimmed) {
    return [];
  }
  
  // Check if it's already a valid single category
  if (KNOWN_CATEGORIES.includes(trimmed)) {
    return [trimmed];
  }
  
  // Try to split by finding known category names within the string
  const found: string[] = [];
  let remaining = trimmed;
  
  // Sort by length (longest first) to match "Decks & Patios" before "Decks"
  const sortedCategories = [...KNOWN_CATEGORIES].sort((a, b) => b.length - a.length);
  
  // Keep trying to find categories until no more matches
  let changed = true;
  while (changed && remaining.length > 0) {
    changed = false;
    for (const knownCat of sortedCategories) {
      if (remaining.includes(knownCat)) {
        found.push(knownCat);
        remaining = remaining.replace(knownCat, '');
        changed = true;
        break; // Restart from longest after each match
      }
    }
  }
  
  // If we found categories, return them; otherwise return the original as-is
  return found.length > 0 ? found : [trimmed];
};

export const ProjectDataProvider: React.FC<ProjectDataProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { isGuest, guestData } = useGuest();

  // Memoized transform function for projects (synchronous, loads from JSON first)
  // Note: Phases are loaded from the projects.phases JSONB column.
  // This column is kept up-to-date by rebuild_phases_json_from_project_phases function.
  // If phases are empty, they should be rebuilt in the database before loading here.
  const transformProjects = React.useMemo(() => (data: any[]): Project[] => {
    if (!data || !Array.isArray(data)) {
      console.error('❌ transformProjects: data is not an array:', data);
      return [];
    }
    
    return data.map(project => {
      try {
        let phases = [];
        if (project.phases) {
          try {
            let parsedPhases = project.phases;
            
            if (typeof parsedPhases === 'string') {
              parsedPhases = JSON.parse(parsedPhases);
            }
            
            if (typeof parsedPhases === 'string') {
              console.warn('Phases were double-encoded for project:', project.name);
              parsedPhases = JSON.parse(parsedPhases);
            }
            
            phases = parsedPhases;
          } catch (e) {
            console.error('Failed to parse phases JSON for project:', project.name, e);
            phases = [];
          }
        }
        
        // Normalize image fields so catalog always has a reliable cover image:
        // - Prefer explicit cover_image when present
        // - Otherwise, if images[] exists, use its first entry as cover_image
        // - Preserve legacy single-image column if present
        const normalizedImages = Array.isArray(project.images)
          ? project.images
          : (project.images ? [project.images] : []);
        const coverImage =
          project.cover_image ??
          (normalizedImages.length > 0 ? normalizedImages[0] : null);

        return {
          id: project.id,
          name: project.name,
          description: project.description || '',
          projectChallenges: project.project_challenges,
          instructionsDataSources: project.instructions_data_sources,
          projectType: project.project_type?.toLowerCase() === 'secondary' ? 'Secondary' : 'Primary',
          image: project.image,
          images: normalizedImages,
          cover_image: coverImage,
          createdAt: project.created_at ? new Date(project.created_at) : new Date(),
          updatedAt: project.updated_at ? new Date(project.updated_at) : new Date(),
          startDate: project.start_date ? new Date(project.start_date) : new Date(),
          planEndDate: project.plan_end_date ? new Date(project.plan_end_date) : new Date(),
          endDate: project.end_date ? new Date(project.end_date) : undefined,
          status: 'not-started' as const, // Projects don't have status - only project_runs do
          publishStatus: project.publish_status as 'draft' | 'published' | 'beta-testing' | 'archived',
          visibilityStatus: (project as any).visibility_status as 'default' | 'coming-soon' | 'hidden' | undefined,
          release_date: project.release_date ?? undefined,
          category: normalizeCategories(project.category),
          difficulty: project.difficulty,
          effortLevel: project.effort_level as Project['effortLevel'],
          skillLevel: project.skill_level as Project['skillLevel'],
          estimatedTime: project.estimated_time,
          estimatedTotalTime: project.estimated_total_time,
          typicalProjectSize: project.typical_project_size,
          estimatedTimePerUnit: project.estimated_time_per_unit,
          scalingUnit: project.scaling_unit as Project['scalingUnit'],
          phases: Array.isArray(phases) ? phases : [],
          revisionNumber: project.revision_number ?? undefined,
          parentProjectId: project.parent_project_id ?? undefined,
          isPopular: project.is_popular === true,
          isStandardTemplate: project.is_standard === true,
          isFoundational: project.is_foundational === true,
          foundationProjectId: project.foundation_project_id ?? null,
        };
      } catch (e) {
        console.error('❌ transformProjects: Error transforming project:', project?.name, project?.id, e);
        // Return null to filter out later, or return a minimal valid project
        return null as any;
      }
    }).filter((p): p is Project => p !== null); // Filter out nulls from errors
  }, []);

  // Memoized transform function for project runs (includes phase_ratings / photos for analytics)
  const transformProjectRuns = React.useMemo(() => (data: any[]): ProjectRun[] => {
    return data
      .map((run) => projectRunFromSupabaseRow(run as Record<string, unknown>))
      .filter((run): run is ProjectRun => run !== null);
  }, []);

  // Fetch projects data
  // Projects table stores all template revisions; frontend applies visibility and publish filters.
  const {
    data: projects,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
    mutate: updateProjectsCache
  } = useDataFetch<Project>({
    table: 'projects',
    select: '*',
    orderBy: { column: 'updated_at', ascending: false },
    transform: transformProjects,
    cacheKey: 'projects',
    enabled: true // Explicitly enable
  });

  React.useEffect(() => {
    if (projectsError) {
      console.error('ProjectDataContext: Error fetching projects:', projectsError);
    }
  }, [projectsError]);

  // Listen for refetch requests from cascade operations
  useEffect(() => {
    const handleRefetchRequest = () => {
      refetchProjects();
    };

    window.addEventListener('refetch-projects', handleRefetchRequest);
    return () => window.removeEventListener('refetch-projects', handleRefetchRequest);
  }, [refetchProjects]);

  // Fetch project runs data - only when authenticated
  const shouldFetchProjectRuns = !isGuest && !!user;

  const {
    data: projectRuns,
    loading: projectRunsLoading,
    error: projectRunsError,
    refetch: refetchProjectRuns,
    mutate: updateProjectRunsCache
  } = useDataFetch<ProjectRun>({
    table: 'project_runs',
    select: '*',
    filters: shouldFetchProjectRuns ? [{ column: 'user_id', value: user.id }] : [],
    orderBy: { column: 'created_at', ascending: false },
    transform: transformProjectRuns,
    dependencies: [user?.id, shouldFetchProjectRuns],
    cacheKey: shouldFetchProjectRuns ? `project_runs_${user.id}` : undefined,
    enabled: shouldFetchProjectRuns
  });

  const value = {
    projects,
    projectRuns: isGuest ? guestData.projectRuns : projectRuns,
    loading: projectsLoading || (shouldFetchProjectRuns ? projectRunsLoading : false),
    error: projectsError || (shouldFetchProjectRuns ? projectRunsError : null),
    refetchProjects,
    refetchProjectRuns,
    updateProjectsCache,
    updateProjectRunsCache
  };

  return (
    <ProjectDataContext.Provider value={value}>
      {children}
    </ProjectDataContext.Provider>
  );
};
