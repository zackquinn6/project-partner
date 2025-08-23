import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Clock, Wrench, ArrowRight, CheckCircle, BarChart3, Zap } from 'lucide-react';

interface WorkflowOptimization {
  id: string;
  type: 'step-reorder' | 'tool-consolidation' | 'time-reduction' | 'parallel-tasks';
  title: string;
  description: string;
  timeSavings: number; // in minutes
  effortReduction: number; // percentage
  confidence: number; // 0-100
  affectedSteps: string[];
  projectTypes: string[];
  basedOnData: {
    userCompletions: number;
    averageTimeBefore: number;
    averageTimeAfter: number;
    feedbackScore: number;
  };
  status: 'suggested' | 'testing' | 'validated' | 'implemented';
  createdAt: Date;
  applied: boolean;
  appliedDate?: Date;
}

interface OptimizationInsight {
  id: string;
  category: 'efficiency' | 'safety' | 'quality' | 'cost';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  frequency: number; // how often this issue occurs
  projectsAffected: string[];
}

export const WorkflowOptimizationEngine: React.FC = () => {
  const [optimizations, setOptimizations] = useState<WorkflowOptimization[]>([]);
  const [insights, setInsights] = useState<OptimizationInsight[]>([]);
  const [autoApproval, setAutoApproval] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadOptimizationData();
  }, []);

  const loadOptimizationData = async () => {
    // Load demo data - in production this would analyze real project data
    setOptimizations([
      {
        id: '1',
        type: 'step-reorder',
        title: 'Reorder Paint Preparation Steps',
        description: 'Move "Clean brushes and tools" to before "Apply first coat" to reduce setup time for second coat',
        timeSavings: 18,
        effortReduction: 12,
        confidence: 87,
        affectedSteps: ['surface-prep', 'tool-cleaning', 'first-coat'],
        projectTypes: ['interior-painting', 'exterior-painting'],
        basedOnData: {
          userCompletions: 247,
          averageTimeBefore: 45,
          averageTimeAfter: 27,
          feedbackScore: 4.2
        },
        status: 'validated',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        applied: false
      },
      {
        id: '2',
        type: 'tool-consolidation',
        title: 'Combine Measuring Tasks',
        description: 'Group all measuring and marking steps to minimize tool changes and improve accuracy',
        timeSavings: 22,
        effortReduction: 8,
        confidence: 92,
        affectedSteps: ['layout-planning', 'cut-measurements', 'installation-marks'],
        projectTypes: ['flooring', 'tile-work', 'trim-installation'],
        basedOnData: {
          userCompletions: 156,
          averageTimeBefore: 38,
          averageTimeAfter: 16,
          feedbackScore: 4.6
        },
        status: 'suggested',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        applied: false
      },
      {
        id: '3',
        type: 'parallel-tasks',
        title: 'Parallel Drying Operations',
        description: 'While primer dries, prep next room or clean tools to maximize productivity',
        timeSavings: 35,
        effortReduction: 0,
        confidence: 95,
        affectedSteps: ['primer-application', 'drying-wait', 'room-prep'],
        projectTypes: ['interior-painting'],
        basedOnData: {
          userCompletions: 89,
          averageTimeBefore: 240,
          averageTimeAfter: 205,
          feedbackScore: 4.8
        },
        status: 'implemented',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        applied: true,
        appliedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: '4',
        type: 'time-reduction',
        title: 'Streamlined Material Prep',
        description: 'Pre-stage all materials by phase to reduce back-and-forth trips',
        timeSavings: 28,
        effortReduction: 15,
        confidence: 78,
        affectedSteps: ['material-gathering', 'tool-setup'],
        projectTypes: ['general'],
        basedOnData: {
          userCompletions: 203,
          averageTimeBefore: 52,
          averageTimeAfter: 24,
          feedbackScore: 4.1
        },
        status: 'testing',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        applied: false
      }
    ]);

    setInsights([
      {
        id: '1',
        category: 'efficiency',
        title: 'Tool Setup Repetition',
        description: 'Users are setting up the same tools multiple times per project. 67% could benefit from consolidated tool sessions.',
        impact: 'high',
        frequency: 0.67,
        projectsAffected: ['painting', 'flooring', 'trim-work']
      },
      {
        id: '2',
        category: 'quality',
        title: 'Measurement Errors',
        description: 'Projects with scattered measuring steps show 23% more rework. Batching measurements improves accuracy.',
        impact: 'medium',
        frequency: 0.23,
        projectsAffected: ['flooring', 'tile-work', 'cabinetry']
      },
      {
        id: '3',
        category: 'safety',
        title: 'Ladder Movement Frequency',
        description: 'Excessive ladder repositioning increases fall risk. 43% of projects could optimize vertical work sequencing.',
        impact: 'high',
        frequency: 0.43,
        projectsAffected: ['painting', 'electrical', 'plumbing']
      }
    ]);
  };

  const runOptimizationAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis process
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    toast({
      title: "Analysis Complete",
      description: "Found 2 new optimization opportunities and 1 workflow improvement"
    });
    
    setIsAnalyzing(false);
  };

  const applyOptimization = async (optimizationId: string) => {
    setOptimizations(optimizations.map(opt => 
      opt.id === optimizationId 
        ? { ...opt, applied: true, appliedDate: new Date(), status: 'implemented' }
        : opt
    ));
    
    const optimization = optimizations.find(opt => opt.id === optimizationId);
    
    toast({
      title: "Optimization Applied",
      description: `${optimization?.title} is now active across ${optimization?.projectTypes.join(', ')} projects`
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented': return 'bg-green-500/10 text-green-500';
      case 'validated': return 'bg-blue-500/10 text-blue-500';
      case 'testing': return 'bg-yellow-500/10 text-yellow-500';
      case 'suggested': return 'bg-purple-500/10 text-purple-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-500/10 text-red-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'low': return 'bg-green-500/10 text-green-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const totalTimeSavings = optimizations
    .filter(opt => opt.applied)
    .reduce((total, opt) => total + opt.timeSavings, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Optimization Engine</h2>
          <p className="text-muted-foreground">AI-powered improvements based on user feedback and performance data</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Auto-apply validated optimizations</label>
            <Switch checked={autoApproval} onCheckedChange={setAutoApproval} />
          </div>
          <Button onClick={runOptimizationAnalysis} disabled={isAnalyzing} className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Workflows'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Time Saved</p>
                <p className="text-2xl font-bold">{totalTimeSavings} min</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Optimizations</p>
                <p className="text-2xl font-bold">{optimizations.filter(opt => opt.applied).length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {Math.round(optimizations.reduce((sum, opt) => sum + opt.confidence, 0) / optimizations.length)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="optimizations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="optimizations">Workflow Optimizations</TabsTrigger>
          <TabsTrigger value="insights">Performance Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="optimizations" className="space-y-4">
          <div className="grid gap-4">
            {optimizations.map(optimization => (
              <Card key={optimization.id}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{optimization.title}</h3>
                          <Badge className={getStatusColor(optimization.status)}>
                            {optimization.status}
                          </Badge>
                          {optimization.type === 'step-reorder' && <Wrench className="h-4 w-4 text-blue-500" />}
                          {optimization.type === 'tool-consolidation' && <Wrench className="h-4 w-4 text-green-500" />}
                          {optimization.type === 'time-reduction' && <Clock className="h-4 w-4 text-purple-500" />}
                          {optimization.type === 'parallel-tasks' && <Zap className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <p className="text-muted-foreground">{optimization.description}</p>
                      </div>
                      
                      {!optimization.applied && optimization.status === 'validated' && (
                        <Button onClick={() => applyOptimization(optimization.id)} className="gap-2">
                          <ArrowRight className="h-4 w-4" />
                          Apply
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium text-green-600">Time Savings</p>
                        <p className="text-xl font-bold">{optimization.timeSavings} min</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-600">Effort Reduction</p>
                        <p className="text-xl font-bold">{optimization.effortReduction}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-purple-600">Confidence</p>
                        <p className="text-xl font-bold">{optimization.confidence}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">User Data</p>
                        <p className="text-xl font-bold">{optimization.basedOnData.userCompletions}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Affected Steps: </span>
                        <span className="text-sm text-muted-foreground">
                          {optimization.affectedSteps.join(' → ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Project Types: </span>
                        {optimization.projectTypes.map(type => (
                          <Badge key={type} variant="outline" className="mr-1">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium mb-1">Performance Data</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Before: </span>
                          <span className="font-medium">{optimization.basedOnData.averageTimeBefore} min</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">After: </span>
                          <span className="font-medium">{optimization.basedOnData.averageTimeAfter} min</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">User Rating: </span>
                          <span className="font-medium">{optimization.basedOnData.feedbackScore}/5</span>
                        </div>
                      </div>
                    </div>

                    {optimization.applied && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Applied on {optimization.appliedDate?.toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4">
            {insights.map(insight => (
              <Card key={insight.id}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{insight.title}</h3>
                        <Badge className={getImpactColor(insight.impact)}>
                          {insight.impact} impact
                        </Badge>
                        <Badge variant="outline">
                          {Math.round(insight.frequency * 100)}% frequency
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground">{insight.description}</p>
                    
                    <div>
                      <span className="text-sm font-medium">Affected Projects: </span>
                      {insight.projectsAffected.map(project => (
                        <Badge key={project} variant="outline" className="mr-1">
                          {project}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};