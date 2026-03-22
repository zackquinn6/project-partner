import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import founderPhoto from '@/assets/zack-quinn-founder.png';

interface FounderInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FounderInfoDialog = ({ open, onOpenChange }: FounderInfoDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          'flex flex-col gap-0 p-0 max-h-[min(90dvh,calc(100vh-1.5rem))] w-[min(42rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-hidden sm:max-w-2xl sm:rounded-lg border bg-background shadow-lg'
        }
      >
        <DialogHeader className="sticky top-0 z-20 flex flex-row items-center justify-between gap-3 space-y-0 text-left border-b border-border bg-background px-4 py-3 sm:px-6 sm:py-4 shrink-0">
          <DialogTitle className="text-lg font-bold pr-2 min-w-0">About Project Partner</DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 space-y-6">
          <p className="text-lg text-muted-foreground leading-relaxed break-words">
            I'm a guy that loves to DIY. My wife loves the results and some of the process - but hates when it doesn't go to schedule. She doesn't expect everything to go perfect, but thinks that most issues can be prevented and that i should always be able to accurately answer "When will this be done?"
          </p>

          <p className="text-lg text-muted-foreground leading-relaxed break-words">
            That's why i built Project Partner, to first solve my own problem - and make it a tool for others to get the same benefits. After running my first project through this app- my wife came back and said "Now this is DIY done right".
          </p>

          <div className="space-y-3 min-w-0">
            <img
              src={founderPhoto}
              alt="Zack Quinn, Co-Founder of Toolio"
              className="w-full max-w-full h-auto rounded-lg shadow-lg"
            />
            <p className="text-sm text-muted-foreground italic text-center">
              Zack Quinn, Co-Founder of Toolio and creator of Project Partner
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full sm:hidden"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
