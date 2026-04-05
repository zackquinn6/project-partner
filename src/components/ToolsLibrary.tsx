import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Image, ArrowUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { filterToolVariationsForDisplay } from "@/utils/variationAttributeDefinitions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LibraryItemForm } from "./LibraryItemForm";
import { VariationViewer } from "./VariationViewer";
import { ToolsImportManager } from "./ToolsImportManager";
import { ExportToolsData } from "./ExportToolsData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PLANNING_TOOL_SAVE_CLOSE_CLASSNAME } from "@/components/PlanningWizardSteps/PlanningToolWindowHeaderActions";

const TOOLS_LIBRARY_EDIT_FORM_ID = "tools-library-edit-tool-form";

/** Add / Edit tool dialogs: 90vw × 90dvh, centered; fixed height so all tabs keep the same chrome. */
const ADMIN_TOOL_DIALOG_OVERLAY_CLASS = cn("z-[100] bg-black/50 backdrop-blur-md");

/** `!` overrides shared DialogContent `md:max-w-lg` (~50% width on desktop). */
const ADMIN_TOOL_DIALOG_CONTENT_CLASS = cn(
  "z-[101] flex h-[90dvh] max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-lg border p-0",
  "w-[90vw] max-w-[90vw] !w-[90vw] !max-w-[90vw] md:!w-[90vw] md:!max-w-[90vw]",
  "md:!max-h-[90dvh]"
);

interface Tool {
  id: string;
  item: string; // Mapped from database 'name' column
  description: string | null;
  category: string;
  photo_url: string | null;
  specialty_scale: number;
  created_at: string;
  updated_at: string;
  instructions?: unknown;
  variations?: Array<{
    id: string;
    name: string;
  }>;
}

// Database row type (matches actual schema)
type ToolRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  photo_url: string | null;
  specialty_scale: number;
  created_at: string;
  updated_at: string;
  instructions?: unknown;
};

type SortField = 'item' | 'description' | 'variations' | 'created_at';
type SortDirection = 'asc' | 'desc';

export function ToolsLibrary() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showImportManager, setShowImportManager] = useState(false);
  const [viewingVariations, setViewingVariations] = useState<Tool | null>(null);
  const [sortField, setSortField] = useState<SortField>('item');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editToolFormSubmitting, setEditToolFormSubmitting] = useState(false);

  const fetchTools = async () => {
    try {
      // Explicitly select columns to avoid type inference issues
      // Cast entire query to bypass TypeScript type checking for column names
      const query = supabase
        .from('tools' as any)
        .select('id, name, description, category, photo_url, specialty_scale, created_at, updated_at, instructions') as any;

      const { data, error } = await query.order('name', { ascending: true }); // Database column is 'name', not 'item'
      
      if (error) throw error;
      
      // Map database rows to UI interface (name -> item)
      const toolsData = ((data as unknown as ToolRow[]) || []).map((row): Tool => ({
        id: row.id,
        item: row.name,
        description: row.description,
        category: row.category,
        photo_url: row.photo_url,
        specialty_scale: row.specialty_scale,
        created_at: row.created_at,
        updated_at: row.updated_at,
        instructions: row.instructions
      }));
      
      // Fetch variations for each tool from unified tool_variations
      const toolsWithVariations = await Promise.all(
        toolsData.map(async (tool) => {
          const { data: variations } = await supabase
            .from('tool_variations')
            .select('id, name')
            .eq('core_item_id', tool.id);
          
          return {
            ...tool,
            variations: filterToolVariationsForDisplay(variations || [])
          };
        })
      );
      
      setTools(toolsWithVariations);
    } catch (error) {
      console.error('Error fetching tools:', error);
      toast.error('Failed to load tools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const filteredTools = tools.filter(tool => 
    tool.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tool.description && tool.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedTools = [...filteredTools].sort((a, b) => {
    let aValue: string | number = '';
    let bValue: string | number = '';
    
    if (sortField === 'variations') {
      aValue = a.variations?.length || 0;
      bValue = b.variations?.length || 0;
    } else if (sortField === 'created_at') {
      aValue = new Date(a[sortField] as string).getTime();
      bValue = new Date(b[sortField] as string).getTime();
    } else {
      aValue = (a[sortField] || '').toString().toLowerCase();
      bValue = (b[sortField] || '').toString().toLowerCase();
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return <ArrowUpDown className={`w-4 h-4 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />;
  };

  const handleDelete = async (toolId: string) => {
    try {
      const { error } = await supabase
        .from('tools' as any)
        .delete()
        .eq('id', toolId);
      
      if (error) throw error;
      
      setTools(tools.filter(tool => tool.id !== toolId));
    } catch (error) {
      console.error('Error deleting tool:', error);
      toast.error('Failed to delete tool');
    }
  };

  const handleSave = () => {
    // Force refresh the tools list twice to ensure data is loaded
    fetchTools();
    setTimeout(() => {
      fetchTools();
    }, 200);
    window.dispatchEvent(new CustomEvent('tools-library-updated'));
    setShowAddDialog(false);
    setShowEditDialog(false);
    setEditingTool(null);
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    setShowEditDialog(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-muted-foreground">
        Loading tools...
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search tools by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 px-6 py-4"
          />
        </div>
        <ExportToolsData className="text-xs" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowImportManager(true)}
          className="text-xs"
        >
          <Plus className="w-4 h-4 mr-1" />
          Import
        </Button>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-8 h-8 p-0" title="Add Tool">
              <Plus className="w-3 h-3" />
            </Button>
          </DialogTrigger>
          <DialogContent
            overlayClassName={ADMIN_TOOL_DIALOG_OVERLAY_CLASS}
            className={ADMIN_TOOL_DIALOG_CONTENT_CLASS}
          >
            <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-6">
              <DialogTitle>Add New Tool</DialogTitle>
            </DialogHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-2 sm:px-6">
              <LibraryItemForm
                type="tools"
                onSave={handleSave}
                onCancel={() => setShowAddDialog(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
        <div className="min-h-0 flex-1 overflow-auto">
          {sortedTools.length === 0 ? (
            <div className="px-4 py-12 text-center text-muted-foreground">
              {searchTerm ? 'No tools found matching your search.' : 'No tools in library yet.'}
            </div>
          ) : (
            <Table wrapperClassName="overflow-visible">
              <TableHeader className="bg-background border-b">
                <TableRow>
                  <TableHead className="sticky top-0 z-20 w-12 border-b bg-background">Photo</TableHead>
                  <TableHead className="sticky top-0 z-20 w-32 border-b bg-background">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('item')}
                      className="h-auto p-0 font-semibold hover:bg-transparent flex items-center"
                    >
                      Tool Name
                      {getSortIcon('item')}
                    </Button>
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 border-b bg-background">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('description')}
                      className="h-auto p-0 font-semibold hover:bg-transparent flex items-center"
                    >
                      Description
                      {getSortIcon('description')}
                    </Button>
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 border-b bg-background">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('variations')}
                      className="h-auto p-0 font-semibold hover:bg-transparent flex items-center"
                    >
                      Variants
                      {getSortIcon('variations')}
                    </Button>
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 w-20 border-b bg-background text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTools.map((tool) => (
                  <TableRow
                    key={tool.id}
                    className="cursor-pointer hover:bg-muted/50 h-[72px]"
                    onClick={() => setViewingVariations(tool)}
                  >
                    <TableCell className="py-0 px-1">
                      {tool.photo_url ? (
                        <img
                          src={tool.photo_url}
                          alt={tool.item}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                          <Image className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium capitalize py-0 px-1.5 w-32 break-words">
                      {tool.item}
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-0.5">
                        {tool.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-0 px-1.5">
                      <div className="break-words" title={tool.description || '-'}>
                        {tool.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs py-0 px-1">
                      {tool.variations && tool.variations.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5">
                          {tool.variations.slice(0, 4).map((variation) => (
                            <Badge key={variation.id} variant="secondary" className="text-xs whitespace-nowrap px-1 py-0">
                              {variation.name}
                            </Badge>
                          ))}
                          {tool.variations.length > 4 && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              +{tool.variations.length - 4} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No variants</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-0 px-1" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(tool)}
                          title="Edit Variations"
                          className="w-8 h-8 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) {
            setEditingTool(null);
            setEditToolFormSubmitting(false);
          }
        }}
      >
        <DialogContent
          overlayClassName={ADMIN_TOOL_DIALOG_OVERLAY_CLASS}
          className={ADMIN_TOOL_DIALOG_CONTENT_CLASS}
        >
          <DialogHeader className="shrink-0 flex flex-row flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-left sm:px-6">
            <DialogTitle className="min-w-0 flex-1">
              {editingTool != null ? `Edit Tool - ${editingTool.item}` : "Edit Tool"}
            </DialogTitle>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9 px-3 text-xs md:min-h-8 md:text-sm"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingTool(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form={TOOLS_LIBRARY_EDIT_FORM_ID}
                size="sm"
                disabled={editToolFormSubmitting}
                className={cn(
                  "min-h-9 px-3 text-xs md:min-h-8 md:text-sm",
                  PLANNING_TOOL_SAVE_CLOSE_CLASSNAME
                )}
              >
                {editToolFormSubmitting ? "Saving..." : "Save & Close"}
              </Button>
            </div>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-2 sm:px-6">
            {editingTool && (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="min-h-0 flex-1 overflow-hidden">
                  <LibraryItemForm
                    type="tools"
                    formId={TOOLS_LIBRARY_EDIT_FORM_ID}
                    hideFooterActions
                    onSubmittingChange={setEditToolFormSubmitting}
                    item={{ ...editingTool, name: editingTool.item }}
                    onSave={handleSave}
                    onCancel={() => {
                      setShowEditDialog(false);
                      setEditingTool(null);
                    }}
                  />
                </div>
                <div className="flex shrink-0 justify-end border-t border-border pt-3">
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          Delete Tool
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="z-[220]">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Tool</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{editingTool.item}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              await handleDelete(editingTool.id);
                              setShowEditDialog(false);
                              setEditingTool(null);
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ToolsImportManager
        open={showImportManager}
        onOpenChange={setShowImportManager}
        onSuccess={handleSave}
      />

      {viewingVariations && (
        <VariationViewer
          open={!!viewingVariations}
          onOpenChange={(open) => !open && setViewingVariations(null)}
          coreItemId={viewingVariations.id}
          coreItemName={viewingVariations.item}
        />
      )}
    </div>
  );
}