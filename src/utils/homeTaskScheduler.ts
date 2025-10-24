interface Task {
  id: string;
  title: string;
  skill_level: 'high' | 'medium' | 'low';
  subtasks: Subtask[];
}

interface Subtask {
  id: string;
  title: string;
  estimated_hours: number;
  skill_level: 'high' | 'medium' | 'low';
}

interface Person {
  id: string;
  name: string;
  available_hours: number;
  available_days: string[];
  consecutive_days: number;
  skill_level: 'high' | 'medium' | 'low';
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
  warnings: string[];
}

const DAY_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function canPersonDoTask(person: Person, taskSkillLevel: 'high' | 'medium' | 'low'): boolean {
  const skillLevels = { low: 1, medium: 2, high: 3 };
  return skillLevels[person.skill_level] >= skillLevels[taskSkillLevel];
}

function getSkillMatchScore(person: Person, taskSkillLevel: 'high' | 'medium' | 'low'): number {
  // Perfect match = 3, one level up = 2, two levels up = 1
  const skillLevels = { low: 1, medium: 2, high: 3 };
  const gap = skillLevels[person.skill_level] - skillLevels[taskSkillLevel];
  return Math.max(0, 3 - gap);
}

export function scheduleHomeTasksOptimized(
  tasks: Task[],
  people: Person[],
  startDate: Date = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  })()
): ScheduleResult {
  const assignments: Assignment[] = [];
  const unassigned: Array<{ taskId: string; taskTitle: string; subtaskId: string | null; reason: string }> = [];
  const warnings: string[] = [];

  if (people.length === 0) {
    warnings.push('No team members available. Add people to enable scheduling.');
    return { assignments: [], unassigned: [], warnings };
  }

  // Flatten tasks into work units
  interface WorkUnit {
    taskId: string;
    taskTitle: string;
    subtaskId: string | null;
    subtaskTitle: string;
    hours: number;
    skillLevel: 'high' | 'medium' | 'low';
  }

  const workUnits: WorkUnit[] = [];
  
  for (const task of tasks) {
    if (task.subtasks.length > 0) {
      for (const subtask of task.subtasks) {
        workUnits.push({
          taskId: task.id,
          taskTitle: task.title,
          subtaskId: subtask.id,
          subtaskTitle: subtask.title,
          hours: subtask.estimated_hours,
          skillLevel: subtask.skill_level
        });
      }
    } else {
      // Task with no subtasks - estimate as 1 hour task
      workUnits.push({
        taskId: task.id,
        taskTitle: task.title,
        subtaskId: null,
        subtaskTitle: task.title,
        hours: 1,
        skillLevel: task.skill_level
      });
    }
  }

  // Sort work units by skill level (high first) for optimal assignment
  workUnits.sort((a, b) => {
    const skillOrder = { high: 3, medium: 2, low: 1 };
    return skillOrder[b.skillLevel] - skillOrder[a.skillLevel];
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

  // Initialize availability for next 90 days (starting day after startDate)
  const currentDate = new Date(startDate);
  for (let dayOffset = 1; dayOffset < 91; dayOffset++) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + dayOffset);
    const dayName = DAY_ORDER[date.getDay()].toLowerCase();
    const dateStr = date.toISOString().split('T')[0];

    for (const avail of availability) {
      if (avail.person.available_days.includes(dayName)) {
        avail.availableHoursByDay.set(dateStr, avail.person.available_hours);
      }
    }
  }

  // Assign work units
  for (const unit of workUnits) {
    let remainingHours = unit.hours;
    let assigned = false;

    // Find best person for this task
    const eligiblePeople = availability
      .filter(a => canPersonDoTask(a.person, unit.skillLevel))
      .sort((a, b) => {
        // Priority: skill match score, then total available hours
        const scoreA = getSkillMatchScore(a.person, unit.skillLevel);
        const scoreB = getSkillMatchScore(b.person, unit.skillLevel);
        if (scoreB !== scoreA) return scoreB - scoreA;
        
        const totalHoursA = Array.from(a.availableHoursByDay.values()).reduce((sum, h) => sum + h, 0);
        const totalHoursB = Array.from(b.availableHoursByDay.values()).reduce((sum, h) => sum + h, 0);
        return totalHoursB - totalHoursA;
      });

    if (eligiblePeople.length === 0) {
      unassigned.push({
        taskId: unit.taskId,
        taskTitle: unit.taskTitle,
        subtaskId: unit.subtaskId,
        reason: `No person with ${unit.skillLevel} skill or higher available`
      });
      continue;
    }

    // Try to assign to best-match person
    for (const personAvail of eligiblePeople) {
      const sortedDates = Array.from(personAvail.availableHoursByDay.entries())
        .filter(([, hours]) => hours > 0)
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
      }

      if (remainingHours <= 0) break;
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

  return { assignments, unassigned, warnings };
}