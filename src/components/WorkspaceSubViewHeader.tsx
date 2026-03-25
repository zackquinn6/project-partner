import type { ReactNode } from 'react';
import { HelpCircle, Home as HomeIcon, Bell, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const LOGO_SRC = '/lovable-uploads/1a837ddc-50ca-40f7-b975-0ad92fdf9882.png';

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
      <div className="space-y-3 px-3 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between gap-3">
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

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-primary shadow-sm ring-1 ring-border/60 md:h-9 md:w-9">
              {screenIcon ?? <LayoutGrid className="h-4 w-4 md:h-[18px] md:w-[18px]" aria-hidden />}
            </span>
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground md:text-lg">
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
                          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={helpTitle}
                        >
                          <HelpCircle className="h-4 w-4" />
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

          <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
            {showReminders && onOpenReminders ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 shrink-0 p-0 md:h-9 md:w-9"
                onClick={onOpenReminders}
                title="Reminders & notifications"
                aria-label="Reminders & notifications"
              >
                <Bell className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 shrink-0 p-0 md:h-9 md:w-9"
              onClick={onOpenHomeManager}
              title="Homes"
              aria-label="Homes"
            >
              <HomeIcon className="h-4 w-4" />
            </Button>
            <Select value={selectedHomeId || ''} onValueChange={onHomeChange}>
              <SelectTrigger
                className="h-8 min-w-0 flex-1 text-[11px] md:h-9 md:min-w-[11rem] md:flex-none md:text-xs"
                aria-label="Home"
              >
                <SelectValue placeholder="Select home" />
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

        {children ? <div className="space-y-2 pt-0.5">{children}</div> : null}
      </div>
    </div>
  );
}
