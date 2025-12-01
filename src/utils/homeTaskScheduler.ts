interface Task {
  id: string;
  title: string;
  diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  priority?: 'high' | 'medium' | 'low';
  ordered?: boolean;
  subtasks: Subtask[];
  due_date?: string | null;
}

interface Subtask {
  id: string;
  title: string;
  estimated_hours: number;
  diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
}

interface Person {
  id: string;
  name: string;
  available_hours: number;
  available_days: string[];
  consecutive_days: number;
  diy_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  hourly_rate?: number;
  not_available_dates?: string[];
}

interface Assignment {
  taskId: string;
  taskTitle: string;
  subtaskId: string | null;
  subtaskTitle: string;
  personId: string;
  personName: string;
  scheduledDate: Date;
  scheduledHours: number;
}

interface ScheduleResult {
  assignments: Assignment[];
  unassigned: Array<{ taskId: string; taskTitle: string; subtaskId: string | null; reason: string }>;
  professionalTasks: Array<{ taskId: string; taskTitle: string; subtaskId: string | null; subtaskTitle: string; dueDate: string | null }>;
  warnings: string[];
}

const DAY_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function canPersonDoTask(person: Person, taskDiyLevel: 'beginner' | 'intermediate' | 'advanced' | 'pro'): boolean {
  const diyLevels = { beginner: 1, intermediate: 2, advanced: 3, pro: 4 };
  return diyLevels[person.diy_level] >= diyLevels[taskDiyLevel];
}

function getSkillMatchScore(person: Person, taskDiyLevel: 'beginner' | 'intermediate' | 'advanced' | 'pro'): number {
  // Perfect match = 4, one level up = 3, two levels up = 2, etc.
  const diyLevels = { beginner: 1, intermediate: 2, advanced: 3, pro: 4 };
  const gap = diyLevels[person.diy_level] - diyLevels[taskDiyLevel];
  return Math.max(0, 4 - gap);
}

interface ExistingAssignment {
  task_id: string;
  subtask_id: string | null;
  person_id: string;
  scheduled_date: string;
  scheduled_hours: number;
}

export function scheduleHomeTasksOptimized(
  tasks: Task[],
  people: Person[],
  startDate: Date = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  })(),
  existingAssignments: ExistingAssignment[] = []
): ScheduleResult {
  const assignments: Assignment[] = [];
  const unassigned: Array<{ taskId: string; taskTitle: string; subtaskId: string | null; reason: string }> = [];
  const professionalTasks: Array<{ taskId: string; taskTitle: string; subtaskId: string | null; subtaskTitle: string; dueDate: string | null }> = [];
  const warnings: string[] = [];

  if (people.length === 0) {
    warnings.push('No team members available. Add people to enable scheduling.');
    return { assignments: [], unassigned: [], professionalTasks: [], warnings };
  }

  // Create a map of existing assignments by subtask/task
  const manualAssignments = new Map<string, ExistingAssignment>();
  for (const assignment of existingAssignments) {
    const key = assignment.subtask_id || assignment.task_id;
    manualAssignments.set(key, assignment);
  }

  // Convert existing manual assignments to Assignment format
  // Only include assignments on or after the startDate - never in the past
  const startDateMidnight = new Date(startDate);
  startDateMidnight.setHours(0, 0, 0, 0);
  
  for (const [key, manualAssignment] of manualAssignments) {
    const task = tasks.find(t => t.id === manualAssignment.task_id);
    if (!task) continue;

    const person = people.find(p => p.id === manualAssignment.person_id);
    if (!person) continue;

    const assignmentDate = new Date(manualAssignment.scheduled_date);
    assignmentDate.setHours(0, 0, 0, 0);
    
    // Skip assignments in the past - only include assignments on or after startDate
    if (assignmentDate < startDateMidnight) {
      continue;
    }

    let subtaskTitle = task.title;
    if (manualAssignment.subtask_id) {
      const subtask = task.subtasks.find(st => st.id === manualAssignment.subtask_id);
      if (subtask) subtaskTitle = subtask.title;
    }

    assignments.push({
      taskId: manualAssignment.task_id,
      taskTitle: task.title,
      subtaskId: manualAssignment.subtask_id,
      subtaskTitle,
      personId: person.id,
      personName: person.name,
      scheduledDate: new Date(manualAssignment.scheduled_date),
      scheduledHours: manualAssignment.scheduled_hours
    });
  }

  // Flatten tasks into work units
  interface WorkUnit {
    taskId: string;
    taskTitle: string;
    subtaskId: string | null;
    subtaskTitle: string;
    hours: number;
    diyLevel: 'beginner' | 'intermediate' | 'advanced' | 'pro';
    priority: 'high' | 'medium' | 'low';
    ordered: boolean;
    orderIndex?: number;
    dependsOn?: string | null; // subtaskId that must be completed first
  }

  const workUnits: WorkUnit[] = [];
  
  for (const task of tasks) {
    const taskPriority = task.priority || 'medium';
    const taskOrdered = task.ordered || false;
    
    if (task.subtasks.length > 0) {
      for (let i = 0; i < task.subtasks.length; i++) {
        const subtask = task.subtasks[i];
        const prevSubtask = i > 0 ? task.subtasks[i - 1] : null;
        
        // Skip if manually assigned
        if (manualAssignments.has(subtask.id)) continue;
        
        workUnits.push({
          taskId: task.id,
          taskTitle: task.title,
          subtaskId: subtask.id,
          subtaskTitle: subtask.title,
          hours: subtask.estimated_hours,
          diyLevel: subtask.diy_level,
          priority: taskPriority,
          ordered: taskOrdered,
          orderIndex: i,
          dependsOn: taskOrdered && prevSubtask ? prevSubtask.id : null
        });
      }
    } else {
      // Task with no subtasks - check if manually assigned
      if (manualAssignments.has(task.id)) continue;
      
      // Task with no subtasks - estimate as 1 hour task
      workUnits.push({
        taskId: task.id,
        taskTitle: task.title,
        subtaskId: null,
        subtaskTitle: task.title,
        hours: 1,
        diyLevel: task.diy_level,
        priority: taskPriority,
        ordered: false,
        orderIndex: 0,
        dependsOn: null
      });
    }
  }

  // Sort work units by priority first, then by DIY level for optimal assignment
  workUnits.sort((a, b) => {
    // Priority: high > medium > low
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then by DIY level (pro first)
    const diyOrder = { pro: 4, advanced: 3, intermediate: 2, beginner: 1 };
    return diyOrder[b.diyLevel] - diyOrder[a.diyLevel];
  });

  // Track person availability
  interface PersonAvailability {
    personId: string;
    person: Person;
    availableHoursByDay: Map<string, number>; // date string -> hours
    lastWorkDay: Date | null;
    consecutiveDaysWorked: number;
  }

  const availability: PersonAvailability[] = people.map(person => ({
    personId: person.id,
    person,
    availableHoursByDay: new Map(),
    lastWorkDay: null,
    consecutiveDaysWorked: 0
  }));

  // Track completed work units (by subtaskId) for ordered dependencies
  const completedSubtasks = new Set<string>();
  const subtaskCompletionDates = new Map<string, Date>();

  // Initialize availability for next 90 days (starting day after startDate)
  const currentDate = new Date(startDate);
  for (let dayOffset = 1; dayOffset < 91; dayOffset++) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + dayOffset);
    const dayName = DAY_ORDER[date.getDay()].toLowerCase();
    const dateStr = date.toISOString().split('T')[0];

    for (const avail of availability) {
      // Check if person is available on this day of week
      if (avail.person.available_days.includes(dayName)) {
        // Check if this specific date is in the person's not_available_dates
        const isDateUnavailable = avail.person.not_available_dates?.some(
          unavailableDate => unavailableDate === dateStr
        );
        
        if (!isDateUnavailable) {
          avail.availableHoursByDay.set(dateStr, avail.person.available_hours);
        }
      }
    }
  }

  // Assign work units
  for (const unit of workUnits) {
    // Check if this is a professional-level task
    if (unit.diyLevel === 'pro') {
      const task = tasks.find(t => t.id === unit.taskId);
      professionalTasks.push({
        taskId: unit.taskId,
        taskTitle: unit.taskTitle,
        subtaskId: unit.subtaskId,
        subtaskTitle: unit.subtaskTitle,
        dueDate: task?.due_date || null
      });
      continue; // Professional tasks are not assigned to team
    }

    // Check if this unit has an ordering dependency
    if (unit.ordered && unit.dependsOn && !completedSubtasks.has(unit.dependsOn)) {
      unassigned.push({
        taskId: unit.taskId,
        taskTitle: unit.taskTitle,
        subtaskId: unit.subtaskId,
        reason: `Waiting for previous subtask to complete (ordered task)`
      });
      continue;
    }

    let remainingHours = unit.hours;
    let assigned = false;
    let earliestStart = unit.dependsOn && subtaskCompletionDates.has(unit.dependsOn) 
      ? subtaskCompletionDates.get(unit.dependsOn)!
      : new Date(startDate);

    // Find best person for this task
    const eligiblePeople = availability
      .filter(a => canPersonDoTask(a.person, unit.diyLevel))
      .sort((a, b) => {
        // Priority: 
        // 1. DIY level match score (prefer exact match)
        // 2. Hourly rate (prefer lower cost when skill matches)
        // 3. Total available hours
        
        const scoreA = getSkillMatchScore(a.person, unit.diyLevel);
        const scoreB = getSkillMatchScore(b.person, unit.diyLevel);
        
        if (scoreB !== scoreA) return scoreB - scoreA;
        
        // If DIY level matches are equal, prefer lower hourly rate
        const rateA = a.person.hourly_rate || 0;
        const rateB = b.person.hourly_rate || 0;
        if (rateA !== rateB) return rateA - rateB; // Lower rate first
        
        // Finally, compare total available hours
        const totalHoursA = Array.from(a.availableHoursByDay.values()).reduce((sum, h) => sum + h, 0);
        const totalHoursB = Array.from(b.availableHoursByDay.values()).reduce((sum, h) => sum + h, 0);
        return totalHoursB - totalHoursA;
      });

    if (eligiblePeople.length === 0) {
      unassigned.push({
        taskId: unit.taskId,
        taskTitle: unit.taskTitle,
        subtaskId: unit.subtaskId,
        reason: `No person with ${unit.diyLevel} DIY level or higher available`
      });
      continue;
    }

    // Try to assign to best-match person
    for (const personAvail of eligiblePeople) {
      const sortedDates = Array.from(personAvail.availableHoursByDay.entries())
        .filter(([dateStr, hours]) => {
          const date = new Date(dateStr);
          return hours > 0 && date >= earliestStart; // Respect earliestStart for ordered tasks
        })
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB));

      for (const [dateStr, availHours] of sortedDates) {
        if (remainingHours <= 0) break;

        const hoursToAssign = Math.min(remainingHours, availHours);
        const schedDate = new Date(dateStr);

        // Check consecutive days constraint
        if (personAvail.lastWorkDay) {
          const daysDiff = Math.floor((schedDate.getTime() - personAvail.lastWorkDay.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            personAvail.consecutiveDaysWorked++;
          } else {
            personAvail.consecutiveDaysWorked = 1;
          }

          if (personAvail.consecutiveDaysWorked > personAvail.person.consecutive_days) {
            continue; // Skip this day due to consecutive days limit
          }
        } else {
          personAvail.consecutiveDaysWorked = 1;
        }

        assignments.push({
          taskId: unit.taskId,
          taskTitle: unit.taskTitle,
          subtaskId: unit.subtaskId,
          subtaskTitle: unit.subtaskTitle,
          personId: personAvail.personId,
          personName: personAvail.person.name,
          scheduledDate: schedDate,
          scheduledHours: hoursToAssign
        });

        personAvail.availableHoursByDay.set(dateStr, availHours - hoursToAssign);
        personAvail.lastWorkDay = schedDate;
        remainingHours -= hoursToAssign;
        assigned = true;

        // Track the latest completion date for this subtask for ordering
        if (unit.subtaskId) {
          const currentLatest = subtaskCompletionDates.get(unit.subtaskId);
          if (!currentLatest || schedDate > currentLatest) {
            subtaskCompletionDates.set(unit.subtaskId, schedDate);
          }
        }
      }

      if (remainingHours <= 0) {
        // Mark this subtask as completed
        if (unit.subtaskId) {
          completedSubtasks.add(unit.subtaskId);
        }
        break;
      }
    }

    if (remainingHours > 0) {
      unassigned.push({
        taskId: unit.taskId,
        taskTitle: unit.taskTitle,
        subtaskId: unit.subtaskId,
        reason: `Insufficient availability (${remainingHours.toFixed(1)}h remaining)`
      });
    }
  }

  // Generate warnings
  if (unassigned.length > 0) {
    warnings.push(`${unassigned.length} work item(s) could not be fully scheduled`);
  }

  return { assignments, unassigned, professionalTasks, warnings };
}