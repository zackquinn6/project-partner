import { ProjectRun } from '@/interfaces/ProjectRun';
// Removed deprecated addStandardPhasesToProjectRun import - project runs already have standard phases

interface NeedDate {
  itemId: string;
  itemName: string;
  itemType: 'material' | 'tool';
  startDate: Date | null;
  endDate: Date | null;
  stepIds: string[];
}

interface ScheduleWarning {
  itemId: string;
  itemName: string;
  itemType: 'material' | 'tool';
  message: string;
  oldStart?: Date;
  oldEnd?: Date;
  newStart?: Date;
  newEnd?: Date;
  daysChange?: number;
}

interface ScheduleSnapshot {
  timestamp: number;
  needDates: NeedDate[];
}

/**
 * Extracts need-dates for all tools and materials based on scheduled events
 */
export function extractNeedDatesFromSchedule(projectRun: ProjectRun): NeedDate[] {
  const scheduleEvents = projectRun.schedule_events?.events || [];
  
  if (!scheduleEvents || scheduleEvents.length === 0) {
    return [];
  }

  const materialLeadTimes = projectRun.shopping_checklist_data?.materialLeadTimes;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const materialDates = new Map<string, { name: string; dates: Date[]; stepIds: string[] }>();
  const toolDates = new Map<string, { name: string; dates: Date[]; stepIds: string[] }>();

  // Process each scheduled event
  scheduleEvents.forEach((event: any) => {
    if (!event.stepId || !event.start) return;

    const eventStart = new Date(event.start);
    const eventEnd = event.end ? new Date(event.end) : eventStart;

    // Find the step in the project phases to get its materials and tools
    // Project runs already have standard phases from the database, no need to add them
    const processedPhases = projectRun.phases || [];
    
    processedPhases.forEach((phase) => {
      phase.operations?.forEach((operation) => {
        operation.steps?.forEach((step) => {
          const stepId = step.id || `step-${phase.id}-${operation.id}-${step.step}`;
          
          if (stepId === event.stepId) {
            // Process materials
            step.materials?.forEach((material) => {
              const key = material.id || material.name;
              if (!materialDates.has(key)) {
                materialDates.set(key, { name: material.name, dates: [], stepIds: [] });
              }
              const entry = materialDates.get(key)!;
              entry.dates.push(eventStart);
              entry.stepIds.push(stepId);
            });

            // Process tools
            step.tools?.forEach((tool) => {
              const key = tool.id || tool.name;
              if (!toolDates.has(key)) {
                toolDates.set(key, { name: tool.name, dates: [], stepIds: [] });
              }
              const entry = toolDates.get(key)!;
              entry.dates.push(eventStart, eventEnd);
              entry.stepIds.push(stepId);
            });
          }
        });
      });
    });
  });

  const needDates: NeedDate[] = [];

  // Materials: needed by the earliest date
  materialDates.forEach((data, itemId) => {
    const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime());

    const leadDaysRaw = materialLeadTimes ? materialLeadTimes[itemId] : undefined;
    let leadDays = 0;
    if (typeof leadDaysRaw === 'number' && !Number.isNaN(leadDaysRaw)) {
      leadDays = leadDaysRaw;
    }

    const orderingReadyDate = sortedDates[0] ? new Date(sortedDates[0].getTime() - (leadDays * MS_PER_DAY)) : null;
    needDates.push({
      itemId,
      itemName: data.name,
      itemType: 'material',
      startDate: orderingReadyDate,
      endDate: null,
      stepIds: [...new Set(data.stepIds)]
    });
  });

  // Tools: need between first and last usage
  toolDates.forEach((data, itemId) => {
    const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime());
    needDates.push({
      itemId,
      itemName: data.name,
      itemType: 'tool',
      startDate: sortedDates[0],
      endDate: sortedDates[sortedDates.length - 1],
      stepIds: [...new Set(data.stepIds)]
    });
  });

  return needDates;
}

/**
 * Compares current schedule with previous snapshot and generates warnings
 */
export function detectScheduleChanges(
  currentNeedDates: NeedDate[],
  previousSnapshot: ScheduleSnapshot | null
): ScheduleWarning[] {
  if (!previousSnapshot || !previousSnapshot.needDates) {
    return [];
  }

  const warnings: ScheduleWarning[] = [];
  const previousMap = new Map(
    previousSnapshot.needDates.map(nd => [nd.itemId, nd])
  );

  currentNeedDates.forEach(current => {
    const previous = previousMap.get(current.itemId);
    
    if (!previous) return;

    // Check for date changes
    const currentStart = current.startDate?.getTime() || 0;
    const previousStart = previous.startDate?.getTime() || 0;
    const currentEnd = current.endDate?.getTime() || 0;
    const previousEnd = previous.endDate?.getTime() || 0;

    if (current.itemType === 'material') {
      // Materials: check if needed date moved
      if (currentStart !== previousStart) {
        const daysChange = Math.round((currentStart - previousStart) / (1000 * 60 * 60 * 24));
        const direction = daysChange > 0 ? 'later' : 'earlier';
        
        warnings.push({
          itemId: current.itemId,
          itemName: current.itemName,
          itemType: 'material',
          message: `${current.itemName} now needed ${Math.abs(daysChange)} day(s) ${direction}`,
          oldStart: previous.startDate || undefined,
          newStart: current.startDate || undefined,
          daysChange
        });
      }
    } else {
      // Tools: check if rental period changed
      if (currentStart !== previousStart || currentEnd !== previousEnd) {
        const oldDuration = previousEnd - previousStart;
        const newDuration = currentEnd - currentStart;
        const durationChange = Math.round((newDuration - oldDuration) / (1000 * 60 * 60 * 24));
        
        if (durationChange !== 0) {
          const action = durationChange > 0 ? 'extended' : 'shortened';
          warnings.push({
            itemId: current.itemId,
            itemName: current.itemName,
            itemType: 'tool',
            message: `${current.itemName} rental needs to be ${action} by ${Math.abs(durationChange)} day(s)`,
            oldStart: previous.startDate || undefined,
            oldEnd: previous.endDate || undefined,
            newStart: current.startDate || undefined,
            newEnd: current.endDate || undefined,
            daysChange: durationChange
          });
        } else if (currentStart !== previousStart) {
          const daysChange = Math.round((currentStart - previousStart) / (1000 * 60 * 60 * 24));
          const direction = daysChange > 0 ? 'later' : 'earlier';
          warnings.push({
            itemId: current.itemId,
            itemName: current.itemName,
            itemType: 'tool',
            message: `${current.itemName} rental period shifted ${Math.abs(daysChange)} day(s) ${direction}`,
            oldStart: previous.startDate || undefined,
            oldEnd: previous.endDate || undefined,
            newStart: current.startDate || undefined,
            newEnd: current.endDate || undefined,
            daysChange
          });
        }
      }
    }
  });

  return warnings;
}

/**
 * Creates a schedule snapshot for comparison
 */
export function createScheduleSnapshot(needDates: NeedDate[]): ScheduleSnapshot {
  return {
    timestamp: Date.now(),
    needDates: JSON.parse(JSON.stringify(needDates)) // Deep clone
  };
}

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
  // Project runs already have standard phases from the database, no need to add them
  const processedPhases = projectRun.phases || [];
  
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
                alternates: material.alternates || [],
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
                alternates: tool.alternates || [],
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
    // Project runs already have standard phases from the database, no need to add them
    const processedPhases = projectRun.phases || [];
    
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