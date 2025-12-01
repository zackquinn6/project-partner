import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppReference } from '@/interfaces/Project';
import { getAllNativeApps } from '@/utils/appsRegistry';
import { supabase } from '@/integrations/supabase/client';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { Check, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AppsLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedApps: AppReference[];
  onAppsSelected: (apps: AppReference[]) => void;
}

export const AppsLibraryDialog = ({
  open,
  onOpenChange,
  selectedApps,
  onAppsSelected
}: AppsLibraryDialogProps) => {
  const [tempSelected, setTempSelected] = useState<AppReference[]>(selectedApps);
  const [nativeApps, setNativeApps] = useState<AppReference[]>([]);
  
  // Load native apps with overrides from database (same logic as AppManager)
  useEffect(() => {
    const loadAppsWithOverrides = async () => {
      try {
        // Load app overrides from database
        const {
          data: appOverrides,
          error: overrideError
        } = await supabase.from('app_overrides').select('*');
        
        const overrideMap = new Map<string, {
          app_name: string;
          description?: string;
          icon?: string;
        }>();
        
        if (!overrideError && appOverrides) {
          appOverrides.forEach(override => {
            overrideMap.set(override.app_id, override);
          });
        }

        // Load native apps and apply overrides
        const allNativeApps = getAllNativeApps();
        const appsWithOverrides = allNativeApps.map(app => {
          const actionKey = app.actionKey || app.id.replace('app-', '');
          const override = overrideMap.get(actionKey);
          if (override) {
            // Apply override from database (updated app name/description/icon)
            return {
              ...app,
              appName: override.app_name,
              description: override.description || app.description,
              icon: override.icon || app.icon
            };
          }
          return app;
        });
        
        // Sort native apps alphabetically by name
        const sortedApps = [...appsWithOverrides].sort((a, b) => {
          const nameA = (a.appName || '').toLowerCase();
          const nameB = (b.appName || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        setNativeApps(sortedApps);
      } catch (error) {
        console.error('Error loading apps with overrides:', error);
        // Fallback to basic native apps if override loading fails
        const allNativeApps = getAllNativeApps();
        const sortedApps = [...allNativeApps].sort((a, b) => {
          const nameA = (a.appName || '').toLowerCase();
          const nameB = (b.appName || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setNativeApps(sortedApps);
      }
    };
    
    if (open) {
      loadAppsWithOverrides();
      setTempSelected(selectedApps);
    }
  }, [open, selectedApps]);
  
  // External app form state
  const [externalAppName, setExternalAppName] = useState('');
  const [externalAppType, setExternalAppType] = useState<'external-embed' | 'external-link'>('external-link');
  const [externalAppUrl, setExternalAppUrl] = useState('');
  const [externalAppIcon, setExternalAppIcon] = useState('ExternalLink');
  const [externalAppDescription, setExternalAppDescription] = useState('');

  const getIconComponent = (iconName: string): LucideIcon => {
    const Icon = (Icons as any)[iconName];
    return Icon || Icons.Sparkles;
  };

  const isSelected = (appId: string) => {
    return tempSelected.some(app => app.id === appId);
  };

  const toggleApp = (app: AppReference) => {
    if (isSelected(app.id)) {
      setTempSelected(tempSelected.filter(a => a.id !== app.id));
    } else {
      setTempSelected([...tempSelected, app]);
    }
  };

  const handleSave = () => {
    console.log('📱 AppsLibraryDialog: Saving apps', {
      count: tempSelected.length,
      apps: tempSelected.map(a => ({ id: a.id, name: a.appName }))
    });
    onAppsSelected(tempSelected);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempSelected(selectedApps);
    onOpenChange(false);
  };

  const handleAddExternalApp = () => {
    if (!externalAppName.trim() || !externalAppUrl.trim()) {
      toast.error('Please fill in app name and URL');
      return;
    }

    const newApp: AppReference = {
      id: `external-${Date.now()}`,
      appName: externalAppName,
      appType: externalAppType,
      icon: externalAppIcon,
      description: externalAppDescription || undefined,
      embedUrl: externalAppType === 'external-embed' ? externalAppUrl : undefined,
      linkUrl: externalAppType === 'external-link' ? externalAppUrl : undefined,
      openInNewTab: externalAppType === 'external-link' ? true : undefined,
      displayOrder: 999
    };

    setTempSelected([...tempSelected, newApp]);
    
    // Reset form
    setExternalAppName('');
    setExternalAppUrl('');
    setExternalAppIcon('ExternalLink');
    setExternalAppDescription('');
    
    toast.success('External app added');
  };

  // Common icon options for external apps
  const iconOptions = [
    'ExternalLink', 'Link', 'Globe', 'Sparkles', 'Zap', 
    'Tool', 'Settings', 'FileText', 'Image', 'Video'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Apps to Workflow Step</DialogTitle>
          <DialogDescription>
            Select apps to help users complete this step
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="native" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="native">Native Apps</TabsTrigger>
            <TabsTrigger value="external">External Apps</TabsTrigger>
          </TabsList>

          <TabsContent value="native" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nativeApps.map((app) => {
                const IconComponent = getIconComponent(app.icon);
                const selected = isSelected(app.id);
                
                return (
                  <Card
                    key={app.id}
                    className={`cursor-pointer transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50 hover:shadow-sm'
                    }`}
                    onClick={() => toggleApp(app)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div 
                          className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            selected ? 'bg-primary/20' : 'bg-primary/10'
                          }`}
                        >
                          <IconComponent 
                            className={`w-6 h-6 ${
                              selected ? 'text-primary' : 'text-primary/70'
                            }`}
                            fill="none"
                            stroke="currentColor"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{app.appName}</h4>
                              {app.isBeta && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  BETA
                                </Badge>
                              )}
                            </div>
                            {selected && (
                              <Check className="w-5 h-5 text-primary flex-shrink-0" />
                            )}
                          </div>
                          {app.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {app.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="external" className="mt-4 space-y-4">
            <Card className="border-2 border-dashed">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="w-5 h-5" />
                  <h3 className="font-semibold">Add External App</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="app-name">App Name *</Label>
                    <Input
                      id="app-name"
                      placeholder="e.g., Cost Calculator"
                      value={externalAppName}
                      onChange={(e) => setExternalAppName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="app-description">Description</Label>
                    <Input
                      id="app-description"
                      placeholder="Brief description of the app"
                      value={externalAppDescription}
                      onChange={(e) => setExternalAppDescription(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>App Type *</Label>
                    <RadioGroup 
                      value={externalAppType} 
                      onValueChange={(value) => setExternalAppType(value as 'external-embed' | 'external-link')}
                      className="flex gap-4 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="external-link" id="type-link" />
                        <Label htmlFor="type-link" className="font-normal cursor-pointer">
                          Link (Opens in new tab)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="external-embed" id="type-embed" />
                        <Label htmlFor="type-embed" className="font-normal cursor-pointer">
                          Embed (iFrame)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="app-url">
                      {externalAppType === 'external-embed' ? 'Embed URL *' : 'Link URL *'}
                    </Label>
                    <Input
                      id="app-url"
                      placeholder="https://..."
                      value={externalAppUrl}
                      onChange={(e) => setExternalAppUrl(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="app-icon">Icon</Label>
                    <Select value={externalAppIcon} onValueChange={setExternalAppIcon}>
                      <SelectTrigger id="app-icon">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {iconOptions.map((icon) => {
                          const IconComponent = getIconComponent(icon);
                          return (
                            <SelectItem key={icon} value={icon}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="w-4 h-4" fill="none" stroke="currentColor" />
                                <span>{icon}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleAddExternalApp} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add External App
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Show selected external apps */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Selected External Apps</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tempSelected
                  .filter(app => app.appType !== 'native')
                  .sort((a, b) => {
                    const nameA = (a.appName || '').toLowerCase();
                    const nameB = (b.appName || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                  })
                  .map((app) => {
                    const IconComponent = getIconComponent(app.icon);
                    return (
                      <Card
                        key={app.id}
                        className="border-primary bg-primary/5"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/20">
                              <IconComponent className="w-6 h-6 text-primary" fill="none" stroke="currentColor" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-medium text-sm">{app.appName}</h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setTempSelected(tempSelected.filter(a => a.id !== app.id))}
                                >
                                  Remove
                                </Button>
                              </div>
                              {app.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {app.description}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {app.appType === 'external-embed' ? 'Embed' : 'Link'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {tempSelected.length} app{tempSelected.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Apps
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
