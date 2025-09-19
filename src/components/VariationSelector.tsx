import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

interface VariationAttribute {
  id: string;
  name: string;
  display_name: string;
  values: VariationAttributeValue[];
}

interface VariationAttributeValue {
  id: string;
  value: string;
  display_value: string;
}

interface VariationInstance {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  attributes: Record<string, string>;
}

interface SelectedVariation {
  variationId?: string;
  coreItemId: string;
  itemType: 'tools' | 'materials';
  name: string;
  attributes: Record<string, string>;
  isPrime: boolean;
  alternateToolId?: string;
}

interface VariationSelectorProps {
  coreItemId: string;
  itemType: 'tools' | 'materials';
  coreItemName: string;
  onVariationSelect: (variation: SelectedVariation) => void;
  selectedVariation?: SelectedVariation;
  allowPrimeToggle?: boolean;
  compact?: boolean;
  availableAlternateTools?: Array<{id: string; name: string}>;
}

export function VariationSelector({ 
  coreItemId, 
  itemType, 
  coreItemName, 
  onVariationSelect,
  selectedVariation,
  allowPrimeToggle = false,
  compact = false,
  availableAlternateTools = []
}: VariationSelectorProps) {
  const [attributes, setAttributes] = useState<VariationAttribute[]>([]);
  const [variations, setVariations] = useState<VariationInstance[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [matchingVariation, setMatchingVariation] = useState<VariationInstance | null>(null);
  const [isPrime, setIsPrime] = useState(selectedVariation?.isPrime ?? true);
  const [selectedAlternateTool, setSelectedAlternateTool] = useState<string>('');

  useEffect(() => {
    fetchAttributes();
    fetchVariations();
  }, [coreItemId]);

  useEffect(() => {
    if (selectedVariation) {
      setSelectedAttributes(selectedVariation.attributes);
      setIsPrime(selectedVariation.isPrime);
    }
  }, [selectedVariation]);

  useEffect(() => {
    // Find matching variation when attributes change
    if (Object.keys(selectedAttributes).length > 0) {
      const matching = variations.find(v => {
        return Object.keys(selectedAttributes).every(key => 
          v.attributes[key] === selectedAttributes[key]
        );
      });
      setMatchingVariation(matching || null);
    } else {
      setMatchingVariation(null);
    }
  }, [selectedAttributes, variations]);

  const fetchAttributes = async () => {
    try {
      // First get all variation instances for this item to see what attributes actually exist
      const { data: variationsData, error: variationsError } = await supabase
        .from('variation_instances')
        .select('attributes')
        .eq('core_item_id', coreItemId)
        .eq('item_type', itemType);

      if (variationsError) throw variationsError;

      // Extract unique attribute keys from existing variations
      const existingAttributeKeys = new Set<string>();
      (variationsData || []).forEach(variation => {
        if (variation.attributes) {
          Object.keys(variation.attributes).forEach(key => {
            existingAttributeKeys.add(key);
          });
        }
      });

      // Only fetch attributes that actually exist for this item
      const { data: attributesData, error } = await supabase
        .from('variation_attributes')
        .select(`
          *,
          variation_attribute_values (*)
        `)
        .in('name', Array.from(existingAttributeKeys))
        .order('display_name');

      if (error) throw error;

      const formattedAttributes: VariationAttribute[] = (attributesData || []).map(attr => ({
        id: attr.id,
        name: attr.name,
        display_name: attr.display_name,
        values: (attr.variation_attribute_values || [])
          .filter((v: any) => {
            // Only show values that exist in variations for this specific item
            return (variationsData || []).some(variation => 
              variation.attributes && variation.attributes[attr.name] === v.value
            );
          })
          .map((v: any) => ({
            id: v.id,
            value: v.value,
            display_value: v.display_value
          }))
      }));

      setAttributes(formattedAttributes);
    } catch (error) {
      console.error('Error fetching attributes:', error);
    }
  };

  const fetchVariations = async () => {
    try {
      const { data, error } = await supabase
        .from('variation_instances')
        .select('*')
        .eq('core_item_id', coreItemId)
        .eq('item_type', itemType);

      if (error) throw error;
      setVariations((data || []).map(item => ({
        ...item,
        item_type: item.item_type as 'tools' | 'materials',
        attributes: item.attributes as Record<string, string>
      })));
    } catch (error) {
      console.error('Error fetching variations:', error);
    }
  };

  const handleAttributeChange = (attributeName: string, value: string) => {
    const newAttributes = { ...selectedAttributes, [attributeName]: value };
    setSelectedAttributes(newAttributes);
  };

  const handleClearAttribute = (attributeName: string) => {
    const newAttributes = { ...selectedAttributes };
    delete newAttributes[attributeName];
    setSelectedAttributes(newAttributes);
  };

  const handleSelectVariation = () => {
    const variation: SelectedVariation = {
      variationId: matchingVariation?.id,
      coreItemId,
      itemType,
      name: matchingVariation?.name || generateVariationName(),
      attributes: selectedAttributes,
      isPrime,
      alternateToolId: !isPrime ? selectedAlternateTool : undefined
    };
    onVariationSelect(variation);
  };

  const generateVariationName = () => {
    if (Object.keys(selectedAttributes).length === 0) {
      return coreItemName;
    }

    const attributeStrings = Object.entries(selectedAttributes).map(([attrName, valueKey]) => {
      const attribute = attributes.find(a => a.name === attrName);
      const value = attribute?.values.find(v => v.value === valueKey);
      return value?.display_value || valueKey;
    });
    
    // Title case function - capitalize first letter of each word
    const toTitleCase = (str: string) => {
      return str.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    };
    
    return toTitleCase(`${attributeStrings.join(' ')} ${coreItemName}`);
  };

  const getAvailableValuesForAttribute = (attributeName: string) => {
    const attribute = attributes.find(a => a.name === attributeName);
    if (!attribute) return [];

    // Filter values based on existing variations and current selections
    const otherSelections = { ...selectedAttributes };
    delete otherSelections[attributeName];

    const availableValues = attribute.values.filter(value => {
      // Check if there's a variation that matches current selections + this value
      const testAttributes = { ...otherSelections, [attributeName]: value.value };
      return variations.some(v => {
        return Object.keys(testAttributes).every(key => v.attributes[key] === testAttributes[key]);
      }) || Object.keys(otherSelections).length === 0;
    });

    return availableValues;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">{coreItemName}</div>
        
        {attributes.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {attributes.map(attr => {
              const availableValues = getAvailableValuesForAttribute(attr.name);
              if (availableValues.length === 0) return null;
              
              return (
                <div key={attr.id}>
                  <Select
                    value={selectedAttributes[attr.name] || ''}
                    onValueChange={(value) => handleAttributeChange(attr.name, value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder={attr.display_name} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableValues.map(value => (
                        <SelectItem key={value.id} value={value.value}>
                          {value.display_value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}

        {allowPrimeToggle && (
          <div className="flex items-center gap-2">
            <Button
              variant={isPrime ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPrime(true)}
            >
              Prime
            </Button>
            <Button
              variant={!isPrime ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPrime(false)}
            >
              Alternate
            </Button>
          </div>
        )}

        <Button onClick={handleSelectVariation} size="sm" className="w-full">
          Add Tool
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">{coreItemName}</h3>
            
            {/* Attribute Selection */}
            <div className="space-y-3">
              {attributes.map(attr => {
                const availableValues = getAvailableValuesForAttribute(attr.name);
                if (availableValues.length === 0) return null;
                
                return (
                  <div key={attr.id} className="space-y-1">
                    <Label className="text-sm">{attr.display_name}</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedAttributes[attr.name] || ''}
                        onValueChange={(value) => handleAttributeChange(attr.name, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${attr.display_name.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableValues.map(value => (
                            <SelectItem key={value.id} value={value.value}>
                              {value.display_value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedAttributes[attr.name] && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClearAttribute(attr.name)}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Attributes Display */}
            {Object.keys(selectedAttributes).length > 0 && (
              <div className="mt-3">
                <Label className="text-sm">Selected Configuration:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(selectedAttributes).map(([key, value]) => {
                    const attr = attributes.find(a => a.name === key);
                    const attrValue = attr?.values.find(v => v.value === value);
                    return (
                      <Badge key={key} variant="secondary">
                        {attr?.display_name}: {attrValue?.display_value || value}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variation Match Status */}
            {matchingVariation && (
              <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                <div className="text-sm text-green-800">
                  ✓ Matches existing variation: <strong>{matchingVariation.name}</strong>
                </div>
                {matchingVariation.sku && (
                  <div className="text-xs text-green-600">SKU: {matchingVariation.sku}</div>
                )}
              </div>
            )}

            {/* Prime/Alternate Toggle */}
            {allowPrimeToggle && (
              <div className="mt-3">
                <Label className="text-sm">Selection Type</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={isPrime ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsPrime(true)}
                  >
                    Prime Tool
                  </Button>
                  <Button
                    variant={!isPrime ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsPrime(false)}
                  >
                    Alternate Tool
                  </Button>
                </div>
                
                {/* Alternate Tool Selection */}
                {!isPrime && availableAlternateTools.length > 0 && (
                  <div className="mt-2">
                    <Label className="text-sm">Alternative to:</Label>
                    <Select
                      value={selectedAlternateTool}
                      onValueChange={setSelectedAlternateTool}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tool this can replace" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAlternateTools.map(tool => (
                          <SelectItem key={tool.id} value={tool.id}>
                            {tool.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Select Button */}
            <div className="mt-4">
              <Button onClick={handleSelectVariation} className="w-full">
                Add Tool
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}