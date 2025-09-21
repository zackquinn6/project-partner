import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {currentMode === 'add-tools' ? 'Add to Library' : 'My Tools Library'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="tools" className="w-full h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tools">My Tools</TabsTrigger>
            <TabsTrigger value="materials">My Materials</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tools" className="h-full">
            <UserToolsEditor 
              initialMode={currentMode}
              onBackToLibrary={() => setCurrentMode('library')}
              onSwitchToAdd={() => setCurrentMode('add-tools')}
            />
          </TabsContent>
          
          <TabsContent value="materials" className="h-full">
            <UserMaterialsEditor 
              initialMode={'add-materials'}
              onBackToLibrary={() => setCurrentMode('library')}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}