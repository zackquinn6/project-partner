import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading tools & materials...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isAdmin ? "Tools & Materials Library (Admin)" : "My Tools & Materials Library"}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="tools" className="w-full h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tools">
              {isAdmin ? "Tools Library" : "My Tools"}
            </TabsTrigger>
            <TabsTrigger value="materials">
              {isAdmin ? "Materials Library" : "My Materials"}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tools" className="h-full">
            {isAdmin ? <ToolsLibrary /> : <UserToolsEditor />}
          </TabsContent>
          
          <TabsContent value="materials" className="h-full">
            {isAdmin ? <MaterialsLibrary /> : <UserMaterialsEditor />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}