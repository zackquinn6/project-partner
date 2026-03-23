import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

export const PROJECT_LIST = [
  "Demo & heavy lifting",
  "Drywall finishing",
  "Painting",
  "Electrical",
  "Plumbing",
  "Precision & high patience: tiling, trim",
  "High heights / ladders",
] as const;

export type ProjectSkillRow = {
  name: string;
  skillLevel: number;
  avoid: boolean;
};

export function buildProjectSkillRows(
  initialSkills?: Record<string, number> | null,
  initialAvoid?: string[] | null
): ProjectSkillRow[] {
  return PROJECT_LIST.map((name) => ({
    name,
    skillLevel: initialSkills?.[name] ?? 0,
    avoid: initialAvoid?.includes(name) ?? false,
  }));
}

interface ProjectSkillsFormProps {
  rows: ProjectSkillRow[];
  onRowsChange: (rows: ProjectSkillRow[]) => void;
  /** Optional intro shown under the title (e.g. in profile wizard step). */
  description?: string;
}

/** Inline “Define project-specific experience” UI (no dialog). */
export function ProjectSkillsForm({
  rows,
  onRowsChange,
  description = "Set your skill level for each project type and mark projects you'd like to avoid.",
}: ProjectSkillsFormProps) {
  const handleSkillLevelChange = (projectName: string, value: number[]) => {
    onRowsChange(
      rows.map((skill) =>
        skill.name === projectName ? { ...skill, skillLevel: value[0] } : skill
      )
    );
  };

  const handleAvoidChange = (projectName: string, checked: boolean) => {
    onRowsChange(
      rows.map((skill) =>
        skill.name === projectName ? { ...skill, avoid: checked } : skill
      )
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{description}</p>

      <div className="space-y-4">
        {rows.map((project) => (
          <Card key={project.name}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="font-semibold text-sm">{project.name}</Label>
                  <div className="flex items-center gap-2 shrink-0">
                    <Label htmlFor={`avoid-inline-${project.name}`} className="text-xs text-muted-foreground whitespace-nowrap">
                      Avoid this project
                    </Label>
                    <Checkbox
                      id={`avoid-inline-${project.name}`}
                      checked={project.avoid}
                      onCheckedChange={(checked) =>
                        handleAvoidChange(project.name, checked as boolean)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Skill Level</Label>
                  <div className="relative py-1.5">
                    <div className="absolute top-1/2 left-0 right-0 flex h-2 -translate-y-1/2 rounded-full overflow-hidden pointer-events-none">
                      <div className="w-1/3 bg-green-500" />
                      <div className="w-1/3 bg-blue-500" />
                      <div className="w-1/3 bg-black" />
                    </div>
                    <Slider
                      value={[project.skillLevel]}
                      onValueChange={(value) => handleSkillLevelChange(project.name, value)}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full relative z-10 [&_[role=slider]]:bg-background [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary [&>div>div]:bg-transparent"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground relative">
                    <div className="text-center" style={{ width: "33.33%" }}>
                      <div className="font-medium">🔰 Beginner</div>
                      <div className="text-[10px]">Just getting started</div>
                    </div>
                    <div className="text-center" style={{ width: "33.33%" }}>
                      <div className="font-medium">🧰 Intermediate</div>
                      <div className="text-[10px]">Done a few projects</div>
                    </div>
                    <div className="text-center" style={{ width: "33.33%" }}>
                      <div className="font-medium">🛠️ Advanced</div>
                      <div className="text-[10px]">Tackled big stuff</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface ProjectSkillsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAvoidProjects?: string[];
  initialSkills?: Record<string, number> | null;
  onSave: (avoidProjects: string[], projectSkills?: Record<string, number>) => void;
}

export function ProjectSkillsWindow({
  open,
  onOpenChange,
  initialAvoidProjects = [],
  initialSkills = null,
  onSave,
}: ProjectSkillsWindowProps) {
  const [rows, setRows] = useState<ProjectSkillRow[]>(() =>
    buildProjectSkillRows(initialSkills, initialAvoidProjects)
  );

  useEffect(() => {
    if (open) {
      setRows(buildProjectSkillRows(initialSkills, initialAvoidProjects));
    }
  }, [open, initialAvoidProjects, initialSkills]);

  const handleSave = () => {
    const avoidProjects = rows.filter((skill) => skill.avoid).map((skill) => skill.name);
    const projectSkillsMap: Record<string, number> = {};
    rows.forEach((skill) => {
      projectSkillsMap[skill.name] = skill.skillLevel;
    });
    onSave(avoidProjects, projectSkillsMap);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[102]" />
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[103]">
          <DialogHeader>
            <DialogTitle>Define project-specific experience</DialogTitle>
          </DialogHeader>

          <ProjectSkillsForm rows={rows} onRowsChange={setRows} />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
