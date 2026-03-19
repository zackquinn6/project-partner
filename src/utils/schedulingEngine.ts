import { 
  SchedulingInputs, 
  SchedulingResult, 
  Task, 
  Worker, 
  ScheduledTask, 
  RemediationSuggestion,
  TaskStatus,
  TimeSlot,
  SchedulingHeuristics,
  CureDryWindow
} from '@/interfaces/Scheduling';

export class SchedulingEngine {
  private heuristics: SchedulingHeuristics = {
    bufferMapping: {
      '0.9-1.0': 0,      // High confidence: 0% buffer
      '0.75-0.9': 0.1,   // Good confidence: 10% buffer
      '0.6-0.75': 0.2,   // Medium confidence: 20% buffer
      '0.0-0.6': 0.35    // Low confidence: 35% buffer
    },
    nightWorkPenalty: 0.15, // 15% productivity penalty
    helperEfficiency: {
      single: 0.4,         // Single helper reduces time by 40%
      diminishingReturns: 0.2 // Each additional helper adds 20% less benefit
    },
    phaseBuffer: {
      lowConfidenceThreshold: 0.75,
      bufferBlocks: 1
    }
  };

  computeSchedule(inputs: SchedulingInputs): SchedulingResult {
    try {
      // 1. Expand availability into time slots
      const availableSlots = this.expandAvailability(inputs);

      // 2. Validate and sort tasks
      const sortedTasks = this.validateAndSortTasks(inputs.tasks);

      // 3. Apply confidence-based buffers
      const bufferedTasks = this.applyBuffers(sortedTasks, inputs.scheduleTempo);

      // 4. Backwards placement algorithm
      const scheduledTasks = this.backwardsPlacement(
        bufferedTasks, 
        availableSlots, 
        inputs
      );

      // 5. Calculate critical path and slack
      const { criticalPath, slackTimes } = this.calculateCriticalPath(
        scheduledTasks, 
        bufferedTasks
      );

      // 6. Generate remediation suggestions
      const remediations = this.generateRemediations(
        scheduledTasks, 
        bufferedTasks, 
        inputs
      );

      // 7. Detect warnings
      const warnings = this.detectWarnings(scheduledTasks, inputs);

      const totalDuration = this.calculateTotalDuration(scheduledTasks);

      return {
        scheduledTasks,
        criticalPath,
        totalDuration,
        remediations,
        warnings,
        slackTimes
      };
    } catch (error) {
      console.error('Scheduling error:', error);
      return {
        scheduledTasks: [],
        criticalPath: [],
        totalDuration: 0,
        remediations: [],
        warnings: ['Failed to generate schedule. Please check inputs and try again.'],
        slackTimes: {}
      };
    }
  }

  private expandAvailability(inputs: SchedulingInputs): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const searchLimit = new Date(inputs.targetCompletionDate);
    searchLimit.setDate(searchLimit.getDate() - 90); // Search 90 days back

    inputs.workers.forEach(worker => {
      worker.availability.forEach(slot => {
        // Generate recurring slots based on worker availability
        let currentDate = new Date(Math.max(searchLimit.getTime(), slot.start.getTime()));
        
        while (currentDate <= inputs.targetCompletionDate) {
          // Check if this date is a blackout date
          const isBlackout = inputs.blackoutDates.some(blackout =>
            blackout.toDateString() === currentDate.toDateString()
          );

          if (!isBlackout && this.isWorkingDay(currentDate, inputs.siteConstraints)) {
            slots.push({
              start: new Date(currentDate),
              end: new Date(currentDate.getTime() + (slot.end.getTime() - slot.start.getTime())),
              workerId: worker.id,
              isAvailable: true
            });
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
    });

    return slots.sort((a, b) => b.start.getTime() - a.start.getTime()); // Latest first
  }

  private validateAndSortTasks(tasks: Task[]): Task[] {
    // Topological sort to detect cycles and establish dependency order
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const sorted: Task[] = [];

    const visit = (taskId: string): boolean => {
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected involving task: ${taskId}`);
      }
      if (visited.has(taskId)) return true;

      visiting.add(taskId);
      
      const task = tasks.find(t => t.id === taskId);
      if (!task) return false;

      // Visit all dependencies first
      for (const depId of task.dependencies) {
        if (!visit(depId)) {
          throw new Error(`Missing dependency: ${depId} for task: ${taskId}`);
        }
      }

      visiting.delete(taskId);
      visited.add(taskId);
      sorted.push(task);
      
      return true;
    };

    // Visit all tasks
    for (const task of tasks) {
      visit(task.id);
    }

    return sorted.reverse(); // Reverse for backwards placement
  }

  private applyBuffers(tasks: Task[], scheduleTempo: string): Task[] {
    const tempoMultiplier = {
      extended: 1.5,      // More breathing room
      steady: 1.0,        // Balanced
      fast_track: 0.7     // Tight schedule
    }[scheduleTempo] || 1.0;

    return tasks.map(task => {
      const confidence = task.confidence ?? 0.7;
      let bufferPercent = 0;

      // Find matching buffer range
      for (const [range, buffer] of Object.entries(this.heuristics.bufferMapping)) {
        const [min, max] = range.split('-').map(parseFloat);
        if (confidence >= min && confidence <= max) {
          bufferPercent = buffer;
          break;
        }
      }

      const adjustedBuffer = bufferPercent * tempoMultiplier;
      const bufferedHours = task.estimatedHours * (1 + adjustedBuffer);

      return {
        ...task,
        estimatedHours: bufferedHours
      };
    });
  }

  private backwardsPlacement(
    tasks: Task[], 
    availableSlots: TimeSlot[], 
    inputs: SchedulingInputs
  ): ScheduledTask[] {
    const scheduledTasks: ScheduledTask[] = [];
    const reservedSlots = new Set<string>();

    const taskStartTimes = new Map<string, Date>();

    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    const taskById = new Map(tasks.map(t => [t.id, t]));

    // Build reverse dependency index: for a given prerequisite, list tasks that depend on it.
    const dependentsByPrerequisite = new Map<string, string[]>();
    for (const t of tasks) {
      for (const depId of t.dependencies) {
        const existing = dependentsByPrerequisite.get(depId);
        if (existing) {
          existing.push(t.id);
        } else {
          dependentsByPrerequisite.set(depId, [t.id]);
        }
      }
    }

    const dropDead = inputs.dropDeadDate || inputs.targetCompletionDate;

    for (const task of tasks) {
      // Determine worker type required
      const workerType = this.getRequiredWorkerType(task, inputs);

      const taskDurationMs = task.estimatedHours * 60 * 60 * 1000;

      // Latest time this task is allowed to END so all already-scheduled dependents
      // can START without violating material lead time.
      let latestAllowedEnd = new Date(dropDead);
      const dependents = dependentsByPrerequisite.get(task.id) || [];

      for (const dependentId of dependents) {
        const dependentStart = taskStartTimes.get(dependentId);
        if (!dependentStart) continue;

        const dependentTask = taskById.get(dependentId);
        if (!dependentTask) continue;

        const leadDaysRaw = dependentTask.materialLeadTimeDays;
        let leadDays = 0;
        if (typeof leadDaysRaw === 'number' && !Number.isNaN(leadDaysRaw)) {
          leadDays = leadDaysRaw;
        }
        const lagMs = leadDays * MS_PER_DAY;

        // Constraint: dependentStart >= prerequisiteEnd + leadTime(dependent)
        // => prerequisiteEnd <= dependentStart - leadTime(dependent)
        const allowedEnd = new Date(dependentStart.getTime() - lagMs);
        if (allowedEnd < latestAllowedEnd) {
          latestAllowedEnd = allowedEnd;
        }
      }

      const latestStart = new Date(latestAllowedEnd.getTime() - taskDurationMs);
      
      // Find contiguous slots that can accommodate this task
      const suitableSlots = this.findSuitableSlots(
        task, 
        availableSlots, 
        workerType, 
        latestStart, 
        reservedSlots, 
        inputs
      );

      if (suitableSlots.length > 0) {
        // Schedule the task in the latest suitable slot
        const selectedSlot = suitableSlots[0];
        const endTime = new Date(selectedSlot.start.getTime() + taskDurationMs);
        
        const scheduledTask: ScheduledTask = {
          taskId: task.id,
          workerId: selectedSlot.workerId,
          startTime: selectedSlot.start,
          endTime,
          targetCompletionDate: endTime,
          latestCompletionDate: latestAllowedEnd,
          status: 'confirmed',
          bufferApplied: this.calculateAppliedBuffer(task)
        };

        scheduledTasks.push(scheduledTask);
        taskStartTimes.set(task.id, selectedSlot.start);
        
        // Reserve the slot
        reservedSlots.add(`${selectedSlot.workerId}-${selectedSlot.start.getTime()}`);
      } else {
        // Cannot schedule - mark as conflict
        const latestCompletion = latestAllowedEnd;
        const conflictTask: ScheduledTask = {
          taskId: task.id,
          workerId: inputs.workers[0]?.id || 'unknown',
          startTime: new Date(),
          endTime: new Date(),
          targetCompletionDate: new Date(),
          latestCompletionDate: latestCompletion,
          status: 'conflict',
          bufferApplied: 0
        };
        
        scheduledTasks.push(conflictTask);
      }
    }

    return scheduledTasks;
  }

  private findLatestStartTime(
    task: Task, 
    completionTimes: Map<string, Date>, 
    targetDate: Date
  ): Date {
    let latestStart = targetDate;

    // Check all dependent tasks
    for (const depId of task.dependencies) {
      const depCompletion = completionTimes.get(depId);
      if (depCompletion && depCompletion < latestStart) {
        latestStart = depCompletion;
      }
    }

    return latestStart;
  }

  private findSuitableSlots(
    task: Task, 
    slots: TimeSlot[], 
    workerType: 'owner' | 'helper', 
    latestStart: Date,
    reservedSlots: Set<string>,
    inputs: SchedulingInputs
  ): TimeSlot[] {
    const suitableSlots: TimeSlot[] = [];
    const taskDurationMs = task.estimatedHours * 60 * 60 * 1000;

    for (const slot of slots) {
      // Check if slot is before latest start time
      if (slot.start > latestStart) continue;

      // Check if slot is reserved
      const slotKey = `${slot.workerId}-${slot.start.getTime()}`;
      if (reservedSlots.has(slotKey)) continue;

      // Check if worker matches required type
      const worker = inputs.workers.find(w => w.id === slot.workerId);
      if (!worker || worker.type !== workerType) continue;

      // Check if slot can accommodate task duration and contiguous hours
      const slotDurationMs = slot.end.getTime() - slot.start.getTime();
      if (slotDurationMs >= taskDurationMs && 
          slotDurationMs >= task.minContiguousHours * 60 * 60 * 1000) {
        
        // Check site constraints (noise, time of day, etc.)
        if (this.respectsSiteConstraints(task, slot, inputs.siteConstraints)) {
          suitableSlots.push(slot);
        }
      }
    }

    return suitableSlots;
  }

  private calculateCriticalPath(
    scheduledTasks: ScheduledTask[], 
    tasks: Task[]
  ): { criticalPath: string[], slackTimes: Record<string, number> } {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const scheduledMap = new Map(scheduledTasks.map(st => [st.taskId, st]));
    
    // Calculate earliest start times (forward pass)
    const earliestStart = new Map<string, number>();
    const earliestFinish = new Map<string, number>();
    
    for (const task of tasks) {
      const scheduled = scheduledMap.get(task.id);
      if (!scheduled || scheduled.status !== 'confirmed') continue;
      
      const leadDaysRaw = task.materialLeadTimeDays;
      let leadDays = 0;
      if (typeof leadDaysRaw === 'number' && !Number.isNaN(leadDaysRaw)) {
        leadDays = leadDaysRaw;
      }
      const leadHours = leadDays * 24;

      let maxDependencyFinish = 0;
      for (const depId of task.dependencies) {
        const depFinish = earliestFinish.get(depId);
        const safeDepFinish = typeof depFinish === 'number' ? depFinish : 0;
        // Constraint: task.start >= dep.finish + leadTime(task)
        const candidate = safeDepFinish + leadHours;
        maxDependencyFinish = Math.max(maxDependencyFinish, candidate);
      }
      
      earliestStart.set(task.id, maxDependencyFinish);
      earliestFinish.set(task.id, maxDependencyFinish + task.estimatedHours);
    }
    
    // Calculate latest start times (backward pass)
    const latestStart = new Map<string, number>();
    const latestFinish = new Map<string, number>();
    const projectEnd = Math.max(...Array.from(earliestFinish.values()));
    
    // Initialize all latest finishes to project end
    for (const task of tasks) {
      latestFinish.set(task.id, projectEnd);
    }
    
    // Backward pass
    for (let i = tasks.length - 1; i >= 0; i--) {
      const task = tasks[i];
      const scheduled = scheduledMap.get(task.id);
      if (!scheduled || scheduled.status !== 'confirmed') continue;
      
      // Find minimum latest start of dependent tasks
      let minLatestFinish = projectEnd;
      for (const otherTask of tasks) {
        if (otherTask.dependencies.includes(task.id)) {
          const dependentLatestStart = latestStart.get(otherTask.id);
          const safeDependentLatestStart = typeof dependentLatestStart === 'number' ? dependentLatestStart : projectEnd;

          const leadDaysRaw = otherTask.materialLeadTimeDays;
          let leadDays = 0;
          if (typeof leadDaysRaw === 'number' && !Number.isNaN(leadDaysRaw)) {
            leadDays = leadDaysRaw;
          }
          const leadHours = leadDays * 24;

          // Constraint: prerequisiteEnd <= dependentStart - leadTime(dependent)
          const candidateLatestFinish = safeDependentLatestStart - leadHours;
          minLatestFinish = Math.min(minLatestFinish, candidateLatestFinish);
        }
      }
      
      latestFinish.set(task.id, minLatestFinish);
      latestStart.set(task.id, minLatestFinish - task.estimatedHours);
    }
    
    // Calculate slack times and identify critical path
    const criticalPath: string[] = [];
    const slackTimes: Record<string, number> = {};
    
    for (const task of tasks) {
      const es = earliestStart.get(task.id) || 0;
      const ls = latestStart.get(task.id) || 0;
      const slack = ls - es;
      
      slackTimes[task.id] = slack;
      
      if (Math.abs(slack) < 0.1) { // Critical path tasks have near-zero slack
        criticalPath.push(task.id);
      }
    }

    return { criticalPath, slackTimes };
  }

  private generateRemediations(
    scheduledTasks: ScheduledTask[], 
    tasks: Task[], 
    inputs: SchedulingInputs
  ): RemediationSuggestion[] {
    const remediations: RemediationSuggestion[] = [];
    const conflictTasks = scheduledTasks.filter(st => st.status === 'conflict');

    if (conflictTasks.length > 0) {
      // Suggest adding helpers
      remediations.push({
        type: 'add_helper',
        description: `Add a helper to complete ${conflictTasks.length} conflicting tasks`,
        impact: {
          timeSaved: conflictTasks.length * 8, // Estimate
          costEstimate: 500, // Rough estimate
          feasibilityScore: 0.8
        }
      });

      // Suggest allowing night work
      if (!inputs.siteConstraints.allowNightWork) {
        remediations.push({
          type: 'allow_night_work',
          description: 'Allow evening work (with 15% productivity penalty)',
          impact: {
            timeSaved: conflictTasks.length * 4,
            feasibilityScore: 0.6
          }
        });
      }

      // Suggest extending deadline
      remediations.push({
        type: 'extend_date',
        description: 'Extend target completion by 1-2 weeks',
        impact: {
          timeSaved: 0,
          feasibilityScore: 0.9
        }
      });
    }

    return remediations;
  }

  private detectWarnings(scheduledTasks: ScheduledTask[], inputs: SchedulingInputs): string[] {
    const warnings: string[] = [];

    // Check for tight scheduling
    const conflictCount = scheduledTasks.filter(st => st.status === 'conflict').length;
    if (conflictCount > 0) {
      warnings.push(`${conflictCount} tasks cannot be scheduled within target date`);
    }

    // Check for night work
    const nightWork = scheduledTasks.some(st => {
      const hour = st.startTime.getHours();
      return hour < 7 || hour > 22;
    });
    
    if (nightWork) {
      warnings.push('Schedule includes evening/early morning work');
    }

    return warnings;
  }

  private calculateTotalDuration(scheduledTasks: ScheduledTask[]): number {
    if (scheduledTasks.length === 0) return 0;
    
    const confirmedTasks = scheduledTasks.filter(st => st.status === 'confirmed');
    if (confirmedTasks.length === 0) return 0;

    const startTime = Math.min(...confirmedTasks.map(st => st.startTime.getTime()));
    const endTime = Math.max(...confirmedTasks.map(st => st.endTime.getTime()));
    
    return (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
  }

  // Helper methods
  private getRequiredWorkerType(task: Task, inputs: SchedulingInputs): 'owner' | 'helper' {
    // Determine worker type based on task tags or user preference
    if (inputs.preferHelpers && inputs.workers.some(w => w.type === 'helper')) {
      return 'helper';
    }
    return 'owner';
  }

  private isWorkingDay(date: Date, constraints: any): boolean {
    const dayOfWeek = date.getDay();
    
    if (constraints.weekendsOnly) {
      return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    }
    
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
  }

  private respectsSiteConstraints(task: Task, slot: TimeSlot, constraints: any): boolean {
    // Check noise constraints
    if (task.tags.includes('noisy') && constraints.noiseCurfew) {
      const hour = slot.start.getHours();
      const curfewHour = parseInt(constraints.noiseCurfew.split(':')[0]);
      if (hour >= curfewHour) return false;
    }

    // Check night work allowance
    if (!constraints.allowNightWork) {
      const hour = slot.start.getHours();
      if (hour < 7 || hour > 22) return false;
    }

    return true;
  }

  private calculateAppliedBuffer(task: Task): number {
    const confidence = task.confidence ?? 0.7;
    
    for (const [range, buffer] of Object.entries(this.heuristics.bufferMapping)) {
      const [min, max] = range.split('-').map(parseFloat);
      if (confidence >= min && confidence <= max) {
        return buffer * 100; // Return as percentage
      }
    }
    
    return 0;
  }

  // Public API for simulations
  simulateChange(inputs: SchedulingInputs, changes: Partial<SchedulingInputs>): SchedulingResult {
    const modifiedInputs = { ...inputs, ...changes };
    return this.computeSchedule(modifiedInputs);
  }

  commitSchedule(result: SchedulingResult): void {
    // In a real implementation, this would persist the schedule
    console.log('Schedule committed:', result);
  }
}

export const schedulingEngine = new SchedulingEngine();