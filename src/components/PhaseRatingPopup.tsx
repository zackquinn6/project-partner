import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Smile, Meh, Frown } from "lucide-react";

interface PhaseRatingPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseName: string;
  onRatingSubmit: (rating: number) => void;
  onReportIssue: () => void;
}

export function PhaseRatingPopup({ 
  open, 
  onOpenChange, 
  phaseName,
  onRatingSubmit,
  onReportIssue
}: PhaseRatingPopupProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const handleSubmit = () => {
    if (selectedRating !== null) {
      onRatingSubmit(selectedRating);
      setSelectedRating(null);
      onOpenChange(false);
    }
  };

  const handleReportIssue = () => {
    onReportIssue();
    setSelectedRating(null);
    onOpenChange(false);
  };

  const handleSkip = () => {
    setSelectedRating(null);
    onOpenChange(false);
  };

  const getRatingIcon = (rating: number) => {
    if (rating <= 2) return <Frown className="w-8 h-8" />;
    if (rating === 3) return <Meh className="w-8 h-8" />;
    return <Smile className="w-8 h-8" />;
  };

  const getRatingColor = (rating: number) => {
    if (rating <= 2) return "text-destructive-soft hover:text-destructive-soft";
    if (rating === 3) return "text-warning-soft hover:text-warning-soft";
    return "text-success hover:text-success";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            How'd {phaseName} go?
          </DialogTitle>
          <DialogDescription className="text-center">
            Rate your experience with this phase (1-5 scale)
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center gap-4 mb-6">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setSelectedRating(rating)}
                  className={`
                    flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                    ${selectedRating === rating 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-border'
                    }
                  `}
                >
                  <div className={getRatingColor(rating)}>
                    {getRatingIcon(rating)}
                  </div>
                  <span className="text-sm font-medium">{rating}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              {selectedRating !== null && (
                <Button onClick={handleSubmit} className="w-full">
                  Submit Rating
                </Button>
              )}
              
              {selectedRating !== null && selectedRating < 4 && (
                <Button 
                  variant="outline" 
                  onClick={handleReportIssue}
                  className="w-full border-warning-soft/40 text-warning-soft hover:bg-warning-soft/10"
                >
                  Report an Issue
                </Button>
              )}
              
              <Button variant="ghost" onClick={handleSkip} className="w-full">
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}