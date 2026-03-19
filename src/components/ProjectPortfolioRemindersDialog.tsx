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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reminders &amp; notifications</DialogTitle>
          <DialogDescription>
            Email preferences for project dashboard and task manager updates.
          </DialogDescription>
        </DialogHeader>
        <PortfolioNotifications />
      </DialogContent>
    </Dialog>
  );
}
