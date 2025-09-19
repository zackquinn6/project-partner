import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash2, Image, ArrowUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LibraryItemForm } from "./LibraryItemForm";
import { VariationViewer } from "./VariationViewer";
import { ToolsImportManager } from "./ToolsImportManager";
import { ExportToolsData } from "./ExportToolsData";
import { supabase } from "@/integrations/supabase/client";
import { clearAllTools } from "@/utils/variationUtils";
import { EnhancedToolParser, importEnhancedToolsToDatabase } from "@/utils/enhancedToolParser";
import { toast } from "sonner";

interface Tool {
  id: string;
  item: string;
  description: string | null;
  example_models: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  variations?: Array<{
    id: string;
    name: string;
  }>;
}

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

  const fetchTools = async () => {
    try {
      const { data, error } = await supabase
        .from('tools' as any)
        .select('*')
        .order('item');
      
      if (error) throw error;
      
      const toolsData = (data as unknown as Tool[]) || [];
      
      // Fetch variations for each tool
      const toolsWithVariations = await Promise.all(
        toolsData.map(async (tool) => {
          const { data: variations } = await supabase
            .from('variation_instances')
            .select('id, name')
            .eq('core_item_id', tool.id)
            .eq('item_type', 'tools');
          
          return {
            ...tool,
            variations: variations || []
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
    setShowAddDialog(false);
    setShowEditDialog(false);
    setEditingTool(null);
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    setShowEditDialog(true);
  };

  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      const success = await clearAllTools();
      if (success) {
        setTools([]);
        toast.success('All tools deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting all tools:', error);
      toast.error('Failed to delete all tools');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return <div className="flex justify-center p-8">Loading tools...</div>;
  }

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search tools by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" className="text-xs" title="Delete All Tools">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete All Tools</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all tools, variations, and models from the library. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete All Tools
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
            <Button size="sm" className="text-xs">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Tool</DialogTitle>
            </DialogHeader>
        <LibraryItemForm
          type="tools"
          onSave={handleSave}
          onCancel={() => setShowAddDialog(false)}
        />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <div className="overflow-auto max-h-[70vh]">
          <Table>
            <TableHeader className="bg-background border-b">
              <TableRow>
                <TableHead className="w-12 bg-background sticky top-0 z-20">Photo</TableHead>
                <TableHead className="bg-background sticky top-0 z-20">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('item')}
                    className="h-auto p-0 font-semibold hover:bg-transparent flex items-center"
                  >
                    Tool Name
                    {getSortIcon('item')}
                  </Button>
                </TableHead>
                <TableHead className="bg-background sticky top-0 z-20">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('description')}
                    className="h-auto p-0 font-semibold hover:bg-transparent flex items-center"
                  >
                    Description
                    {getSortIcon('description')}
                  </Button>
                </TableHead>
                <TableHead className="bg-background sticky top-0 z-20">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('variations')}
                    className="h-auto p-0 font-semibold hover:bg-transparent flex items-center"
                  >
                    Variants
                    {getSortIcon('variations')}
                  </Button>
                </TableHead>
                <TableHead className="w-32 text-right bg-background sticky top-0 z-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTools.map((tool) => (
              <TableRow 
                key={tool.id} 
                className="cursor-pointer hover:bg-muted/50" 
                onClick={() => setViewingVariations(tool)}
              >
                <TableCell>
                  {tool.photo_url ? (
                    <img
                      src={tool.photo_url}
                      alt={tool.item}
                      className="w-10 h-10 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                      <Image className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium capitalize">{tool.item}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {tool.description || '-'}
                </TableCell>
                <TableCell className="text-sm">
                  {tool.variations && tool.variations.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {tool.variations.slice(0, 2).map((variation) => (
                        <Badge key={variation.id} variant="secondary" className="text-xs">
                          {variation.name}
                        </Badge>
                      ))}
                      {tool.variations.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{tool.variations.length - 2} more
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No variants</span>
                  )}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(tool)}
                      title="Edit Variations"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Tool</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{tool.item}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(tool.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
           </TableBody>
          </Table>
        </div>
        
        {sortedTools.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchTerm ? 'No tools found matching your search.' : 'No tools in library yet.'}
          </div>
        )}
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tool</DialogTitle>
          </DialogHeader>
          {editingTool && (
            <LibraryItemForm
              type="tools"
              item={editingTool}
              onSave={handleSave}
              onCancel={() => {
                setShowEditDialog(false);
                setEditingTool(null);
              }}
            />
          )}
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
          itemType="tools"
          coreItemName={viewingVariations.item}
        />
      )}
    </div>
  );
}