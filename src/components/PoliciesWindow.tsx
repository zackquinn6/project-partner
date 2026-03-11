import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Shield } from 'lucide-react';

const PLACEHOLDER_PRIVACY = `
Privacy Policy (Placeholder)

This is placeholder content for the Project Partner Privacy Policy. It will be replaced with the full policy text.

We do not share your home information with any other businesses. Your data is safe and secure.

- What we collect
- How we use your data
- How we protect your data
- Your choices
`.trim();

const PLACEHOLDER_LIABILITY = `
General Usage (Placeholder)

This is placeholder content for the Project Partner General Usage agreement. It will be replaced with the full legal text.

- Scope of services
- No guarantee of results
- Assumption of risk
- Limitation of liability
- Professional advice
`.trim();

interface PoliciesWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PoliciesWindow({ open, onOpenChange }: PoliciesWindowProps) {
  const [tab, setTab] = useState<'privacy' | 'liability'>('privacy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Policies
          </DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'privacy' | 'liability')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="privacy" className="gap-2">
              <Shield className="h-4 w-4" />
              Privacy Policy
            </TabsTrigger>
            <TabsTrigger value="liability" className="gap-2">
              <FileText className="h-4 w-4" />
              General Usage
            </TabsTrigger>
          </TabsList>
          <TabsContent value="privacy" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[50vh] border rounded-md p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{PLACEHOLDER_PRIVACY}</pre>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="liability" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[50vh] border rounded-md p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{PLACEHOLDER_LIABILITY}</pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
