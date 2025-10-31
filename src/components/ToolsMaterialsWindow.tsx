import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToolsLibrary } from "./ToolsLibrary";
import { MaterialsLibrary } from "./MaterialsLibrary";
import { UserToolsEditor } from "./UserToolsEditor";
import { UserMaterialsEditor } from "./UserMaterialsEditor";
import { useUserRole } from "@/hooks/useUserRole";

interface ToolsMaterialsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ToolsMaterialsWindow({ open, onOpenChange }: ToolsMaterialsWindowProps) {
  const { isAdmin, loading } = useUserRole();

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg md:text-xl font-bold">Loading...</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onOpenChange(false)} 
                className="h-7 px-2 text-[9px] md:text-xs"
              >
                Close
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading tools & materials...</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl font-bold">
              {isAdmin ? "Tools & Materials Library (Admin)" : "My Tools & Materials Library"}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)} 
              className="h-7 px-2 text-[9px] md:text-xs"
            >
              Close
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
          <Tabs defaultValue="tools" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="tools" className="text-xs md:text-sm">
                {isAdmin ? "Tools Library" : "My Tools"}
              </TabsTrigger>
              <TabsTrigger value="materials" className="text-xs md:text-sm">
                {isAdmin ? "Materials Library" : "My Materials"}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="tools" className="mt-4">
              {isAdmin ? <ToolsLibrary /> : <UserToolsEditor />}
            </TabsContent>
            
            <TabsContent value="materials" className="mt-4">
              {isAdmin ? <MaterialsLibrary /> : <UserMaterialsEditor />}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}