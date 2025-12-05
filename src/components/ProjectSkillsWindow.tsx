import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

interface ProjectSkill {
  name: string;
  skillLevel: number; // 0-100 continuous value
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
  "High heights / ladders"
];

// Removed SKILL_LEVEL_LABELS as we're using continuous sliders now

export function ProjectSkillsWindow({ 
  open, 
  onOpenChange, 
  initialAvoidProjects = [],
  onSave 
}: ProjectSkillsWindowProps) {
  const [projectSkills, setProjectSkills] = useState<ProjectSkill[]>(() => {
    return PROJECT_LIST.map(project => ({
      name: project,
      skillLevel: 0, // Default to 0 (beginner)
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
          <DialogTitle>Define project-specific experience</DialogTitle>
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
                      <Label className="text-xs text-muted-foreground">Skill Level</Label>
                      <div className="relative py-1.5">
                        {/* Color sections background - positioned to align with slider track */}
                        <div className="absolute top-1/2 left-0 right-0 flex h-2 -translate-y-1/2 rounded-full overflow-hidden pointer-events-none">
                          <div className="w-1/3 bg-green-500"></div>
                          <div className="w-1/3 bg-blue-500"></div>
                          <div className="w-1/3 bg-black"></div>
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
                        <div className="text-center" style={{ width: '33.33%' }}>
                          <div className="font-medium">🔰 Beginner</div>
                          <div className="text-[10px]">Just getting started</div>
                        </div>
                        <div className="text-center" style={{ width: '33.33%' }}>
                          <div className="font-medium">🧰 Intermediate</div>
                          <div className="text-[10px]">Done a few projects</div>
                        </div>
                        <div className="text-center" style={{ width: '33.33%' }}>
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

