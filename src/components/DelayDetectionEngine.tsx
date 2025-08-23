import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Clock, 
  TrendingDown, 
  Lightbulb, 
  CheckCircle2, 
  Calendar,
  MapPin,
  Wrench,
  CloudRain,
  Package
} from 'lucide-react';
import { DelayDetection, DelayIntervention, DelayFactor, WeatherAlert } from '@/interfaces/AdvancedFeatures';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useToast } from '@/components/ui/use-toast';

interface DelayDetectionEngineProps {
  projectRun: ProjectRun;
  onInterventionApply: (intervention: DelayIntervention) => void;
}

export const DelayDetectionEngine: React.FC<DelayDetectionEngineProps> = ({
  projectRun,
  onInterventionApply
}) => {
  const { toast } = useToast();
  const [delayAnalysis, setDelayAnalysis] = useState<DelayDetection | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeProjectDelay();
    checkWeatherAlerts();
  }, [projectRun]);

  const analyzeProjectDelay = async () => {
    setLoading(true);
    
    // Calculate expected vs actual progress
    const daysSinceStart = Math.floor(
      (Date.now() - new Date(projectRun.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalProjectDays = Math.floor(
      (new Date(projectRun.planEndDate).getTime() - new Date(projectRun.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const expectedProgress = Math.min((daysSinceStart / totalProjectDays) * 100, 100);
    const actualProgress = projectRun.progress;
    
    const delayRisk = calculateDelayRisk(expectedProgress, actualProgress);
    const delayFactors = identifyDelayFactors(projectRun);
    const interventions = generateInterventions(projectRun, delayFactors);

    const analysis: DelayDetection = {
      projectId: projectRun.id,
      actualProgress,
      expectedProgress,
      delayRisk,
      predictedDelay: Math.max(0, Math.ceil((expectedProgress - actualProgress) / 100 * totalProjectDays)),
      interventions,
      factors: delayFactors,
      lastAnalyzed: new Date().toISOString()
    };

    setDelayAnalysis(analysis);
    setLoading(false);
  };

  const calculateDelayRisk = (expected: number, actual: number): DelayDetection['delayRisk'] => {
    const gap = expected - actual;
    if (gap < 5) return 'low';
    if (gap < 15) return 'medium';
    if (gap < 30) return 'high';
    return 'critical';
  };

  const identifyDelayFactors = (projectRun: ProjectRun): DelayFactor[] => {
    const factors: DelayFactor[] = [];

    // Weather factor (simulated - would integrate with weather API)
    if (hasOutdoorWork(projectRun)) {
      factors.push({
        type: 'weather',
        description: 'Upcoming rain may delay exterior work',
        impact: 2,
        probability: 0.7
      });
    }

    // Skill gap factor
    const avgStepTime = getAverageStepTime(projectRun);
    const expectedStepTime = getExpectedStepTime(projectRun.difficulty || 'Intermediate');
    if (avgStepTime > expectedStepTime * 1.5) {
      factors.push({
        type: 'skill-gap',
        description: 'Steps taking longer than expected for skill level',
        impact: Math.ceil((avgStepTime - expectedStepTime) / 60 / 24), // convert to days
        probability: 0.8
      });
    }

    // Supply chain factor (simulated)
    factors.push({
      type: 'supply-chain',
      description: 'Material delivery delays possible',
      impact: 1,
      probability: 0.3
    });

    return factors;
  };

  const generateInterventions = (projectRun: ProjectRun, factors: DelayFactor[]): DelayIntervention[] => {
    const interventions: DelayIntervention[] = [];

    // Weather interventions
    if (factors.some(f => f.type === 'weather')) {
      interventions.push({
        id: 'weather-reorder',
        type: 'parallel-task',
        title: 'Reorder Tasks for Weather',
        description: 'Move indoor tasks up in schedule while weather clears',
        impact: 'Saves 1-2 days',
        difficulty: 'easy',
        priority: 4
      });
    }

    // Skill gap interventions
    if (factors.some(f => f.type === 'skill-gap')) {
      interventions.push({
        id: 'skill-help',
        type: 'help-request',
        title: 'Get Expert Guidance',
        description: 'Schedule a video call with a professional for difficult steps',
        impact: 'Reduces step time by 30%',
        difficulty: 'easy',
        priority: 5
      });

      interventions.push({
        id: 'break-down-steps',
        type: 'schedule-adjust',
        title: 'Break Down Complex Steps',
        description: 'Split challenging operations into smaller, manageable tasks',
        impact: 'Improves completion rate by 40%',
        difficulty: 'moderate',
        priority: 3
      });
    }

    // Supply chain interventions
    interventions.push({
      id: 'preorder-materials',
      type: 'resource-reorder',
      title: 'Pre-order Next Phase Materials',
      description: 'Order materials for upcoming phases now to avoid delays',
      impact: 'Prevents 2-3 day delays',
      difficulty: 'easy',
      priority: 4
    });

    return interventions.sort((a, b) => b.priority - a.priority);
  };

  const checkWeatherAlerts = async () => {
    try {
      // Use Open-Meteo API (free, no API key required)
      // For demo purposes, using a fixed location - in production, get user's location
      const lat = 40.7128; // NYC coordinates as example
      const lon = -74.0060;
      
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto&forecast_days=7`
      );
      
      if (!response.ok) {
        throw new Error('Weather API request failed');
      }
      
      const data = await response.json();
      const alerts: WeatherAlert[] = [];
      
      // Check current and forecast conditions
      const current = data.current;
      const daily = data.daily;
      
      // Check for rain (weather codes 61, 63, 65, 80, 81, 82)
      const rainCodes = [61, 63, 65, 80, 81, 82];
      if (rainCodes.includes(current.weather_code) || current.precipitation > 0) {
        alerts.push({
          id: 'weather-rain',
          projectId: projectRun.id,
          weatherType: 'rain',
          severity: current.precipitation > 5 ? 'warning' : 'advisory',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          affectedPhases: ['exterior-work', 'painting', 'landscaping'],
          recommendations: [
            'Delay exterior painting until dry conditions return',
            'Cover outdoor materials and equipment',
            'Consider indoor tasks during rain period'
          ],
          created: new Date().toISOString()
        });
      }
      
      // Check for extreme temperatures
      if (current.temperature_2m < 0) {
        alerts.push({
          id: 'weather-cold',
          projectId: projectRun.id,
          weatherType: 'extreme-cold',
          severity: 'advisory',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          affectedPhases: ['exterior-work', 'concrete-work'],
          recommendations: [
            'Avoid painting in freezing temperatures',
            'Allow extra time for materials to reach working temperature',
            'Consider postponing concrete work'
          ],
          created: new Date().toISOString()
        });
      }
      
      if (current.temperature_2m > 35) {
        alerts.push({
          id: 'weather-heat',
          projectId: projectRun.id,
          weatherType: 'extreme-heat',
          severity: 'advisory',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          affectedPhases: ['exterior-work', 'roofing'],
          recommendations: [
            'Work during cooler morning/evening hours',
            'Take frequent breaks and stay hydrated',
            'Paint may dry too quickly in extreme heat'
          ],
          created: new Date().toISOString()
        });
      }
      
      setWeatherAlerts(alerts);
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      // Fallback to empty alerts if weather API fails
      setWeatherAlerts([]);
    }
  };

  const hasOutdoorWork = (projectRun: ProjectRun): boolean => {
    return projectRun.phases.some(phase => 
      phase.name.toLowerCase().includes('exterior') ||
      phase.name.toLowerCase().includes('outdoor') ||
      phase.name.toLowerCase().includes('landscaping')
    );
  };

  const getAverageStepTime = (projectRun: ProjectRun): number => {
    // Simulated - would calculate from actual step completion times
    return 45; // minutes
  };

  const getExpectedStepTime = (difficulty: string): number => {
    const baseTimes = {
      'Beginner': 60,
      'Intermediate': 35,
      'Advanced': 20
    };
    return baseTimes[difficulty as keyof typeof baseTimes] || 35;
  };

  const handleInterventionApply = (intervention: DelayIntervention) => {
    onInterventionApply(intervention);
    toast({
      title: "Intervention Applied",
      description: `${intervention.title} has been added to your project plan.`,
    });
  };

  const getRiskColor = (risk: DelayDetection['delayRisk']) => {
    switch (risk) {
      case 'low': return 'text-green-600 border-green-200 bg-green-50';
      case 'medium': return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'high': return 'text-orange-600 border-orange-200 bg-orange-50';
      case 'critical': return 'text-red-600 border-red-200 bg-red-50';
    }
  };

  const getRiskIcon = (risk: DelayDetection['delayRisk']) => {
    switch (risk) {
      case 'low': return CheckCircle2;
      case 'medium': return Clock;
      case 'high': return AlertTriangle;
      case 'critical': return TrendingDown;
    }
  };

  if (loading || !delayAnalysis) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Analyzing project timeline...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const RiskIcon = getRiskIcon(delayAnalysis.delayRisk);

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className={`border-2 ${getRiskColor(delayAnalysis.delayRisk)}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiskIcon className="h-5 w-5" />
              Project Timeline Analysis
            </CardTitle>
            <Badge variant={delayAnalysis.delayRisk === 'low' ? 'default' : 'destructive'}>
              {delayAnalysis.delayRisk.toUpperCase()} RISK
            </Badge>
          </div>
          <CardDescription>
            AI-powered delay detection and intervention recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Expected Progress</div>
              <div className="flex items-center gap-2">
                <Progress value={delayAnalysis.expectedProgress} className="flex-1" />
                <span className="text-sm font-medium">
                  {delayAnalysis.expectedProgress.toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Actual Progress</div>
              <div className="flex items-center gap-2">
                <Progress value={delayAnalysis.actualProgress} className="flex-1" />
                <span className="text-sm font-medium">
                  {delayAnalysis.actualProgress.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          {delayAnalysis.predictedDelay > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Predicted Delay</AlertTitle>
              <AlertDescription>
                Current trajectory suggests a {delayAnalysis.predictedDelay} day delay. 
                Review interventions below to get back on track.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Weather Alerts */}
      {weatherAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudRain className="h-5 w-5" />
              Weather Alerts
            </CardTitle>
            <CardDescription>
              Upcoming weather may impact your project timeline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {weatherAlerts.map(alert => (
              <Alert key={alert.id}>
                <MapPin className="h-4 w-4" />
                <AlertTitle className="capitalize">
                  {alert.weatherType} {alert.severity}
                </AlertTitle>
                <AlertDescription>
                  <div className="space-y-2 mt-2">
                    <div className="text-sm">
                      {new Date(alert.startTime).toLocaleDateString()} - {new Date(alert.endTime).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Affected phases:</strong> {alert.affectedPhases.join(', ')}
                    </div>
                    <div>
                      <strong>Recommendations:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {alert.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Delay Factors */}
      <Card>
        <CardHeader>
          <CardTitle>Delay Risk Factors</CardTitle>
          <CardDescription>
            Identified factors that could impact your timeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {delayAnalysis.factors.map((factor, index) => {
              const factorIcons = {
                weather: CloudRain,
                'supply-chain': Package,
                'skill-gap': Wrench,
                'tool-missing': Wrench,
                complexity: AlertTriangle
              };
              const FactorIcon = factorIcons[factor.type] || AlertTriangle;

              return (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <FactorIcon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{factor.description}</div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>Impact: {factor.impact} day(s)</span>
                      <span>Probability: {(factor.probability * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Interventions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Recovery Interventions
          </CardTitle>
          <CardDescription>
            AI-recommended actions to get your project back on track
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {delayAnalysis.interventions.map(intervention => (
              <Card key={intervention.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{intervention.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {intervention.type.replace('-', ' ')}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {[...Array(intervention.priority)].map((_, i) => (
                            <div key={i} className="w-1 h-1 bg-primary rounded-full" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {intervention.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>💡 {intervention.impact}</span>
                        <span>🔧 {intervention.difficulty}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleInterventionApply(intervention)}
                      className="ml-4"
                    >
                      Apply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};