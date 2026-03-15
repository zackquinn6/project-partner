import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, ListOrdered, Wrench, Clock, GraduationCap, GitBranch, FileText, Target, ClipboardCheck } from 'lucide-react';

export type PlanningGuideTab = 'overview' | 'instructions' | 'publishing-checklist' | 'faqs';

interface PlanningGuideWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the guide opens to this tab (e.g. from "View publishing checklist" link). */
  initialTab?: PlanningGuideTab;
}

export function PlanningGuideWindow({ open, onOpenChange, initialTab }: PlanningGuideWindowProps) {
  const defaultTab = initialTab ?? 'overview';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[90vw] max-h-[90vh] flex flex-col p-0 gap-0 [&>button]:hidden">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Project Management Planning Guide
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogHeader>
        <Tabs key={open ? defaultTab : 'closed'} defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start flex-shrink-0 rounded-none border-b bg-muted/30 px-4 h-11">
            <TabsTrigger value="overview" className="text-xs md:text-sm">Overview & guidelines</TabsTrigger>
            <TabsTrigger value="instructions" className="text-xs md:text-sm">Instructions</TabsTrigger>
            <TabsTrigger value="publishing-checklist" className="text-xs md:text-sm">Publishing checklist</TabsTrigger>
            <TabsTrigger value="faqs" className="text-xs md:text-sm">FAQs</TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-1">
            <TabsContent value="overview" className="mt-0 px-4 py-4 pb-8 focus-visible:outline-none">
              <div className="space-y-6 text-sm max-w-3xl">
                <section>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4" />
                    Goal and general rules
                  </h2>
                  <p className="mb-2">
                    As in the Project Owner agreement: we’re all here for the same reason — to make DIY less chaotic and more empowering. This agreement keeps us aligned, accountable, and moving in the same direction, with clarity, good vibes, and shared purpose.
                  </p>
                  <p className="text-muted-foreground italic">
                    “We’re all here for the same reason: to make DIY less chaotic and more empowering. This agreement simply keeps us aligned, accountable, and moving in the same direction — with clarity, good vibes, and shared purpose.”
                  </p>
                </section>
                <section>
                  <h2 className="text-base font-semibold mb-2">General guidelines</h2>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Keep instructions sequential, simple, and broken into clear phases.</li>
                    <li>Be specific about tools, materials, timing, and what “good” looks like.</li>
                    <li>Update content regularly to reflect current techniques and standards.</li>
                    <li>Put safety guidance upfront and explain why each step matters.</li>
                    <li>Use visuals only when they add clarity or prevent confusion.</li>
                    <li>Treat feedback as a signal for improvement and respond promptly.</li>
                    <li>Monitor Success Scores and adjust content based on user outcomes.</li>
                    <li>Maintain a supportive, human tone that builds confidence.</li>
                    <li>Offer alternatives and quick fixes when tools or conditions vary.</li>
                    <li>Keep version notes so updates stay consistent across the system.</li>
                  </ul>
                </section>
                <section>
                  <h2 className="text-base font-semibold mb-2">What Project Management is for</h2>
                  <p>
                    Project Management is where you define <strong>project templates</strong>: phases, operations, and steps. Each template can have tools, materials, time estimates, and instructions. You manage project details and use <strong>Revision Control</strong> to create new versions and publish when ready.
                  </p>
                </section>
              </div>
            </TabsContent>

            <TabsContent value="instructions" className="mt-0 px-4 py-4 pb-8 focus-visible:outline-none">
              <div className="space-y-8 text-sm max-w-3xl pr-4">
                <section>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                    <ListOrdered className="w-4 h-4" />
                    Choosing what to edit
                  </h2>
                  <ul className="list-disc pl-5 space-y-1 mb-2">
                    <li><strong>Select a project</strong> from the dropdown to work on an existing template.</li>
                    <li><strong>Edit Standard</strong> opens the shared “Standard Project Foundation.” Use it only when changing the core workflow for everyone.</li>
                    <li><strong>New Project</strong> creates a new template; then select it and use Edit Workflow to build phases and steps.</li>
                  </ul>
                  <p>For most work, select a specific project and use <strong>Edit Workflow</strong>.</p>
                </section>
                <section>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">Workflow structure</h2>
                  <p className="mb-2">Templates are organized in three levels:</p>
                  <ol className="list-decimal pl-5 space-y-1 mb-2">
                    <li><strong>Phases</strong> — High-level stages (e.g. Preparation, Installation, Finishing).</li>
                    <li><strong>Operations</strong> — Groups of tasks within a phase.</li>
                    <li><strong>Steps</strong> — Individual tasks with tools, materials, time, and instructions.</li>
                  </ol>
                  <p>Standard phases can only be changed via <strong>Edit Standard</strong>.</p>
                </section>
                <section>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4" />
                    How to add or edit alternate tools
                  </h2>
                  <p className="mb-2">For any step you can assign primary and <strong>alternate tools</strong>. Alternates give users other options (e.g. different brand or type).</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>In the workflow editor, open the step.</li>
                    <li>In the <strong>Tools</strong> section, add or select primary tool(s).</li>
                    <li>Add <strong>alternates</strong> for that tool (names or from the library).</li>
                    <li>Save the step.</li>
                  </ol>
                </section>
                <section>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" />
                    How to change durations (time estimates)
                  </h2>
                  <p className="mb-2">Each step can have a <strong>time estimation</strong> (fixed or variable, and for scaled steps, per unit).</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Open the step in the workflow editor.</li>
                    <li>Find the <strong>Time Estimation</strong> section.</li>
                    <li>Enter or adjust time values; for scaled steps set time per unit.</li>
                    <li>Save the step.</li>
                  </ol>
                </section>
                <section>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4" />
                    Instructions for different user levels
                  </h2>
                  <p className="mb-2">Steps can show different content for <strong>beginner</strong>, <strong>intermediate</strong>, and <strong>advanced</strong> users.</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Open the step.</li>
                    <li>In the step’s content/instructions area, use the editor for <strong>Beginner, Intermediate, Advanced</strong>.</li>
                    <li>Write or paste text for each level; save the step.</li>
                  </ol>
                </section>
                <section>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" />
                    Other per-step settings
                  </h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Materials</strong> — Required materials and quantities.</li>
                    <li><strong>Outputs</strong> — What the step produces.</li>
                    <li><strong>Step type</strong> — Scaled vs fixed, quality-control.</li>
                    <li><strong>Skill level</strong> — Suggested skill for the step.</li>
                  </ul>
                </section>
                <section>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                    <GitBranch className="w-4 h-4" />
                    Revisions and publishing
                  </h2>
                  <p className="mb-2">The <strong>Revision Control</strong> tab lets you create new revisions and publish when ready. Use revision notes to record what changed.</p>
                </section>
              </div>
            </TabsContent>

            <TabsContent value="publishing-checklist" className="mt-0 px-4 py-4 pb-8 focus-visible:outline-none">
              <div className="space-y-4 text-sm max-w-3xl">
                <p className="text-muted-foreground">
                  Before releasing to beta or publishing, confirm each item below. Use revision notes to record what you changed.
                </p>
                <ul className="space-y-3 list-none pl-0">
                  <li className="flex items-start gap-3">
                    <ClipboardCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>3 levels of instructions</strong> — Beginner, Intermediate, and Advanced content for steps where it matters.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ClipboardCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Tools & alternates</strong> — Primary tools and alternate options defined for steps that require tools.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ClipboardCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Materials & alternates</strong> — Materials and quantities (and alternates where applicable) for each step.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ClipboardCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>FMEA</strong> — Process FMEA (failure modes and effects) completed where relevant for the project.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ClipboardCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Risks</strong> — Risks and mitigation strategies documented in the project’s risk management.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ClipboardCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Key Characteristics</strong> — Key product or process characteristics identified and documented.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ClipboardCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Quality Control</strong> — Quality control steps and criteria defined where applicable.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ClipboardCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Error Correction</strong> — Guidance for common errors and how to correct them.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ClipboardCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Safety</strong> — Safety guidance upfront and at relevant steps; reasons explained.</span>
                  </li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="faqs" className="mt-0 px-4 py-4 pb-8 focus-visible:outline-none">
              <div className="space-y-6 text-sm max-w-3xl">
                <div>
                  <h3 className="font-semibold mb-1">How do I add alternate tools?</h3>
                  <p className="text-muted-foreground">Open the step in the workflow editor → Tools section → add or select the primary tool → add alternates for that tool (name or from library). Save the step.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">How do I change standard durations?</h3>
                  <p className="text-muted-foreground">Open the step → Time Estimation section → set fixed or variable time (and per-unit for scaled steps). For the shared standard workflow, use Edit Standard first, then edit the step durations there.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">How do I write instructions for different user levels?</h3>
                  <p className="text-muted-foreground">Open the step → content/instructions editor → write separate text for Beginner, Intermediate, and Advanced. Users see the level that matches their chosen experience.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">When should I use Edit Standard vs a specific project?</h3>
                  <p className="text-muted-foreground">Use <strong>Edit Standard</strong> only when changing the core phases/steps that apply across templates. For normal edits (one project’s workflow, tools, instructions), select that project and use Edit Workflow.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Where do I see the publishing checklist?</h3>
                  <p className="text-muted-foreground">Open the Planning Guide (Planning Guide button in Project Management) and go to the <strong>Publishing checklist</strong> tab. A link is also available in the dialog when you enter release notes before publishing.</p>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
