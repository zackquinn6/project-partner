import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VariationInstance {
  id: string;
  core_item_id: string;
  item_type: 'tools' | 'materials';
  name: string;
  description?: string;
  sku?: string;
  photo_url?: string;
  attributes: Record<string, string>;
  estimated_weight_lbs?: number;
  estimated_rental_lifespan_days?: number;
  warning_flags?: string[];
}

interface ToolModel {
  id: string;
  variation_instance_id: string;
  model_name: string;
  manufacturer?: string;
  model_number?: string;
  upc_code?: string;
}

interface PricingData {
  id: string;
  model_id: string;
  retailer: string;
  price?: number;
  currency: string;
  availability_status?: string;
  product_url?: string;
}

interface VariationEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variation: VariationInstance;
  onSave: () => void;
}

export function VariationEditor({ open, onOpenChange, variation, onSave }: VariationEditorProps) {
  const [editedVariation, setEditedVariation] = useState<VariationInstance>(variation);
  const [models, setModels] = useState<ToolModel[]>([]);
  const [pricing, setPricing] = useState<PricingData[]>([]);
  const [newModel, setNewModel] = useState<Partial<ToolModel>>({});
  const [newPricing, setNewPricing] = useState<Partial<PricingData>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    setEditedVariation(variation);
    fetchModelsAndPricing();
  }, [variation]);

  const fetchModelsAndPricing = async () => {
    try {
      // Fetch models
      const { data: modelsData, error: modelsError } = await supabase
        .from('tool_models')
        .select('*')
        .eq('variation_instance_id', variation.id);

      if (modelsError) throw modelsError;
      setModels(modelsData || []);

      // Fetch pricing for models
      if (modelsData && modelsData.length > 0) {
        const modelIds = modelsData.map(m => m.id);
        const { data: pricingData, error: pricingError } = await supabase
          .from('pricing_data')
          .select('*')
          .in('model_id', modelIds);

        if (pricingError) throw pricingError;
        setPricing(pricingData || []);
      }
    } catch (error) {
      console.error('Error fetching models and pricing:', error);
      toast.error('Failed to load variation data');
    }
  };

  const saveVariation = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('variation_instances')
        .update({
          name: editedVariation.name,
          description: editedVariation.description,
          sku: editedVariation.sku,
          photo_url: editedVariation.photo_url,
          estimated_weight_lbs: editedVariation.estimated_weight_lbs,
          estimated_rental_lifespan_days: editedVariation.estimated_rental_lifespan_days,
          warning_flags: editedVariation.warning_flags,
          updated_at: new Date().toISOString()
        })
        .eq('id', variation.id);

      if (error) throw error;

      toast.success('Variation updated successfully');
      onSave();
    } catch (error) {
      console.error('Error saving variation:', error);
      toast.error('Failed to save variation');
    } finally {
      setLoading(false);
    }
  };

  const addModel = async () => {
    if (!newModel.model_name) {
      toast.error('Model name is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tool_models')
        .insert({
          variation_instance_id: variation.id,
          model_name: newModel.model_name,
          manufacturer: newModel.manufacturer,
          model_number: newModel.model_number,
          upc_code: newModel.upc_code
        })
        .select()
        .single();

      if (error) throw error;

      setModels([...models, data]);
      setNewModel({});
      toast.success('Model added successfully');
    } catch (error) {
      console.error('Error adding model:', error);
      toast.error('Failed to add model');
    }
  };

  const deleteModel = async (modelId: string) => {
    try {
      const { error } = await supabase
        .from('tool_models')
        .delete()
        .eq('id', modelId);

      if (error) throw error;

      setModels(models.filter(m => m.id !== modelId));
      setPricing(pricing.filter(p => p.model_id !== modelId));
      toast.success('Model deleted successfully');
    } catch (error) {
      console.error('Error deleting model:', error);
      toast.error('Failed to delete model');
    }
  };

  const addPricing = async () => {
    if (!newPricing.model_id || !newPricing.retailer) {
      toast.error('Model and retailer are required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pricing_data')
        .insert({
          model_id: newPricing.model_id,
          retailer: newPricing.retailer,
          price: newPricing.price,
          currency: newPricing.currency || 'USD',
          availability_status: newPricing.availability_status,
          product_url: newPricing.product_url
        })
        .select()
        .single();

      if (error) throw error;

      setPricing([...pricing, data]);
      setNewPricing({});
      toast.success('Pricing data added successfully');
    } catch (error) {
      console.error('Error adding pricing:', error);
      toast.error('Failed to add pricing data');
    }
  };

  const deletePricing = async (pricingId: string) => {
    try {
      const { error } = await supabase
        .from('pricing_data')
        .delete()
        .eq('id', pricingId);

      if (error) throw error;

      setPricing(pricing.filter(p => p.id !== pricingId));
      toast.success('Pricing data deleted successfully');
    } catch (error) {
      console.error('Error deleting pricing:', error);
      toast.error('Failed to delete pricing data');
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${variation.id}-${Date.now()}.${fileExt}`;
      const filePath = `variations/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('library-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('library-photos')
        .getPublicUrl(filePath);

      setEditedVariation({ ...editedVariation, photo_url: publicUrl });
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const getModelPricing = (modelId: string) => {
    return pricing.filter(p => p.model_id === modelId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Variation: {variation.name}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Variation Name</Label>
                <Input
                  id="name"
                  value={editedVariation.name}
                  onChange={(e) => setEditedVariation({ ...editedVariation, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="sku">SKU/Model Numbers</Label>
                <Input
                  id="sku"
                  value={editedVariation.sku || ''}
                  onChange={(e) => setEditedVariation({ ...editedVariation, sku: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={editedVariation.estimated_weight_lbs || ''}
                  onChange={(e) => setEditedVariation({ 
                    ...editedVariation, 
                    estimated_weight_lbs: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                />
              </div>
              <div>
                <Label htmlFor="lifespan">Rental Lifespan (days)</Label>
                <Input
                  id="lifespan"
                  type="number"
                  value={editedVariation.estimated_rental_lifespan_days || ''}
                  onChange={(e) => setEditedVariation({ 
                    ...editedVariation, 
                    estimated_rental_lifespan_days: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedVariation.description || ''}
                onChange={(e) => setEditedVariation({ ...editedVariation, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="photo">Photo</Label>
              <div className="space-y-2">
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={loading}
                />
                {editedVariation.photo_url && (
                  <div className="flex items-center space-x-2">
                    <img
                      src={editedVariation.photo_url}
                      alt="Variation preview"
                      className="h-16 w-16 object-cover rounded-md"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditedVariation({ ...editedVariation, photo_url: undefined })}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="model-name">Model Name *</Label>
                    <Input
                      id="model-name"
                      value={newModel.model_name || ''}
                      onChange={(e) => setNewModel({ ...newModel, model_name: e.target.value })}
                      placeholder="e.g., DeWalt DCS570B"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Input
                      id="manufacturer"
                      value={newModel.manufacturer || ''}
                      onChange={(e) => setNewModel({ ...newModel, manufacturer: e.target.value })}
                      placeholder="e.g., DeWalt"
                    />
                  </div>
                  <div>
                    <Label htmlFor="model-number">Model Number</Label>
                    <Input
                      id="model-number"
                      value={newModel.model_number || ''}
                      onChange={(e) => setNewModel({ ...newModel, model_number: e.target.value })}
                      placeholder="e.g., DCS570B"
                    />
                  </div>
                  <div>
                    <Label htmlFor="upc">UPC Code</Label>
                    <Input
                      id="upc"
                      value={newModel.upc_code || ''}
                      onChange={(e) => setNewModel({ ...newModel, upc_code: e.target.value })}
                      placeholder="e.g., 885911419154"
                    />
                  </div>
                </div>
                <Button onClick={addModel} className="w-full" disabled={!newModel.model_name}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Model
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {models.map((model) => (
                <Card key={model.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{model.model_name}</div>
                        {model.manufacturer && (
                          <div className="text-sm text-muted-foreground">by {model.manufacturer}</div>
                        )}
                        {model.model_number && (
                          <div className="text-xs text-muted-foreground">Model: {model.model_number}</div>
                        )}
                        {model.upc_code && (
                          <div className="text-xs text-muted-foreground">UPC: {model.upc_code}</div>
                        )}
                        <div className="mt-2">
                          {getModelPricing(model.id).length > 0 && (
                            <div className="text-sm">
                              <strong>Pricing:</strong> {getModelPricing(model.id).length} retailer(s)
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteModel(model.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Pricing Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pricing-model">Model *</Label>
                    <select
                      id="pricing-model"
                      className="w-full p-2 border rounded-md"
                      value={newPricing.model_id || ''}
                      onChange={(e) => setNewPricing({ ...newPricing, model_id: e.target.value })}
                    >
                      <option value="">Select model...</option>
                      {models.map(model => (
                        <option key={model.id} value={model.id}>{model.model_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="retailer">Retailer *</Label>
                    <Input
                      id="retailer"
                      value={newPricing.retailer || ''}
                      onChange={(e) => setNewPricing({ ...newPricing, retailer: e.target.value })}
                      placeholder="e.g., Home Depot"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={newPricing.price || ''}
                      onChange={(e) => setNewPricing({ 
                        ...newPricing, 
                        price: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="availability">Availability Status</Label>
                    <Input
                      id="availability"
                      value={newPricing.availability_status || ''}
                      onChange={(e) => setNewPricing({ ...newPricing, availability_status: e.target.value })}
                      placeholder="e.g., In Stock"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="product-url">Product URL</Label>
                  <Input
                    id="product-url"
                    value={newPricing.product_url || ''}
                    onChange={(e) => setNewPricing({ ...newPricing, product_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <Button 
                  onClick={addPricing} 
                  className="w-full" 
                  disabled={!newPricing.model_id || !newPricing.retailer}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Pricing Data
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {pricing.map((price) => {
                const model = models.find(m => m.id === price.model_id);
                return (
                  <Card key={price.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{model?.model_name}</div>
                          <div className="text-sm text-muted-foreground">{price.retailer}</div>
                          {price.price && (
                            <div className="text-lg font-bold text-green-600">
                              ${price.price.toFixed(2)} {price.currency}
                            </div>
                          )}
                          {price.availability_status && (
                            <Badge variant="outline" className="mt-1">
                              {price.availability_status}
                            </Badge>
                          )}
                          {price.product_url && (
                            <div className="text-xs text-blue-600 mt-1 truncate max-w-xs">
                              <a href={price.product_url} target="_blank" rel="noopener noreferrer">
                                {price.product_url}
                              </a>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePricing(price.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={saveVariation} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}