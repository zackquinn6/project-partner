import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { X, MessageCircle, Video, Phone } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface HelpPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpPopup: React.FC<HelpPopupProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <VisuallyHidden>
          <DialogTitle>Get Help</DialogTitle>
          <DialogDescription>Choose between chat support or video call assistance</DialogDescription>
        </VisuallyHidden>
        
        <div className="relative">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-center mb-2">Stuck? Get Help</h2>
            <p className="text-muted-foreground text-center mb-8">
              Choose the support option that works best for you
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Chat Option */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MessageCircle className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Chat Support</h3>
                    <p className="text-green-600 font-medium mb-2">FREE - Included in your package</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Get quick answers from our expert team
                    </p>
                  </div>
                  
                  {/* Chat Mockup */}
                  <div className="bg-slate-100 rounded-lg p-4 mb-4 border">
                    <div className="bg-white rounded-lg shadow-sm">
                      <div className="border-b p-3 bg-slate-50 rounded-t-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <MessageCircle className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-sm">Support Chat</span>
                          <div className="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="p-3 space-y-3 max-h-32 overflow-y-auto">
                        <div className="flex justify-end">
                          <div className="bg-primary text-white p-2 rounded-lg max-w-[80%] text-sm">
                            The paint isn't covering stains well - what should I do?
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="bg-slate-100 p-2 rounded-lg max-w-[80%] text-sm">
                            Sometimes a third coat is necessary. You might only need this coat in spots or individual walls instead of the whole project. Try that out and come back here if it doesn't hide the stain.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full" onClick={() => {}}>
                    Start Chat
                  </Button>
                </CardContent>
              </Card>
              
              {/* Video Call Option */}
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Video className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Video Call</h3>
                    <p className="text-primary font-medium mb-1">$99</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      60min + unlimited calls for rest of project<br/>
                      <span className="text-xs">Future calls: $14.99</span>
                    </p>
                  </div>
                  
                  {/* Video Call Mockup */}
                  <div className="bg-slate-900 rounded-lg p-4 mb-4 relative overflow-hidden">
                    <div className="bg-slate-800 rounded-lg aspect-video relative">
                      {/* Professional painter mockup */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-slate-900/50 rounded-lg">
                        <div className="absolute top-3 left-3 bg-slate-700/80 rounded px-2 py-1">
                          <span className="text-white text-xs font-medium">Professional Painter</span>
                        </div>
                        <div className="absolute bottom-3 right-3 bg-slate-700/80 rounded px-2 py-1">
                          <span className="text-white text-xs">You</span>
                        </div>
                        {/* Video call interface elements */}
                        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
                          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                            <Phone className="w-4 h-4 text-white transform rotate-[135deg]" />
                          </div>
                          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                            <Video className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        {/* Professional avatar */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className="w-20 h-20 bg-slate-300 rounded-full flex items-center justify-center">
                            <div className="w-16 h-16 bg-slate-400 rounded-full flex items-center justify-center">
                              <span className="text-slate-600 text-xl font-bold">P</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    variant="outline" 
                    onClick={() => window.open('https://calendar.app.google/7cfDpEjfM32niEQu5', '_blank')}
                  >
                    Schedule Call
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};