import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface AccountabilityMessagePopupProps {
  isOpen: boolean;
  onClose: () => void;
  messageType: 'phase-complete' | 'issue-report';
  progress?: number;
  projectName?: string;
}

export function AccountabilityMessagePopup({ 
  isOpen, 
  onClose, 
  messageType, 
  progress = 0,
  projectName = "their project"
}: AccountabilityMessagePopupProps) {
  const getMessage = () => {
    if (messageType === 'phase-complete') {
      return `Your friend has now completed ${Math.round(progress)}% of their project. Send them a congrats!`;
    } else {
      return "Your friend might be having a tough time on their project - how about a check-in?";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 bg-transparent border-none shadow-none">
        <VisuallyHidden>
          <DialogTitle>Accountability Partner Message</DialogTitle>
          <DialogDescription>
            {messageType === 'phase-complete' ? 'Phase completion notification' : 'Issue reporting notification'}
          </DialogDescription>
        </VisuallyHidden>
        <div className="relative">
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="absolute -top-10 -right-2 z-10 bg-black/20 text-white hover:bg-black/40"
          >
            <X className="w-4 h-4" />
          </Button>
          
          {/* iPhone mockup */}
          <div className="mx-auto w-[280px] h-[580px] bg-black rounded-[45px] p-2 shadow-2xl">
            {/* iPhone screen */}
            <div className="w-full h-full bg-white rounded-[38px] overflow-hidden relative">
              {/* Status bar */}
              <div className="flex justify-between items-center px-6 py-2 bg-gray-50 text-xs font-medium">
                <div className="flex items-center gap-1">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-black rounded-full"></div>
                    <div className="w-1 h-1 bg-black rounded-full"></div>
                    <div className="w-1 h-1 bg-black rounded-full"></div>
                  </div>
                  <span className="ml-2 text-black">Verizon</span>
                </div>
                <span className="text-black font-semibold">9:41 AM</span>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-3 border border-black rounded-sm">
                    <div className="w-4 h-1.5 bg-green-500 rounded-sm m-0.5"></div>
                  </div>
                </div>
              </div>
              
              {/* Messages header */}
              <div className="bg-blue-500 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm text-gray-600">👤</span>
                  </div>
                  <div>
                    <div className="font-semibold">Alex (Team Mate)</div>
                    <div className="text-xs opacity-90">Active now</div>
                  </div>
                </div>
              </div>
              
              {/* Messages content */}
              <div className="flex-1 p-4 bg-gray-50">
                <div className="space-y-4">
                  {/* Previous messages */}
                  <div className="flex justify-start">
                    <div className="bg-gray-300 rounded-2xl rounded-bl-md px-4 py-2 max-w-[200px]">
                      <p className="text-sm text-gray-800">Hey! How's the project going?</p>
                      <p className="text-xs text-gray-600 mt-1">2:30 PM</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <div className="bg-blue-500 rounded-2xl rounded-br-md px-4 py-2 max-w-[200px]">
                      <p className="text-sm text-white">Pretty good! Making progress 💪</p>
                      <p className="text-xs text-blue-200 mt-1">2:32 PM</p>
                    </div>
                  </div>
                  
                  {/* New automated message */}
                  <div className="flex justify-start">
                    <div className="bg-yellow-100 border border-yellow-300 rounded-2xl rounded-bl-md px-4 py-3 max-w-[220px]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white">🤖</span>
                        </div>
                        <span className="text-xs font-medium text-orange-700">Project Partner</span>
                      </div>
                      <p className="text-sm text-gray-800 font-medium">
                        {getMessage()}
                      </p>
                      <p className="text-xs text-gray-600 mt-2">Just now</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Message input area */}
              <div className="p-3 bg-white border-t">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full px-4 py-2">
                    <span className="text-gray-500 text-sm">Message...</span>
                  </div>
                  <button className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">↑</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}