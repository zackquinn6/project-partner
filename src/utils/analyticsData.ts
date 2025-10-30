import { ProjectRun } from '@/interfaces/ProjectRun';
import { addDays, subDays, format } from 'date-fns';

export interface AnalyticsData {
  totalCompletions: number;
  averageDuration: number;
  completionRate: number;
  issueReportRate: number;
  durationData: Array<{ days: number; projects: number }>;
  stepTimeData: Array<{ step: string; avgHours: number; completions: number }>;
  issueData: Array<{ name: string; value: number; count: number }>;
  phaseRatingsData: Array<{ phase: string; avgRating: number; count: number }>;
  overallPhaseRating: number;
}

export function generateDemoData(): AnalyticsData {
  return {
    totalCompletions: 1247,
    averageDuration: 14.2,
    completionRate: 91.5,
    issueReportRate: 18.7,
    durationData: [
      { days: 3, projects: 8 },
      { days: 5, projects: 23 },
      { days: 7, projects: 67 },
      { days: 9, projects: 124 },
      { days: 11, projects: 198 },
      { days: 13, projects: 245 },
      { days: 15, projects: 203 },
      { days: 17, projects: 156 },
      { days: 19, projects: 98 },
      { days: 21, projects: 54 },
      { days: 23, projects: 32 },
      { days: 25, projects: 18 },
      { days: 27, projects: 12 },
      { days: 29, projects: 7 },
      { days: 31, projects: 2 }
    ],
    stepTimeData: [
      { step: 'Project Planning', avgHours: 2.8, completions: 1247 },
      { step: 'Material Acquisition', avgHours: 1.5, completions: 1205 },
      { step: 'Site Preparation', avgHours: 3.2, completions: 1189 },
      { step: 'Primary Construction', avgHours: 12.6, completions: 1156 },
      { step: 'Quality Assurance', avgHours: 2.1, completions: 1124 },
      { step: 'Finishing Work', avgHours: 4.3, completions: 1098 },
      { step: 'Final Inspection', avgHours: 0.9, completions: 1087 },
      { step: 'Project Documentation', avgHours: 1.2, completions: 1076 }
    ],
    issueData: [
      { name: 'No Issues', value: 81.3, count: 1014 },
      { name: 'Material Shortage', value: 8.4, count: 105 },
      { name: 'Tool Malfunction', value: 4.2, count: 52 },
      { name: 'Unclear Instructions', value: 3.8, count: 47 },
      { name: 'Safety Concerns', value: 1.6, count: 20 },
      { name: 'Time Overrun', value: 0.7, count: 9 }
    ],
    phaseRatingsData: [
      { phase: 'Planning', avgRating: 4.3, count: 1205 },
      { phase: 'Execution', avgRating: 4.1, count: 1156 },
      { phase: 'Quality Check', avgRating: 4.5, count: 1124 },
      { phase: 'Closeout', avgRating: 4.7, count: 1098 }
    ],
    overallPhaseRating: 4.4
  };
}

export function calculateRealAnalytics(
  projectRuns: ProjectRun[],
  selectedProject?: string,
  selectedCategory?: string,
  dateRange?: { from?: Date; to?: Date }
): AnalyticsData {
  // Filter project runs based on selection criteria
  let filteredRuns = projectRuns;

  if (selectedProject && selectedProject !== 'all') {
    filteredRuns = filteredRuns.filter(run => run.templateId === selectedProject);
  }

  if (selectedCategory && selectedCategory !== 'all') {
    filteredRuns = filteredRuns.filter(run => {
      if (Array.isArray(run.category)) {
        return run.category.includes(selectedCategory);
      }
      return run.category === selectedCategory;
    });
  }

  if (dateRange?.from && dateRange?.to) {
    filteredRuns = filteredRuns.filter(run => {
      const runDate = new Date(run.createdAt);
      return runDate >= dateRange.from! && runDate <= dateRange.to!;
    });
  }

  const completedRuns = filteredRuns.filter(run => run.status === 'complete');
  const totalRuns = filteredRuns.length;
  
  // Calculate basic metrics
  const totalCompletions = completedRuns.length;
  const completionRate = totalRuns > 0 ? (totalCompletions / totalRuns) * 100 : 0;
  
  // Calculate average duration for completed projects
  const durations = completedRuns
    .filter(run => run.endDate)
    .map(run => {
      const start = new Date(run.startDate);
      const end = new Date(run.endDate!);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    });
  
  const averageDuration = durations.length > 0 
    ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
    : 0;

  // Calculate issue report rate
  const runsWithIssues = filteredRuns.filter(run => 
    run.issue_reports && run.issue_reports.length > 0
  ).length;
  const issueReportRate = totalRuns > 0 ? (runsWithIssues / totalRuns) * 100 : 0;

  // Generate duration distribution
  const durationData = generateDurationDistribution(durations);

  // Generate step time data (mock for now - would need actual time tracking data)
  const stepTimeData = [
    { step: 'Project Setup', avgHours: 1.8, completions: totalCompletions },
    { step: 'Material Gathering', avgHours: 2.1, completions: Math.floor(totalCompletions * 0.95) },
    { step: 'Execution Phase 1', avgHours: 8.5, completions: Math.floor(totalCompletions * 0.89) },
    { step: 'Execution Phase 2', avgHours: 6.2, completions: Math.floor(totalCompletions * 0.82) },
    { step: 'Quality Check', avgHours: 1.5, completions: Math.floor(totalCompletions * 0.78) },
    { step: 'Cleanup', avgHours: 2.3, completions: Math.floor(totalCompletions * 0.76) }
  ];

  // Generate issue data
  const issueData = generateIssueDistribution(filteredRuns);

  // Generate phase ratings data
  const { phaseRatingsData, overallPhaseRating } = generatePhaseRatingsData(filteredRuns);

  return {
    totalCompletions,
    averageDuration,
    completionRate,
    issueReportRate,
    durationData,
    stepTimeData,
    issueData,
    phaseRatingsData,
    overallPhaseRating
  };
}

function generateDurationDistribution(durations: number[]): Array<{ days: number; projects: number }> {
  if (durations.length === 0) {
    return [];
  }

  const minDays = Math.min(...durations);
  const maxDays = Math.max(...durations);
  const buckets: { [key: number]: number } = {};

  // Create buckets for every 2 days
  for (let i = minDays; i <= maxDays; i += 2) {
    buckets[i] = 0;
  }

  // Count durations in each bucket
  durations.forEach(duration => {
    const bucket = Math.floor(duration / 2) * 2;
    buckets[bucket] = (buckets[bucket] || 0) + 1;
  });

  return Object.entries(buckets)
    .map(([days, projects]) => ({ days: parseInt(days), projects }))
    .sort((a, b) => a.days - b.days);
}

function generateIssueDistribution(projectRuns: ProjectRun[]): Array<{ name: string; value: number; count: number }> {
  const totalRuns = projectRuns.length;
  
  if (totalRuns === 0) {
    return [{ name: 'No Data', value: 100, count: 0 }];
  }

  const issueCounts: { [key: string]: number } = {
    'No Issues': 0,
    'Material Issues': 0,
    'Tool Problems': 0,
    'Unclear Instructions': 0,
    'Safety Concerns': 0,
    'Time Management': 0
  };

  projectRuns.forEach(run => {
    if (!run.issue_reports || run.issue_reports.length === 0) {
      issueCounts['No Issues']++;
    } else {
      // Analyze issue reports (simplified)
      run.issue_reports.forEach(report => {
        if (report.issues) {
          Object.keys(report.issues).forEach(issueType => {
            if (issueType.toLowerCase().includes('material')) {
              issueCounts['Material Issues']++;
            } else if (issueType.toLowerCase().includes('tool')) {
              issueCounts['Tool Problems']++;
            } else if (issueType.toLowerCase().includes('instruction')) {
              issueCounts['Unclear Instructions']++;
            } else if (issueType.toLowerCase().includes('safety')) {
              issueCounts['Safety Concerns']++;
            } else {
              issueCounts['Time Management']++;
            }
          });
        }
      });
    }
  });

  return Object.entries(issueCounts)
    .map(([name, count]) => ({
      name,
      count,
      value: parseFloat(((count / totalRuns) * 100).toFixed(1))
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.value - a.value);
}

function generatePhaseRatingsData(projectRuns: ProjectRun[]): { 
  phaseRatingsData: Array<{ phase: string; avgRating: number; count: number }>, 
  overallPhaseRating: number 
} {
  if (projectRuns.length === 0) {
    return { 
      phaseRatingsData: [], 
      overallPhaseRating: 0 
    };
  }

  // Aggregate phase ratings by phase name
  const phaseRatingsByName: { [key: string]: { totalRating: number; count: number } } = {};
  let totalRatings = 0;
  let totalCount = 0;

  projectRuns.forEach(run => {
    if (run.phase_ratings && Array.isArray(run.phase_ratings)) {
      run.phase_ratings.forEach((rating: any) => {
        const phaseName = rating.phaseName || 'Unknown';
        const ratingValue = rating.rating || 0;

        if (!phaseRatingsByName[phaseName]) {
          phaseRatingsByName[phaseName] = { totalRating: 0, count: 0 };
        }

        phaseRatingsByName[phaseName].totalRating += ratingValue;
        phaseRatingsByName[phaseName].count += 1;
        totalRatings += ratingValue;
        totalCount += 1;
      });
    }
  });

  // Convert to array format with averages
  const phaseRatingsData = Object.entries(phaseRatingsByName)
    .map(([phase, data]) => ({
      phase,
      avgRating: parseFloat((data.totalRating / data.count).toFixed(2)),
      count: data.count
    }))
    .sort((a, b) => b.count - a.count);

  const overallPhaseRating = totalCount > 0 
    ? parseFloat((totalRatings / totalCount).toFixed(2)) 
    : 0;

  return {
    phaseRatingsData,
    overallPhaseRating
  };
}

export function exportAnalyticsData(data: AnalyticsData, filters: any) {
  const csvContent = [
    // Summary metrics
    'Analytics Summary',
    `Total Completions,${data.totalCompletions}`,
    `Average Duration (days),${data.averageDuration.toFixed(1)}`,
    `Completion Rate (%),${data.completionRate.toFixed(1)}`,
    `Issue Report Rate (%),${data.issueReportRate.toFixed(1)}`,
    `Overall Phase Rating (1-5),${data.overallPhaseRating.toFixed(2)}`,
    '',
    
    // Duration distribution
    'Duration Distribution',
    'Days,Project Count',
    ...data.durationData.map(d => `${d.days},${d.projects}`),
    '',
    
    // Step time data
    'Step Analysis',
    'Step Name,Average Hours,Completions',
    ...data.stepTimeData.map(s => `${s.step},${s.avgHours},${s.completions}`),
    '',
    
    // Issue distribution
    'Issue Distribution',
    'Issue Type,Percentage,Count',
    ...data.issueData.map(i => `${i.name},${i.value}%,${i.count}`),
    '',
    
    // Phase ratings
    'Phase Ratings',
    'Phase Name,Average Rating (1-5),Rating Count',
    ...data.phaseRatingsData.map(p => `${p.phase},${p.avgRating},${p.count}`)
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `project-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
}