import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, ListOrdered, Wrench, Clock, GraduationCap, GitBranch, FileText } from 'lucide-react';

interface PlanningGuideWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanningGuideWindow({ open, onOpenChange }: PlanningGuideWindowProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 [&>button]:hidden">
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
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-8 pr-4 pb-6 text-sm">
            <p className="text-muted-foreground">
              This guide explains how to use Project Management to create and maintain project templates that your users will follow. Work through the sections in order when you are new; use the headings to jump to a topic when you need a refresher.
            </p>

            <section>
              <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                <ListOrdered className="w-4 h-4" />
                1. What Project Management is for
              </h2>
              <p className="mb-2">
                Project Management is where you define <strong>project templates</strong>: the phases, operations, and steps that make up a project. Each template can have tools, materials, time estimates, and instructions. Users start a project from a template and follow the workflow you design.
              </p>
              <p>
                You can manage <strong>project details</strong> (name, description, category, images) and use <strong>Revision Control</strong> to create new versions of a template, compare revisions, and publish when ready.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                <ListOrdered className="w-4 h-4" />
                2. Choosing what to edit
              </h2>
              <ul className="list-disc pl-5 space-y-1 mb-2">
                <li><strong>Select a project</strong> from the dropdown to work on an existing template.</li>
                <li><strong>Edit Standard</strong> opens the shared “Standard Project Foundation” that underlies many projects. Use it to change the core phases and steps that appear across templates. Only use this when you intend to change the standard workflow for everyone.</li>
                <li><strong>New Project</strong> creates a new template. After creating it, select it and use the workflow editor to build phases and steps.</li>
              </ul>
              <p>
                For most day-to-day work, select a specific project (not Edit Standard) and use the <strong>Edit Workflow</strong> button to open the workflow editor.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                <ListOrdered className="w-4 h-4" />
                3. Understanding the workflow structure
              </h2>
              <p className="mb-2">
                Every project template is organized in three levels:
              </p>
              <ol className="list-decimal pl-5 space-y-2 mb-2">
                <li><strong>Phases</strong> — High-level stages (e.g. “Preparation”, “Installation”, “Finishing”). They define the order of work.</li>
                <li><strong>Operations</strong> — Groups of tasks within a phase (e.g. “Remove old fixture”, “Install new fixture”).</li>
                <li><strong>Steps</strong> — Individual tasks. Each step can have tools, materials, time estimates, and instructions.</li>
              </ol>
              <p>
                In the workflow editor you can add, reorder, and delete phases, operations, and steps. Standard phases (from the Standard Project Foundation) can only be changed when you use <strong>Edit Standard</strong>; for a normal project you add custom phases or work within the standard structure.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4" />
                4. How to add or edit alternate tools
              </h2>
              <p className="mb-2">
                For any step you can assign <strong>primary tools</strong> and <strong>alternate tools</strong>. Primary tools are the main recommendation; alternates give users other options (e.g. a different brand or type that still works).
              </p>
              <ol className="list-decimal pl-5 space-y-1 mb-2">
                <li>In the workflow editor, open the step you want to edit.</li>
                <li>In the <strong>Tools</strong> section for that step, add or select the primary tool(s).</li>
                <li>Use the option to add <strong>alternates</strong> (or “alternate tools”) for that tool and enter the alternate tool names or select them from the library.</li>
                <li>Save the step. Users will see both primary and alternate options when they view the step.</li>
              </ol>
              <p>
                If your project uses the Tools & Materials Library, you can pick tools from the library so names and details stay consistent. Alternates are stored per step so different steps can have different primary/alternate sets.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" />
                5. How to change standard durations (time estimates)
              </h2>
              <p className="mb-2">
                Each step can have a <strong>time estimation</strong> so users see how long the step might take. You can set fixed time or variable time (e.g. low/medium/high) and, for scaled steps, tie time to the project’s scaling unit (e.g. per square foot).
              </p>
              <ol className="list-decimal pl-5 space-y-1 mb-2">
                <li>In the workflow editor, open the step.</li>
                <li>Find the <strong>Time Estimation</strong> (or “Duration”) section for that step.</li>
                <li>Enter or adjust the time values (e.g. minutes or hours for fixed time, or low/medium/high for variable time). For scaled steps, set time per unit if your template uses a scaling unit.</li>
                <li>Save the step. Project totals will update from these step-level estimates.</li>
              </ol>
              <p>
                Changing durations here only affects the template you’re editing. To change durations in the shared standard workflow, use <strong>Edit Standard</strong> and edit the time estimation for the relevant steps there.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4" />
                6. How to write instructions for different user levels
              </h2>
              <p className="mb-2">
                Steps can show different instruction content depending on whether the user is a <strong>beginner</strong>, <strong>intermediate</strong>, or <strong>advanced</strong> user. That way you can provide more detail for beginners and shorter, assumption-heavy text for advanced users.
              </p>
              <ol className="list-decimal pl-5 space-y-1 mb-2">
                <li>In the workflow editor, open the step.</li>
                <li>In the step’s content/instructions area, use the editor that supports <strong>multiple instruction levels</strong> (often labeled for Beginner, Intermediate, Advanced).</li>
                <li>Write or paste the instruction text for each level. You can use the same text for two levels or tailor each level (e.g. more safety and “why” for beginners, fewer basics for advanced).</li>
                <li>Add sections, bullets, or formatting as needed. Save the step.</li>
              </ol>
              <p>
                When a user runs the project, they choose their experience level (or it’s remembered). The app then shows the matching instruction content for each step. Keeping levels in sync (e.g. same steps in a different tone) makes the experience consistent.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" />
                7. Other things you can set per step
              </h2>
              <p className="mb-2">
                Besides tools, time, and instructions, you can configure:
              </p>
              <ul className="list-disc pl-5 space-y-1 mb-2">
                <li><strong>Materials</strong> — Required materials and quantities so users can build a shopping list.</li>
                <li><strong>Outputs</strong> — What the step produces (e.g. “Fixture removed”, “Surface prepared”) for tracking progress.</li>
                <li><strong>Step type</strong> — e.g. scaled vs fixed, or quality-control steps, so time and scheduling behave correctly.</li>
                <li><strong>Skill level</strong> — Suggested skill level for the step so users know what to expect.</li>
              </ul>
              <p>
                Use these so each step gives users clear guidance, timing, and materials in one place.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                <GitBranch className="w-4 h-4" />
                8. Revisions and publishing
              </h2>
              <p className="mb-2">
                The <strong>Revision Control</strong> tab lets you create new revisions of a project template. Each revision is a version you can edit without changing the previously published one. When you’re happy with a revision, you can publish it so users see the updated template.
              </p>
              <ul className="list-disc pl-5 space-y-1 mb-2">
                <li>Create a new revision when you want to try changes without affecting the current live template.</li>
                <li>Edit the new revision’s workflow and details as needed.</li>
                <li>Publish the revision when it’s ready; that revision becomes the template users can start from.</li>
              </ul>
              <p>
                Use revision notes to record what changed (e.g. “Added alternates for Step 3”, “Updated durations for Phase 2”). That helps you and your team understand the history of each template.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mb-2">Quick reference</h2>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><strong>Add alternate tools:</strong> Step → Tools section → add/select tool → add alternates for that tool.</li>
                <li><strong>Change durations:</strong> Step → Time Estimation section → set fixed or variable time (and per-unit for scaled steps).</li>
                <li><strong>Instructions by level:</strong> Step → content/instructions editor → write separate Beginner, Intermediate, and Advanced text.</li>
                <li><strong>Edit standard workflow:</strong> Use “Edit Standard” only when changing the shared foundation; otherwise select a project and use “Edit Workflow”.</li>
              </ul>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
