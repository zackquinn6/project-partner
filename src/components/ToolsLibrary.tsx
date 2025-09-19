import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, Image, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LibraryItemForm } from "./LibraryItemForm";
import { VariationViewer } from "./VariationViewer";
import { ToolsImportManager } from "./ToolsImportManager";
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
}

export function ToolsLibrary() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showImportManager, setShowImportManager] = useState(false);
  const [viewingVariations, setViewingVariations] = useState<Tool | null>(null);

  const fetchTools = async () => {
    try {
      const { data, error } = await supabase
        .from('tools' as any)
        .select('*')
        .order('item');
      
      if (error) throw error;
      setTools((data as unknown as Tool[]) || []);
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

  // Execute one-time import on component mount - FRESH START
  useEffect(() => {
    let isMounted = true;
    
    const executeCleanImport = async () => {
      if (!isMounted) return;
      
      try {
        console.log('🚀 FRESH START - Clean tool import beginning...');
        
        // First verify database is completely empty
        const { data: toolsCheck } = await supabase.from('tools').select('id').limit(1);
        const { data: variationsCheck } = await supabase.from('variation_instances').select('id').eq('item_type', 'tools').limit(1);
        
        if ((toolsCheck && toolsCheck.length > 0) || (variationsCheck && variationsCheck.length > 0)) {
          console.log('⚠️ Database not empty - this should not happen after TRUNCATE');
          throw new Error('Database clearing failed');
        }
        
        console.log('✅ Database confirmed completely empty - proceeding with import');

        // Load and parse Excel file
        console.log('2️⃣ Loading Excel file...');
        const response = await fetch('/src/assets/temp-import.xlsx');
        const blob = await response.blob();
        const file = new File([blob], 'temp-import.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        console.log('📄 Parsing Excel file...');
        const parsedTools = await EnhancedToolParser.parseEnhancedToolListExcel(file);
        console.log(`✅ Parsed ${parsedTools.length} tools with variants`);

        // Import to database with better error handling
        console.log('3️⃣ Importing tools to database...');
        const results = await importEnhancedToolsToDatabase(parsedTools, (current, total) => {
          console.log(`📥 Importing tool ${current + 1} of ${total}...`);
        });
        console.log(`✅ Imported ${results.success} tools successfully`);

        if (results.errors.length > 0) {
          console.log(`⚠️ ${results.errors.length} import errors (likely duplicates)`);
          // Don't stop the process for duplicate errors
        }

        // Trigger web scraping
        console.log('4️⃣ Starting web scraping for pricing and estimates...');
        const { data: variations } = await supabase
          .from('variation_instances')
          .select('id, name')
          .eq('item_type', 'tools');

        if (variations && variations.length > 0) {
          console.log(`🔍 Triggering scrape for ${variations.length} tool variations...`);
          
          const { data, error } = await supabase.functions.invoke('scrape-tool-pricing', {
            body: { 
              mode: 'bulk',
              variationIds: variations.map(v => v.id)
            }
          });

          if (error) {
            console.error('❌ Web scraping failed:', error);
          } else {
            console.log('✅ Web scraping initiated successfully');
          }
        }

        console.log('🎉 One-time import completed successfully!');
        toast.success('Import completed - refreshing data...');
        
        // Force refresh the tools list
        setTimeout(() => {
          fetchTools();
        }, 2000);
        
      } catch (error) {
        console.error('❌ Import failed:', error);
        toast.error('Import failed: ' + error.message);
      }
    };

    // Execute import once on mount
    executeOneTimeImport();
  }, []);  // Empty dependency array ensures this runs only once

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
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
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
        <Button
          variant="outline"
          onClick={() => setShowImportManager(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Import Tools
        </Button>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Tool
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
        {filteredTools.map((tool) => (
          <Card key={tool.id} className="relative cursor-pointer hover:shadow-md transition-shadow" onClick={() => setViewingVariations(tool)}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{tool.item}</CardTitle>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingVariations(tool)}
                    title="View Variations"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(tool)}
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
              </div>
            </CardHeader>
            <CardContent>
              {tool.photo_url && (
                <div className="mb-3">
                  <img
                    src={tool.photo_url}
                    alt={tool.item}
                    className="w-full h-32 object-cover rounded-md"
                  />
                </div>
              )}
              {tool.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {tool.description}
                </p>
              )}
              {tool.example_models && (
                <div>
                  <Badge variant="secondary" className="text-xs">
                    Tool models: {tool.example_models}
                  </Badge>
                </div>
              )}
              {!tool.photo_url && !tool.description && !tool.example_models && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Image className="w-4 h-4" />
                  <span className="text-sm">No additional details</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? 'No tools found matching your search.' : 'No tools in library yet.'}
        </div>
      )}

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