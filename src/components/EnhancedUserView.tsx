import React, { useState } from 'react';
import UserView from './UserView';
import { WeatherPlanningEngine } from './WeatherPlanningEngine';
import { GoogleCalendarIntegration } from './GoogleCalendarIntegration';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Cloud, Calendar } from 'lucide-react';

interface EnhancedUserViewProps {
  resetToListing?: boolean;
  forceListingMode?: boolean;
  onProjectSelected?: () => void;
  projectRunId?: string;
}

export const EnhancedUserView: React.FC<EnhancedUserViewProps> = (props) => {
  const [showWeatherPlanning, setShowWeatherPlanning] = useState(false);
  const [showCalendarIntegration, setShowCalendarIntegration] = useState(false);
  const [currentProjectRun, setCurrentProjectRun] = useState<ProjectRun | null>(null);

  const handleWeatherRecommendationApply = (recommendation: any) => {
    console.log('Applying weather recommendation:', recommendation);
    // Logic to apply the recommendation to the project schedule
  };

  const handleCalendarEventCreated = (event: any) => {
    console.log('Calendar event created:', event);
    // Logic to sync with project timeline
  };

  const handleProjectRunChange = (projectRun: ProjectRun | null) => {
    setCurrentProjectRun(projectRun);
  };

  return (
    <div className="relative">
      {/* Enhanced toolbar */}
      {currentProjectRun && (
        <div className="fixed top-20 right-4 z-50 space-y-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowWeatherPlanning(true)}
            className="bg-background/95 backdrop-blur-sm shadow-md"
          >
            <Cloud className="h-4 w-4 mr-2" />
            Weather Planning
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCalendarIntegration(true)}
            className="bg-background/95 backdrop-blur-sm shadow-md"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Google Calendar
          </Button>
        </div>
      )}

      {/* Main UserView */}
      <UserView 
        {...props}
        onProjectRunChange={handleProjectRunChange}
      />

      {/* Weather Planning Dialog */}
      {currentProjectRun && (
        <WeatherPlanningEngine
          projectRun={currentProjectRun}
          onRecommendationApply={handleWeatherRecommendationApply}
        />
      )}

      {/* Google Calendar Integration Dialog */}
      {currentProjectRun && (
        <GoogleCalendarIntegration
          projectRun={currentProjectRun}
          onEventCreated={handleCalendarEventCreated}
          open={showCalendarIntegration}
          onOpenChange={setShowCalendarIntegration}
        />
      )}
    </div>
  );
};