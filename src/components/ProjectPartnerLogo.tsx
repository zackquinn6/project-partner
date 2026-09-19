import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import logoDark from '@/assets/project-partner-logo.png';
import logoLight from '@/assets/project-partner-logo-print.png';

type ProjectPartnerLogoProps = {
  className?: string;
  title?: string;
  /** Force a variant when the surface is always dark (e.g. primary footer). */
  variant?: 'auto' | 'dark' | 'light';
};

/**
 * Transparent Project Partner mark.
 * Dark: pale type + signal orange on transparent.
 * Light: graphite type + signal orange on transparent.
 */
export function ProjectPartnerLogo({
  className,
  title = 'Project Partner',
  variant = 'auto',
}: ProjectPartnerLogoProps) {
  const { themeMode } = useTheme();
  // Guests/null resolve to dark (product default).
  const useDark = variant === 'dark' || (variant === 'auto' && themeMode !== 'light');

  return (
    <img
      src={useDark ? logoDark : logoLight}
      alt={title}
      className={cn('h-8 w-auto', className)}
      decoding="async"
    />
  );
}

export default ProjectPartnerLogo;
