import { AppReference } from '@/interfaces/Project';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ExternalLink, X } from 'lucide-react';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface CompactAppsSectionProps {
  apps: AppReference[];
  onAppsChange: (apps: AppReference[]) => void;
  onAddApp: () => void;
  onLaunchApp: (app: AppReference) => void;
  editMode?: boolean;
}

export const CompactAppsSection = ({
  apps,
  onAppsChange,
  onAddApp,
  onLaunchApp,
  editMode = false
}: CompactAppsSectionProps) => {
  
  const getIconComponent = (iconName: string): LucideIcon => {
    const Icon = (Icons as any)[iconName];
    return Icon || Icons.Sparkles;
  };

  const handleRemoveApp = (appId: string) => {
    onAppsChange(apps.filter(app => app.id !== appId));
  };

  if (!apps || apps.length === 0) {
    if (!editMode) return null;
    
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No apps added yet</p>
        <Button onClick={onAddApp} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add App
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {apps.map((app) => {
          const IconComponent = getIconComponent(app.icon);
          
          return (
            <Card
              key={app.id}
              className="relative group cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-border/50 hover:border-primary/50"
              onClick={() => !editMode && onLaunchApp(app)}
            >
              {editMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveApp(app.id);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
              
              <div className="flex flex-col items-center justify-center p-2 space-y-1">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
                  <IconComponent className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
                </div>
                
                <div className="text-center">
                  <p className="text-[10px] font-medium line-clamp-2 leading-tight">
                    {app.appName}
                  </p>
                  {app.isBeta && (
                    <Badge variant="secondary" className="text-[8px] px-1 py-0 mt-0.5">
                      BETA
                    </Badge>
                  )}
                </div>
                
                {app.appType === 'external-link' && (
                  <ExternalLink className="w-2 h-2 text-muted-foreground" />
                )}
              </div>
            </Card>
          );
        })}
      </div>
      
      {editMode && (
        <Button onClick={onAddApp} variant="outline" size="sm" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add App
        </Button>
      )}
    </div>
  );
};
