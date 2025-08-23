import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { X, MessageCircle, Video, Phone, Bot, User } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface HelpPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpPopup: React.FC<HelpPopupProps> = ({ isOpen, onClose }) => {
  const handleScheduleCall = () => {
    // Try different approach to avoid ERR_BLOCKED_BY_RESPONSE
    const link = document.createElement('a');
    link.href = 'https://calendar.app.google/7cfDpEjfM32niEQu5';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <VisuallyHidden>
          <DialogTitle>Get Help</DialogTitle>
          <DialogDescription>Choose between chat support or video call assistance</DialogDescription>
        </VisuallyHidden>
        
        <div className="relative">
          <div className="p-4">
            <h2 className="text-2xl font-bold text-center mb-2">Stuck? Get Help</h2>
            <p className="text-muted-foreground text-center mb-6">
              Choose the support option that works best for you
            </p>
            
            <div className="grid lg:grid-cols-3 gap-4 mb-6">
              {/* Coach Dan ChatBot Option */}
              <Card className="border-2 hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-4 h-full flex flex-col">
                  <div className="text-center mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Bot className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Coach Dan</h3>
                    <p className="text-green-600 font-medium mb-1">FREE - Available 24/7</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Chat with our AI assistant for instant help
                    </p>
                  </div>
                  
                  {/* ChatBot Mockup */}
                  <div className="bg-blue-50 rounded-lg p-3 mb-3 border flex-1">
                    <div className="bg-white rounded-lg shadow-sm h-full">
                      <div className="border-b p-2 bg-blue-50 rounded-t-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <Bot className="w-3 h-3 text-white" />
                          </div>
                          <span className="font-medium text-xs">Coach Dan</span>
                          <div className="ml-auto w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="p-2 space-y-2 h-20 overflow-y-auto">
                        <div className="flex justify-end">
                          <div className="bg-blue-600 text-white p-1.5 rounded-lg max-w-[80%] text-xs">
                            My paint keeps dripping, what's wrong?
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="bg-slate-100 p-1.5 rounded-lg max-w-[80%] text-xs">
                            Try using less paint on your brush!
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-auto" onClick={() => {}}>
                    Chat with Coach Dan
                  </Button>
                </CardContent>
              </Card>

              {/* Human Chat Support Option */}
              <Card className="border-2 hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-4 h-full flex flex-col">
                  <div className="text-center mb-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Expert Human Support</h3>
                    <p className="text-primary font-medium mb-1">$9.99</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Chat with our expert human team members
                    </p>
                  </div>
                  
                  {/* Human Chat Mockup */}
                  <div className="bg-slate-100 rounded-lg p-3 mb-3 border flex-1">
                    <div className="bg-white rounded-lg shadow-sm h-full">
                      <div className="border-b p-2 bg-slate-50 rounded-t-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-white" />
                          </div>
                          <span className="font-medium text-xs">Expert Support</span>
                          <div className="ml-auto w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="p-2 space-y-2 h-20 overflow-y-auto">
                        <div className="flex justify-end">
                          <div className="bg-primary text-white p-1.5 rounded-lg max-w-[80%] text-xs">
                            Paint isn't covering stains well?
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="bg-slate-100 p-1.5 rounded-lg max-w-[80%] text-xs">
                            Try a third coat in problem areas.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full mt-auto" onClick={() => {}}>
                    Start Expert Chat
                  </Button>
                </CardContent>
              </Card>
              
              {/* Video Call Option */}
              <Card className="border-2 hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-4 h-full flex flex-col">
                  <div className="text-center mb-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Video className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Video Call</h3>
                    <p className="text-primary font-medium mb-0.5">$99</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      60min + unlimited calls for rest of project<br/>
                      <span className="text-xs">Future calls: $14.99</span>
                    </p>
                  </div>
                  
                  {/* Video Call Mockup */}
                  <div className="bg-slate-900 rounded-lg p-3 mb-3 relative overflow-hidden flex-1">
                    <div className="bg-slate-800 rounded-lg h-20 relative">
                      {/* Professional expert mockup */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-slate-900/50 rounded-lg">
                        <div className="absolute top-1 left-1 bg-slate-700/80 rounded px-1.5 py-0.5">
                          <span className="text-white text-xs font-medium">Expert</span>
                        </div>
                        <div className="absolute bottom-1 right-1 bg-slate-700/80 rounded px-1.5 py-0.5">
                          <span className="text-white text-xs">You</span>
                        </div>
                        {/* Video call interface elements */}
                        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
                          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <Phone className="w-2 h-2 text-white transform rotate-[135deg]" />
                          </div>
                          <div className="w-4 h-4 bg-slate-600 rounded-full flex items-center justify-center">
                            <Video className="w-2 h-2 text-white" />
                          </div>
                        </div>
                        {/* Professional avatar */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                            <span className="text-slate-600 text-xs font-bold">E</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full mt-auto" variant="outline" onClick={handleScheduleCall}>
                    Schedule Call
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Satisfaction Guarantee */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <h4 className="font-semibold text-green-800 mb-1">💯 Satisfaction Guarantee</h4>
              <p className="text-sm text-green-700 mb-1">
                We're committed to your project success. If our support doesn't meet your expectations, 
                we'll make it right or provide a full refund.
              </p>
              <button className="text-xs text-green-600 underline hover:text-green-800">
                See terms and conditions
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};