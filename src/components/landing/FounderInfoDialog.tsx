import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import founderPhoto from '@/assets/zack-quinn-founder.png';

interface FounderInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FounderInfoDialog = ({ open, onOpenChange }: FounderInfoDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>About Project Partner</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-lg text-muted-foreground leading-relaxed">
            I'm a guy that loves to DIY. My wife loves the results and some of the process - but hates when it doesn't go to schedule. She doesn't expect everything to go perfect, but thinks that most issues can be prevented and that i should always be able to accurately answer "When will this be done?"
          </p>
          
          <p className="text-lg text-muted-foreground leading-relaxed">
            That's why i built Project Partner, to first solve my own problem - and make it a tool for others to get the same benefits. After running my first project through this app- my wife came back and said "Now this is DIY done right".
          </p>
          
          <div className="space-y-3">
            <img 
              src={founderPhoto} 
              alt="Zack Quinn, Co-Founder of Toolio" 
              className="w-full rounded-lg shadow-lg"
            />
            <p className="text-sm text-muted-foreground italic text-center">
              Zack Quinn, Co-Founder of Toolio and creator of Project Partner
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
