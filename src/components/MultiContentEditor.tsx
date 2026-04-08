import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileText, Image, Video, ExternalLink, AlertTriangle, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ContentSection, GeneralProjectDecision } from "@/interfaces/Project";
import {
  isInstructionWarningType,
  isInstructionProseSectionType,
  orderSectionsWithSafetyFirst,
} from "@/utils/instructionContentSections";

const DECISION_APPLICABILITY_TOOLTIP =
  "Leave as default to show this section for every homeowner choice. Add rules so this section only appears when all listed decisions match the selected choices.";

function getLayoutWidthClass(width?: ContentSection["width"]) {
  switch (width) {
    case "half":
      return "w-full sm:w-1/2";
    case "third":
      return "w-full sm:w-1/3";
    case "two-thirds":
      return "w-full sm:w-2/3";
    default:
      return "w-full";
  }
}

function getLayoutAlignmentClass(alignment?: ContentSection["alignment"]) {
  switch (alignment) {
    case "center":
      return "mx-auto";
    case "right":
      return "ml-auto";
    default:
      return "";
  }
}

interface MultiContentEditorProps {
  sections: ContentSection[];
  onChange: (sections: ContentSection[]) => void;
  /** When provided, each section can restrict visibility to general project decision choices (AND across rules). */
  generalDecisions?: GeneralProjectDecision[];
}

function SectionDecisionApplicabilityBlock({
  section,
  generalDecisions,
  onUpdate,
}: {
  section: ContentSection;
  generalDecisions: GeneralProjectDecision[];
  onUpdate: (app: ContentSection["decisionApplicability"]) => void;
}) {
  if (generalDecisions.length === 0) return null;

  const rules =
    section.decisionApplicability === null || section.decisionApplicability === undefined
      ? []
      : section.decisionApplicability;

  const setRules = (next: NonNullable<ContentSection["decisionApplicability"]>) => {
    onUpdate(next.length > 0 ? next : null);
  };

  return (
    <Accordion type="single" collapsible className="rounded-lg border border-dashed bg-muted/30 px-3">
      <AccordionItem value={`decision-applicability-${section.id}`} className="border-0">
        <AccordionTrigger className="py-3 text-xs font-semibold hover:no-underline [&[data-state=open]]:pb-2">
          <span className="flex items-center gap-2 text-left">
            Decision applicability
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="About decision applicability"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs leading-snug">
                  {DECISION_APPLICABILITY_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pt-0">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onUpdate(null)}
            >
              All choices (default)
            </Button>
          </div>
      <div className="space-y-3">
        {rules.map((rule, ruleIdx) => {
          const decision = generalDecisions.find((d) => d.id === rule.decisionId);
          return (
            <div key={`${rule.decisionId}-${ruleIdx}`} className="rounded border bg-background p-2 space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[10rem] space-y-1">
                  <Label className="text-[10px]">Decision</Label>
                  <Select
                    value={rule.decisionId}
                    onValueChange={(decisionId) => {
                      const d = generalDecisions.find((x) => x.id === decisionId);
                      const firstChoice = d?.choices[0]?.id;
                      const next = rules.map((r, i) =>
                        i === ruleIdx
                          ? { decisionId, choiceIds: firstChoice ? [firstChoice] : [] }
                          : r
                      );
                      setRules(next);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select decision" />
                    </SelectTrigger>
                    <SelectContent>
                      {generalDecisions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive"
                  onClick={() => setRules(rules.filter((_, i) => i !== ruleIdx))}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {decision && decision.choices.length > 0 ? (
                <div className="space-y-1">
                  <Label className="text-[10px]">Choices (this section shows if user picked any of)</Label>
                  <div className="flex flex-col gap-1.5 pl-1">
                    {decision.choices.map((c) => {
                      const checked = rule.choiceIds.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const on = v === true;
                              const nextChoiceIds = on
                                ? [...rule.choiceIds, c.id]
                                : rule.choiceIds.filter((id) => id !== c.id);
                              const next = rules.map((r, i) =>
                                i === ruleIdx ? { ...r, choiceIds: nextChoiceIds } : r
                              );
                              setRules(next);
                            }}
                          />
                          <span>{c.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={() => {
          const first = generalDecisions[0];
          if (!first) return;
          const cid = first.choices[0]?.id;
          setRules([
            ...rules,
            { decisionId: first.id, choiceIds: cid ? [cid] : [] },
          ]);
        }}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add decision rule
      </Button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function MultiContentEditor({ sections, onChange, generalDecisions = [] }: MultiContentEditorProps) {
  const orderedSections = useMemo(() => orderSectionsWithSafetyFirst(sections), [sections]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const ordered = orderSectionsWithSafetyFirst(sections);
    const rawKey = sections.map((s) => s.id).join("|");
    const orderedKey = ordered.map((s) => s.id).join("|");
    if (rawKey !== orderedKey) {
      onChangeRef.current(ordered);
    }
  }, [sections]);

  const addSection = (type: ContentSection["type"]) => {
    const newSection: ContentSection = {
      id: `section-${Date.now()}`,
      type,
      content: "",
      title: type === "text" ? "New Text Section" : "",
    };
    const base = orderSectionsWithSafetyFirst(sections);
    if (type === "safety-warning") {
      const safety = base.filter((s) => isInstructionWarningType(s.type));
      const rest = base.filter((s) => !isInstructionWarningType(s.type));
      onChange([newSection, ...safety, ...rest]);
    } else {
      onChange([...base, newSection]);
    }
  };

  const updateSection = (target: ContentSection, updates: Partial<ContentSection>) => {
    const idx = sections.indexOf(target);
    if (idx < 0) return;
    const updated = sections.map((section, i) => (i === idx ? { ...section, ...updates } : section));
    onChange(updated);
  };

  const removeSection = (target: ContentSection) => {
    const idx = sections.indexOf(target);
    if (idx < 0) return;
    onChange(sections.filter((_, i) => i !== idx));
  };

  const moveSection = (target: ContentSection, direction: "up" | "down") => {
    const list = orderSectionsWithSafetyFirst(sections);
    const index = list.indexOf(target);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const cur = list[index];
    const adj = list[targetIndex];
    const curSafety = isInstructionWarningType(cur.type);
    const adjSafety = isInstructionWarningType(adj.type);
    if (curSafety !== adjSafety) return;
    const newSections = [...list];
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    onChange(newSections);
  };

  const canMoveUp = (target: ContentSection) => {
    const list = orderedSections;
    const index = list.indexOf(target);
    if (index <= 0) return false;
    const cur = list[index];
    const prev = list[index - 1];
    return isInstructionWarningType(cur.type) === isInstructionWarningType(prev.type);
  };

  const canMoveDown = (target: ContentSection) => {
    const list = orderedSections;
    const index = list.indexOf(target);
    if (index < 0 || index >= list.length - 1) return false;
    const cur = list[index];
    const next = list[index + 1];
    return isInstructionWarningType(cur.type) === isInstructionWarningType(next.type);
  };

  const getIcon = (type: ContentSection['type']) => {
    switch (type) {
      case 'text':
      case 'standard':
      case 'tip':
        return <FileText className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'link': return <ExternalLink className="w-4 h-4" />;
      case 'safety-warning': return <AlertTriangle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'button': return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Step Content</h3>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => addSection('text')} 
            variant="outline"
            type="button"
          >
            <FileText className="w-4 h-4 mr-2" />
            Add Text
          </Button>
          <Button 
            size="sm" 
            onClick={() => addSection('image')} 
            variant="outline"
            type="button"
          >
            <Image className="w-4 h-4 mr-2" />
            Add Image
          </Button>
          <Button 
            size="sm" 
            onClick={() => addSection('video')} 
            variant="outline"
            type="button"
          >
            <Video className="w-4 h-4 mr-2" />
            Add Video
          </Button>
          <Button 
            size="sm" 
            onClick={() => addSection('link')} 
            variant="outline"
            type="button"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Add Link
          </Button>
          <Button 
            size="sm" 
            onClick={() => addSection('safety-warning')} 
            variant="outline"
            type="button"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Safety Warning
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-start">
        {orderedSections.map((section, index) => (
          <div
            key={`${sections.indexOf(section)}-${section.id}`}
            className={cn(
              getLayoutWidthClass(section.width),
              getLayoutAlignmentClass(section.alignment),
              "min-w-0 shrink-0"
            )}
          >
          <Card className="border-2 h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {getIcon(section.type)}
                  <CardTitle className="text-sm capitalize truncate">
                    {section.type} Section {index + 1}
                  </CardTitle>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => moveSection(section, 'up')}
                    disabled={!canMoveUp(section)}
                  >
                    ↑
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => moveSection(section, 'down')}
                    disabled={!canMoveDown(section)}
                  >
                    ↓
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => removeSection(section)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Layout Controls */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Width</Label>
                  <Select 
                    value={section.width || 'full'} 
                    onValueChange={(value) => updateSection(section, { width: value as ContentSection['width'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Width</SelectItem>
                      <SelectItem value="two-thirds">Two Thirds</SelectItem>
                      <SelectItem value="half">Half Width</SelectItem>
                      <SelectItem value="third">One Third</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Alignment</Label>
                  <Select 
                    value={section.alignment || 'left'} 
                    onValueChange={(value) => updateSection(section, { alignment: value as ContentSection['alignment'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SectionDecisionApplicabilityBlock
                section={section}
                generalDecisions={generalDecisions}
                onUpdate={(app) => updateSection(section, { decisionApplicability: app })}
              />

              {isInstructionProseSectionType(section.type) && (
                <>
                  <div>
                    <Label>Section Title (Optional)</Label>
                    <Input
                      value={section.title || ''}
                      onChange={(e) => updateSection(section, { title: e.target.value })}
                      placeholder="Enter section title..."
                    />
                  </div>
                  <div>
                    <Label>Text Content</Label>
                    <Textarea
                      value={section.content}
                      onChange={(e) => updateSection(section, { content: e.target.value })}
                      placeholder="Enter text content..."
                      className="min-h-[100px]"
                    />
                  </div>
                </>
              )}

              {section.type === 'image' && (
                <>
                  <div>
                    <Label>Image Title (Optional)</Label>
                    <Input
                      value={section.title || ''}
                      onChange={(e) => updateSection(section, { title: e.target.value })}
                      placeholder="Enter image title..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Image URL or Upload</Label>
                    <Input
                      value={section.content}
                      onChange={(e) => updateSection(section, { content: e.target.value })}
                      placeholder="Enter image URL or upload below..."
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          // Validate file size (5MB)
                          if (file.size > 5 * 1024 * 1024) {
                            alert('Image must be smaller than 5MB');
                            return;
                          }
                          
                          try {
                            const fileExt = file.name.split('.').pop();
                            const fileName = `content-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                            
                            const { error: uploadError } = await supabase.storage
                              .from('library-photos')
                              .upload(fileName, file);
                            
                            if (uploadError) throw uploadError;
                            
                            const { data: { publicUrl } } = supabase.storage
                              .from('library-photos')
                              .getPublicUrl(fileName);
                            
                            updateSection(section, { content: publicUrl });
                          } catch (error) {
                            console.error('Upload error:', error);
                            alert('Failed to upload image');
                          }
                        }}
                        className="text-xs"
                      />
                    </div>
                  </div>
                  {section.content && (
                    <div className="mt-2">
                      <img 
                        src={section.content} 
                        alt={section.title || 'Preview'} 
                        className="max-w-full h-auto rounded border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              {section.type === 'video' && (
                <>
                  <div>
                    <Label>Video Title (Optional)</Label>
                    <Input
                      value={section.title || ''}
                      onChange={(e) => updateSection(section, { title: e.target.value })}
                      placeholder="Enter video title..."
                    />
                  </div>
                  <div>
                    <Label>Video Embed URL</Label>
                    <Input
                      value={section.content}
                      onChange={(e) => updateSection(section, { content: e.target.value })}
                      placeholder="Enter video embed URL (YouTube, Vimeo, etc.)..."
                    />
                  </div>
                  {section.content && (
                    <div className="mt-2">
                      <div className="aspect-video rounded-lg overflow-hidden border">
                        <iframe 
                          src={section.content} 
                          className="w-full h-full" 
                          allowFullScreen 
                          title={section.title || 'Video content'}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {section.type === 'link' && (
                <>
                  <div>
                    <Label>Link Title</Label>
                    <Input
                      value={section.title || ''}
                      onChange={(e) => updateSection(section, { title: e.target.value })}
                      placeholder="Enter link title..."
                    />
                  </div>
                  <div>
                    <Label>URL</Label>
                    <Input
                      value={section.content}
                      onChange={(e) => updateSection(section, { content: e.target.value })}
                      placeholder="Enter URL..."
                    />
                  </div>
                  {section.content && section.title && (
                    <div className="mt-2">
                      <a 
                        href={section.content} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {section.title}
                      </a>
                    </div>
                  )}
                </>
              )}

              {isInstructionWarningType(section.type) && (
                <>
                  <div>
                    <Label>Warning Title</Label>
                    <Input
                      value={section.title || ''}
                      onChange={(e) => updateSection(section, { title: e.target.value })}
                      placeholder="Enter warning title..."
                    />
                  </div>
                  <div>
                    <Label>Severity Level</Label>
                    <Select 
                      value={section.severity || 'medium'} 
                      onValueChange={(value) => updateSection(section, { severity: value as ContentSection['severity'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Minor injury or comfort</SelectItem>
                        <SelectItem value="medium">Medium - Minor injury potential</SelectItem>
                        <SelectItem value="high">High - Serious injury potential</SelectItem>
                        <SelectItem value="critical">Critical - Life-threatening hazard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Warning Message</Label>
                    <Textarea
                      value={section.content}
                      onChange={(e) => updateSection(section, { content: e.target.value })}
                      placeholder="Enter safety warning details..."
                      className="min-h-[80px]"
                    />
                  </div>
                  {section.content && (
                    <div className="mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          {(section.title || section.severity) && (
                            <div className="flex items-center gap-2 mb-1">
                              {section.title ? (
                                <div className="font-semibold text-destructive">{section.title}</div>
                              ) : null}
                              {section.severity ? (
                                <Badge variant="secondary" className="uppercase">
                                  {section.severity}
                                </Badge>
                              ) : null}
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground">{section.content}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          </div>
        ))}
      </div>

      {sections.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">No content sections added yet.</p>
            <Button onClick={() => addSection('text')}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Section
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}