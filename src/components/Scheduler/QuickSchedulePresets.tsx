import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Moon, Sun, Zap, Clock } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  weekendsOnly: boolean;
  weekdaysAfterFivePm: boolean;
  workingHours: {
    start: string;
    end: string;
  };
}

interface QuickSchedulePresetsProps {
  onPresetSelect: (preset: SchedulePreset) => void;
  teamMembers: TeamMember[];
}

export interface SchedulePreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  settings: {
    weekendsOnly: boolean;
    weekdaysAfterFivePm: boolean;
    hoursPerWeek: number;
    workingHours: {
      start: string;
      end: string;
    };
  };
}

const presets: SchedulePreset[] = [
  {
    id: 'weekends',
    name: 'Weekends Only',
    description: 'Work Saturday & Sunday, 8 hours/day',
    icon: <Calendar className="w-5 h-5" />,
    settings: {
      weekendsOnly: true,
      weekdaysAfterFivePm: false,
      hoursPerWeek: 16,
      workingHours: { start: '09:00', end: '17:00' }
    }
  },
  {
    id: 'evenings',
    name: 'Evenings & Weekends',
    description: 'Weekdays after 5pm + full weekends',
    icon: <Moon className="w-5 h-5" />,
    settings: {
      weekendsOnly: false,
      weekdaysAfterFivePm: true,
      hoursPerWeek: 26,
      workingHours: { start: '17:00', end: '21:00' }
    }
  },
  {
    id: 'fulltime',
    name: 'Full Time',
    description: 'Work daily, regular business hours',
    icon: <Sun className="w-5 h-5" />,
    settings: {
      weekendsOnly: false,
      weekdaysAfterFivePm: false,
      hoursPerWeek: 40,
      workingHours: { start: '08:00', end: '17:00' }
    }
  },
  {
    id: 'sprint',
    name: 'Sprint Mode',
    description: 'Maximum hours, every day possible',
    icon: <Zap className="w-5 h-5" />,
    settings: {
      weekendsOnly: false,
      weekdaysAfterFivePm: false,
      hoursPerWeek: 60,
      workingHours: { start: '07:00', end: '19:00' }
    }
  }
];

export const QuickSchedulePresets: React.FC<QuickSchedulePresetsProps> = ({ onPresetSelect, teamMembers }) => {
  // Determine which preset matches the current team member settings
  const getSelectedPresetId = (): string | null => {
    if (teamMembers.length === 0) return null;
    
    const firstMember = teamMembers[0];
    
    // Find preset that matches current settings
    const matchingPreset = presets.find(preset => {
      const settings = preset.settings;
      return (
        settings.weekendsOnly === firstMember.weekendsOnly &&
        settings.weekdaysAfterFivePm === firstMember.weekdaysAfterFivePm &&
        settings.workingHours.start === firstMember.workingHours.start &&
        settings.workingHours.end === firstMember.workingHours.end
      );
    });
    
    return matchingPreset?.id || null;
  };
  
  const selectedPresetId = getSelectedPresetId();
  
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium mb-2">Quick Availability</h3>
        <p className="text-xs text-muted-foreground">Choose a schedule that fits your availability</p>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {presets.map((preset) => {
          const isSelected = selectedPresetId === preset.id;
          return (
            <Card 
              key={preset.id}
              className={`group cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'hover:border-primary hover:shadow-md'
              }`}
              onClick={() => onPresetSelect(preset)}
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={`p-2 rounded-lg transition-transform ${
                    isSelected
                      ? 'bg-primary text-primary-foreground scale-110'
                      : 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary group-hover:scale-110'
                  }`}>
                    {preset.icon}
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <h4 className={`font-semibold text-xs transition-colors ${
                      isSelected 
                        ? 'text-primary' 
                        : 'group-hover:text-primary'
                    }`}>
                      {preset.name}
                    </h4>
                    <p className={`text-[10px] mt-1 leading-tight ${
                      isSelected 
                        ? 'text-primary/80' 
                        : 'text-muted-foreground'
                    }`}>
                      {preset.description}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Badge 
                        variant={isSelected ? 'default' : 'secondary'} 
                        className="text-[10px] font-medium px-1.5 py-0.5"
                      >
                        <Clock className={`w-2.5 h-2.5 mr-1 ${isSelected ? 'text-primary-foreground' : ''}`} />
                        {preset.settings.hoursPerWeek}h
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
