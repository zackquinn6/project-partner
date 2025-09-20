import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VariationEditor } from './VariationEditor';

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
}

interface PricingData {
  id: string;
  model_id: string;
  retailer: string;
  price?: number;
  currency: string;
  availability_status?: string;
}

interface VariationAttribute {
  id: string;
  name: string;
  display_name: string;
  values: VariationAttributeValue[];
}

interface VariationAttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  display_value: string;
}

interface VariationViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coreItemId: string;
  itemType: 'tools' | 'materials';
  coreItemName: string;
  onVariationSelect?: (variation: VariationInstance) => void;
}

export function VariationViewer({ open, onOpenChange, coreItemId, itemType, coreItemName, onVariationSelect }: VariationViewerProps) {
  const [variations, setVariations] = useState<VariationInstance[]>([]);
  const [attributes, setAttributes] = useState<VariationAttribute[]>([]);
  const [models, setModels] = useState<ToolModel[]>([]);
  const [pricing, setPricing] = useState<PricingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingVariation, setEditingVariation] = useState<VariationInstance | null>(null);

  const fetchData = async () => {
    if (!coreItemId) return;
    
    setLoading(true);
    try {
      // Fetch variations
      const { data: variationsData, error: variationsError } = await supabase
        .from('variation_instances')
        .select('*')
        .eq('core_item_id', coreItemId)
        .eq('item_type', itemType);

      if (variationsError) throw variationsError;
      
      const processedVariations = (variationsData || []).map(item => ({
        ...item,
        item_type: item.item_type as 'tools' | 'materials',
        attributes: item.attributes as Record<string, string>
      }));
      setVariations(processedVariations);

      // Fetch tool models for these variations
      const variationIds = processedVariations.map(v => v.id);
      if (variationIds.length > 0) {
        const { data: modelsData, error: modelsError } = await supabase
          .from('tool_models')
          .select('*')
          .in('variation_instance_id', variationIds);

        if (modelsError) throw modelsError;
        setModels(modelsData || []);

        // Fetch pricing data for models
        const modelIds = (modelsData || []).map(m => m.id);
        if (modelIds.length > 0) {
          const { data: pricingData, error: pricingError } = await supabase
            .from('pricing_data')
            .select('*')
            .in('model_id', modelIds);

          if (pricingError) throw pricingError;
          setPricing(pricingData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch variation data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttributes = async () => {
    if (!coreItemId) return;
    
    try {
      const { data: attributesData, error } = await supabase
        .from('variation_attributes')
        .select(`
          *,
          variation_attribute_values!inner (*)
        `)
        .eq('variation_attribute_values.core_item_id', coreItemId)
        .order('display_name');

      if (error) throw error;

      const formattedAttributes: VariationAttribute[] = attributesData.map(attr => ({
        id: attr.id,
        name: attr.name,
        display_name: attr.display_name,
        values: attr.variation_attribute_values || []
      }));

      setAttributes(formattedAttributes);
    } catch (error) {
      console.error('Error fetching attributes:', error);
    }
  };

  useEffect(() => {
    if (open && coreItemId) {
      fetchData();
      fetchAttributes();
    }
  }, [open, coreItemId]);

  const getModelPricing = (modelId: string) => {
    const modelPricing = pricing.filter(p => p.model_id === modelId && p.price && p.price > 0);
    if (modelPricing.length === 0) return null;
    
    const avgPrice = modelPricing.reduce((sum, p) => sum + (p.price || 0), 0) / modelPricing.length;
    return {
      averagePrice: avgPrice,
      retailerCount: modelPricing.length,
      prices: modelPricing
    };
  };

  const getVariationModels = (variationId: string) => {
    return models.filter(m => m.variation_instance_id === variationId);
  };

  const handleEditVariation = (variation: VariationInstance) => {
    setEditingVariation(variation);
  };

  const handleVariationSaved = () => {
    fetchData();
    setEditingVariation(null);
  };

  // Render selection view when onVariationSelect is provided
  if (onVariationSelect) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select Variation for {coreItemName}</DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <div className="flex justify-center p-8">Loading variations...</div>
          ) : variations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No variations found for this {itemType.slice(0, -1)}.
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                {variations.map(variation => (
                  <div
                    key={variation.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      {variation.photo_url && (
                        <img
                          src={variation.photo_url}
                          alt={variation.name}
                          className="h-12 w-12 object-cover rounded flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-base truncate">{variation.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(variation.attributes).map(([key, value]) => {
                            const attr = attributes.find(a => a.name === key);
                            const attrValue = attr?.values.find(v => v.value === value);
                            return (
                              <Badge key={key} variant="secondary" className="text-xs">
                                {attr?.display_name || key}: {attrValue?.display_value || value}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        onVariationSelect(variation);
                      }}
                      className="ml-4 flex-shrink-0"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Render detailed view when no onVariationSelect is provided
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Variations for {coreItemName}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center p-8">Loading variations...</div>
        ) : variations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No variations found for this {itemType.slice(0, -1)}.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {variations.map(variation => (
                <Card key={variation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      {variation.photo_url && (
                        <img
                          src={variation.photo_url}
                          alt={variation.name}
                          className="h-16 w-16 object-cover rounded-md flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-lg">{variation.name}</div>
                        {variation.description && (
                          <div className="text-sm text-muted-foreground mb-2">{variation.description}</div>
                        )}
                        {variation.sku && (
                          <div className="text-xs text-muted-foreground mb-2">Model: {variation.sku}</div>
                        )}
                        
                        {/* Weight and Rental Lifespan Info */}
                        <div className="flex gap-4 mb-2 text-xs text-muted-foreground">
                          {variation.estimated_weight_lbs && (
                            <span>Weight: {variation.estimated_weight_lbs} lbs</span>
                          )}
                          {variation.estimated_rental_lifespan_days && (
                            <span>Rental Life: {variation.estimated_rental_lifespan_days} days</span>
                        )}
                        </div>

                        {/* Models and Pricing */}
                        {(() => {
                          const variationModels = getVariationModels(variation.id);
                          return variationModels.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <div className="text-sm font-medium text-foreground">Models:</div>
                              {variationModels.map(model => {
                                const modelPricing = getModelPricing(model.id);
                                return (
                                  <div key={model.id} className="bg-muted/50 p-2 rounded text-sm">
                                    <div className="font-medium">{model.model_name}</div>
                                    {model.manufacturer && (
                                      <div className="text-xs text-muted-foreground">by {model.manufacturer}</div>
                                    )}
                                    {modelPricing ? (
                                      <div className="text-sm font-medium text-green-600 mt-1">
                                        Avg: ${modelPricing.averagePrice.toFixed(2)} ({modelPricing.retailerCount} retailer{modelPricing.retailerCount !== 1 ? 's' : ''})
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground mt-1">No pricing data</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Warning Flags */}
                        {variation.warning_flags && variation.warning_flags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {variation.warning_flags.map((flag, index) => (
                              <Badge key={index} variant="destructive" className="text-xs">
                                ⚠️ {flag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {Object.entries(variation.attributes).map(([key, value]) => {
                            const attr = attributes.find(a => a.name === key);
                            const attrValue = attr?.values.find(v => v.value === value);
                            return (
                              <Badge key={key} variant="outline" className="text-xs">
                                {attr?.display_name}: {attrValue?.display_value || value}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>

      {editingVariation && (
        <VariationEditor
          open={!!editingVariation}
          onOpenChange={(open) => !open && setEditingVariation(null)}
          variation={editingVariation}
          onSave={handleVariationSaved}
        />
      )}
    </Dialog>
  );
}