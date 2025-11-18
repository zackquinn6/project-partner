import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

interface ProjectSkill {
  name: string;
  skillLevel: number; // 0 = beginner, 1 = intermediate, 2 = advanced
  avoid: boolean;
}

interface ProjectSkillsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAvoidProjects?: string[];
  onSave: (avoidProjects: string[], projectSkills?: Record<string, number>) => void;
}

const PROJECT_LIST = [
  "Demo & heavy lifting",
  "Drywall finishing",
  "Painting",
  "Electrical",
  "Plumbing",
  "Precision & high patience: tiling, trim",
  "Permit-required stuff",
  "High heights / ladders"
];

const SKILL_LEVEL_LABELS = ["Beginner", "Intermediate", "Advanced"];

export function ProjectSkillsWindow({ 
  open, 
  onOpenChange, 
  initialAvoidProjects = [],
  onSave 
}: ProjectSkillsWindowProps) {
  const [projectSkills, setProjectSkills] = useState<ProjectSkill[]>(() => {
    return PROJECT_LIST.map(project => ({
      name: project,
      skillLevel: 0, // Default to beginner
      avoid: initialAvoidProjects.includes(project)
    }));
  });

  // Update when initialAvoidProjects changes
  useEffect(() => {
    if (open && initialAvoidProjects) {
      setProjectSkills(prev => 
        prev.map(skill => ({
          ...skill,
          avoid: initialAvoidProjects.includes(skill.name)
        }))
      );
    }
  }, [open, initialAvoidProjects]);

  const handleSkillLevelChange = (projectName: string, value: number[]) => {
    setProjectSkills(prev =>
      prev.map(skill =>
        skill.name === projectName
          ? { ...skill, skillLevel: value[0] }
          : skill
      )
    );
  };

  const handleAvoidChange = (projectName: string, checked: boolean) => {
    setProjectSkills(prev =>
      prev.map(skill =>
        skill.name === projectName
          ? { ...skill, avoid: checked }
          : skill
      )
    );
  };

  const handleSave = () => {
    const avoidProjects = projectSkills
      .filter(skill => skill.avoid)
      .map(skill => skill.name);
    
    const projectSkillsMap: Record<string, number> = {};
    projectSkills.forEach(skill => {
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
          <DialogTitle>Optional: Define Project Skills</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set your skill level for each project type and mark projects you'd like to avoid.
          </p>

          <div className="space-y-4">
            {projectSkills.map((project) => (
              <Card key={project.name}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-sm">{project.name}</Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`avoid-${project.name}`} className="text-xs text-muted-foreground">
                          Avoid this project
                        </Label>
                        <Checkbox
                          id={`avoid-${project.name}`}
                          checked={project.avoid}
                          onCheckedChange={(checked) => handleAvoidChange(project.name, checked as boolean)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Skill Level</Label>
                        <span className="text-xs font-medium">
                          {SKILL_LEVEL_LABELS[project.skillLevel]}
                        </span>
                      </div>
                      <Slider
                        value={[project.skillLevel]}
                        onValueChange={(value) => handleSkillLevelChange(project.name, value)}
                        min={0}
                        max={2}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Beginner</span>
                        <span>Intermediate</span>
                        <span>Advanced</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

