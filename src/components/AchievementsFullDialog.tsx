import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AchievementsSection } from '@/components/AchievementsSection';
import { X } from 'lucide-react';

/** Full-screen achievements browser; high z-index so it stacks above other modals. */
export function AchievementsFullDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[110]" />
        <DialogContent className="z-[111] flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none border-0 bg-achievement-surface p-0 text-achievement-foreground shadow-none md:h-[min(90vh,900px)] md:max-h-[90vh] md:w-[90%] md:max-w-[90%] md:rounded-[8px] md:border md:border-achievement-border [&>button]:hidden">
          <DialogTitle className="sr-only">Achievements</DialogTitle>
          <header className="flex shrink-0 items-center justify-end border-b border-achievement-border px-2 py-1.5 sm:px-3 sm:py-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-11 w-11 shrink-0 rounded-md text-achievement-muted transition-colors duration-achievement hover:bg-achievement-raised hover:text-achievement-foreground focus-visible:ring-2 focus-visible:ring-achievement-accent focus-visible:ring-offset-2 focus-visible:ring-offset-achievement-surface"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
            <AchievementsSection />
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
