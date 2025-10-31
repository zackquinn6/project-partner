import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
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
import * as DialogPrimitive from '@radix-ui/react-dialog';

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
  weight_lbs?: number;
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

interface WarningFlag {
  id: string;
  name: string;
  description?: string;
  icon_class?: string;
  color_class?: string;
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
  const [availableWarnings, setAvailableWarnings] = useState<WarningFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    setEditedVariation(variation);
    fetchModelsAndPricing();
    fetchWarningFlags();
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

  const fetchWarningFlags = async () => {
    try {
      const { data, error } = await supabase
        .from('warning_flags')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailableWarnings(data || []);
    } catch (error) {
      console.error('Error fetching warning flags:', error);
      toast.error('Failed to load warning flags');
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
           weight_lbs: editedVariation.weight_lbs,
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

  const toggleWarningFlag = (flagName: string) => {
    const currentFlags = editedVariation.warning_flags || [];
    const isSelected = currentFlags.includes(flagName);
    
    let newFlags;
    if (isSelected) {
      newFlags = currentFlags.filter(f => f !== flagName);
    } else {
      newFlags = [...currentFlags, flagName];
    }
    
    setEditedVariation({ ...editedVariation, warning_flags: newFlags });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[250]" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[251] translate-x-[-50%] translate-y-[-50%] max-w-4xl max-h-[80vh] w-[90vw] overflow-y-auto bg-background border rounded-lg shadow-lg p-6">
        <DialogHeader>
          <DialogTitle>Edit Variation: {variation.name}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="warnings">Warnings</TabsTrigger>
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
                <Label htmlFor="weight">Actual Weight (lbs)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={editedVariation.weight_lbs || ''}
                  onChange={(e) => setEditedVariation({ 
                    ...editedVariation, 
                    weight_lbs: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="e.g., 10.5"
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

          <TabsContent value="warnings" className="space-y-4">
            <div>
              <Label className="text-base font-medium">Safety Warning Flags</Label>
              <div className="text-sm text-muted-foreground mb-4">
                Select applicable warning flags for this variation to help users identify potential safety considerations.
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {availableWarnings.map((flag) => {
                  const isSelected = editedVariation.warning_flags?.includes(flag.name) || false;
                  return (
                    <div
                      key={flag.id}
                      onClick={() => toggleWarningFlag(flag.name)}
                      className={`
                        p-3 rounded-lg border cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-yellow-500 bg-yellow-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center
                          ${isSelected 
                            ? 'border-yellow-500 bg-yellow-500' 
                            : 'border-gray-300'
                          }
                        `}>
                          {isSelected && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium capitalize">{flag.name}</div>
                          {flag.description && (
                            <div className="text-xs text-muted-foreground">{flag.description}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {editedVariation.warning_flags && editedVariation.warning_flags.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">Selected Warnings:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editedVariation.warning_flags.map((flagName) => {
                      const flag = availableWarnings.find(f => f.name === flagName);
                      return (
                        <Badge key={flagName} variant="secondary" className="bg-yellow-100 text-yellow-800">
                          ⚠️ {flag?.name || flagName}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
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
          <Button onClick={saveVariation} disabled={loading} size="icon" variant="outline">
            <Save className="w-4 h-4" />
          </Button>
        </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}