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
        <DialogContent className="flex h-screen max-h-full w-full max-w-full min-h-0 flex-col overflow-hidden p-0 md:h-[90vh] md:max-h-[90vh] md:max-w-[90vw] md:rounded-lg [&>button]:hidden">
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
          <div className="flex flex-1 min-h-0 flex-col items-center justify-center overflow-hidden px-2 md:px-4 py-3 md:py-4">
            <div className="text-muted-foreground">Loading tools & materials...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-screen max-h-full w-full max-w-full min-h-0 flex-col overflow-hidden p-0 md:h-[90vh] md:max-h-[90vh] md:max-w-[90vw] md:rounded-lg [&>button]:hidden">
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 md:px-4 py-3 md:py-4">
          <Tabs defaultValue="tools" className="flex min-h-0 flex-1 flex-col gap-0">
            <TabsList className="mb-3 grid h-11 w-full shrink-0 grid-cols-[2fr_1fr] md:h-12">
              <TabsTrigger value="tools" className="w-full text-xs md:text-sm">
                {isAdmin ? "Tools Library" : "My Tools"}
              </TabsTrigger>
              <TabsTrigger value="materials" className="w-full text-xs md:text-sm">
                {isAdmin ? "Materials Library" : "My Materials"}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="tools"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
            >
              {isAdmin ? <ToolsLibrary /> : <UserToolsEditor />}
            </TabsContent>

            <TabsContent
              value="materials"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
            >
              {isAdmin ? <MaterialsLibrary /> : <UserMaterialsEditor />}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}