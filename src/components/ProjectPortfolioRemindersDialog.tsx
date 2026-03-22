import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PortfolioNotifications } from "@/components/PortfolioNotifications";

interface ProjectPortfolioRemindersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectPortfolioRemindersDialog({
  open,
  onOpenChange,
}: ProjectPortfolioRemindersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] md:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription>
            Notification preferences for project &amp; task manager updates.
          </DialogDescription>
        </DialogHeader>
        <PortfolioNotifications
          onSaved={() => {
            queueMicrotask(() => onOpenChange(false));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
