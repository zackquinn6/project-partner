import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, CheckCircle, HelpCircle, MessageCircle, Building, Store, AlertTriangle } from "lucide-react";
import { FeedbackDialog } from './FeedbackDialog';
import { useState } from 'react';

interface ContractorFinderWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractorFinderWindow({ open, onOpenChange }: ContractorFinderWindowProps) {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-full sm:max-w-[90vw] sm:max-h-[90vh] overflow-hidden border-none sm:border p-0 sm:p-6">
          <DialogHeader className="p-4 sm:p-0 border-b sm:border-b-0">
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Find Local Contractors
            </DialogTitle>
          </DialogHeader>
          
          {/* Beta Banner */}
          <div className="bg-gradient-to-r from-orange-100 to-yellow-100 border-b border-orange-200 p-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-500 text-white">BETA</Badge>
                <span className="text-sm font-medium text-orange-800">
                  Feature under development - Hit the ? icon in upper right to give us feedback!
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowFeedback(true)}>
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 p-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              Connect with trusted professionals to help complete your DIY projects. 
              Compare quotes, read reviews, and find the perfect contractor for your needs.
            </p>
          </div>

          {/* Ideal Channels Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckCircle className="h-5 w-5 text-green-500" />
                3 Ideal Channels for Finding Top-Tier Contractors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Personal Referrals & Word of Mouth</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Still the gold standard. Ask neighbors, friends, or colleagues who&apos;ve had similar work done.</li>
                      <li>• You get firsthand insight into reliability, communication, and quality of finish.</li>
                      <li>• Bonus: you can see the completed work in person before hiring.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Local Trade Associations & Guilds</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Examples: National Association of the Remodeling Industry (NARI), Associated General Contractors of America (AGC), or regional builders&apos; associations.</li>
                      <li>• Members are vetted, licensed, and often held to professional codes of conduct.</li>
                      <li>• Great for finding specialists (e.g., remodelers, electricians, masons) with proven track records.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Store className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Specialty Retailers & Supply Houses</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• High-end lumber yards, tile shops, or kitchen/bath showrooms often maintain shortlists of trusted contractors they recommend to customers.</li>
                      <li>• These referrals are valuable because suppliers only recommend pros who pay on time, communicate well, and don&apos;t cause headaches for their business.</li>
                      <li>• It&apos;s a back-channel into the &quot;real&quot; contractor network that casual homeowners rarely access.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-center">
                  👉 Together, these channels emphasize <strong>trust, reputation, and professional accountability</strong>—the opposite of the churn-and-burn dynamic on big tech marketplaces.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Why Not Section */}
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Why Not Angi&apos;s List, Thumbtack, TaskRabbit, or Yelp?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-red-800 space-y-3">
                <p>
                  These tech marketplaces are optimized for <strong>lead generation, not craftsmanship</strong>. They treat contractors like interchangeable commodities, charging them for leads and pushing volume over quality. The result?
                </p>
                <ul className="space-y-2 ml-4">
                  <li>• Contractors often underbid just to win jobs, then cut corners.</li>
                  <li>• Reviews can be gamed or manipulated, making it hard to separate pros from pretenders.</li>
                  <li>• Homeowners end up with inconsistent quality, poor accountability, and little recourse when work fails.</li>
                </ul>
                <p className="font-medium">
                  In short: these platforms don&apos;t understand the <strong>real-world stakes of home projects</strong>—where trust, skill, and reliability matter more than clicks and star ratings.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">3 things to get right:</h3>
                <div className="grid gap-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Be an officer - license and registration (insurance)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Get 3+ quotes - think twice on bottom price.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Research - Know what you&apos;re shopping for. Reviews help - but be cautious of 1 and 5 stars.</span>
                  </div>
                </div>
              </div>
             </CardContent>
             </Card>
             </div>
           </div>
        </DialogContent>
      </Dialog>
      
      <FeedbackDialog 
        open={showFeedback}
        onOpenChange={setShowFeedback}
      />
    </>
  );
}