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
        <DialogContent className="z-[111] flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none border-0 p-0 md:h-[min(90vh,900px)] md:max-h-[90vh] md:max-w-3xl md:rounded-2xl md:border [&>button]:hidden">
          <DialogTitle className="sr-only">Achievements</DialogTitle>
          <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-5 sm:py-3.5">
            <h2 className="text-base font-bold tracking-tight sm:text-lg">Achievements</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 shrink-0 rounded-full"
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
