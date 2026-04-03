import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { MultiContentEditor } from './MultiContentEditor';
import type { ContentSection } from '@/interfaces/Project';
import { buildPricingModelRowsForVariation } from '@/utils/pricingModelLabels';

/** When PostgREST has no `warning_flags` relation, avoid repeat 404s for the session. */
const WARNING_FLAGS_UNAVAILABLE_SESSION_KEY = 'toolio:warning_flags_unavailable';

/** Nested above parent dialogs that use z-[100] (e.g. VariationViewer); align with VariationManager. */
const NESTED_EDITOR_OVERLAY_CLASS = 'z-[260] bg-black/80';
const NESTED_EDITOR_CONTENT_Z = 'z-[270]';

interface VariationInstance {
  id: string;
  core_item_id: string;
  name: string;
  description?: string;
  sku?: string;
  photo_url?: string;
  attributes: Record<string, string>;
  estimated_weight_lbs?: number;
  estimated_rental_lifespan_days?: number;
  warning_flags?: string[];
  quick_add?: boolean;
  instructions?: unknown;
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
  const [newPricing, setNewPricing] = useState<Partial<PricingData>>({});
  const [availableWarnings, setAvailableWarnings] = useState<WarningFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [instructions, setInstructions] = useState<ContentSection[]>([]);

  function parseInstructions(value: unknown): ContentSection[] {
    if (Array.isArray(value)) return value as ContentSection[];
    if (typeof value === 'string') {
      try { return (JSON.parse(value || '[]') as ContentSection[]); } catch { return []; }
    }
    return [];
  }

  useEffect(() => {
    if (variation) {
      setEditedVariation({
        ...variation,
        name: variation.name || '',
      });
      setInstructions(parseInstructions(variation.instructions));
      fetchModelsAndPricing();
      fetchWarningFlags();
    }
  }, [variation]);

  const fetchModelsAndPricing = async () => {
    try {
      let coreItemDisplayName: string | undefined;
      if (variation.core_item_id) {
        const { data: coreRow } = await supabase
          .from('tools')
          .select('name')
          .eq('id', variation.core_item_id)
          .maybeSingle();
        coreItemDisplayName = coreRow?.name ?? undefined;
      }

      const { data: varData, error: varError } = await supabase
        .from('tool_variations')
        .select('pricing')
        .eq('id', variation.id)
        .single();

      if (varError) throw varError;
      const raw = varData?.pricing as PricingData[] | null;
      const list = Array.isArray(raw) ? raw : [];
      setPricing(list);

      setModels(
        buildPricingModelRowsForVariation({
          variationId: variation.id,
          coreItemId: variation.core_item_id,
          coreItemDisplayName,
          variationName: variation.name,
          variationSku: variation.sku,
          pricing: list,
        })
      );
    } catch (error) {
      console.error('Error fetching models and pricing:', error);
      toast.error('Failed to load variation data');
    }
  };

  const fetchWarningFlags = async () => {
    try {
      if (
        typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem(WARNING_FLAGS_UNAVAILABLE_SESSION_KEY) === '1'
      ) {
        setAvailableWarnings([]);
        return;
      }

      const { data, error } = await supabase
        .from('warning_flags')
        .select('*')
        .order('name');

      if (error) {
        if (
          error.code === 'PGRST205' ||
          /could not find the table.*warning_flags/i.test(String(error.message ?? ''))
        ) {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(WARNING_FLAGS_UNAVAILABLE_SESSION_KEY, '1');
          }
          setAvailableWarnings([]);
          return;
        }
        throw error;
      }
      setAvailableWarnings(data || []);
    } catch (error) {
      console.error('Error fetching warning flags:', error);
      setAvailableWarnings([]);
      toast.error('Failed to load warning flags');
    }
  };

  const saveVariation = async () => {
    if (!editedVariation.name || !editedVariation.name.trim()) {
      toast.error('Variation name is required');
      return;
    }

    setLoading(true);
    try {
      console.log('💾 Saving variation:', {
        id: variation.id,
        name: editedVariation.name,
        description: editedVariation.description
      });

      const updatePayload: Record<string, unknown> = {
        name: editedVariation.name.trim(),
        description: editedVariation.description || null,
        sku: editedVariation.sku || null,
        photo_url: editedVariation.photo_url || null,
        estimated_weight_lbs:
          editedVariation.estimated_weight_lbs != null
            ? editedVariation.estimated_weight_lbs
            : null,
        estimated_rental_lifespan_days:
          editedVariation.estimated_rental_lifespan_days != null
            ? editedVariation.estimated_rental_lifespan_days
            : null,
        warning_flags: editedVariation.warning_flags || null,
        quick_add: editedVariation.quick_add || false,
        updated_at: new Date().toISOString(),
      };
      updatePayload.instructions = instructions;
      const { error } = await supabase
        .from('tool_variations')
        .update(updatePayload)
        .eq('id', variation.id);

      if (error) {
        console.error('❌ Error saving variation:', error);
        throw error;
      }

      console.log('✅ Variation saved successfully');
            onSave();
    } catch (error) {
      console.error('Error saving variation:', error);
      toast.error('Failed to save variation');
    } finally {
      setLoading(false);
    }
  };

  const addPricing = async () => {
    if (!newPricing.model_id || !newPricing.retailer) {
      toast.error('Model and retailer are required');
      return;
    }

    try {
      const newEntry: PricingData = {
        id: crypto.randomUUID(),
        model_id: newPricing.model_id,
        retailer: newPricing.retailer,
        price: newPricing.price ?? undefined,
        currency: newPricing.currency || 'USD',
        availability_status: newPricing.availability_status,
        product_url: newPricing.product_url
      };
      const nextPricing = [...pricing, newEntry];

      const { error } = await supabase
        .from('tool_variations')
        .update({ pricing: nextPricing, updated_at: new Date().toISOString() })
        .eq('id', variation.id);

      if (error) throw error;

      setPricing(nextPricing);
      setNewPricing({});
          } catch (error) {
      console.error('Error adding pricing:', error);
      toast.error('Failed to add pricing data');
    }
  };

  const deletePricing = async (pricingId: string) => {
    try {
      const nextPricing = pricing.filter(p => p.id !== pricingId);
      const { error } = await supabase
        .from('tool_variations')
        .update({ pricing: nextPricing, updated_at: new Date().toISOString() })
        .eq('id', variation.id);

      if (error) throw error;

      setPricing(nextPricing);
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
        <DialogOverlay className={NESTED_EDITOR_OVERLAY_CLASS} />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={`fixed left-[50%] top-[50%] ${NESTED_EDITOR_CONTENT_Z} flex max-h-[85vh] h-[min(85vh,44rem)] w-[90vw] max-w-4xl translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden bg-background border rounded-lg shadow-lg p-6`}
        >
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit Variation: {variation.name}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col gap-0 pt-1"
        >
          <TabsList className="grid w-full shrink-0 grid-cols-5 my-2.5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
            <TabsTrigger value="warnings">Warnings</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-2">
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
                <Label htmlFor="estimated-weight">
                  Display weight (lbs)
                </Label>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Shown on variation details and in the catalog; shoppers see this value.
                </p>
                <Input
                  id="estimated-weight"
                  type="number"
                  step="0.1"
                  value={
                    editedVariation.estimated_weight_lbs != null
                      ? editedVariation.estimated_weight_lbs
                      : ''
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setEditedVariation({
                        ...editedVariation,
                        estimated_weight_lbs: undefined,
                      });
                      return;
                    }
                    const v = parseFloat(raw);
                    if (!Number.isFinite(v)) return;
                    const rounded = Math.round(v * 10) / 10;
                    setEditedVariation({
                      ...editedVariation,
                      estimated_weight_lbs: rounded,
                    });
                  }}
                  placeholder="e.g., 12.5"
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="quick-add"
                checked={editedVariation.quick_add || false}
                onCheckedChange={(checked) => setEditedVariation({ 
                  ...editedVariation, 
                  quick_add: checked as boolean 
                })}
              />
              <Label htmlFor="quick-add" className="cursor-pointer">
                Quick Add (Show in Build Your Profile)
              </Label>
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

          <TabsContent value="instructions" className="space-y-4">
              <div>
                <Label className="text-base font-medium">Variant instructions</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Text, videos, photos, and links shown when users open instructions for this variant in the workflow.
                </p>
                <MultiContentEditor sections={instructions} onChange={setInstructions} />
              </div>
              <Button onClick={saveVariation} disabled={loading}>
                {loading ? 'Saving...' : 'Save variation'}
              </Button>
            </TabsContent>

          <TabsContent value="warnings" className="space-y-4">
            <div>
              <Label className="text-base font-medium">Safety Warning Flags</Label>
              <div className="text-sm text-muted-foreground mb-4">
                Select applicable warning flags for this variation to help users identify potential safety considerations.
              </div>

              {availableWarnings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No warning-flag catalog is available. Any flags already stored on this variation are listed below.
                </p>
              ) : null}

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
            <p className="text-sm text-muted-foreground">
              Pricing targets are keyed by UUID on each variation (variation id, core catalog tool id, or legacy
              keys still present in <code className="text-xs">pricing</code> JSON). Use the Details tab for SKU
              and naming; add retailer rows on the Pricing tab.
            </p>
            <div className="space-y-3">
              {models.map((model) => (
                <Card key={model.id}>
                  <CardContent className="p-4">
                    <div className="font-medium">{model.model_name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1 break-all">{model.id}</div>
                    {getModelPricing(model.id).length > 0 && (
                      <div className="text-sm mt-2">
                        <strong>Pricing:</strong> {getModelPricing(model.id).length} retailer(s)
                      </div>
                    )}
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
          </div>
        </Tabs>

        <div className="flex shrink-0 justify-end gap-2 border-t pt-4 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={saveVariation} disabled={loading} variant="default">
            Save
          </Button>
        </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}