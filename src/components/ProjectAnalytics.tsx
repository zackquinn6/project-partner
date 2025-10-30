import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { CheckCircle, Clock, AlertTriangle, TrendingUp, Star } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { AnalyticsFilters } from './AnalyticsFilters';
import { generateDemoData, calculateRealAnalytics, exportAnalyticsData, AnalyticsData } from '@/utils/analyticsData';
import { DateRange } from 'react-day-picker';

const ProjectAnalytics: React.FC = () => {
  const { projects, projectRuns } = useProject();
  
  // Filter states
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [demoMode, setDemoMode] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  // Calculate analytics data
  useEffect(() => {
    if (demoMode) {
      setAnalyticsData(generateDemoData());
    } else {
      const realData = calculateRealAnalytics(
        projectRuns,
        selectedProject,
        selectedCategory,
        dateRange
      );
      setAnalyticsData(realData);
    }
  }, [projectRuns, selectedProject, selectedCategory, dateRange, demoMode]);

  const handleExport = () => {
    if (analyticsData) {
      exportAnalyticsData(analyticsData, {
        project: selectedProject,
        category: selectedCategory,
        dateRange
      });
    }
  };

  if (!analyticsData) {
    return <div className="flex justify-center p-8">Loading analytics...</div>;
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--secondary))', 'hsl(var(--muted))'];

  const formatTooltipValue = (value: any, name: string) => {
    if (name === 'avgHours') return [`${value} hours`, 'Average Time'];
    if (name === 'projects') return [`${value} projects`, 'Count'];
    if (name === 'completions') return [`${value} completions`, 'Completed'];
    return [value, name];
  };

  return (
    <div className="space-y-6">
      {/* Analytics Filters */}
      <AnalyticsFilters
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        demoMode={demoMode}
        onDemoModeToggle={() => setDemoMode(!demoMode)}
        onExport={handleExport}
        projects={projects}
      />
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="gradient-card border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Completions</p>
                <p className="text-2xl font-bold">{analyticsData.totalCompletions.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">{analyticsData.averageDuration.toFixed(1)} days</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{analyticsData.completionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Issue Reports</p>
                <p className="text-2xl font-bold">{analyticsData.issueReportRate.toFixed(1)}%</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Phase Rating</p>
                <p className="text-2xl font-bold">{analyticsData.overallPhaseRating.toFixed(1)}/5</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" fill="currentColor" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Duration Distribution */}
        <Card className="gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle>Project Duration Distribution</CardTitle>
            <CardDescription>
              Bell curve showing project completion times (avg: {analyticsData.averageDuration.toFixed(1)} days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.durationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="days" 
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: 'Days to Complete', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: 'Number of Projects', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={formatTooltipValue}
                  labelFormatter={(value) => `${value} days`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="projects" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Issue Report Distribution */}
        <Card className="gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle>Issue Report Distribution</CardTitle>
            <CardDescription>
              Breakdown of issues reported during project completion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.issueData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.issueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`${value}% (${analyticsData.issueData.find(d => d.name === name)?.count} projects)`, name]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Time at Each Step */}
      <Card className="gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle>Average Time Spent at Each Step</CardTitle>
          <CardDescription>
            Column chart showing how long users spend on each workflow step
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analyticsData.stepTimeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="step" 
                stroke="hsl(var(--muted-foreground))"
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={formatTooltipValue}
                labelFormatter={(value) => `Step: ${value}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="avgHours" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          
          {/* Step completion rates */}
          <div className="mt-6 space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground">Step Completion Rates</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {analyticsData.stepTimeData.map((step, index) => {
                const completionRate = analyticsData.totalCompletions > 0 
                  ? ((step.completions / analyticsData.totalCompletions) * 100).toFixed(1)
                  : '0';
                return (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm truncate">{step.step}</span>
                    <Badge variant="outline" className="ml-2">
                      {completionRate}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Ratings Analysis */}
      {analyticsData.phaseRatingsData.length > 0 && (
        <Card className="gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle>Phase Ratings by Users</CardTitle>
            <CardDescription>
              Average user satisfaction ratings per phase (1-5 scale)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.phaseRatingsData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="phase" 
                  stroke="hsl(var(--muted-foreground))"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: 'Rating (1-5)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 5]}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'avgRating') return [`${value}/5`, 'Avg Rating'];
                    if (name === 'count') return [`${value}`, 'Total Ratings'];
                    return [value, name];
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="avgRating" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="mt-6">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">Phase Rating Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analyticsData.phaseRatingsData.map((phase, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{phase.phase}</p>
                      <p className="text-xs text-muted-foreground">{phase.count} ratings</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                      <span className="font-bold text-lg">{phase.avgRating}</span>
                      <span className="text-sm text-muted-foreground">/5</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProjectAnalytics;