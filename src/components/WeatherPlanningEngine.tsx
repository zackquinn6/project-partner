import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Cloud, Sun, CloudRain, Thermometer, Clock, AlertTriangle } from 'lucide-react';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useToast } from '@/components/ui/use-toast';

interface WeatherData {
  current: {
    temperature_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    humidity: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
  };
}

interface WeatherRecommendation {
  id: string;
  type: 'seasonal' | 'weather' | 'planning';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestedAction: string;
  affectedPhases: string[];
  timeframe: string;
}

interface SeasonalProject {
  name: string;
  optimalSeason: 'spring' | 'summer' | 'fall' | 'winter' | 'year-round';
  reasons: string[];
  weatherRequirements: {
    minTemp?: number;
    maxTemp?: number;
    maxPrecipitation?: number;
    maxHumidity?: number;
  };
}

const seasonalProjects: SeasonalProject[] = [
  {
    name: 'Exterior Painting',
    optimalSeason: 'summer',
    reasons: ['Low humidity for proper drying', 'Stable temperatures', 'Minimal rain'],
    weatherRequirements: { minTemp: 10, maxTemp: 30, maxPrecipitation: 0, maxHumidity: 70 }
  },
  {
    name: 'Roofing Work',
    optimalSeason: 'summer',
    reasons: ['Dry conditions essential', 'Safe working temperatures', 'Long daylight hours'],
    weatherRequirements: { minTemp: 5, maxTemp: 32, maxPrecipitation: 0 }
  },
  {
    name: 'Landscaping',
    optimalSeason: 'spring',
    reasons: ['Plant establishment season', 'Moderate temperatures', 'Natural growth cycle'],
    weatherRequirements: { minTemp: 5, maxTemp: 25 }
  },
  {
    name: 'Concrete Work',
    optimalSeason: 'fall',
    reasons: ['Ideal curing temperatures', 'Lower evaporation rates', 'Stable weather'],
    weatherRequirements: { minTemp: 5, maxTemp: 25, maxPrecipitation: 0 }
  },
  {
    name: 'Interior Renovations',
    optimalSeason: 'year-round',
    reasons: ['Weather independent', 'Controlled environment', 'Flexible scheduling'],
    weatherRequirements: {}
  },
  {
    name: 'Deck Building',
    optimalSeason: 'summer',
    reasons: ['Dry lumber handling', 'Stable foundation conditions', 'Comfortable working'],
    weatherRequirements: { minTemp: 10, maxTemp: 30, maxPrecipitation: 0 }
  }
];

interface WeatherPlanningEngineProps {
  projectRun: ProjectRun;
  onRecommendationApply: (recommendation: WeatherRecommendation) => void;
}

export const WeatherPlanningEngine: React.FC<WeatherPlanningEngineProps> = ({
  projectRun,
  onRecommendationApply
}) => {
  const { toast } = useToast();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [recommendations, setRecommendations] = useState<WeatherRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeatherData();
  }, []);

  useEffect(() => {
    if (weatherData) {
      generateRecommendations();
    }
  }, [weatherData, projectRun]);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      // Using NYC coordinates as default - in production, get user's location
      const lat = 40.7128;
      const lon = -74.0060;
      
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max&timezone=auto&forecast_days=14`
      );
      
      if (!response.ok) {
        throw new Error('Weather API request failed');
      }
      
      const data = await response.json();
      setWeatherData({
        current: {
          temperature_2m: data.current.temperature_2m,
          precipitation: data.current.precipitation,
          weather_code: data.current.weather_code,
          wind_speed_10m: data.current.wind_speed_10m,
          humidity: data.current.relative_humidity_2m
        },
        daily: data.daily
      });
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      toast({
        title: "Weather Data Unavailable",
        description: "Unable to fetch current weather data. Planning recommendations will be limited.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSeason = (): 'spring' | 'summer' | 'fall' | 'winter' => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  };

  const getWeatherDescription = (code: number): string => {
    const weatherCodes: { [key: number]: string } = {
      0: 'Clear sky',
      1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Depositing rime fog',
      51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
      61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
      80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers'
    };
    return weatherCodes[code] || 'Unknown conditions';
  };

  const generateRecommendations = () => {
    if (!weatherData) return;

    const newRecommendations: WeatherRecommendation[] = [];
    const currentSeason = getCurrentSeason();
    
    // Seasonal recommendations
    const projectCategory = projectRun.category || 'general';
    const relevantSeasonalProject = seasonalProjects.find(p => 
      p.name.toLowerCase().includes(projectCategory.toLowerCase()) ||
      projectCategory.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
    ) || seasonalProjects.find(p => p.optimalSeason === 'year-round');

    if (relevantSeasonalProject && relevantSeasonalProject.optimalSeason !== 'year-round') {
      if (relevantSeasonalProject.optimalSeason === currentSeason) {
        newRecommendations.push({
          id: 'seasonal-optimal',
          type: 'seasonal',
          priority: 'medium',
          message: `Perfect timing! ${currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1)} is the optimal season for ${relevantSeasonalProject.name.toLowerCase()}.`,
          suggestedAction: 'Prioritize this project now for best results',
          affectedPhases: ['all'],
          timeframe: 'Current season'
        });
      } else {
        newRecommendations.push({
          id: 'seasonal-suboptimal',
          type: 'seasonal',
          priority: 'low',
          message: `Consider waiting for ${relevantSeasonalProject.optimalSeason} season for optimal ${relevantSeasonalProject.name.toLowerCase()} conditions.`,
          suggestedAction: `Plan for ${relevantSeasonalProject.optimalSeason} season: ${relevantSeasonalProject.reasons.join(', ').toLowerCase()}`,
          affectedPhases: ['all'],
          timeframe: `Next ${relevantSeasonalProject.optimalSeason}`
        });
      }
    }

    // Weather-based recommendations for next 7 days
    for (let i = 0; i < Math.min(7, weatherData.daily.time.length); i++) {
      const date = weatherData.daily.time[i];
      const temp = weatherData.daily.temperature_2m_max[i];
      const precipitation = weatherData.daily.precipitation_sum[i];
      const weatherCode = weatherData.daily.weather_code[i];

      // Rain warnings
      if (precipitation > 0) {
        const dayName = new Date(date).toLocaleDateString('en', { weekday: 'long' });
        newRecommendations.push({
          id: `rain-${i}`,
          type: 'weather',
          priority: precipitation > 5 ? 'high' : 'medium',
          message: `Rain expected ${dayName} (${precipitation.toFixed(1)}mm). Got a backup plan?`,
          suggestedAction: 'Move outdoor work indoors or reschedule exterior tasks',
          affectedPhases: ['exterior-work', 'painting', 'roofing', 'landscaping'],
          timeframe: dayName
        });
      }

      // Temperature warnings
      if (temp < 5) {
        const dayName = new Date(date).toLocaleDateString('en', { weekday: 'long' });
        newRecommendations.push({
          id: `cold-${i}`,
          type: 'weather',
          priority: 'medium',
          message: `Cold temperatures expected ${dayName} (${temp.toFixed(1)}°C). Materials may not perform optimally.`,
          suggestedAction: 'Delay painting, concrete, or adhesive work until warmer',
          affectedPhases: ['painting', 'concrete-work', 'adhesive-work'],
          timeframe: dayName
        });
      }

      if (temp > 32) {
        const dayName = new Date(date).toLocaleDateString('en', { weekday: 'long' });
        newRecommendations.push({
          id: `heat-${i}`,
          type: 'weather',
          priority: 'medium',
          message: `Hot weather expected ${dayName} (${temp.toFixed(1)}°C). Work during cooler hours.`,
          suggestedAction: 'Schedule work for early morning or evening hours',
          affectedPhases: ['exterior-work', 'roofing', 'concrete-work'],
          timeframe: dayName
        });
      }
    }

    // Planning recommendations based on project phases
    const upcomingPhases = projectRun.phases.filter(phase => 
      !projectRun.completedSteps.some(stepId => 
        phase.operations.some(op => 
          op.steps.some(step => step.id === stepId)
        )
      )
    );

    upcomingPhases.forEach(phase => {
      const phaseName = phase.name.toLowerCase();
      
      if (phaseName.includes('exterior') || phaseName.includes('outdoor')) {
        // Check next 3 days for good weather windows
        const goodWeatherDays = [];
        for (let i = 0; i < 3; i++) {
          const temp = weatherData.daily.temperature_2m_max[i];
          const precipitation = weatherData.daily.precipitation_sum[i];
          if (precipitation < 0.1 && temp > 10 && temp < 30) {
            goodWeatherDays.push(new Date(weatherData.daily.time[i]).toLocaleDateString('en', { weekday: 'short' }));
          }
        }

        if (goodWeatherDays.length > 0) {
          newRecommendations.push({
            id: `planning-${phase.id}`,
            type: 'planning',
            priority: 'medium',
            message: `Optimal weather window for "${phase.name}" coming up: ${goodWeatherDays.join(', ')}.`,
            suggestedAction: 'Schedule this phase during the favorable weather window',
            affectedPhases: [phase.id],
            timeframe: 'Next 3 days'
          });
        }
      }
    });

    setRecommendations(newRecommendations);
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <Sun className="h-4 w-4" />;
      default:
        return <Sun className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Weather Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather Planning & Seasonality
          </CardTitle>
          <CardDescription>
            Smart project planning based on weather conditions and seasonal optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weatherData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <Thermometer className="h-6 w-6 mx-auto mb-1 text-orange-500" />
                <div className="text-2xl font-bold">{weatherData.current.temperature_2m.toFixed(1)}°C</div>
                <div className="text-sm text-muted-foreground">Temperature</div>
              </div>
              <div className="text-center">
                <CloudRain className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                <div className="text-2xl font-bold">{weatherData.current.precipitation.toFixed(1)}mm</div>
                <div className="text-sm text-muted-foreground">Precipitation</div>
              </div>
              <div className="text-center">
                <Sun className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
                <div className="text-lg font-semibold">{getCurrentSeason().charAt(0).toUpperCase() + getCurrentSeason().slice(1)}</div>
                <div className="text-sm text-muted-foreground">Season</div>
              </div>
              <div className="text-center">
                <Calendar className="h-6 w-6 mx-auto mb-1 text-primary" />
                <div className="text-lg font-semibold">{getWeatherDescription(weatherData.current.weather_code)}</div>
                <div className="text-sm text-muted-foreground">Conditions</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Recommendations</CardTitle>
          <CardDescription>
            Weather-informed planning suggestions for your project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No specific weather recommendations at this time. Current conditions are suitable for most project work.
              </div>
            ) : (
              recommendations.map((rec) => (
                <Alert key={rec.id} className="border-l-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getPriorityIcon(rec.priority)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getPriorityColor(rec.priority) as any}>
                            {rec.priority.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{rec.type}</Badge>
                          <span className="text-sm text-muted-foreground">{rec.timeframe}</span>
                        </div>
                        <AlertDescription className="mb-2">
                          <strong>{rec.message}</strong>
                        </AlertDescription>
                        <div className="text-sm text-muted-foreground">
                          💡 {rec.suggestedAction}
                        </div>
                        {rec.affectedPhases.length > 0 && rec.affectedPhases[0] !== 'all' && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Affects: {rec.affectedPhases.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRecommendationApply(rec)}
                      className="ml-2"
                    >
                      Apply
                    </Button>
                  </div>
                </Alert>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Project Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Project Guide</CardTitle>
          <CardDescription>
            When different types of projects perform best throughout the year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {seasonalProjects.map((project, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{project.name}</h4>
                  <Badge variant={project.optimalSeason === getCurrentSeason() ? 'default' : 'secondary'}>
                    {project.optimalSeason}
                  </Badge>
                </div>
                <ul className="text-sm space-y-1">
                  {project.reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-primary text-xs mt-1">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};