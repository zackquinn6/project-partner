import type { ReactNode } from 'react';
import { HelpCircle, Home as HomeIcon, Bell, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const BACK_LABEL = 'Back to Workshop';

function RemindersButton({
  onOpenReminders,
  compact,
}: {
  onOpenReminders: () => void;
  compact?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={
        compact
          ? 'h-7 w-7 shrink-0 p-0'
          : 'h-8 w-8 shrink-0 p-0 md:h-9 md:w-9'
      }
      onClick={onOpenReminders}
      title="Reminders & notifications"
      aria-label="Reminders & notifications"
    >
      <Bell className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </Button>
  );
}

function HomeManagerButton({ onOpenHomeManager, compact }: { onOpenHomeManager: () => void; compact?: boolean }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={
        compact
          ? 'h-7 w-7 shrink-0 p-0'
          : 'h-8 w-8 shrink-0 p-0 md:h-9 md:w-9'
      }
      onClick={onOpenHomeManager}
      title="Homes"
      aria-label="Homes"
    >
      <HomeIcon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </Button>
  );
}

function HomeSelect({
  homes,
  selectedHomeId,
  onHomeChange,
  compact,
}: {
  homes: WorkspaceSubViewHeaderHome[];
  selectedHomeId: string | null;
  onHomeChange: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <Select value={selectedHomeId || ''} onValueChange={onHomeChange}>
      <SelectTrigger
        className={
          compact
            ? 'h-7 w-full min-w-0 max-w-full shrink px-1.5 text-[10px] leading-tight'
            : 'h-8 w-full min-w-0 max-w-full text-[11px] md:h-9 md:text-xs'
        }
        aria-label="Home"
      >
        <SelectValue placeholder="Home" />
      </SelectTrigger>
      <SelectContent
        align="end"
        sideOffset={4}
        collisionPadding={16}
        className="max-w-[min(35rem,calc(100vw-2rem))]"
      >
        <SelectItem value="all">All Homes</SelectItem>
        {homes.map((home) => (
          <SelectItem key={home.id} value={home.id}>
            {home.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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

  const renderHelpButton = () =>
    showHelp && helpTitle && helpBody ? (
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
    ) : null;

  const titleBlockDesktop = (
    <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background text-primary shadow-sm ring-1 ring-border/60 md:h-9 md:w-9">
        {screenIcon ?? <LayoutGrid className="h-3.5 w-3.5 md:h-[18px] md:w-[18px]" aria-hidden />}
      </span>
      <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground md:text-base lg:text-lg">
        {screenTitle}
      </h1>
      {renderHelpButton()}
    </div>
  );

  /** Title + help sit in one cluster so the help icon stays next to the text, not the far edge of the header. */
  const titleBlockMobile = (
    <div className="inline-flex max-w-full min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0">
      <h1 className="inline-block max-w-full min-w-0 text-sm font-semibold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere] line-clamp-2 break-words">
        {screenTitle}
      </h1>
      {renderHelpButton()}
    </div>
  );

  return (
    <div className="flex-shrink-0 border-b border-border/80 bg-muted/20 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/15">
      <div className="flex flex-col gap-1.5 px-2 py-1.5 md:gap-2 md:px-6 md:py-3">
        {/* Mobile: one row — title (left) + homes + home select + notifications + back */}
        <div className="flex items-center gap-1.5 md:hidden">
          <div className="min-w-0 flex-1 pr-0.5">{titleBlockMobile}</div>
          <div className="flex min-w-0 shrink-0 items-center gap-1.5">
            <HomeManagerButton onOpenHomeManager={onOpenHomeManager} compact />
            <div className="min-w-0 w-[min(7.75rem,calc(100vw-13.5rem))] max-w-[7.75rem] shrink">
              <HomeSelect
                homes={homes}
                selectedHomeId={selectedHomeId}
                onHomeChange={onHomeChange}
                compact
              />
            </div>
            {showReminders && onOpenReminders ? (
              <RemindersButton onOpenReminders={onOpenReminders} compact />
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 max-w-[5.25rem] shrink-0 whitespace-normal px-1.5 py-1 text-center text-[9px] font-medium leading-tight"
              onClick={onGoToWorkspace}
            >
              {BACK_LABEL}
            </Button>
          </div>
        </div>

        {/* Desktop: title upper-left + reminders/back; homes + compact selector on second row (left-aligned) */}
        <div className="hidden md:flex md:flex-col md:items-stretch md:gap-2">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0 flex-1">{titleBlockDesktop}</div>
            <div className="flex shrink-0 items-center gap-2">
              {showReminders && onOpenReminders ? (
                <RemindersButton onOpenReminders={onOpenReminders} />
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 px-3 text-xs font-medium md:h-9 md:text-sm"
                onClick={onGoToWorkspace}
              >
                {BACK_LABEL}
              </Button>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <HomeManagerButton onOpenHomeManager={onOpenHomeManager} />
            <div className="min-w-0 w-[min(100%,11rem)] max-w-[11rem] shrink">
              <HomeSelect homes={homes} selectedHomeId={selectedHomeId} onHomeChange={onHomeChange} />
            </div>
          </div>
        </div>

        {children ? (
          <div className="mt-1 space-y-1.5 pt-0 md:mt-0 md:space-y-2 md:pt-0.5">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
