import React, { useState, useMemo } from 'react';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Award, Image as ImageIcon,
  DollarSign, Clock, CheckCircle2, Trophy
} from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';

interface ProjectPerformanceWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectPerformanceWindow: React.FC<ProjectPerformanceWindowProps> = ({ open, onOpenChange }) => {
  const { currentProjectRun } = useProject();
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');

  // Dispatch events when window opens/closes so budgeting window can track it
  useEffect(() => {
    if (open) {
      window.dispatchEvent(new CustomEvent('performance-window-open'));
    } else {
      window.dispatchEvent(new CustomEvent('performance-window-close'));
    }
  }, [open]);

  const budgetMetrics = useMemo(() => {
    if (!currentProjectRun?.budget_data) {
      return { budgeted: 0, actual: 0, variance: 0, variancePercent: 0 };
    }

    const lineItems = currentProjectRun.budget_data.lineItems || [];
    const actualEntries = currentProjectRun.budget_data.actualEntries || [];
    
    const budgeted = lineItems.reduce((sum: number, item: any) => sum + item.budgetedAmount, 0);
    const actual = actualEntries.reduce((sum: number, entry: any) => sum + entry.amount, 0);
    const variance = budgeted - actual;
    const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;

    return { budgeted, actual, variance, variancePercent };
  }, [currentProjectRun]);

  const scheduleMetrics = useMemo(() => {
    if (!currentProjectRun) {
      return { actualDays: 0, estimatedLow: 0, estimatedMed: 0, estimatedHigh: 0 };
    }

    const startDate = new Date(currentProjectRun.startDate || currentProjectRun.createdAt);
    const now = new Date();
    const actualDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate estimated time ranges (simplified)
    const baseTime = parseFloat(currentProjectRun.estimatedTime || '0');
    const estimatedLow = baseTime * 0.8;
    const estimatedMed = baseTime;
    const estimatedHigh = baseTime * 1.3;

    return { actualDays, estimatedLow, estimatedMed, estimatedHigh };
  }, [currentProjectRun]);

  const issueReports = useMemo(() => {
    if (!currentProjectRun?.issue_reports) return { total: 0, byType: {} };

    const reports = Array.isArray(currentProjectRun.issue_reports) 
      ? currentProjectRun.issue_reports 
      : [];

    const byType = reports.reduce((acc: any, report: any) => {
      const type = report.issue_type || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return { total: reports.length, byType, details: reports };
  }, [currentProjectRun]);

  const achievements = useMemo(() => {
    if (!currentProjectRun) return { completed: 0, total: 0, badges: [] };

    const completedSteps = currentProjectRun.completedSteps?.length || 0;
    const totalSteps = currentProjectRun.phases?.reduce((sum: number, phase: any) => {
      return sum + (phase.operations?.reduce((opSum: number, op: any) => {
        return opSum + (op.steps?.length || 0);
      }, 0) || 0);
    }, 0) || 0;

    const progress = currentProjectRun.progress || 0;
    
    const badges = [];
    if (progress >= 25) badges.push({ name: 'Quarter Way', icon: '🎯' });
    if (progress >= 50) badges.push({ name: 'Halfway Hero', icon: '⭐' });
    if (progress >= 75) badges.push({ name: 'Almost There', icon: '🚀' });
    if (progress >= 100) badges.push({ name: 'Project Complete', icon: '🏆' });

    return { completed: completedSteps, total: totalSteps, badges, progress };
  }, [currentProjectRun]);

  const photos = useMemo(() => {
    if (!currentProjectRun?.project_photos) {
      return { before: [], during: [], after: [] };
    }
    return currentProjectRun.project_photos;
  }, [currentProjectRun]);

  if (!currentProjectRun) {
    return null;
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="content-large"
      title="Project Performance Dashboard"
    >
      <div className="mb-4 flex justify-end gap-2">
        <Button
          variant={viewMode === 'simple' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('simple')}
        >
          Simple View
        </Button>
        <Button
          variant={viewMode === 'advanced' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('advanced')}
        >
          Advanced View
        </Button>
      </div>

      {viewMode === 'simple' ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Budget Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Budget
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Budgeted:</span>
                  <span className="font-semibold">${budgetMetrics.budgeted.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Actual:</span>
                  <span className="font-semibold">${budgetMetrics.actual.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Variance:</span>
                  <span className={`font-bold ${budgetMetrics.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {budgetMetrics.variance >= 0 ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
                    ${Math.abs(budgetMetrics.variance).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{scheduleMetrics.actualDays}</div>
                <div className="text-sm text-muted-foreground">Days in Progress</div>
              </div>
            </CardContent>
          </Card>

          {/* Issue Reports */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold">{issueReports.total}</div>
                <div className="text-sm text-muted-foreground">Total Issues Reported</div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span className="font-semibold">{achievements.progress}%</span>
                  </div>
                  <Progress value={achievements.progress} className="h-2" />
                </div>
                <div className="flex gap-2 justify-center">
                  {achievements.badges.map((badge, idx) => (
                    <div key={idx} className="text-2xl" title={badge.name}>
                      {badge.icon}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card className="col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Project Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{photos.before?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Before</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{photos.during?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">During</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{photos.after?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">After</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Tabs defaultValue="budget" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
          </TabsList>

          <TabsContent value="budget" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentProjectRun.budget_data?.lineItems && 
                    Object.entries(
                      currentProjectRun.budget_data.lineItems.reduce((acc: any, item: any) => {
                        if (!acc[item.category]) acc[item.category] = { budgeted: 0, actual: 0 };
                        acc[item.category].budgeted += item.budgetedAmount;
                        acc[item.category].actual += item.actualAmount;
                        return acc;
                      }, {})
                    ).map(([category, values]: [string, any]) => (
                      <div key={category}>
                        <div className="flex justify-between mb-2">
                          <span className="font-medium capitalize">{category}</span>
                          <span className="text-sm">
                            ${values.actual.toFixed(2)} / ${values.budgeted.toFixed(2)}
                          </span>
                        </div>
                        <Progress 
                          value={(values.actual / values.budgeted) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Variance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between p-3 bg-muted rounded">
                    <span>Total Variance</span>
                    <span className={`font-bold ${budgetMetrics.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${budgetMetrics.variance.toFixed(2)} ({budgetMetrics.variancePercent.toFixed(1)}%)
                    </span>
                  </div>
                  {budgetMetrics.variance < 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                      <AlertTriangle className="w-4 h-4 inline mr-2 text-red-600" />
                      Over budget by ${Math.abs(budgetMetrics.variance).toFixed(2)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Time Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground mb-1">Low Estimate</div>
                      <div className="h-8 bg-green-200 rounded flex items-center justify-center">
                        {scheduleMetrics.estimatedLow.toFixed(0)} days
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground mb-1">Medium Estimate</div>
                      <div className="h-8 bg-yellow-200 rounded flex items-center justify-center">
                        {scheduleMetrics.estimatedMed.toFixed(0)} days
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground mb-1">High Estimate</div>
                      <div className="h-8 bg-red-200 rounded flex items-center justify-center">
                        {scheduleMetrics.estimatedHigh.toFixed(0)} days
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-1">Actual Time</div>
                    <div className="h-10 bg-primary/20 rounded flex items-center justify-center font-bold text-lg">
                      {scheduleMetrics.actualDays} days
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Issue Report Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {issueReports.details?.length > 0 ? (
                    issueReports.details.map((issue: any, idx: number) => (
                      <div key={idx} className="p-3 border rounded">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{issue.description || 'Issue'}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Type: {issue.issue_type || 'Unknown'} | 
                              Phase: {issue.phase_name || 'N/A'}
                            </div>
                          </div>
                          <Badge variant={
                            issue.issue_type === 'critical' ? 'destructive' :
                            issue.issue_type === 'major' ? 'default' : 'secondary'
                          }>
                            {issue.issue_type}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No issues reported yet!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Steps Completed</span>
                    <span className="font-bold">{achievements.completed} / {achievements.total}</span>
                  </div>
                  <Progress value={(achievements.completed / achievements.total) * 100} />
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    {achievements.badges.map((badge, idx) => (
                      <div key={idx} className="p-4 border rounded text-center">
                        <div className="text-4xl mb-2">{badge.icon}</div>
                        <div className="font-medium">{badge.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {['before', 'during', 'after'].map(stage => (
                <Card key={stage}>
                  <CardHeader>
                    <CardTitle className="capitalize">{stage} Photos ({(photos as any)[stage]?.length || 0})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(photos as any)[stage]?.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {(photos as any)[stage].map((photo: string, idx: number) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`${stage} ${idx + 1}`}
                            className="w-full h-32 object-cover rounded"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No {stage} photos yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </ResponsiveDialog>
  );
};
