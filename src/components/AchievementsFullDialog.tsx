import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AchievementsSection } from '@/components/AchievementsSection';

/** Full-screen achievements browser; high z-index so it stacks above other modals (e.g. profile survey). */
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
        <DialogContent className="z-[111] flex h-screen max-h-full w-full max-w-full flex-col overflow-hidden p-0 md:h-[90vh] md:max-h-[90vh] md:max-w-[90vw] md:rounded-lg [&>button]:hidden">
          <DialogTitle className="sr-only">My Achievements</DialogTitle>
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex flex-shrink-0 items-center justify-between border-b px-4 py-4 md:px-6">
              <h2 className="text-lg font-bold md:text-xl">My Achievements</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="ml-4 flex-shrink-0"
              >
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <AchievementsSection />
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
