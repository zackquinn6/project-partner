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
import { BulkUpload } from "./BulkUpload";
import { ExportMaterialsData } from "./ExportMaterialsData";
import { supabase } from "@/integrations/supabase/client";
import { clearAllMaterials } from "@/utils/variationUtils";
import { toast } from "sonner";

interface Material {
  id: string;
  item: string;
  description: string | null;
  unit_size: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

type SortField = 'item' | 'description' | 'unit_size';
type SortDirection = 'asc' | 'desc';

export function MaterialsLibrary() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [sortField, setSortField] = useState<SortField>('item');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials' as any)
        .select('*')
        .order('item');
      
      if (error) throw error;
      setMaterials((data as unknown as Material[]) || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const filteredMaterials = materials.filter(material => 
    material.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (material.description && material.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    let aValue: string | number = a[sortField] || '';
    let bValue: string | number = b[sortField] || '';
    
    aValue = aValue.toString().toLowerCase();
    bValue = bValue.toString().toLowerCase();
    
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

  const handleDelete = async (materialId: string) => {
    try {
      const { error } = await supabase
        .from('materials' as any)
        .delete()
        .eq('id', materialId);
      
      if (error) throw error;
      
      setMaterials(materials.filter(material => material.id !== materialId));
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Failed to delete material');
    }
  };

  const handleSave = () => {
    fetchMaterials();
    setShowAddDialog(false);
    setShowEditDialog(false);
    setEditingMaterial(null);
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setShowEditDialog(true);
  };

  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      const success = await clearAllMaterials();
      if (success) {
        setMaterials([]);
        toast.success('All materials deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting all materials:', error);
      toast.error('Failed to delete all materials');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading materials...</div>;
  }

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search materials by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="text-xs" title="Delete All Materials">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete All Materials</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all materials and variations from the library. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete All Materials
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <ExportMaterialsData className="text-xs" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBulkUpload(true)}
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
          <DialogContent className="z-[100]">
            <DialogHeader>
              <DialogTitle>Add New Material</DialogTitle>
            </DialogHeader>
        <LibraryItemForm
          type="materials"
          onSave={handleSave}
          onCancel={() => setShowAddDialog(false)}
        />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg max-h-[70vh] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-12">Photo</TableHead>
              <TableHead className="w-32">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('item')}
                  className="h-auto p-0 font-semibold hover:bg-transparent flex items-center"
                >
                  Material Name
                  {getSortIcon('item')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('description')}
                  className="h-auto p-0 font-semibold hover:bg-transparent flex items-center"
                >
                  Description
                  {getSortIcon('description')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('unit_size')}
                  className="h-auto p-0 font-semibold hover:bg-transparent flex items-center"
                >
                  Unit Size
                  {getSortIcon('unit_size')}
                </Button>
              </TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMaterials.map((material) => (
              <TableRow key={material.id} className="hover:bg-muted/50">
                <TableCell>
                  {material.photo_url ? (
                    <img
                      src={material.photo_url}
                      alt={material.item}
                      className="w-10 h-10 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                      <Image className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium capitalize w-32 break-words">{material.item}</TableCell>
                <TableCell className="text-xs text-muted-foreground break-words">
                  {material.description || '-'}
                </TableCell>
                <TableCell className="text-xs">
                  {material.unit_size ? (
                    <Badge variant="secondary" className="text-xs">
                      {material.unit_size}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(material)}
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
                          <AlertDialogTitle>Delete Material</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{material.item}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(material.id)}>
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
        
        {sortedMaterials.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchTerm ? 'No materials found matching your search.' : 'No materials in library yet.'}
          </div>
        )}
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="z-[100]">
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
          </DialogHeader>
          {editingMaterial && (
            <LibraryItemForm
              type="materials"
              item={editingMaterial}
              onSave={handleSave}
              onCancel={() => {
                setShowEditDialog(false);
                setEditingMaterial(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <BulkUpload
        type="materials"
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        onSuccess={handleSave}
      />
    </div>
  );
}