import { ProjectRun } from '@/interfaces/ProjectRun';
import { addStandardPhasesToProjectRun } from './projectUtils';

/**
 * Determines if shopping is needed after a project replan by comparing
 * current tools/materials with what was previously needed
 */
export function isShoppingNeededAfterReplan(
  currentProjectRun: ProjectRun,
  previousToolsAndMaterials?: { tools: any[], materials: any[] }
): boolean {
  if (!previousToolsAndMaterials) {
    return true; // First time, shopping is needed
  }

  const currentRequirements = extractProjectToolsAndMaterials(currentProjectRun);
  
  // Check if any new materials are needed
  const newMaterials = currentRequirements.materials.filter(currentMaterial => 
    !previousToolsAndMaterials.materials.some(prevMaterial => 
      prevMaterial.name === currentMaterial.name
    )
  );

  // Check if any new tools are needed
  const newTools = currentRequirements.tools.filter(currentTool => 
    !previousToolsAndMaterials.tools.some(prevTool => 
      prevTool.name === currentTool.name
    )
  );

  return newMaterials.length > 0 || newTools.length > 0;
}

/**
 * Extracts all tools and materials needed for a project run
 */
export function extractProjectToolsAndMaterials(projectRun: ProjectRun) {
  const processedPhases = addStandardPhasesToProjectRun(projectRun.phases || []);
  
  const materialsMap = new Map<string, any>();
  const toolsMap = new Map<string, any>();
  
  processedPhases.forEach((phase, phaseIndex) => {
    if (!phase.operations || !Array.isArray(phase.operations)) {
      return;
    }
    
    phase.operations.forEach((operation, opIndex) => {
      if (!operation.steps || !Array.isArray(operation.steps)) {
        return;
      }
      
      operation.steps.forEach((step, stepIndex) => {
        // Process materials - add quantities (materials are consumed per step)
        if (step.materials && Array.isArray(step.materials) && step.materials.length > 0) {
          step.materials.forEach((material, materialIndex) => {
            const key = material.id || material.name || `material-${materialIndex}-${Date.now()}`;
            if (materialsMap.has(key)) {
              const existing = materialsMap.get(key);
              existing.totalQuantity = (existing.totalQuantity || 1) + 1;
            } else {
              const newMaterial = {
                id: material.id || key,
                name: material.name,
                description: material.description || '',
                category: material.category || 'Other',
                required: material.required !== false,
                totalQuantity: 1,
              };
              materialsMap.set(key, newMaterial);
            }
          });
        }

        // Process tools - track max quantity needed in any single step (tools are reused)
        if (step.tools && Array.isArray(step.tools) && step.tools.length > 0) {
          step.tools.forEach((tool, toolIndex) => {
            const key = tool.id || tool.name || `tool-${toolIndex}-${Date.now()}`;
            const toolQuantity = 1; // Default quantity per step
            
            if (toolsMap.has(key)) {
              const existing = toolsMap.get(key);
              existing.maxQuantity = Math.max(existing.maxQuantity || 1, toolQuantity);
            } else {
              const newTool = {
                id: tool.id || key,
                name: tool.name,
                description: tool.description || '',
                category: tool.category || 'Other',
                required: tool.required !== false,
                maxQuantity: toolQuantity,
              };
              toolsMap.set(key, newTool);
            }
          });
        }
      });
    });
  });
  
  return {
    materials: Array.from(materialsMap.values()),
    tools: Array.from(toolsMap.values())
  };
}

/**
 * Marks the ordering step as incomplete if shopping is needed
 */
export function markOrderingStepIncompleteIfNeeded(
  projectRun: ProjectRun,
  completedSteps: Set<string>,
  setCompletedSteps: (steps: Set<string>) => void,
  previousToolsAndMaterials?: { tools: any[], materials: any[] }
): boolean {
  const shoppingNeeded = isShoppingNeededAfterReplan(projectRun, previousToolsAndMaterials);
  
  if (shoppingNeeded) {
    // Find ordering step and mark as incomplete
    const processedPhases = addStandardPhasesToProjectRun(projectRun.phases || []);
    
    processedPhases.forEach((phase, phaseIndex) => {
      if (!phase.operations || !Array.isArray(phase.operations)) {
        return;
      }
      
      phase.operations.forEach((operation, opIndex) => {
        if (!operation.steps || !Array.isArray(operation.steps)) {
          return;
        }
        
        operation.steps.forEach((step, stepIndex) => {
          if (step.step === 'Tool & Material Ordering' || 
              step.id === 'ordering-step-1' ||
              step.step?.toLowerCase().includes('ordering')) {
            const stepId = step.id || `step-${phaseIndex}-${opIndex}-${stepIndex}`;
            
            // Remove from completed steps if it was previously completed
            const newCompletedSteps = new Set(completedSteps);
            newCompletedSteps.delete(stepId);
            setCompletedSteps(newCompletedSteps);
            
            console.log('🛒 Shopping needed after replan - marked ordering step as incomplete:', stepId);
          }
        });
      });
    });
  }
  
  return shoppingNeeded;
}