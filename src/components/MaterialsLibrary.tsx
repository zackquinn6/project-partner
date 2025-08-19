import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, Image } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LibraryItemForm } from "./LibraryItemForm";
import { supabase } from "@/integrations/supabase/client";
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

export function MaterialsLibrary() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

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
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Material
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Material</DialogTitle>
            </DialogHeader>
            <LibraryItemForm
              type="material"
              onSave={handleSave}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
        {filteredMaterials.map((material) => (
          <Card key={material.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{material.item}</CardTitle>
                <div className="flex gap-1">
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
              </div>
            </CardHeader>
            <CardContent>
              {material.photo_url && (
                <div className="mb-3">
                  <img
                    src={material.photo_url}
                    alt={material.item}
                    className="w-full h-32 object-cover rounded-md"
                  />
                </div>
              )}
              {material.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {material.description}
                </p>
              )}
              {material.unit_size && (
                <div>
                  <Badge variant="secondary" className="text-xs">
                    Unit Size: {material.unit_size}
                  </Badge>
                </div>
              )}
              {!material.photo_url && !material.description && !material.unit_size && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Image className="w-4 h-4" />
                  <span className="text-sm">No additional details</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? 'No materials found matching your search.' : 'No materials in library yet.'}
        </div>
      )}

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
          </DialogHeader>
          {editingMaterial && (
            <LibraryItemForm
              type="material"
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
    </div>
  );
}