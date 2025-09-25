import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Layers, AlertTriangle } from 'lucide-react';
import { Project } from '@/interfaces/Project';

interface MemoizedProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
  getDifficultyColor: (difficulty: string) => string;
  getIconForCategory: (category: string) => React.ComponentType<any>;
  isAdminMode?: boolean;
}

export const MemoizedProjectCard = React.memo<MemoizedProjectCardProps>(({ 
  project, 
  onSelect, 
  getDifficultyColor, 
  getIconForCategory,
  isAdminMode = false
}) => {
  const IconComponent = getIconForCategory(project.category || '');
  const difficulty = (project as any).difficulty || 'Beginner'; // Temporary type assertion
  
  return (
    <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105">
      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <IconComponent className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {project.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={getDifficultyColor(difficulty)}>
                  {difficulty}
                </Badge>
                {project.category && (
                  <Badge variant="secondary">
                    {project.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {(project as any).publishStatus === 'beta-testing' && (
            <div className="flex items-center space-x-1 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">BETA</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <CardDescription className="line-clamp-2">
          {project.description}
        </CardDescription>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{project.estimatedTime || 'Time varies'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Layers className="w-4 h-4" />
            <span>{project.phases?.length || 0} phases</span>
          </div>
        </div>
        
        <Button 
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          variant="outline"
          onClick={() => onSelect(project)}
        >
          {isAdminMode ? 'Edit Project' : 'Start Project'}
        </Button>
      </CardContent>
    </Card>
  );
});

MemoizedProjectCard.displayName = 'MemoizedProjectCard';