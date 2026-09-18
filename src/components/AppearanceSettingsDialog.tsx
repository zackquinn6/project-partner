import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Moon, Sun } from 'lucide-react';
import { useTheme, type ColorScheme } from '@/contexts/ThemeContext';

interface AppearanceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLOR_SCHEME_OPTIONS: { value: ColorScheme; label: string; swatch: string }[] = [
  { value: 'default', label: 'Signal', swatch: 'bg-[hsl(16_90%_55%)]' },
  { value: 'blue', label: 'Blue', swatch: 'bg-[hsl(217_91%_60%)]' },
  { value: 'green', label: 'Green', swatch: 'bg-[hsl(142_66%_36%)]' },
  { value: 'purple', label: 'Purple', swatch: 'bg-[hsl(262_74%_55%)]' },
  { value: 'orange', label: 'Orange', swatch: 'bg-[hsl(26_92%_48%)]' },
  { value: 'red', label: 'Red', swatch: 'bg-[hsl(0_74%_52%)]' },
];

export function AppearanceSettingsDialog({ open, onOpenChange }: AppearanceSettingsDialogProps) {
  const { themeMode, colorScheme, loading, setThemeMode, setColorScheme } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Appearance</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Theme</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => void setThemeMode('dark')}
                className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-colors disabled:opacity-50 ${themeMode === 'dark' ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/40'}`}
              >
                <Moon className="h-5 w-5 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Dark</div>
                  <div className="text-xs text-muted-foreground">Default</div>
                </div>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void setThemeMode('light')}
                className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-colors disabled:opacity-50 ${themeMode === 'light' ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/40'}`}
              >
                <Sun className="h-5 w-5 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Light</div>
                  <div className="text-xs text-muted-foreground">Paper</div>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Accent</Label>
            <Select
              value={colorScheme ?? undefined}
              disabled={loading}
              onValueChange={value => void setColorScheme(value as ColorScheme)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_SCHEME_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-sm ${option.swatch}`} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
