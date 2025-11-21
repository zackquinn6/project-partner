import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Users, CheckCircle2, AlertCircle, Loader2, Link2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Phase } from "@/interfaces/Project";
import * as XLSX from 'xlsx';
import { format } from "date-fns";

interface TeamMember {
  id: string;
  name: string;
  type: 'owner' | 'helper';
  skillLevel: 'novice' | 'intermediate' | 'expert';
}

interface PhaseAssignment {
  phaseId: string;
  personId: string;
  phaseName: string;
}

interface PhaseAssignmentProps {
  projectRunId: string;
  phases: Phase[];
  teamMembers: TeamMember[];
  userId: string;
}

export function PhaseAssignment({ projectRunId, phases, teamMembers, userId }: PhaseAssignmentProps) {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Record<string, PhaseAssignment[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Filter phases: exclude standard phases, include custom and incorporated phases
  const availablePhases = phases.filter(phase => {
    // Exclude standard phases
    if (phase.isStandard === true) {
      return false;
    }
    // Include custom phases (isStandard === false or undefined) and incorporated phases (isLinked === true)
    return true;
  });

  const fetchExistingAssignments = useCallback(async () => {
    if (!projectRunId || !userId) return;

    try {
      const { data: existingAssignments, error } = await supabase
        .from('project_run_phase_assignments')
        .select('phase_id, person_id')
        .eq('project_run_id', projectRunId)
        .eq('user_id', userId);

      if (error) throw error;

      // Initialize assignments for each team member
      const assignmentsByPerson: Record<string, PhaseAssignment[]> = {};
      teamMembers.forEach(member => {
        assignmentsByPerson[member.id] = [];
      });

      // Populate with existing assignments
      if (existingAssignments) {
        existingAssignments.forEach(assignment => {
          const phase = phases.find(p => p.id === assignment.phase_id);
          if (phase && assignmentsByPerson[assignment.person_id]) {
            assignmentsByPerson[assignment.person_id].push({
              phaseId: assignment.phase_id,
              personId: assignment.person_id,
              phaseName: phase.name
            });
          }
        });
      }

      setAssignments(assignmentsByPerson);
    } catch (error) {
      console.error("Error fetching phase assignments:", error);
      toast({
        title: "Error",
        description: "Failed to load existing phase assignments.",
        variant: "destructive"
      });
    }
  }, [projectRunId, userId, phases, teamMembers, toast]);

  useEffect(() => {
    if (projectRunId && userId && teamMembers.length > 0) {
      const loadData = async () => {
        setIsLoading(true);
        await fetchExistingAssignments();
        setIsLoading(false);
      };
      loadData();
    }
  }, [projectRunId, userId, teamMembers, fetchExistingAssignments]);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) {
      return;
    }

    // Don't allow dropping back to available phases
    if (destination.droppableId === 'available-phases') {
      return;
    }

    // Parse the draggableId - format is "phase-{id}"
    const firstHyphen = draggableId.indexOf('-');
    const type = draggableId.substring(0, firstHyphen);
    const phaseId = draggableId.substring(firstHyphen + 1);

    if (type !== 'phase') {
      return;
    }

    // Get the team member being assigned to
    const targetMember = teamMembers.find(m => m.id === destination.droppableId);
    if (!targetMember) {
      return;
    }

    const phase = availablePhases.find(p => p.id === phaseId);
    if (!phase) {
      return;
    }

    // Check if already assigned to this person
    const existingAssignment = assignments[targetMember.id]?.find(
      a => a.phaseId === phaseId
    );
    if (existingAssignment) {
      toast({
        title: "Already Assigned",
        description: `${phase.name} is already assigned to ${targetMember.name}.`,
        variant: "default"
      });
      return;
    }

    const newAssignment: PhaseAssignment = {
      phaseId: phaseId,
      personId: targetMember.id,
      phaseName: phase.name
    };

    setAssignments(prev => ({
      ...prev,
      [targetMember.id]: [...(prev[targetMember.id] || []), newAssignment]
    }));
  };

  const removeAssignment = (personId: string, index: number) => {
    setAssignments(prev => ({
      ...prev,
      [personId]: prev[personId].filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Prepare assignments for database
      const allAssignments = Object.entries(assignments).flatMap(([personId, personAssignments]) =>
        personAssignments.map(assignment => ({
          project_run_id: projectRunId,
          phase_id: assignment.phaseId,
          person_id: personId,
          user_id: userId,
          scheduled_date: new Date().toISOString().split('T')[0],
          scheduled_hours: 1
        }))
      );

      // Clear existing assignments and insert new ones
      await supabase
        .from('project_run_phase_assignments')
        .delete()
        .eq('project_run_id', projectRunId)
        .eq('user_id', userId);

      if (allAssignments.length > 0) {
        const { error } = await supabase
          .from('project_run_phase_assignments')
          .insert(allAssignments);

        if (error) throw error;
      }

      toast({
        title: "Assignments saved",
        description: "Phase assignments have been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving phase assignments:", error);
      toast({
        title: "Error",
        description: "Failed to save phase assignments. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const totalAssignments = Object.values(assignments).reduce((sum, arr) => sum + arr.length, 0);

  const handleExport = () => {
    if (totalAssignments === 0) {
      toast({
        title: "No assignments",
        description: "Please assign phases before exporting.",
        variant: "destructive"
      });
      return;
    }

    // Prepare data for export
    const exportData: Array<{
      'Team Member': string;
      'Phase Name': string;
      'Phase Type': string;
      'Assigned Date': string;
    }> = [];

    Object.entries(assignments).forEach(([personId, personAssignments]) => {
      const person = teamMembers.find(m => m.id === personId);
      const personName = person?.name || 'Unknown';

      personAssignments.forEach(assignment => {
        const phase = phases.find(p => p.id === assignment.phaseId);
        const phaseType = phase?.isLinked ? 'Incorporated' : phase?.isStandard ? 'Standard' : 'Custom';

        exportData.push({
          'Team Member': personName,
          'Phase Name': assignment.phaseName,
          'Phase Type': phaseType,
          'Assigned Date': new Date().toLocaleDateString()
        });
      });
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Phase Assignments');

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Team Member
      { wch: 30 }, // Phase Name
      { wch: 15 }, // Phase Type
      { wch: 15 }  // Assigned Date
    ];

    // Generate filename with timestamp
    const filename = `phase_assignments_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;

    // Write and download
    XLSX.writeFile(wb, filename);

    toast({
      title: "Export successful",
      description: `Exported ${totalAssignments} assignment(s) to ${filename}`,
    });
  };

  // Get assigned phase IDs to filter them from available list
  const assignedPhaseIds = new Set<string>();
  Object.values(assignments).forEach(personAssignments => {
    personAssignments.forEach(assignment => {
      assignedPhaseIds.add(assignment.phaseId);
    });
  });

  // Filter available phases
  const unassignedPhases = availablePhases.filter(phase => !assignedPhaseIds.has(phase.id));

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="text-[10px] md:text-xs text-muted-foreground">
        Drag phases to team members to assign work. Only custom and incorporated phases are shown.
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading assignments...</span>
            </div>
            <div className="space-y-3 mt-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : teamMembers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No team members found. Add team members first.</p>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
            {/* Left: Available Phases */}
            <div className="border rounded-lg bg-muted/30 flex flex-col min-h-0">
              <div className="text-xs font-semibold p-3 pb-2 flex-shrink-0">Available Phases</div>
              
              {unassignedPhases.length === 0 ? (
                <p className="text-[10px] md:text-xs text-muted-foreground text-center py-8">
                  {availablePhases.length === 0 
                    ? "No custom or incorporated phases available" 
                    : "All phases have been assigned"}
                </p>
              ) : (
                <div className="flex-1 min-h-0 overflow-auto relative">
                  <Droppable droppableId="available-phases" isDropDisabled={true}>
                    {(provided) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps} 
                        className="space-y-2 p-3 pt-1"
                      >
                        {unassignedPhases.map((phase, index) => (
                          <Draggable key={phase.id} draggableId={`phase-${phase.id}`} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={provided.draggableProps.style}
                                className={`border rounded-lg bg-background p-2 cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary' : ''}`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="flex-shrink-0 text-muted-foreground">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                      <circle cx="3" cy="3" r="1" />
                                      <circle cx="3" cy="6" r="1" />
                                      <circle cx="3" cy="9" r="1" />
                                      <circle cx="9" cy="3" r="1" />
                                      <circle cx="9" cy="6" r="1" />
                                      <circle cx="9" cy="9" r="1" />
                                    </svg>
                                  </div>
                                  <span className="text-[10px] md:text-xs font-medium flex-1">{phase.name}</span>
                                  {phase.isLinked && (
                                    <Badge variant="secondary" className="text-[9px] md:text-[10px] flex items-center gap-1">
                                      <Link2 className="h-3 w-3" />
                                      Incorporated
                                    </Badge>
                                  )}
                                  {!phase.isLinked && !phase.isStandard && (
                                    <Badge variant="outline" className="text-[9px] md:text-[10px]">
                                      Custom
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )}
            </div>

            {/* Right: Team Members with Assignments */}
            <div className="border rounded-lg flex flex-col min-h-0">
              <div className="flex items-center justify-between p-3 pb-2 flex-shrink-0">
                <div className="text-xs font-semibold">Team Assignments</div>
                {totalAssignments > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {totalAssignments} assigned
                  </Badge>
                )}
              </div>

              <div className="overflow-auto flex-1 min-h-0 relative">
                <div className="p-3 pt-1 space-y-2">
                {teamMembers.map(member => (
                  <Droppable key={member.id} droppableId={member.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`border rounded-lg p-2 min-h-[80px] ${snapshot.isDraggingOver ? 'bg-primary/10 border-primary ring-2 ring-primary' : 'bg-background'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] md:text-xs font-semibold">{member.name}</span>
                            <Badge variant="outline" className="text-[9px]">
                              {member.type}
                            </Badge>
                          </div>
                        </div>

                        {assignments[member.id] && assignments[member.id].length > 0 ? (
                          <div className="space-y-1">
                            {assignments[member.id].map((assignment, index) => (
                              <div key={index} className="flex items-center justify-between bg-muted/50 rounded p-1.5">
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-medium truncate">{assignment.phaseName}</div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAssignment(member.id, index)}
                                  className="h-5 w-5 p-0 ml-1"
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[9px] text-center text-muted-foreground py-2">
                            Drop phases here
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-2 pt-2 border-t">
            <Button
              onClick={handleExport}
              disabled={totalAssignments === 0}
              variant="outline"
              className="h-8 text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Export Tasks
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || totalAssignments === 0}
              className="h-8 text-xs"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {isSaving ? 'Saving...' : 'Save Assignments'}
            </Button>
          </div>
        </DragDropContext>
      )}
    </div>
  );
}

