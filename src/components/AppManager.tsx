import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Edit, Save, X, Plus, Trash2, ExternalLink, Globe } from 'lucide-react';
import { AppReference } from '@/interfaces/Project';
import { getAllNativeApps, NATIVE_APPS } from '@/utils/appsRegistry';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface AppManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Workspace apps that aren't in the native apps registry
const WORKSPACE_APPS: Record<string, Omit<AppReference, 'id'>> = {
  'task-manager': {
    appName: 'Task Manager',
    appType: 'native',
    icon: 'ListChecks',
    description: 'Create, organize, and track tasks across your home',
    actionKey: 'task-manager',
    displayOrder: 10
  },
  'project-catalog': {
    appName: 'Project Catalog',
    appType: 'native',
    icon: 'BookOpen',
    description: 'Browse available project templates',
    actionKey: 'project-catalog',
    displayOrder: 11
  },
  'progress-board': {
    appName: 'Progress Board',
    appType: 'native',
    icon: 'FolderOpen',
    description: 'View and manage your active projects',
    actionKey: 'progress-board',
    displayOrder: 12
  },
  'home-maintenance': {
    appName: 'Home Maintenance',
    appType: 'native',
    icon: 'Home',
    description: 'Schedule and track home maintenance tasks',
    actionKey: 'home-maintenance',
    displayOrder: 13
  }
};

export function AppManager({ open, onOpenChange }: AppManagerProps) {
  const [nativeApps, setNativeApps] = useState<AppReference[]>([]);
  const [externalApps, setExternalApps] = useState<AppReference[]>([]);
  const [editingApp, setEditingApp] = useState<AppReference | null>(null);
  const [editForm, setEditForm] = useState<Partial<AppReference>>({});
  const [loading, setLoading] = useState(true);
  const [showAddExternal, setShowAddExternal] = useState(false);
  const [newExternalApp, setNewExternalApp] = useState({
    appName: '',
    description: '',
    appType: 'external-link' as 'external-embed' | 'external-link',
    url: '',
    icon: 'ExternalLink',
    openInNewTab: true
  });

  // Load all apps on mount
  useEffect(() => {
    if (open) {
      loadApps();
    }
  }, [open]);

  const loadApps = async () => {
    setLoading(true);
    try {
      // Load native apps (including workspace apps)
      const allNativeApps = getAllNativeApps();
      const workspaceAppsList = Object.keys(WORKSPACE_APPS).map(key => ({
        id: `app-${key}`,
        ...WORKSPACE_APPS[key]
      }));
      setNativeApps([...allNativeApps, ...workspaceAppsList]);

      // Load external apps from all project templates
      const { data: stepsData, error } = await supabase
        .from('template_steps')
        .select('apps')
        .not('apps', 'is', null);

      if (error) throw error;

      // Aggregate unique external apps
      const externalAppsSet = new Map<string, AppReference>();
      
      stepsData?.forEach(step => {
        if (step.apps && Array.isArray(step.apps)) {
          step.apps.forEach((app: any) => {
            if (app.appType && app.appType !== 'native' && app.id) {
              // Use id as key to avoid duplicates
              if (!externalAppsSet.has(app.id)) {
                externalAppsSet.set(app.id, app as AppReference);
              }
            }
          });
        }
      });

      setExternalApps(Array.from(externalAppsSet.values()));
    } catch (error) {
      console.error('Error loading apps:', error);
      toast.error('Failed to load apps');
    } finally {
      setLoading(false);
    }
  };

  const getIconComponent = (iconName: string): LucideIcon => {
    const Icon = (Icons as any)[iconName];
    return Icon || Icons.Sparkles;
  };

  const handleEditNative = (app: AppReference) => {
    setEditingApp(app);
    setEditForm({
      appName: app.appName,
      description: app.description,
      icon: app.icon
    });
  };

  const handleSaveNative = async () => {
    if (!editingApp) return;

    try {
      // Extract actionKey from app.id (format: "app-{actionKey}") or use app.id
      const appId = editingApp.id.startsWith('app-') 
        ? editingApp.id.replace('app-', '') 
        : editingApp.id;
      const actionKey = editingApp.actionKey || appId;

      // Upsert app override in database (this will trigger update in all template_steps)
      const { error: upsertError } = await supabase
        .from('app_overrides')
        .upsert({
          app_id: actionKey, // Use actionKey as the primary identifier
          app_name: editForm.appName || editingApp.appName,
          description: editForm.description || editingApp.description,
          icon: editForm.icon || editingApp.icon,
          display_order: editingApp.displayOrder || 1,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'app_id'
        });

      if (upsertError) throw upsertError;

      // Manually trigger the update function to update all template_steps
      const { error: updateError } = await supabase.rpc('update_app_names_in_templates', {
        p_app_id: actionKey,
        p_app_name: editForm.appName || editingApp.appName,
        p_description: editForm.description || editingApp.description,
        p_icon: editForm.icon || editingApp.icon
      });

      if (updateError) {
        console.error('Error updating templates:', updateError);
        // Don't throw - the trigger should have handled it, but log the error
      }

      // Rebuild phases JSON for all project templates to refresh app names
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id')
        .eq('is_standard_template', false);

      // Update in background (don't await - let it happen async)
      if (projectsData && projectsData.length > 0) {
        Promise.all(
          projectsData.map(project => 
            supabase.rpc('rebuild_phases_json_from_project_phases', {
              p_project_id: project.id
            })
          )
        ).catch(err => console.error('Error rebuilding project phases:', err));
      }

      toast.success(`App "${editForm.appName || editingApp.appName}" updated in all project templates`);
      
      // Update local state
      setNativeApps(prev => prev.map(app => 
        app.id === editingApp.id 
          ? { ...app, ...editForm }
          : app
      ));
      
      setEditingApp(null);
      setEditForm({});
      loadApps(); // Reload to get fresh data
    } catch (error) {
      console.error('Error saving native app:', error);
      toast.error(`Failed to save app: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditExternal = (app: AppReference) => {
    setEditingApp(app);
    setEditForm({
      appName: app.appName,
      description: app.description,
      icon: app.icon,
      embedUrl: app.embedUrl,
      linkUrl: app.linkUrl,
      openInNewTab: app.openInNewTab
    });
  };

  const handleSaveExternal = async () => {
    if (!editingApp) return;

    try {
      // Update external app in all template_steps that use it
      const { data: stepsData, error: fetchError } = await supabase
        .from('template_steps')
        .select('id, apps')
        .not('apps', 'is', null);

      if (fetchError) throw fetchError;

      let updatedCount = 0;
      for (const step of stepsData || []) {
        if (step.apps && Array.isArray(step.apps)) {
          const updatedApps = step.apps.map((app: any) => {
            if (app.id === editingApp.id) {
              return {
                ...app,
                ...editForm,
                embedUrl: editForm.embedUrl || app.embedUrl,
                linkUrl: editForm.linkUrl || app.linkUrl
              };
            }
            return app;
          });

          const hasChanges = JSON.stringify(updatedApps) !== JSON.stringify(step.apps);
          if (hasChanges) {
            const { error: updateError } = await supabase
              .from('template_steps')
              .update({ apps: updatedApps, updated_at: new Date().toISOString() })
              .eq('id', step.id);

            if (updateError) {
              console.error(`Error updating step ${step.id}:`, updateError);
            } else {
              updatedCount++;
            }
          }
        }
      }

      // Rebuild phases JSON for affected projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id')
        .not('id', 'eq', '00000000-0000-0000-0000-000000000001');

      for (const project of projectsData || []) {
        await supabase.rpc('rebuild_phases_json_from_templates', {
          p_project_id: project.id
        });
      }

      toast.success(`External app updated in ${updatedCount} workflow step(s)`);
      
      // Update local state
      setExternalApps(prev => prev.map(app => 
        app.id === editingApp.id 
          ? { ...app, ...editForm } as AppReference
          : app
      ));
      
      setEditingApp(null);
      setEditForm({});
      loadApps(); // Reload to get fresh data
    } catch (error) {
      console.error('Error saving external app:', error);
      toast.error('Failed to save app');
    }
  };

  const handleAddExternal = async () => {
    if (!newExternalApp.appName.trim() || !newExternalApp.url.trim()) {
      toast.error('Please fill in app name and URL');
      return;
    }

    const newApp: AppReference = {
      id: `external-${Date.now()}`,
      appName: newExternalApp.appName,
      appType: newExternalApp.appType,
      icon: newExternalApp.icon,
      description: newExternalApp.description || undefined,
      embedUrl: newExternalApp.appType === 'external-embed' ? newExternalApp.url : undefined,
      linkUrl: newExternalApp.appType === 'external-link' ? newExternalApp.url : undefined,
      openInNewTab: newExternalApp.appType === 'external-link' ? newExternalApp.openInNewTab : undefined,
      displayOrder: 999
    };

    // Add to external apps list (it will be saved when added to a workflow step)
    setExternalApps(prev => [...prev, newApp]);
    
    // Reset form
    setNewExternalApp({
      appName: '',
      description: '',
      appType: 'external-link',
      url: '',
      icon: 'ExternalLink',
      openInNewTab: true
    });
    setShowAddExternal(false);
    
    toast.success('External app added. It will be available when adding apps to workflow steps.');
  };

  const handleDeleteExternal = async (app: AppReference) => {
    if (!confirm(`Are you sure you want to delete "${app.appName}"? This will remove it from all workflow steps.`)) {
      return;
    }

    try {
      // Remove from all template_steps
      const { data: stepsData, error: fetchError } = await supabase
        .from('template_steps')
        .select('id, apps')
        .not('apps', 'is', null);

      if (fetchError) throw fetchError;

      let updatedCount = 0;
      for (const step of stepsData || []) {
        if (step.apps && Array.isArray(step.apps)) {
          const updatedApps = step.apps.filter((a: any) => a.id !== app.id);
          
          if (updatedApps.length !== step.apps.length) {
            const { error: updateError } = await supabase
              .from('template_steps')
              .update({ apps: updatedApps, updated_at: new Date().toISOString() })
              .eq('id', step.id);

            if (updateError) {
              console.error(`Error updating step ${step.id}:`, updateError);
            } else {
              updatedCount++;
            }
          }
        }
      }

      // Rebuild phases JSON for affected projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id')
        .not('id', 'eq', '00000000-0000-0000-0000-000000000001');

      for (const project of projectsData || []) {
        await supabase.rpc('rebuild_phases_json_from_templates', {
          p_project_id: project.id
        });
      }

      toast.success(`External app removed from ${updatedCount} workflow step(s)`);
      
      setExternalApps(prev => prev.filter(a => a.id !== app.id));
      loadApps(); // Reload to get fresh data
    } catch (error) {
      console.error('Error deleting external app:', error);
      toast.error('Failed to delete app');
    }
  };

  const iconOptions = [
    'ExternalLink', 'Link', 'Globe', 'Sparkles', 'Zap', 
    'Tool', 'Settings', 'FileText', 'Image', 'Video',
    'Home', 'User', 'Calendar', 'ShoppingCart', 'DollarSign',
    'TrendingUp', 'Wrench', 'Hammer', 'ListChecks', 'BookOpen',
    'FolderOpen', 'Package'
  ];

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg md:text-xl font-bold">Loading...</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onOpenChange(false)} 
                className="h-7 px-2 text-[9px] md:text-xs"
              >
                Close
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading apps...</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl font-bold">App Manager</DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)} 
              className="h-7 px-2 text-[9px] md:text-xs"
            >
              Close
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
          <Tabs defaultValue="native" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="native" className="text-xs md:text-sm">
                Native Apps ({nativeApps.length})
              </TabsTrigger>
              <TabsTrigger value="external" className="text-xs md:text-sm">
                External Apps ({externalApps.length})
              </TabsTrigger>
              <TabsTrigger value="add" className="text-xs md:text-sm">
                Add External App
              </TabsTrigger>
            </TabsList>

            <TabsContent value="native" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Native Apps</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Built-in Project Partner apps. Changes require code updates to persist.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Icon</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-24">Type</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nativeApps.map((app) => {
                          const IconComponent = getIconComponent(app.icon);
                          const isEditing = editingApp?.id === app.id;
                          
                          return (
                            <TableRow key={app.id}>
                              <TableCell>
                                {isEditing ? (
                                  <Select
                                    value={editForm.icon || app.icon}
                                    onValueChange={(value) => setEditForm({ ...editForm, icon: value })}
                                  >
                                    <SelectTrigger className="h-8 w-24">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {iconOptions.map(icon => {
                                        const Icon = getIconComponent(icon);
                                        return (
                                          <SelectItem key={icon} value={icon}>
                                            <div className="flex items-center gap-2">
                                              <Icon className="w-4 h-4" />
                                              <span>{icon}</span>
                                            </div>
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <IconComponent className="w-4 h-4 text-primary" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={editForm.appName || app.appName}
                                    onChange={(e) => setEditForm({ ...editForm, appName: e.target.value })}
                                    className="h-8"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{app.appName}</span>
                                    {app.isBeta && (
                                      <Badge variant="secondary" className="text-[10px]">BETA</Badge>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Textarea
                                    value={editForm.description || app.description || ''}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    className="min-h-[60px] text-sm"
                                    placeholder="App description"
                                  />
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    {app.description || 'No description'}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {app.appType}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleSaveNative}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Save className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingApp(null);
                                        setEditForm({});
                                      }}
                                      className="h-7 w-7 p-0"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditNative(app)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="external" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">External Apps</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    External apps found in project templates. Changes will update all workflow steps using these apps.
                  </p>
                </CardHeader>
                <CardContent>
                  {externalApps.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No external apps found in project templates.</p>
                      <p className="text-sm mt-2">Add external apps using the "Add External App" tab.</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Icon</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>URL</TableHead>
                            <TableHead className="w-24">Type</TableHead>
                            <TableHead className="w-32">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {externalApps.map((app) => {
                            const IconComponent = getIconComponent(app.icon);
                            const isEditing = editingApp?.id === app.id;
                            
                            return (
                              <TableRow key={app.id}>
                                <TableCell>
                                  {isEditing ? (
                                    <Select
                                      value={editForm.icon || app.icon}
                                      onValueChange={(value) => setEditForm({ ...editForm, icon: value })}
                                    >
                                      <SelectTrigger className="h-8 w-24">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {iconOptions.map(icon => {
                                          const Icon = getIconComponent(icon);
                                          return (
                                            <SelectItem key={icon} value={icon}>
                                              <div className="flex items-center gap-2">
                                                <Icon className="w-4 h-4" />
                                                <span>{icon}</span>
                                              </div>
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                      <IconComponent className="w-4 h-4 text-primary" />
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <Input
                                      value={editForm.appName || app.appName}
                                      onChange={(e) => setEditForm({ ...editForm, appName: e.target.value })}
                                      className="h-8"
                                    />
                                  ) : (
                                    <span className="font-medium">{app.appName}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <Textarea
                                      value={editForm.description || app.description || ''}
                                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                      className="min-h-[60px] text-sm"
                                      placeholder="App description"
                                    />
                                  ) : (
                                    <span className="text-sm text-muted-foreground">
                                      {app.description || 'No description'}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <Input
                                      value={editForm.embedUrl || editForm.linkUrl || app.embedUrl || app.linkUrl || ''}
                                      onChange={(e) => {
                                        if (app.appType === 'external-embed') {
                                          setEditForm({ ...editForm, embedUrl: e.target.value });
                                        } else {
                                          setEditForm({ ...editForm, linkUrl: e.target.value });
                                        }
                                      }}
                                      className="h-8 text-xs"
                                      placeholder="URL"
                                    />
                                  ) : (
                                    <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                                      {app.embedUrl || app.linkUrl || 'No URL'}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {app.appType === 'external-embed' ? 'Embed' : 'Link'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleSaveExternal}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Save className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingApp(null);
                                          setEditForm({});
                                        }}
                                        className="h-7 w-7 p-0"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditExternal(app)}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteExternal(app)}
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="add" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add External App</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Create a new external app that can be added to workflow steps.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="new-app-name">App Name *</Label>
                    <Input
                      id="new-app-name"
                      value={newExternalApp.appName}
                      onChange={(e) => setNewExternalApp({ ...newExternalApp, appName: e.target.value })}
                      placeholder="e.g., Cost Calculator"
                    />
                  </div>

                  <div>
                    <Label htmlFor="new-app-description">Description</Label>
                    <Textarea
                      id="new-app-description"
                      value={newExternalApp.description}
                      onChange={(e) => setNewExternalApp({ ...newExternalApp, description: e.target.value })}
                      placeholder="Brief description of the app"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>App Type *</Label>
                    <RadioGroup 
                      value={newExternalApp.appType} 
                      onValueChange={(value) => setNewExternalApp({ ...newExternalApp, appType: value as 'external-embed' | 'external-link' })}
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
                    <Label htmlFor="new-app-url">
                      {newExternalApp.appType === 'external-embed' ? 'Embed URL *' : 'Link URL *'}
                    </Label>
                    <Input
                      id="new-app-url"
                      value={newExternalApp.url}
                      onChange={(e) => setNewExternalApp({ ...newExternalApp, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="new-app-icon">Icon</Label>
                    <Select 
                      value={newExternalApp.icon} 
                      onValueChange={(value) => setNewExternalApp({ ...newExternalApp, icon: value })}
                    >
                      <SelectTrigger id="new-app-icon">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {iconOptions.map((icon) => {
                          const IconComponent = getIconComponent(icon);
                          return (
                            <SelectItem key={icon} value={icon}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="w-4 h-4" />
                                <span>{icon}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {newExternalApp.appType === 'external-link' && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="open-new-tab"
                        checked={newExternalApp.openInNewTab}
                        onChange={(e) => setNewExternalApp({ ...newExternalApp, openInNewTab: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="open-new-tab" className="font-normal cursor-pointer">
                        Open in new tab
                      </Label>
                    </div>
                  )}

                  <Button onClick={handleAddExternal} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add External App
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

