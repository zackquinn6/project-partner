import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EnhancedToolImporter } from './EnhancedToolImporter';

interface ToolsImportManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ToolsImportManager({ open, onOpenChange, onSuccess }: ToolsImportManagerProps) {
  const resetAll = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import Tools</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="enhanced" className="w-full overflow-y-auto">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="enhanced">Import tool list</TabsTrigger>
          </TabsList>
          
          {/* Enhanced Import Tab */}
          <TabsContent value="enhanced" className="space-y-4 overflow-y-auto max-h-[70vh]">
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Tool Import System</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Advanced import system with automatic variant detection, warning flags, pricing scraping, and weight/lifespan estimation.
                </p>
                <EnhancedToolImporter
                  open={true}
                  onOpenChange={() => {}}
                  onSuccess={() => {
                    onSuccess();
                    resetAll();
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={resetAll}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}