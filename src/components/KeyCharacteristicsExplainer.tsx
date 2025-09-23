import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KeyCharacteristicsExplainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyCharacteristicsExplainer({ open, onOpenChange }: KeyCharacteristicsExplainerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">🥪 Key Characteristics in Action: The PB&J Example</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-primary/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Key Characteristics (KC) is about matching instruction detail to skill level. The task is always the same, 
              but the way we communicate it changes depending on whether someone is brand new, somewhat familiar, or highly experienced.
            </p>
          </div>

          <p className="text-sm">
            Let's use a peanut butter and jelly sandwich—with one extra requirement: use wheat toast and cut it in half.
          </p>

          {/* Never Done Before */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="destructive">1. Never Done Before</Badge>
                <span className="text-lg">(100% Detail)</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                When someone has never done the task, they need every step spelled out. Nothing is assumed.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-1">
                <p>Step-by-step example:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs ml-4">
                  <li>Wash your hands with soap and water.</li>
                  <li>Gather ingredients: peanut butter, jelly, and two slices of wheat bread.</li>
                  <li>Toast the bread until lightly browned.</li>
                  <li>Gather tools: plate, knife, spoon, napkin.</li>
                  <li>Place the toasted bread slices on the plate.</li>
                  <li>Open the peanut butter jar.</li>
                  <li>Use the knife to spread peanut butter evenly on one slice.</li>
                  <li>Open the jelly jar.</li>
                  <li>Use a clean knife or spoon to spread jelly on the other slice.</li>
                  <li>Press the slices together, spreads facing inward.</li>
                  <li>Use the knife to cut the sandwich in half.</li>
                  <li>Clean up tools and surfaces.</li>
                  <li>Enjoy your sandwich.</li>
                </ol>
              </div>
              <div className="bg-muted p-3 rounded text-xs">
                <strong>👉 Word count:</strong> ~220 words <strong>👉 Steps:</strong> 12–15 <strong>👉 Instruction style:</strong> Explicit, procedural, assumes no prior knowledge
              </div>
            </CardContent>
          </Card>

          {/* Done Once */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary">2. Done Once</Badge>
                <span className="text-lg">(Some Familiarity)</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                After someone has tried it once, they don't need every micro-step. They just need structured reminders.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-1">
                <p>Instruction example:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs ml-4">
                  <li>Toast two slices of wheat bread.</li>
                  <li>Spread peanut butter on one slice, jelly on the other.</li>
                  <li>Press together, cut in half, and clean up.</li>
                </ol>
              </div>
              <div className="bg-muted p-3 rounded text-xs">
                <strong>👉 Word count:</strong> ~60–80 words <strong>👉 Steps:</strong> 5–7 <strong>👉 Instruction style:</strong> Condensed, assumes basic familiarity
              </div>
            </CardContent>
          </Card>

          {/* Done Many Times */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="default">3. Done Many Times</Badge>
                <span className="text-lg">(Expert)</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                For someone who has made dozens of PB&Js, the process is already in their head. They only need the non-trivial requirements stated.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-1">
                <p>Instruction example:</p>
                <div className="ml-4 text-xs font-medium">
                  "Make a PB&J on wheat toast, cut in half."
                </div>
              </div>
              <div className="bg-muted p-3 rounded text-xs">
                <strong>👉 Word count:</strong> 8–10 words <strong>👉 Steps:</strong> 1–2 <strong>👉 Instruction style:</strong> Minimal, outcome-focused, but still captures requirements
              </div>
            </CardContent>
          </Card>

          {/* Why This Matters */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-xl">🔑 Why This Matters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>The task never changes—but the level of detail does.</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Beginners need step-by-step guidance.</li>
                <li>Intermediates benefit from structured reminders.</li>
                <li>Experts only need a short cue with key requirements.</li>
              </ul>
              
              <div className="bg-primary/10 p-4 rounded-lg mt-4">
                <p className="font-medium mb-2">This is the essence of Key Characteristics:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>Root everything in the step-by-step process.</li>
                  <li>Scale the instructions to match the skill level.</li>
                  <li>Recognize that trained people carry most of the process in their head, but still need non-trivial specifications (like wheat toast, cut in half) to ensure consistency.</li>
                </ul>
              </div>
              
              <p className="font-medium text-primary">
                KC's aren't about dumbing things down—it's about precision at the right level of detail.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={() => onOpenChange(false)}>
            Got It!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}