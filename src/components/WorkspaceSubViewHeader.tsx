import type { ReactNode } from 'react';
import { HelpCircle, Home as HomeIcon, Bell, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const LOGO_SRC = '/lovable-uploads/1a837ddc-50ca-40f7-b975-0ad92fdf9882.png';

const APP_NAME = 'Project Partner';

export interface WorkspaceSubViewHeaderHome {
  id: string;
  name: string;
}

export interface WorkspaceSubViewHeaderProps {
  screenTitle: string;
  screenIcon?: ReactNode;
  helpTitle?: string;
  helpBody?: string;
  onGoToWorkspace: () => void;
  homes: WorkspaceSubViewHeaderHome[];
  selectedHomeId: string | null;
  onHomeChange: (id: string) => void;
  onOpenHomeManager: () => void;
  showReminders?: boolean;
  onOpenReminders?: () => void;
  /** Extra controls (e.g. project search row) rendered below the main toolbar */
  children?: ReactNode;
}

export function WorkspaceSubViewHeader({
  screenTitle,
  screenIcon,
  helpTitle,
  helpBody,
  onGoToWorkspace,
  homes,
  selectedHomeId,
  onHomeChange,
  onOpenHomeManager,
  showReminders = false,
  onOpenReminders,
  children,
}: WorkspaceSubViewHeaderProps) {
  const showHelp = Boolean(helpTitle && helpBody);

  return (
    <div className="flex-shrink-0 border-b border-border/80 bg-muted/20 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/15">
      <div className="px-2 py-2 md:space-y-3 md:px-6 md:py-4">
        {/* Desktop: logo + workspace */}
        <div className="hidden items-center justify-between gap-3 md:flex">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={LOGO_SRC}
              alt=""
              className="h-7 w-auto shrink-0 opacity-95 dark:opacity-90"
              width={112}
              height={28}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 px-3 text-xs font-medium md:h-9 md:text-sm"
            onClick={onGoToWorkspace}
          >
            Go to Workspace
          </Button>
        </div>

        {/* Mobile: app name upper-left + workspace (replaces logo row) */}
        <div className="mb-2 flex items-center justify-between gap-2 border-b border-border/50 pb-2 md:mb-0 md:hidden md:border-0 md:pb-0">
          <span className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground">{APP_NAME}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 px-2.5 text-[11px] font-medium"
            onClick={onGoToWorkspace}
          >
            Workspace
          </Button>
        </div>

        {/* Screen title + home controls: one row on mobile */}
        <div className="flex flex-row items-center gap-2 md:flex-col md:items-stretch md:gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background text-primary shadow-sm ring-1 ring-border/60 md:h-9 md:w-9">
              {screenIcon ?? <LayoutGrid className="h-3.5 w-3.5 md:h-[18px] md:w-[18px]" aria-hidden />}
            </span>
            <h1 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-foreground md:flex-none md:text-base lg:text-lg">
              {screenTitle}
            </h1>
            {showHelp ? (
              <TooltipProvider delayDuration={400}>
                <Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          tabIndex={-1}
                          className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:p-1"
                          aria-label={helpTitle}
                        >
                          <HelpCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>{helpTitle}</p>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent side="bottom" className="max-w-sm" align="start">
                    <p className="mb-1 font-medium">{helpTitle}</p>
                    <p className="text-sm text-muted-foreground">{helpBody}</p>
                  </PopoverContent>
                </Popover>
              </TooltipProvider>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1 md:justify-end md:gap-2 lg:justify-start">
            {showReminders && onOpenReminders ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-7 shrink-0 p-0 md:h-9 md:w-9"
                onClick={onOpenReminders}
                title="Reminders & notifications"
                aria-label="Reminders & notifications"
              >
                <Bell className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 w-7 shrink-0 p-0 md:h-9 md:w-9"
              onClick={onOpenHomeManager}
              title="Homes"
              aria-label="Homes"
            >
              <HomeIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
            <Select value={selectedHomeId || ''} onValueChange={onHomeChange}>
              <SelectTrigger
                className="h-7 w-[6.75rem] max-w-[32vw] shrink-0 px-2 text-[10px] leading-tight md:h-9 md:w-auto md:max-w-none md:min-w-[11rem] md:px-3 md:text-xs"
                aria-label="Home"
              >
                <SelectValue placeholder="Home" />
              </SelectTrigger>
              <SelectContent
                align="end"
                sideOffset={4}
                collisionPadding={16}
                className="max-w-[min(20rem,calc(100vw-2rem))]"
              >
                <SelectItem value="all">All Homes</SelectItem>
                {homes.map((home) => (
                  <SelectItem key={home.id} value={home.id}>
                    {home.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {children ? (
          <div className="mt-1.5 space-y-1.5 pt-0 md:mt-0 md:space-y-2 md:pt-0.5">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
