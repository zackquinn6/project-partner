import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
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

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="content-large"
      title={currentMode === 'add-tools' ? 'Add to Library' : 'My Tools Library'}
    >
        
        <div className="flex flex-col min-h-[60vh] p-4 sm:p-0">
          <Tabs defaultValue="tools" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 h-12">
              <TabsTrigger value="tools" className="text-sm px-3 py-2">My Tools</TabsTrigger>
              <TabsTrigger value="materials" className="text-sm px-3 py-2">My Materials</TabsTrigger>
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
    </ResponsiveDialog>
  );
}