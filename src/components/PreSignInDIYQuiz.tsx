import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Clock, CheckCircle2 } from "lucide-react";

interface PreSignInDIYQuizProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PreSignInDIYQuiz({ open, onOpenChange }: PreSignInDIYQuizProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
            <DialogTitle className="text-2xl font-bold">DIY Quiz</DialogTitle>
          </div>
        </DialogHeader>
        
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              
              <h3 className="text-xl font-semibold">Coming Soon!</h3>
              
              <p className="text-muted-foreground leading-relaxed">
                We're working on an exciting DIY assessment that will help you discover your perfect home improvement projects and skill level.
              </p>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Personalized project recommendations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Skill level assessment</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Tool and material suggestions</span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-4">
                Sign up to be notified when it's ready!
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-center mt-4">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}