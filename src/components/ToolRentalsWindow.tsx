import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, MapPin, Calendar, Wrench } from 'lucide-react';
import { ToolRentalFinder } from './ToolRentalFinder';

interface ToolRentalsWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ToolRentalsWindow = ({ isOpen, onClose }: ToolRentalsWindowProps) => {
  const handleVisitToolio = () => {
    window.open('https://toolio.us', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full sm:max-w-6xl sm:max-h-[90vh] overflow-hidden border-none sm:border p-0 sm:p-6">
        <DialogHeader className="p-4 sm:p-0 border-b sm:border-b-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-6 w-6 text-primary" />
              Tool Access & Rentals
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent('show-user-tools-materials'))}
                className="text-xs px-3 py-1 h-7"
              >
                <Wrench className="h-3 w-3 mr-1" />
                My Tool Library
              </Button>
              <Button 
                 variant="ghost" 
                 onClick={onClose}
                 className="sm:hidden text-xs px-2 py-1 h-6"
               >
                 Close
               </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="p-4 sm:p-0">
          <Tabs defaultValue="finder" className="w-full h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="finder">Tool Access Finder</TabsTrigger>
            <TabsTrigger value="toolio">Toolio (Boston, MA)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="finder" className="mt-6 max-h-[70vh] overflow-y-auto">
            <ToolRentalFinder />
          </TabsContent>
          
          <TabsContent value="toolio" className="mt-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Hero Section with Toolio Theme */}
              <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 bg-orange-500 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                      <Wrench className="h-4 w-4" />
                      The Smarter Way To Rent Tools
                    </div>
                    
                    <h2 className="text-3xl font-bold text-gray-900">
                      Seamless Integration
                    </h2>
                    
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                      Match with projects and tool library to rent the exact right tools and save money through rental.
                    </p>
                    
                    <div className="bg-white/80 backdrop-blur rounded-lg p-4 inline-block">
                      <p className="text-sm text-gray-600 font-medium">
                        <MapPin className="inline h-4 w-4 mr-1" />
                        Currently Available in Boston, MA
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Value Proposition */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Calendar className="h-6 w-6 text-orange-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Project-Based Approach</h3>
                    <p className="text-sm text-muted-foreground">
                      Designed around projects, not single tools—giving you bigger value and better results.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ExternalLink className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Book Online</h3>
                    <p className="text-sm text-muted-foreground">
                      Easy online booking with free delivery. Get professional-grade tools delivered to your door.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Wrench className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Professional Quality</h3>
                    <p className="text-sm text-muted-foreground">
                      Access high-quality tools maintained to professional standards for your home projects.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* How it Works */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Great Results Start With The Right Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                      <p className="text-sm">Browse professional-grade tools matched to your specific project needs</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                      <p className="text-sm">Rent by the day, week, or complete project duration</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                      <p className="text-sm">Get free local delivery and pickup service</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CTA */}
              <div className="text-center space-y-3">
                <Button 
                  onClick={handleVisitToolio}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  size="lg"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Book Rental at Toolio.us
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  Seamless tool rentals perfectly integrated with Project Partner
                </p>
              </div>
            </div>
          </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};