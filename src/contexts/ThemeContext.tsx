import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export type ThemeMode = 'light' | 'dark';
export type ColorScheme = 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'red';

export const COLOR_SCHEMES: ColorScheme[] = ['default', 'blue', 'green', 'purple', 'orange', 'red'];

interface ThemeContextType {
  /** Null until the signed-in user's profile has been read. */
  themeMode: ThemeMode | null;
  colorScheme: ColorScheme | null;
  loading: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setColorScheme: (scheme: ColorScheme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function isColorScheme(value: unknown): value is ColorScheme {
  return typeof value === 'string' && (COLOR_SCHEMES as string[]).includes(value);
}

function applyGuestTheme() {
  const root = document.documentElement;
  root.classList.add('dark');
  root.removeAttribute('data-color-scheme');
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [themeMode, setThemeModeState] = useState<ThemeMode | null>(null);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme | null>(null);
  const [loading, setLoading] = useState(true);

  // Signed-out and guest sessions have no profile; graphite dark is the product default.
  useEffect(() => {
    if (user?.id) return;

    setThemeModeState(null);
    setColorSchemeState(null);
    setLoading(false);
    applyGuestTheme();
  }, [user?.id]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('theme_mode, color_scheme')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setLoading(false);
        console.error('Failed to read appearance preferences from profile:', error);
        throw error;
      }

      if (!data) {
        setLoading(false);
        throw new Error(`No user_profiles row for user ${userId}; cannot resolve appearance preferences.`);
      }

      if (!isThemeMode(data.theme_mode)) {
        setLoading(false);
        throw new Error(`Unexpected user_profiles.theme_mode value: ${String(data.theme_mode)}`);
      }

      if (!isColorScheme(data.color_scheme)) {
        setLoading(false);
        throw new Error(`Unexpected user_profiles.color_scheme value: ${String(data.color_scheme)}`);
      }

      setThemeModeState(data.theme_mode);
      setColorSchemeState(data.color_scheme);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Both attributes live on <html> so portaled dialogs, dropdowns, and toasts theme with the page.
  useEffect(() => {
    if (themeMode === null) return;
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
  }, [themeMode]);

  useEffect(() => {
    if (colorScheme === null) return;
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
  }, [colorScheme]);

  const persist = useCallback(
    async (patch: { theme_mode: ThemeMode } | { color_scheme: ColorScheme }) => {
      if (!user?.id) {
        throw new Error('Cannot save appearance preferences without a signed-in user.');
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(patch)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to save appearance preferences to profile:', error);
        throw error;
      }
    },
    [user?.id]
  );

  const setThemeMode = useCallback(
    async (mode: ThemeMode) => {
      setThemeModeState(mode);
      await persist({ theme_mode: mode });
    },
    [persist]
  );

  const setColorScheme = useCallback(
    async (scheme: ColorScheme) => {
      setColorSchemeState(scheme);
      await persist({ color_scheme: scheme });
    },
    [persist]
  );

  return (
    <ThemeContext.Provider value={{ themeMode, colorScheme, loading, setThemeMode, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
