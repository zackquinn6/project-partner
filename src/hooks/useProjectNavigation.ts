import { useCallback } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { ProjectRun } from '@/interfaces/ProjectRun';

/**
 * Centralized project navigation handler
 * Ensures consistent, single-click navigation between projects and workflow
 */
export function useProjectNavigation() {
  const { setCurrentProjectRun } = useProject();

  const navigateToProject = useCallback((
    projectRun: ProjectRun,
    onNavigate?: (mode: 'workflow') => void
  ) => {
    console.log('🎯 useProjectNavigation: Starting navigation to:', projectRun.name);
    
    // 1. Set project run immediately (synchronous)
    setCurrentProjectRun(projectRun);
    
    // 2. Clear any conflicting URL state
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // 3. Signal navigation mode change (synchronous)
    if (onNavigate) {
      console.log('🎯 useProjectNavigation: Calling onNavigate with workflow mode');
      onNavigate('workflow');
    }
    
    console.log('🎯 useProjectNavigation: Navigation completed for:', projectRun.name);
  }, [setCurrentProjectRun]);

  return { navigateToProject };
}