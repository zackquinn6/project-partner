import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, ListOrdered, Wrench, Clock, GraduationCap, GitBranch, FileText, Target, ClipboardCheck, Layers } from 'lucide-react';
import {
  CROSS_CUTTING_RULES,
  HIERARCHY_SUMMARY,
  INSTRUCTION_LEVELS,
  PLANNING_STANDARD_VERSION,
  PRODUCT_GUIDELINES,
  PUBLISHING_CHECKLIST,
  TOOLIO_PROJECT_STRUCTURE_STANDARD,
} from '@/utils/projectPlanningStandard';

export type PlanningGuideTab = 'overview' | 'structure' | 'instructions' | 'publishing-checklist' | 'faqs';

interface PlanningGuideWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the guide opens to this tab (e.g. from "View publishing checklist" link). */
  initialTab?: PlanningGuideTab;
}

function crossCuttingRule(id: string): string {
  const found = CROSS_CUTTING_RULES.find((r) => r.id === id);
  if (!found) {
    throw new Error(`Missing cross-cutting rule: ${id}`);
  }
  return found.rule;
}

export function PlanningGuideWindow({ open, onOpenChange, initialTab }: PlanningGuideWindowProps) {
  const defaultTab = initialTab ?? 'overview';
  const structure = TOOLIO_PROJECT_STRUCTURE_STANDARD;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] md:max-w-[90vw] h-[90vh] min-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden [&>button]:hidden">
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
        <Tabs key={open ? defaultTab : 'closed'} defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="w-full justify-start flex-shrink-0 rounded-none border-b bg-muted/30 px-4 h-11 space-x-1">
            <TabsTrigger value="overview" className="text-xs md:text-sm">Overview & guidelines</TabsTrigger>
            <TabsTrigger value="structure" className="text-xs md:text-sm flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Project structure guide
            </TabsTrigger>
            <TabsTrigger value="instructions" className="text-xs md:text-sm">Instructions</TabsTrigger>
            <TabsTrigger value="publishing-checklist" className="text-xs md:text-sm">Publishing checklist</TabsTrigger>
            <TabsTrigger value="faqs" className="text-xs md:text-sm">FAQs</TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-1 min-h-0">
            <TabsContent value="overview" className="mt-0 px-4 py-4 pb-8 focus-visible:outline-none">
              <div className="space-y-6 text-sm max-w-3xl">
                <section>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4" />
                    Goal and general rules
                  </h2>
                  <p className="mb-2">
                    As in the Project Owner agreement: we are all here for the same reason - to make DIY less chaotic and more empowering. This agreement keeps us aligned, accountable, and moving in the same direction, with clarity, good vibes, and shared purpose.
                  </p>
                  <p className="text-muted-foreground italic">
                    &ldquo;We&apos;re all here for the same reason: to make DIY less chaotic and more empowering. This agreement simply keeps us aligned, accountable, and moving in the same direction - with clarity, good vibes, and shared purpose.&rdquo;
                  </p>
                </section>
                <section>
                  <h2 className="text-base font-semibold mb-2">General guidelines</h2>
                  <ul className="list-disc pl-5 space-y-2">
                    {PRODUCT_GUIDELINES.map((guideline) => (
                      <li key={guideline}>{guideline}</li>
                    ))}
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

            <TabsContent value="structure" className="mt-0 px-4 py-4 pb-8 focus-visible:outline-none">
              <div className="space-y-6 text-sm max-w-4xl">
                <section>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4" />
                    TOOLIO Project structure - quick reference standard
                  </h2>
                  <p className="text-muted-foreground">
                    {structure.summary}
                  </p>
                </section>

                <section>
                  <h2 className="text-base font-semibold mb-2">Hierarchy</h2>
                  <div className="rounded-md border bg-muted/40 p-3">
                    {structure.hierarchy.map(line => (
                      <p key={line} className="font-medium">
                        {line}
                      </p>
                    ))}
                    <p className="text-xs text-muted-foreground mt-1">
                      {HIERARCHY_SUMMARY}
                    </p>
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">1. Phase</h3>
                    <p className="text-sm">
                      {structure.levels.phase.description}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Purpose:</span>{' '}
                      {structure.levels.phase.purpose}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Contains:</span>{' '}
                      {structure.levels.phase.contains}
                    </p>
                    <div>
                      <p className="font-semibold text-sm mb-1">Rules</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Duration: {structure.levels.phase.durationMax}</li>
                        <li>Count: {structure.levels.phase.countRules}</li>
                        {structure.levels.phase.mustRules.map(rule => (
                          <li key={rule}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                    {structure.levels.phase.examples && (
                      <div>
                        <p className="font-semibold text-sm mb-1">Examples</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {structure.levels.phase.examples.map(ex => (
                            <li key={ex}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">2. Operation</h3>
                    <p className="text-sm">
                      {structure.levels.operation.description}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Purpose:</span>{' '}
                      {structure.levels.operation.purpose}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Contains:</span>{' '}
                      {structure.levels.operation.contains}
                    </p>
                    <div>
                      <p className="font-semibold text-sm mb-1">Rules</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Duration: {structure.levels.operation.durationMax}</li>
                        <li>Count: {structure.levels.operation.countRules}</li>
                        {structure.levels.operation.mustRules.map(rule => (
                          <li key={rule}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                    {structure.levels.operation.examples && (
                      <div>
                        <p className="font-semibold text-sm mb-1">Examples</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {structure.levels.operation.examples.map(ex => (
                            <li key={ex}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">3. Step</h3>
                    <p className="text-sm">
                      {structure.levels.step.description}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Purpose:</span>{' '}
                      {structure.levels.step.purpose}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Contains:</span>{' '}
                      {structure.levels.step.contains}
                    </p>
                    <div>
                      <p className="font-semibold text-sm mb-1">Rules</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Typical: {structure.levels.step.durationTypical}</li>
                        <li>Max: {structure.levels.step.durationMax}</li>
                        <li>Count: {structure.levels.step.countRules}</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">4. Actions inside each step</h3>
                    <p className="text-sm">Every step must include:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      {structure.stepRequirements.map(req => (
                        <li key={req}>{req}</li>
                      ))}
                    </ol>
                    <div>
                      <p className="font-semibold text-sm mb-1">Action examples</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {(structure.levels.action.examples ?? []).map(ex => (
                          <li key={ex}>{ex}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold text-sm mb-2">5. Time standards summary</h3>
                  <div className="overflow-x-auto rounded-md border bg-muted/40">
                    <table className="w-full text-xs md:text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b">
                          <th className="py-2 pr-4">Level</th>
                          <th className="py-2 pr-4">Typical duration</th>
                          <th className="py-2 pr-4">Max duration</th>
                          <th className="py-2 pr-4">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {structure.timeStandards.map(row => (
                          <tr key={row.level} className="border-b last:border-0">
                            <td className="py-2 pr-4 capitalize">{row.level}</td>
                            <td className="py-2 pr-4">{row.typicalDuration}</td>
                            <td className="py-2 pr-4">{row.maxDuration}</td>
                            <td className="py-2 pr-4">{row.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                    <li><strong>Edit Standard</strong> opens the shared &ldquo;Standard Project Foundation.&rdquo; Use it only when changing the core workflow for everyone.</li>
                    <li><strong>New Project</strong> creates a new template; then select it and use Edit Workflow to build phases and steps.</li>
                  </ul>
                  <p>For most work, select a specific project and use <strong>Edit Workflow</strong>.</p>
                </section>
                <section>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">Workflow structure</h2>
                  <p className="mb-2">Templates are organized as:</p>
                  <ol className="list-decimal pl-5 space-y-1 mb-2">
                    <li><strong>Phases</strong> - High-level stages (e.g. Preparation, Installation, Finishing).</li>
                    <li><strong>Operations</strong> - Groups of tasks within a phase.</li>
                    <li><strong>Steps</strong> - Individual tasks with tools, materials, time, and instructions.</li>
                  </ol>
                  <p className="text-muted-foreground mb-2">{HIERARCHY_SUMMARY}</p>
                  <p>Standard phases can only be changed via <strong>Edit Standard</strong>.</p>
                </section>
                <section>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4" />
                    How to add or edit alternate tools
                  </h2>
                  <p className="mb-2">{crossCuttingRule('alternates')}</p>
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
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">Waiting steps (drying, curing)</h2>
                  <p className="mb-2">{crossCuttingRule('waiting-steps')}</p>
                </section>
                <section>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4" />
                    Instructions for different user levels
                  </h2>
                  <p className="mb-2">{INSTRUCTION_LEVELS.rule}</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Open the step.</li>
                    <li>In the step&apos;s content/instructions area, use the editor for <strong>Beginner, Intermediate, Advanced</strong>.</li>
                    <li>Write or paste text for each level; save the step.</li>
                  </ol>
                </section>
                <section>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" />
                    Other per-step settings
                  </h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Materials</strong> - Required materials and quantities.</li>
                    <li><strong>Outputs</strong> - What the step produces.</li>
                    <li><strong>Step type</strong> - Scaled vs fixed, quality-control.</li>
                    <li><strong>Skill level</strong> - Suggested skill for the step.</li>
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
                  {PUBLISHING_CHECKLIST.map((item) => (
                    <li key={item.id} className="flex items-start gap-3">
                      <ClipboardCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>{item.label}</strong> - {item.description}
                      </span>
                    </li>
                  ))}
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
                  <p className="text-muted-foreground">{INSTRUCTION_LEVELS.rule} In the editor, write separate text for each level.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">When should I use Edit Standard vs a specific project?</h3>
                  <p className="text-muted-foreground">Use <strong>Edit Standard</strong> only when changing the core phases/steps that apply across templates. For normal edits (one project&apos;s workflow, tools, instructions), select that project and use Edit Workflow.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Where do I see the publishing checklist?</h3>
                  <p className="text-muted-foreground">Open the Planning Guide (Planning Guide button in Project Management) and go to the <strong>Publishing checklist</strong> tab. A link is also available in the dialog when you enter release notes before publishing.</p>
                </div>
              </div>
            </TabsContent>

            <div className="px-4 py-3 border-t text-xs text-muted-foreground">
              Planning standard v{PLANNING_STANDARD_VERSION} - Shared with AI project development reference
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
