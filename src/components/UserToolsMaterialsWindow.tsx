import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserToolsEditor } from "./UserToolsEditor";
import { UserMaterialsEditor } from "./UserMaterialsEditor";

interface UserToolsMaterialsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialToolsMode?: 'library' | 'add-tools';
}

export function UserToolsMaterialsWindow({ open, onOpenChange, initialToolsMode }: UserToolsMaterialsWindowProps) {
  const [currentMode, setCurrentMode] = useState<'library' | 'add-tools'>('library');

  // Update currentMode when initialToolsMode changes
  useEffect(() => {
    if (initialToolsMode) {
      setCurrentMode(initialToolsMode);
    }
  }, [initialToolsMode]);

  // Listen for close add window events
  useEffect(() => {
    const handleCloseAddWindow = () => {
      onOpenChange(false);
    };

    window.addEventListener('close-add-tools-window', handleCloseAddWindow);
    return () => {
      window.removeEventListener('close-add-tools-window', handleCloseAddWindow);
    };
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-6xl sm:max-h-[80vh] overflow-hidden border-none sm:border p-0 sm:p-6">
        <DialogHeader className="p-4 sm:p-0 border-b sm:border-none">
          <DialogTitle className="text-sm sm:text-base">
            {currentMode === 'add-tools' ? 'Add to Library' : 'My Tools Library'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col min-h-[60vh] p-4 sm:p-0">
          <Tabs defaultValue="tools" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="tools">My Tools</TabsTrigger>
              <TabsTrigger value="materials">My Materials</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tools">
              <UserToolsEditor 
                initialMode={currentMode}
                onBackToLibrary={() => setCurrentMode('library')}
                onSwitchToAdd={() => setCurrentMode('add-tools')}
              />
            </TabsContent>
            
            <TabsContent value="materials">
              <UserMaterialsEditor 
                initialMode={'library'}
                onBackToLibrary={() => setCurrentMode('library')}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}