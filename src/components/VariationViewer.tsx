import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
}

export function VariationViewer({ open, onOpenChange, coreItemId, itemType, coreItemName }: VariationViewerProps) {
  const [variations, setVariations] = useState<VariationInstance[]>([]);
  const [attributes, setAttributes] = useState<VariationAttribute[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVariations = async () => {
    if (!coreItemId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('variation_instances')
        .select('*')
        .eq('core_item_id', coreItemId)
        .eq('item_type', itemType);

      if (error) throw error;
      console.log('Raw variations data:', data);
      const processedData = (data || []).map(item => ({
        ...item,
        item_type: item.item_type as 'tools' | 'materials',
        attributes: item.attributes as Record<string, string>
      }));
      console.log('Processed variations:', processedData);
      setVariations(processedData);
    } catch (error) {
      console.error('Error fetching variations:', error);
      toast.error('Failed to fetch variations');
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
      fetchVariations();
      fetchAttributes();
    }
  }, [open, coreItemId]);

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
    </Dialog>
  );
}