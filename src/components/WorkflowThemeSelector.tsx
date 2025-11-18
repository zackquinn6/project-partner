import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Palette, Moon, Sun } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export type ThemeMode = 'light' | 'dark';
export type ColorScheme = 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'red';

interface WorkflowThemeSelectorProps {
  projectRunId?: string;
}

export function WorkflowThemeSelector({ projectRunId }: WorkflowThemeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [themeMode, setThemeMode] = useLocalStorage<ThemeMode>(
    projectRunId ? `workflow-theme-mode-${projectRunId}` : 'workflow-theme-mode',
    'light'
  );
  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>(
    projectRunId ? `workflow-color-scheme-${projectRunId}` : 'workflow-color-scheme',
    'default'
  );

  // Apply theme to workflow view container
  useEffect(() => {
    // Find the workflow view container (main element in UserView)
    const workflowContainer = document.querySelector('main.flex-1.overflow-auto');
    if (!workflowContainer) return;
    
    const container = workflowContainer as HTMLElement;
    
    // Apply theme mode class to container
    if (themeMode === 'dark') {
      container.classList.add('dark-theme');
      container.classList.remove('light-theme');
    } else {
      container.classList.add('light-theme');
      container.classList.remove('dark-theme');
    }

    // Apply color scheme
    container.setAttribute('data-color-scheme', colorScheme);
    
    // Set CSS custom properties for color scheme on the container
    const colorSchemes: Record<ColorScheme, { primary: string; secondary: string; accent: string }> = {
      default: { primary: 'hsl(222.2, 47.4%, 11.2%)', secondary: 'hsl(210, 40%, 96.1%)', accent: 'hsl(210, 40%, 98%)' },
      blue: { primary: 'hsl(217, 91%, 60%)', secondary: 'hsl(217, 91%, 95%)', accent: 'hsl(217, 91%, 98%)' },
      green: { primary: 'hsl(142, 76%, 36%)', secondary: 'hsl(142, 76%, 95%)', accent: 'hsl(142, 76%, 98%)' },
      purple: { primary: 'hsl(262, 83%, 58%)', secondary: 'hsl(262, 83%, 95%)', accent: 'hsl(262, 83%, 98%)' },
      orange: { primary: 'hsl(25, 95%, 53%)', secondary: 'hsl(25, 95%, 95%)', accent: 'hsl(25, 95%, 98%)' },
      red: { primary: 'hsl(0, 84%, 60%)', secondary: 'hsl(0, 84%, 95%)', accent: 'hsl(0, 84%, 98%)' }
    };

    const scheme = colorSchemes[colorScheme];
    // Apply color scheme via data attribute (CSS will handle it)
    container.setAttribute('data-color-scheme', colorScheme);
    
    // Also apply to root for global dark mode if needed
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeMode, colorScheme]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Palette className="w-4 h-4" />
          Theme
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Workflow Theme Settings</DialogTitle>
          <DialogDescription>
            Customize the appearance of your project workflow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Mode Selection */}
          <div className="space-y-3">
            <Label>Theme Mode</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setThemeMode('light')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  themeMode === 'light'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
              >
                <Sun className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Light</div>
                  <div className="text-xs text-muted-foreground">Bright and clean</div>
                </div>
              </button>
              <button
                onClick={() => setThemeMode('dark')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  themeMode === 'dark'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
              >
                <Moon className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium text-white">Dark</div>
                  <div className="text-xs text-muted-foreground">Easy on the eyes</div>
                </div>
              </button>
            </div>
          </div>

          {/* Color Scheme Selection */}
          <div className="space-y-3">
            <Label>Color Scheme</Label>
            <Select value={colorScheme} onValueChange={(value) => setColorScheme(value as ColorScheme)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-slate-500"></div>
                    Default
                  </div>
                </SelectItem>
                <SelectItem value="blue">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    Blue
                  </div>
                </SelectItem>
                <SelectItem value="green">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    Green
                  </div>
                </SelectItem>
                <SelectItem value="purple">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                    Purple
                  </div>
                </SelectItem>
                <SelectItem value="orange">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                    Orange
                  </div>
                </SelectItem>
                <SelectItem value="red">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    Red
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose a color scheme that matches your preference
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

