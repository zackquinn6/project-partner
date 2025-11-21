import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon, Edit2, Check, X, Clock, Plus, Trash2, Briefcase } from "lucide-react";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Helper to parse YYYY-MM-DD strings without timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Helper to format Date to YYYY-MM-DD in local time
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface Contractor {
  id: string;
  name: string;
  companyName?: string;
  specialty?: string;
  contactEmail?: string;
  contactPhone?: string;
  costPerHour?: number;
  availabilityMode: 'general' | 'specific';
  weekendsOnly: boolean;
  weekdaysAfterFivePm: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  availabilityDates: { [date: string]: any };
  notes?: string;
  dbId?: string; // ID from user_contractors table
}

interface ContractorPhaseAssignment {
  id: string;
  contractorId: string;
  phaseName: string;
  phaseId?: string;
  notes?: string;
  dbId?: string; // ID from contractor_phase_assignments table
}

interface ProjectContractorsProps {
  projectRunId: string;
  phases: Array<{ name: string; id?: string; isStandard?: boolean }>; // Phases from project
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function ProjectContractors({ projectRunId, phases }: ProjectContractorsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [assignments, setAssignments] = useState<ContractorPhaseAssignment[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingContractorId, setEditingContractorId] = useState<string | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [newContractor, setNewContractor] = useState<Partial<Contractor>>({
    name: '',
    availabilityMode: 'general',
    weekendsOnly: false,
    weekdaysAfterFivePm: false,
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    availabilityDates: {}
  });
  const [availabilityMode, setAvailabilityMode] = useState<'general' | 'specific'>('general');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [specificDates, setSpecificDates] = useState<Date[]>([]);
  const [notAvailableDates, setNotAvailableDates] = useState<Date[]>([]);

  // Load contractors from database
  useEffect(() => {
    const loadContractors = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_contractors')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data) {
          const loadedContractors: Contractor[] = data.map(contractor => ({
            id: contractor.id,
            dbId: contractor.id,
            name: contractor.name,
            companyName: contractor.company_name,
            specialty: contractor.specialty,
            contactEmail: contractor.contact_email,
            contactPhone: contractor.contact_phone,
            costPerHour: contractor.cost_per_hour,
            availabilityMode: contractor.availability_mode || 'general',
            weekendsOnly: contractor.weekends_only,
            weekdaysAfterFivePm: contractor.weekdays_after_five_pm,
            workingHoursStart: contractor.working_hours_start || '08:00',
            workingHoursEnd: contractor.working_hours_end || '17:00',
            availabilityDates: (contractor.availability_dates as any) || {},
            notes: contractor.notes
          }));

          setContractors(loadedContractors);
        }
      } catch (error: any) {
        console.error('Error loading contractors:', error);
      }
    };

    loadContractors();
  }, [user]);

  // Load phase assignments from database
  useEffect(() => {
    const loadAssignments = async () => {
      if (!user || !projectRunId) return;

      try {
        const { data, error } = await supabase
          .from('contractor_phase_assignments')
          .select('*')
          .eq('project_run_id', projectRunId)
          .order('assigned_at', { ascending: true });

        if (error) throw error;

        if (data) {
          const loadedAssignments: ContractorPhaseAssignment[] = data.map(assignment => ({
            id: assignment.id,
            dbId: assignment.id,
            contractorId: assignment.contractor_id,
            phaseName: assignment.phase_name,
            phaseId: assignment.phase_id,
            notes: assignment.notes
          }));

          setAssignments(loadedAssignments);
        }
      } catch (error: any) {
        console.error('Error loading assignments:', error);
      }
    };

    loadAssignments();
  }, [user, projectRunId]);

  const handleAddContractor = async () => {
    if (!newContractor.name || !newContractor.name.trim()) {
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add contractors",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const contractorToAdd: Contractor = {
      id: Date.now().toString(),
      name: newContractor.name.trim(),
      companyName: newContractor.companyName,
      specialty: newContractor.specialty,
      contactEmail: newContractor.contactEmail,
      contactPhone: newContractor.contactPhone,
      costPerHour: newContractor.costPerHour,
      availabilityMode: availabilityMode,
      weekendsOnly: newContractor.weekendsOnly || false,
      weekdaysAfterFivePm: newContractor.weekdaysAfterFivePm || false,
      workingHoursStart: newContractor.workingHoursStart || '08:00',
      workingHoursEnd: newContractor.workingHoursEnd || '17:00',
      availabilityDates: newContractor.availabilityDates || {}
    };

    // Apply availability settings
    if (availabilityMode === 'general') {
      contractorToAdd.weekendsOnly = selectedDays.length > 0 && 
        selectedDays.every(d => d === 'saturday' || d === 'sunday');
      contractorToAdd.weekdaysAfterFivePm = selectedDays.includes('monday') || 
        selectedDays.includes('tuesday') || 
        selectedDays.includes('wednesday') || 
        selectedDays.includes('thursday') || 
        selectedDays.includes('friday');
      contractorToAdd.availabilityDates = {};
    } else {
      const newAvailability: { [date: string]: any } = {};
      specificDates.forEach(date => {
        const dateStr = formatLocalDate(date);
        newAvailability[dateStr] = {
          start: contractorToAdd.workingHoursStart,
          end: contractorToAdd.workingHoursEnd,
          available: true
        };
      });
      notAvailableDates.forEach(date => {
        const dateStr = formatLocalDate(date);
        newAvailability[dateStr] = {
          start: contractorToAdd.workingHoursStart,
          end: contractorToAdd.workingHoursEnd,
          available: false
        };
      });
      contractorToAdd.availabilityDates = newAvailability;
    }

    try {
      const { data, error } = await supabase
        .from('user_contractors')
        .insert({
          user_id: user.id,
          name: contractorToAdd.name,
          company_name: contractorToAdd.companyName,
          specialty: contractorToAdd.specialty,
          contact_email: contractorToAdd.contactEmail,
          contact_phone: contractorToAdd.contactPhone,
          cost_per_hour: contractorToAdd.costPerHour,
          availability_mode: availabilityMode,
          weekends_only: contractorToAdd.weekendsOnly,
          weekdays_after_five_pm: contractorToAdd.weekdaysAfterFivePm,
          working_hours_start: contractorToAdd.workingHoursStart,
          working_hours_end: contractorToAdd.workingHoursEnd,
          availability_dates: contractorToAdd.availabilityDates,
          notes: contractorToAdd.notes
        })
        .select()
        .single();

      if (error) throw error;

      contractorToAdd.dbId = data.id;
      setContractors([...contractors, contractorToAdd]);
      cancelAdding();
      
      toast({
        title: "Success",
        description: "Contractor added and saved",
      });
    } catch (error: any) {
      console.error('Error saving contractor:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save contractor",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteContractor = async (contractorId: string) => {
    const contractor = contractors.find(c => c.id === contractorId);
    if (!contractor) return;

    if (contractor.dbId && user) {
      setIsLoading(true);
      try {
        // Also delete any assignments for this contractor
        await supabase
          .from('contractor_phase_assignments')
          .delete()
          .eq('contractor_id', contractor.dbId);

        const { error } = await supabase
          .from('user_contractors')
          .delete()
          .eq('id', contractor.dbId)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Contractor deleted",
        });
      } catch (error: any) {
        console.error('Error deleting contractor:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to delete contractor",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      } finally {
        setIsLoading(false);
      }
    }

    setContractors(contractors.filter(c => c.id !== contractorId));
    setAssignments(assignments.filter(a => a.contractorId !== contractorId));
  };

  const handleAssignPhase = async (contractorId: string, phaseName: string) => {
    if (!user || !projectRunId) return;

    const contractor = contractors.find(c => c.id === contractorId);
    if (!contractor || !contractor.dbId) return;

    // Check if assignment already exists
    const existingAssignment = assignments.find(
      a => a.contractorId === contractorId && a.phaseName === phaseName
    );

    if (existingAssignment) {
      toast({
        title: "Already Assigned",
        description: "This contractor is already assigned to this phase",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const phase = phases.find(p => p.name === phaseName);
      
      const { data, error } = await supabase
        .from('contractor_phase_assignments')
        .insert({
          project_run_id: projectRunId,
          contractor_id: contractor.dbId,
          phase_name: phaseName,
          phase_id: phase?.id || null
        })
        .select()
        .single();

      if (error) throw error;

      const newAssignment: ContractorPhaseAssignment = {
        id: data.id,
        dbId: data.id,
        contractorId: contractorId,
        phaseName: phaseName,
        phaseId: phase?.id,
        notes: data.notes
      };

      setAssignments([...assignments, newAssignment]);
      
      toast({
        title: "Success",
        description: "Contractor assigned to phase",
      });
    } catch (error: any) {
      console.error('Error assigning contractor:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign contractor",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassignPhase = async (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment || !assignment.dbId) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('contractor_phase_assignments')
        .delete()
        .eq('id', assignment.dbId);

      if (error) throw error;

      setAssignments(assignments.filter(a => a.id !== assignmentId));
      
      toast({
        title: "Success",
        description: "Assignment removed",
      });
    } catch (error: any) {
      console.error('Error removing assignment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove assignment",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelAdding = () => {
    setShowAddForm(false);
    setNewContractor({
      name: '',
      availabilityMode: 'general',
      weekendsOnly: false,
      weekdaysAfterFivePm: false,
      workingHoursStart: '08:00',
      workingHoursEnd: '17:00',
      availabilityDates: {}
    });
    setSelectedDays([]);
    setSpecificDates([]);
    setNotAvailableDates([]);
    setAvailabilityMode('general');
  };

  // Get phases that require Professional skill level (can be assigned contractors)
  const professionalPhases = phases.filter(phase => {
    // For now, allow all phases to be assignable
    // In the future, this could check phase skill level requirements
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="text-[10px] md:text-xs text-muted-foreground">
        Manage contractors (professionals) for phases requiring Professional skill level
      </div>

      {/* Contractors List Section */}
      <div className="space-y-2">
        <div className="text-[10px] md:text-xs font-medium">Contractors</div>
        {contractors.length === 0 && !showAddForm ? (
          <p className="text-[10px] md:text-xs text-muted-foreground text-center py-3">
            No contractors yet. Click "Add Contractor" below to get started.
          </p>
        ) : (
          contractors.map((contractor) => (
            <div key={contractor.id} className="border rounded-lg p-2 md:p-3 space-y-2 text-[10px] md:text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span className="font-medium">{contractor.name}</span>
                  {contractor.companyName && (
                    <Badge variant="outline" className="text-[9px]">
                      {contractor.companyName}
                    </Badge>
                  )}
                  {contractor.specialty && (
                    <Badge variant="secondary" className="text-[9px]">
                      {contractor.specialty}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => {
                      setEditingContractorId(contractor.id);
                      setEditingContractor({ ...contractor });
                      setAvailabilityMode(contractor.availabilityMode);
                    }}
                    size="sm"
                    variant="outline"
                    className="h-6 text-[9px] md:text-[10px]"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDeleteContractor(contractor.id)}
                    size="sm"
                    variant="outline"
                    className="h-6 text-[9px] md:text-[10px] text-destructive hover:text-destructive"
                    disabled={isLoading}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {contractor.contactEmail && (
                <div className="text-[9px] md:text-[10px] text-muted-foreground">
                  Email: {contractor.contactEmail}
                </div>
              )}
              {contractor.contactPhone && (
                <div className="text-[9px] md:text-[10px] text-muted-foreground">
                  Phone: {contractor.contactPhone}
                </div>
              )}
              {contractor.costPerHour && contractor.costPerHour > 0 && (
                <div className="text-[9px] md:text-[10px] text-muted-foreground">
                  Cost: ${contractor.costPerHour}/hour
                </div>
              )}
            </div>
          ))
        )}

        {!showAddForm ? (
          <Button 
            onClick={() => setShowAddForm(true)} 
            size="sm" 
            className="h-7 w-full text-[10px] md:text-xs"
            disabled={isLoading}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Contractor
          </Button>
        ) : (
          <div className="border rounded-lg p-2 md:p-3 space-y-2 bg-muted/30">
            <div className="text-[10px] md:text-xs font-medium">New Contractor</div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Name"
                value={newContractor.name || ''}
                onChange={(e) => setNewContractor({ ...newContractor, name: e.target.value })}
                className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
              />
              <Input
                placeholder="Company (optional)"
                value={newContractor.companyName || ''}
                onChange={(e) => setNewContractor({ ...newContractor, companyName: e.target.value })}
                className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Specialty (optional)"
                value={newContractor.specialty || ''}
                onChange={(e) => setNewContractor({ ...newContractor, specialty: e.target.value })}
                className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
              />
              <Input
                type="email"
                placeholder="Email (optional)"
                value={newContractor.contactEmail || ''}
                onChange={(e) => setNewContractor({ ...newContractor, contactEmail: e.target.value })}
                className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="tel"
                placeholder="Phone (optional)"
                value={newContractor.contactPhone || ''}
                onChange={(e) => setNewContractor({ ...newContractor, contactPhone: e.target.value })}
                className="text-[10px] md:text-xs h-7 flex-1 min-w-[120px]"
              />
              <Input
                type="number"
                placeholder="Cost/Hour ($)"
                value={newContractor.costPerHour || ''}
                onChange={(e) => setNewContractor({ ...newContractor, costPerHour: parseFloat(e.target.value) || 0 })}
                className="text-[10px] md:text-xs h-7 w-32"
                min="0"
                step="0.01"
              />
            </div>

            {/* Working Hours */}
            <div className="flex gap-2 items-center">
              <Label className="text-[10px] md:text-xs w-20">Hours:</Label>
              <Input
                type="time"
                value={newContractor.workingHoursStart || '08:00'}
                onChange={(e) => setNewContractor({ ...newContractor, workingHoursStart: e.target.value })}
                className="text-[10px] md:text-xs h-7 w-24"
              />
              <span className="text-[10px] md:text-xs">to</span>
              <Input
                type="time"
                value={newContractor.workingHoursEnd || '17:00'}
                onChange={(e) => setNewContractor({ ...newContractor, workingHoursEnd: e.target.value })}
                className="text-[10px] md:text-xs h-7 w-24"
              />
            </div>

            {/* Availability Mode - similar to team members */}
            <div>
              <div className="text-[10px] md:text-xs font-medium mb-1.5">Availability Mode:</div>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 cursor-pointer">
                  <Checkbox
                    checked={availabilityMode === 'general'}
                    onCheckedChange={() => setAvailabilityMode('general')}
                    className="h-3 w-3"
                  />
                  <span className="text-[10px] md:text-xs">General (Days/Patterns)</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <Checkbox
                    checked={availabilityMode === 'specific'}
                    onCheckedChange={() => setAvailabilityMode('specific')}
                    className="h-3 w-3"
                  />
                  <span className="text-[10px] md:text-xs">Specific Dates</span>
                </label>
              </div>
            </div>

            {availabilityMode === 'general' ? (
              <div className="space-y-2 border-t pt-2">
                <div className="text-[10px] md:text-xs font-medium">Available Days</div>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setSelectedDays(prev => 
                          prev.includes(day) 
                            ? prev.filter(d => d !== day)
                            : [...prev, day]
                        );
                      }}
                      className={cn(
                        "px-2 py-1 rounded text-[9px] md:text-[10px] border transition-colors",
                        selectedDays.includes(day)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-accent"
                      )}
                    >
                      {day.slice(0, 3).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2 border-t pt-2">
                <div className="text-[10px] md:text-xs font-medium">Specific Available Dates</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] md:text-xs">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {specificDates.length > 0 ? `${specificDates.length} date(s)` : 'Select dates'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="multiple"
                      selected={specificDates}
                      onSelect={(dates) => setSpecificDates(dates || [])}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <div className="text-[10px] md:text-xs font-medium mt-3">Not Available Dates (Blackout)</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] md:text-xs">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {notAvailableDates.length > 0 ? `${notAvailableDates.length} date(s)` : 'Select dates'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="multiple"
                      selected={notAvailableDates}
                      onSelect={(dates) => setNotAvailableDates(dates || [])}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t">
              <Button 
                onClick={handleAddContractor} 
                size="sm" 
                className="h-7 text-[10px] md:text-xs flex-1"
                disabled={isLoading}
              >
                <Check className="w-3 h-3 mr-1" />
                Add
              </Button>
              <Button 
                onClick={cancelAdding} 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] md:text-xs flex-1"
                disabled={isLoading}
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Phase Assignments Section */}
      <div className="space-y-2 border-t pt-4">
        <div className="text-[10px] md:text-xs font-medium">Phase Assignments</div>
        {contractors.length === 0 ? (
          <p className="text-[10px] md:text-xs text-muted-foreground text-center py-3">
            Add contractors above to assign them to phases
          </p>
        ) : (
          <div className="space-y-2">
            {professionalPhases.map((phase) => {
              const phaseAssignments = assignments.filter(a => a.phaseName === phase.name);
              return (
                <div key={phase.name} className="border rounded-lg p-2 md:p-3 space-y-2 text-[10px] md:text-xs">
                  <div className="font-medium">{phase.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {phaseAssignments.length > 0 ? (
                      phaseAssignments.map((assignment) => {
                        const contractor = contractors.find(c => c.id === assignment.contractorId);
                        return contractor ? (
                          <Badge key={assignment.id} variant="secondary" className="text-[9px] flex items-center gap-1">
                            {contractor.name}
                            <button
                              onClick={() => handleUnassignPhase(assignment.id)}
                              className="ml-1 hover:text-destructive"
                              disabled={isLoading}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ) : null;
                      })
                    ) : (
                      <span className="text-[9px] md:text-[10px] text-muted-foreground">No contractor assigned</span>
                    )}
                    <Select
                      onValueChange={(contractorId) => handleAssignPhase(contractorId, phase.name)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="text-[10px] md:text-xs h-7 w-40">
                        <SelectValue placeholder="Assign contractor" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {contractors
                          .filter(c => !phaseAssignments.some(a => a.contractorId === c.id))
                          .map(contractor => (
                            <SelectItem key={contractor.id} value={contractor.id}>
                              {contractor.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

