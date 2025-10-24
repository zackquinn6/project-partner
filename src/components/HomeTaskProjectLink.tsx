import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HomeTaskProjectLinkProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  currentProjectRunId: string | null;
  onSuccess?: () => void;
}

interface ProjectRun {
  id: string;
  name: string;
  status: string;
  template_id: string;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  estimated_time: string | null;
}

export function HomeTaskProjectLink({ 
  open, 
  onOpenChange, 
  taskId, 
  taskTitle,
  currentProjectRunId,
  onSuccess
}: HomeTaskProjectLinkProps) {
  const { user } = useAuth();
  const [myProjects, setMyProjects] = useState<ProjectRun[]>([]);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchMyProjects();
      fetchProjectTemplates();
    }
  }, [open, user]);

  const fetchMyProjects = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("project_runs")
      .select("id, name, status, template_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setMyProjects(data as ProjectRun[]);
    }
  };

  const fetchProjectTemplates = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, description, category, difficulty, estimated_time")
      .in("publish_status", ["published", "beta-testing"])
      .neq("name", "Manual Project Template")
      .order("name");
    
    if (!error && data) {
      setProjectTemplates(data as ProjectTemplate[]);
    }
  };

  const handleLinkToExistingProject = async (projectRunId: string) => {
    setLoading(true);
    
    const { error } = await supabase
      .from("home_tasks")
      .update({ project_run_id: projectRunId })
      .eq("id", taskId);
    
    if (error) {
      toast.error("Failed to link project");
    } else {
      toast.success("Task linked to project");
      onSuccess?.();
      onOpenChange(false);
    }
    
    setLoading(false);
  };

  const handleCreateAndLinkProject = async (templateId: string) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Create a new project run
      const template = projectTemplates.find(t => t.id === templateId);
      const { data: newRun, error: runError } = await supabase
        .from("project_runs")
        .insert([{
          template_id: templateId,
          user_id: user.id,
          name: template?.name || "New Project",
          status: "not-started"
        }])
        .select()
        .single();
      
      if (runError) throw runError;
      
      // Link the task to the new project
      const { error: linkError } = await supabase
        .from("home_tasks")
        .update({ project_run_id: newRun.id })
        .eq("id", taskId);
      
      if (linkError) throw linkError;
      
      toast.success("New project created and linked");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating and linking project:", error);
      toast.error("Failed to create and link project");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    setLoading(true);
    
    const { error } = await supabase
      .from("home_tasks")
      .update({ project_run_id: null })
      .eq("id", taskId);
    
    if (error) {
      toast.error("Failed to unlink project");
    } else {
      toast.success("Task unlinked from project");
      onSuccess?.();
      onOpenChange(false);
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Link Task to Project
          </DialogTitle>
          <DialogDescription>
            Link "{taskTitle}" to an existing project or start a new one
          </DialogDescription>
        </DialogHeader>

        {currentProjectRunId && (
          <div className="p-3 bg-muted rounded-lg text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Currently linked to a project</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnlink}
                disabled={loading}
                className="h-7 text-xs"
              >
                Unlink
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="existing" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">My Projects</TabsTrigger>
            <TabsTrigger value="catalog">Project Catalog</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="flex-1 overflow-auto mt-4">
            <div className="space-y-2">
              {myProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No projects found. Start a new project from the catalog.
                </p>
              ) : (
                myProjects.map((project) => (
                  <Card key={project.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{project.name}</h4>
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {project.status.replace(/-/g, ' ')}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleLinkToExistingProject(project.id)}
                          disabled={loading || currentProjectRunId === project.id}
                          className="h-7 text-xs"
                        >
                          {currentProjectRunId === project.id ? 'Linked' : 'Link'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="catalog" className="flex-1 overflow-auto mt-4">
            <div className="space-y-2">
              {projectTemplates.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No projects available in the catalog.
                </p>
              ) : (
                projectTemplates.map((template) => (
                  <Card key={template.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium">{template.name}</h4>
                          {template.description && (
                            <CardDescription className="text-xs mt-1 line-clamp-2">
                              {template.description}
                            </CardDescription>
                          )}
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {template.category && (
                              <Badge variant="secondary" className="text-[10px]">
                                {template.category}
                              </Badge>
                            )}
                            {template.difficulty && (
                              <Badge variant="outline" className="text-[10px]">
                                {template.difficulty}
                              </Badge>
                            )}
                            {template.estimated_time && (
                              <Badge variant="outline" className="text-[10px]">
                                {template.estimated_time}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCreateAndLinkProject(template.id)}
                          disabled={loading}
                          className="h-7 text-xs shrink-0"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Start & Link
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
