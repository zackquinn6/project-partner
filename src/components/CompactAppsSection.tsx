import { AppReference } from '@/interfaces/Project';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ExternalLink, X, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
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
    if (!iconName) return Sparkles;
    
    // Try exact match first
    let Icon = (LucideIcons as any)[iconName];
    
    // If not found, try with first letter capitalized (common lucide pattern)
    if (!Icon && iconName.length > 0) {
      const capitalized = iconName.charAt(0).toUpperCase() + iconName.slice(1);
      Icon = (LucideIcons as any)[capitalized];
    }
    
    // If still not found, try all lowercase
    if (!Icon) {
      Icon = (LucideIcons as any)[iconName.toLowerCase()];
    }
    
    // Try matching case-insensitive
    if (!Icon) {
      const iconKeys = Object.keys(LucideIcons);
      const matchedKey = iconKeys.find(key => key.toLowerCase() === iconName.toLowerCase());
      if (matchedKey) {
        Icon = (LucideIcons as any)[matchedKey];
      }
    }
    
    return Icon || Sparkles;
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
          const IconComponent = getIconComponent(app.icon || 'Sparkles');
          
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
                <div className="w-7 h-7 rounded-lg bg-primary/25 dark:bg-primary/35 flex items-center justify-center border-2 border-primary/60 dark:border-primary/70 shadow-md icon-container">
                  <IconComponent 
                    className="w-4 h-4 flex-shrink-0 text-primary app-icon"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
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
