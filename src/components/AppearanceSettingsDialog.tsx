import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Moon, Sun } from 'lucide-react';
import { useTheme, type ColorScheme } from '@/contexts/ThemeContext';

interface AppearanceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLOR_SCHEME_OPTIONS: { value: ColorScheme; label: string; swatch: string }[] = [
  { value: 'default', label: 'Coral', swatch: 'bg-[hsl(14_100%_58%)]' },
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
          <DialogDescription>Saved to your profile and applied on every device you sign in from.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Theme Mode</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => void setThemeMode('light')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all disabled:opacity-50 ${themeMode === 'light' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}`}
              >
                <Sun className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Light</div>
                  <div className="text-xs text-muted-foreground">Bright and clean</div>
                </div>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void setThemeMode('dark')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all disabled:opacity-50 ${themeMode === 'dark' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}`}
              >
                <Moon className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Dark</div>
                  <div className="text-xs text-muted-foreground">Easy on the eyes</div>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Accent Color</Label>
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
                      <div className={`w-4 h-4 rounded-full ${option.swatch}`} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Recolors buttons, links, and highlights across the app.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
