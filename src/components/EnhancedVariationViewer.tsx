import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Edit, 
  Trash2, 
  Plus, 
  DollarSign, 
  Weight, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedVariationViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coreItemId: string;
  itemType: string;
  coreItemName: string;
}

interface VariationInstance {
  id: string;
  name: string;
  description: string;
  attributes: Record<string, string>;
  warning_flags: string[];
  estimated_rental_lifespan_days: number;
  estimated_weight_lbs: number;
  photo_url?: string;
}

interface ToolModel {
  id: string;
  model_name: string;
  manufacturer: string;
  model_number: string;
  upc_code?: string;
  variation_instance_id: string;
}

interface PricingData {
  id: string;
  retailer: string;
  price: number;
  currency: string;
  availability_status: string;
  product_url?: string;
  last_scraped_at: string;
}

interface WarningFlag {
  id: string;
  name: string;
  description: string;
  icon_class: string;
  color_class: string;
}

export function EnhancedVariationViewer({ 
  open, 
  onOpenChange, 
  coreItemId, 
  itemType, 
  coreItemName 
}: EnhancedVariationViewerProps) {
  const [variations, setVariations] = useState<VariationInstance[]>([]);
  const [models, setModels] = useState<Record<string, ToolModel[]>>({});
  const [pricingData, setPricingData] = useState<Record<string, PricingData[]>>({});
  const [warningFlags, setWarningFlags] = useState<WarningFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrapingProgress, setScrapingProgress] = useState<Record<string, number>>({});
  const [editingVariation, setEditingVariation] = useState<VariationInstance | null>(null);
  const [editingModel, setEditingModel] = useState<ToolModel | null>(null);
  const [showAddModel, setShowAddModel] = useState<string | null>(null);

  useEffect(() => {
    if (open && coreItemId) {
      fetchData();
    }
  }, [open, coreItemId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch variations
      const { data: variationsData, error: variationsError } = await supabase
        .from('variation_instances')
        .select('*')
        .eq('core_item_id', coreItemId)
        .eq('item_type', itemType);

      if (variationsError) throw variationsError;
      setVariations((variationsData || []).map(v => ({
        ...v,
        attributes: v.attributes as Record<string, string> || {},
        warning_flags: v.warning_flags || []
      })));

      // Fetch models for each variation
      if (variationsData?.length > 0) {
        const variationIds = variationsData.map(v => v.id);
        const { data: modelsData, error: modelsError } = await supabase
          .from('tool_models')
          .select('*')
          .in('variation_instance_id', variationIds);

        if (modelsError) throw modelsError;

        // Group models by variation
        const modelsByVariation: Record<string, ToolModel[]> = {};
        modelsData?.forEach(model => {
          if (!modelsByVariation[model.variation_instance_id]) {
            modelsByVariation[model.variation_instance_id] = [];
          }
          modelsByVariation[model.variation_instance_id].push(model);
        });
        setModels(modelsByVariation);

        // Fetch pricing data
        if (modelsData?.length > 0) {
          const modelIds = modelsData.map(m => m.id);
          const { data: pricingDataResult, error: pricingError } = await supabase
            .from('pricing_data')
            .select('*')
            .in('model_id', modelIds);

          if (pricingError) throw pricingError;

          // Group pricing by model
          const pricingByModel: Record<string, PricingData[]> = {};
          pricingDataResult?.forEach(pricing => {
            if (!pricingByModel[pricing.model_id]) {
              pricingByModel[pricing.model_id] = [];
            }
            pricingByModel[pricing.model_id].push(pricing);
          });
          setPricingData(pricingByModel);
        }
      }

      // Fetch warning flags
      const { data: flagsData, error: flagsError } = await supabase
        .from('warning_flags')
        .select('*')
        .order('name');

      if (flagsError) throw flagsError;
      setWarningFlags(flagsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load variation data');
    } finally {
      setLoading(false);
    }
  };

  const scrapePricingForModel = async (model: ToolModel) => {
    const modelId = model.id;
    setScrapingProgress(prev => ({ ...prev, [modelId]: 0 }));
    
    try {
      const searchTerm = `${model.manufacturer || ''} ${model.model_name}`.trim();
      
      const { data, error } = await supabase.functions.invoke('scrape-tool-pricing', {
        body: { 
          modelId,
          searchTerm,
          includeEstimates: true
        }
      });

      if (error) throw error;

      setScrapingProgress(prev => ({ ...prev, [modelId]: 100 }));
      
      // Refresh pricing data
      fetchData();
      
      toast.success(`Scraped pricing for ${model.model_name}`);
    } catch (error) {
      console.error('Error scraping pricing:', error);
      toast.error(`Failed to scrape pricing for ${model.model_name}`);
    } finally {
      setTimeout(() => {
        setScrapingProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[modelId];
          return newProgress;
        });
      }, 2000);
    }
  };

  const updateVariationWarningFlags = async (variationId: string, flags: string[]) => {
    try {
      const { error } = await supabase
        .from('variation_instances')
        .update({ warning_flags: flags })
        .eq('id', variationId);

      if (error) throw error;
      
      setVariations(prev => 
        prev.map(v => v.id === variationId ? { ...v, warning_flags: flags } : v)
      );
      
      toast.success('Warning flags updated');
    } catch (error) {
      console.error('Error updating warning flags:', error);
      toast.error('Failed to update warning flags');
    }
  };

  const updateVariationEstimate = async (
    variationId: string, 
    field: 'estimated_rental_lifespan_days' | 'estimated_weight_lbs', 
    value: number
  ) => {
    try {
      const { error } = await supabase
        .from('variation_instances')
        .update({ [field]: value })
        .eq('id', variationId);

      if (error) throw error;
      
      setVariations(prev => 
        prev.map(v => v.id === variationId ? { ...v, [field]: value } : v)
      );
      
      toast.success('Estimate updated');
    } catch (error) {
      console.error('Error updating estimate:', error);
      toast.error('Failed to update estimate');
    }
  };

  const addNewModel = async (variationId: string, modelData: Partial<ToolModel>) => {
    try {
      const { error } = await supabase
        .from('tool_models')
        .insert({
          variation_instance_id: variationId,
          model_name: modelData.model_name || '',
          manufacturer: modelData.manufacturer || '',
          model_number: modelData.model_number || '',
          upc_code: modelData.upc_code || ''
        });

      if (error) throw error;
      
      fetchData();
      setShowAddModel(null);
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
      
      fetchData();
      toast.success('Model deleted');
    } catch (error) {
      console.error('Error deleting model:', error);
      toast.error('Failed to delete model');
    }
  };

  const getAveragePricing = (modelId: string): { average: number; count: number } => {
    const pricing = pricingData[modelId] || [];
    if (pricing.length === 0) return { average: 0, count: 0 };
    
    const validPrices = pricing.filter(p => p.price > 0);
    const average = validPrices.reduce((sum, p) => sum + p.price, 0) / validPrices.length;
    
    return { average: Math.round(average * 100) / 100, count: validPrices.length };
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <div className="flex justify-center p-8">Loading variations...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Enhanced Variations for {coreItemName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto">
          {variations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No variations found for this tool.
            </div>
          ) : (
            variations.map((variation) => (
              <Card key={variation.id} className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{variation.name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingVariation(variation)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="models">Models</TabsTrigger>
                      <TabsTrigger value="pricing">Pricing</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Weight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Weight: {variation.estimated_weight_lbs || 'N/A'} lbs
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Lifespan: {variation.estimated_rental_lifespan_days || 'N/A'} days
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {variation.warning_flags?.length || 0} warnings
                          </span>
                        </div>
                      </div>

                      {/* Attributes */}
                      {Object.keys(variation.attributes).length > 0 && (
                        <div>
                          <Label className="font-medium">Attributes:</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(variation.attributes).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}: {value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warning Flags */}
                      {variation.warning_flags?.length > 0 && (
                        <div>
                          <Label className="font-medium">Warning Flags:</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {variation.warning_flags.map((flag) => {
                              const flagData = warningFlags.find(f => f.name === flag);
                              return (
                                <Badge 
                                  key={flag} 
                                  variant="secondary" 
                                  className={`text-xs ${flagData?.color_class || 'text-gray-500'}`}
                                >
                                  {flag}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="models" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="font-medium">Tool Models</Label>
                        <Button
                          size="sm"
                          onClick={() => setShowAddModel(variation.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Model
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {(models[variation.id] || []).map((model) => (
                          <div key={model.id} className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <div className="font-medium">
                                {model.manufacturer} {model.model_name}
                              </div>
                              {model.model_number && (
                                <div className="text-sm text-muted-foreground">
                                  Model: {model.model_number}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {scrapingProgress[model.id] !== undefined ? (
                                <div className="flex items-center gap-2">
                                  <Progress 
                                    value={scrapingProgress[model.id]} 
                                    className="w-20 h-2" 
                                  />
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => scrapePricingForModel(model)}
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingModel(model)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteModel(model.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="pricing" className="space-y-4">
                      <Label className="font-medium">Market Pricing Data</Label>
                      
                      {(models[variation.id] || []).map((model) => {
                        const pricing = pricingData[model.id] || [];
                        const { average, count } = getAveragePricing(model.id);
                        
                        return (
                          <div key={model.id} className="border rounded-md p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">
                                {model.manufacturer} {model.model_name}
                              </div>
                              {average > 0 && (
                                <Badge variant="default">
                                  Avg: ${average} ({count} retailers)
                                </Badge>
                              )}
                            </div>
                            
                            {pricing.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {pricing.map((price) => (
                                  <div key={price.id} className="bg-muted p-2 rounded text-sm">
                                    <div className="font-medium">{price.retailer}</div>
                                    <div className="text-lg">${price.price}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {price.availability_status}
                                    </div>
                                    {price.product_url && (
                                      <a 
                                        href={price.product_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                      >
                                        View <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                No pricing data available. Click the scrape button to fetch pricing.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4">
                      {/* Weight and Lifespan Estimates */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Rental Lifespan (days)</Label>
                          <Input
                            type="number"
                            value={variation.estimated_rental_lifespan_days || ''}
                            onChange={(e) => 
                              updateVariationEstimate(
                                variation.id, 
                                'estimated_rental_lifespan_days', 
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>Weight (lbs)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={variation.estimated_weight_lbs || ''}
                            onChange={(e) => 
                              updateVariationEstimate(
                                variation.id, 
                                'estimated_weight_lbs', 
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </div>

                      {/* Warning Flags */}
                      <div>
                        <Label className="font-medium mb-2 block">Warning Flags</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {warningFlags.map((flag) => (
                            <div key={flag.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${variation.id}-${flag.name}`}
                                checked={variation.warning_flags?.includes(flag.name) || false}
                                onCheckedChange={(checked) => {
                                  const currentFlags = variation.warning_flags || [];
                                  const newFlags = checked 
                                    ? [...currentFlags, flag.name]
                                    : currentFlags.filter(f => f !== flag.name);
                                  updateVariationWarningFlags(variation.id, newFlags);
                                }}
                              />
                              <label
                                htmlFor={`${variation.id}-${flag.name}`}
                                className={`text-sm ${flag.color_class}`}
                              >
                                {flag.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}