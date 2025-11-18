import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Calendar, Trash2, Edit2, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Note {
  id: string;
  user_id: string;
  project_run_id: string;
  project_run_name?: string | null;
  template_id: string | null;
  step_id: string;
  step_name?: string | null;
  phase_id?: string | null;
  phase_name?: string | null;
  operation_id?: string | null;
  operation_name?: string | null;
  note_text: string;
  created_at: string;
  updated_at: string;
}

interface NotesGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectRunId?: string;
  templateId?: string;
  mode?: 'user' | 'admin';
  title?: string;
}

export function NotesGallery({ 
  open, 
  onOpenChange, 
  projectRunId,
  templateId,
  mode = 'user',
  title = 'Project Notes'
}: NotesGalleryProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editText, setEditText] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAvailableProjects();
      fetchNotes();
    }
  }, [open, projectRunId, templateId, projectFilter, dateFilter]);

  const fetchAvailableProjects = async () => {
    if (!user || projectRunId) return;

    try {
      const { data: projectRuns, error } = await supabase
        .from('project_runs')
        .select('id, name, custom_project_name')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      const projects = (projectRuns || []).map(run => ({
        id: run.id,
        name: run.custom_project_name || run.name
      }));

      setAvailableProjects(projects);
    } catch (error) {
      console.error('Error fetching available projects:', error);
    }
  };

  const fetchNotes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('project_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (projectRunId) {
        query = query.eq('project_run_id', projectRunId);
      } else if (templateId) {
        query = query.eq('template_id', templateId);
      }

      if (projectFilter !== 'all' && !projectRunId) {
        query = query.eq('project_run_id', projectFilter);
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const projectRunIds = [...new Set((data || []).map((n: any) => n.project_run_id))];
      const { data: projectRunsData } = await supabase
        .from('project_runs')
        .select('id, name, custom_project_name')
        .in('id', projectRunIds);
      
      const projectRunMap = new Map(
        (projectRunsData || []).map((run: any) => [
          run.id,
          run.custom_project_name || run.name
        ])
      );
      
      const fetchedNotes: Note[] = (data || []).map((note: any) => ({
        ...note,
        project_run_name: projectRunMap.get(note.project_run_id) || null
      }));
      
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('project_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast.success('Note deleted');
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setEditText(note.note_text);
  };

  const handleSaveEdit = async () => {
    if (!editingNote || !editText.trim()) return;

    try {
      const { error } = await supabase
        .from('project_notes')
        .update({ note_text: editText.trim() })
        .eq('id', editingNote.id);

      if (error) throw error;

      toast.success('Note updated');
      setEditingNote(null);
      setEditText('');
      fetchNotes();
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditText('');
  };

  const getStepDisplayName = (note: Note) => {
    // If step_name is "-", it means the note was added from the gallery (not from a specific step)
    if (note.step_name === '-') {
      return '-';
    }
    const parts = [];
    if (note.phase_name) parts.push(note.phase_name);
    if (note.operation_name) parts.push(note.operation_name);
    if (note.step_name) parts.push(note.step_name);
    return parts.length > 0 ? parts.join(' > ') : note.step_id;
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !user) {
      toast.error('Please enter a note');
      return;
    }

    if (!projectRunId) {
      toast.error('Project run ID is required');
      return;
    }

    setAddingNote(true);
    try {
      const { error } = await supabase
        .from('project_notes')
        .insert({
          user_id: user.id,
          project_run_id: projectRunId,
          template_id: templateId || null,
          step_id: '-', // Use "-" to indicate not from a specific step
          step_name: '-', // Use "-" to indicate not from a specific step
          phase_id: null,
          phase_name: null,
          operation_id: null,
          operation_name: null,
          note_text: newNoteText.trim()
        });

      if (error) throw error;

      toast.success('Note added successfully');
      setNewNoteText('');
      setShowAddNote(false);
      fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {projectRunId && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowAddNote(true)}
                  className="h-7 px-2 text-[9px] md:text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onOpenChange(false)} 
                className="h-7 px-2 text-[9px] md:text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
          {/* Filters - only show if viewing all projects */}
          {!projectRunId && (
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading notes...</div>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notes yet</p>
              <p className="text-sm text-muted-foreground mt-2">Add notes to your project steps to track your progress</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Step</TableHead>
                    <TableHead>Note</TableHead>
                    {!projectRunId && <TableHead className="w-[150px]">Project</TableHead>}
                    <TableHead className="w-[150px]">Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-sm">{getStepDisplayName(note)}</span>
                          {note.phase_name && (
                            <span className="text-xs text-muted-foreground">{note.phase_name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingNote?.id === note.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={3}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs">
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7 text-xs">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                        )}
                      </TableCell>
                      {!projectRunId && (
                        <TableCell className="text-sm text-muted-foreground">
                          {note.project_run_name || 'Unknown'}
                        </TableCell>
                      )}
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(note.created_at), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingNote?.id !== note.id && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditNote(note)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNote(note.id)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Add Note Dialog */}
        <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Add Note
              </DialogTitle>
              <DialogDescription>
                Add a general note to your project. This note will not be associated with a specific step.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-note-text">Note</Label>
                <Textarea
                  id="new-note-text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Enter your note here..."
                  rows={6}
                  className="resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddNote(false);
                  setNewNoteText('');
                }} 
                disabled={addingNote}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddNote} 
                disabled={addingNote || !newNoteText.trim()}
              >
                {addingNote ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Note'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

