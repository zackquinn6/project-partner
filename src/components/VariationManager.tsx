import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VariationEditor } from './VariationEditor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { clearAllToolVariations, clearAllMaterialVariations } from '@/utils/variationUtils';

interface VariationAttribute {
  id: string;
  name: string;
  display_name: string;
  attribute_type: string;
  values: VariationAttributeValue[];
}

interface VariationAttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  display_value: string;
  sort_order: number;
  core_item_id?: string;
}

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
  created_at?: string;
  updated_at?: string;
}

interface VariationManagerProps {
  coreItemId: string;
  itemType: 'tools' | 'materials';
  coreItemName: string;
  onVariationUpdate?: () => void;
}

export function VariationManager({ coreItemId, itemType, coreItemName, onVariationUpdate }: VariationManagerProps) {
  const [attributes, setAttributes] = useState<VariationAttribute[]>([]);
  const [variations, setVariations] = useState<VariationInstance[]>([]);
  const [editingVariation, setEditingVariation] = useState<VariationInstance | null>(null);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>('');
  const [newValueText, setNewValueText] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [variationName, setVariationName] = useState('');
  const [variationDescription, setVariationDescription] = useState('');
  const [variationSku, setVariationSku] = useState('');
  const [variationPhotoUrl, setVariationPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAttributeDialog, setShowAttributeDialog] = useState(false);
  const [showValueDialog, setShowValueDialog] = useState(false);
  const [showVariationDialog, setShowVariationDialog] = useState(false);
  
  // Common attributes that can be selected
  const [commonAttributes] = useState([
    { name: 'model', display_name: 'Model' },
    { name: 'price', display_name: 'Price' },
    { name: 'size', display_name: 'Size' },
    { name: 'color', display_name: 'Color' },
    { name: 'material', display_name: 'Material' },
    { name: 'brand', display_name: 'Brand' },
    { name: 'power_source', display_name: 'Power Source' },
    { name: 'voltage', display_name: 'Voltage' },
    { name: 'weight', display_name: 'Weight' },
    { name: 'blade_size', display_name: 'Blade Size' },
    { name: 'capacity', display_name: 'Capacity' },
    { name: 'speed', display_name: 'Speed' },
    { name: 'torque', display_name: 'Torque' },
    { name: 'length', display_name: 'Length' },
    { name: 'width', display_name: 'Width' },
    { name: 'height', display_name: 'Height' },
    { name: 'finish', display_name: 'Finish' },
    { name: 'thread_count', display_name: 'Thread Count' },
    { name: 'grade', display_name: 'Grade' },
    { name: 'type', display_name: 'Type' }
  ]);
  const [selectedCommonAttributes, setSelectedCommonAttributes] = useState<string[]>([]);

  useEffect(() => {
    fetchAttributes();
    fetchVariations();
  }, [coreItemId]);

  const fetchAttributes = async () => {
    try {
      // First, get all attributes that have values for this core item
      const { data: attributeValues, error: valuesError } = await supabase
        .from('variation_attribute_values')
        .select(`
          attribute_id,
          variation_attributes!inner (
            id,
            name,
            display_name,
            attribute_type
          )
        `)
        .eq('core_item_id', coreItemId);

      if (valuesError) throw valuesError;

      // Get unique attributes
      const uniqueAttributeIds = [...new Set(attributeValues?.map(v => v.attribute_id))];
      
      if (uniqueAttributeIds.length === 0) {
        setAttributes([]);
        return;
      }

      // Now get full attribute data with all their values for this core item
      const { data: fullAttributesData, error: fullError } = await supabase
        .from('variation_attributes')
        .select(`
          *,
          variation_attribute_values (*)
        `)
        .in('id', uniqueAttributeIds)
        .order('display_name');

      if (fullError) throw fullError;

      const formattedAttributes: VariationAttribute[] = (fullAttributesData || []).map(attr => {
        const allValues = (attr.variation_attribute_values || [])
          .filter((v: any) => v.core_item_id === coreItemId)
          .sort((a: any, b: any) => a.sort_order - b.sort_order);
        
        // If only placeholder values exist, show empty array but keep the attribute
        const nonPlaceholderValues = allValues.filter((v: any) => v.value !== '_placeholder_');
        
        return {
          id: attr.id,
          name: attr.name,
          display_name: attr.display_name,
          attribute_type: attr.attribute_type,
          values: nonPlaceholderValues.length > 0 ? nonPlaceholderValues : []
        };
      });

      setAttributes(formattedAttributes);
    } catch (error) {
      console.error('Error fetching attributes:', error);
      toast.error('Failed to fetch variation attributes');
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
      toast.error('Failed to fetch variations');
    }
  };

  const handleCreateAttribute = async () => {
    if (selectedCommonAttributes.length === 0 && !newAttributeName.trim()) {
      toast.error('Please select common attributes or enter a custom attribute name');
      return;
    }

    setLoading(true);
    try {
      const attributesToCreate = [];
      
      // Prepare selected common attributes
      for (const attrName of selectedCommonAttributes) {
        const commonAttr = commonAttributes.find(a => a.name === attrName);
        if (commonAttr) {
          attributesToCreate.push({
            name: commonAttr.name,
            display_name: commonAttr.display_name,
            attribute_type: 'text'
          });
        }
      }

      // Prepare custom attribute if provided
      if (newAttributeName.trim()) {
        attributesToCreate.push({
          name: newAttributeName.toLowerCase().replace(/\s+/g, '_'),
          display_name: newAttributeName,
          attribute_type: 'text'
        });
      }

      // Create or get attributes and associate them with the tool
      for (const attrData of attributesToCreate) {
        // First, try to insert the attribute (will be ignored if exists)
        const { data: insertedAttr, error: insertError } = await supabase
          .from('variation_attributes')
          .insert(attrData)
          .select()
          .single();

        let attributeId = insertedAttr?.id;

        // If attribute already exists, get its ID
        if (insertError && insertError.code === '23505') {
          const { data: existingAttr, error: selectError } = await supabase
            .from('variation_attributes')
            .select('id')
            .eq('name', attrData.name)
            .single();

          if (selectError) throw selectError;
          attributeId = existingAttr.id;
        } else if (insertError) {
          throw insertError;
        }

        // Now create a placeholder value to associate this attribute with the tool
        const { error: valueError } = await supabase
          .from('variation_attribute_values')
          .insert({
            attribute_id: attributeId,
            value: '_placeholder_',
            display_value: 'No values yet',
            sort_order: 999,
            core_item_id: coreItemId
          })
          .select();

        // Ignore if placeholder already exists
        if (valueError && valueError.code !== '23505') {
          throw valueError;
        }
      }

      setNewAttributeName('');
      setSelectedCommonAttributes([]);
      setShowAttributeDialog(false);
      fetchAttributes();
      fetchGlobalAttributes();
    } catch (error) {
      console.error('Error creating attribute:', error);
      toast.error('Failed to create attribute');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAttributeValue = async () => {
    if (!selectedAttributeId || !newValueText.trim()) {
      toast.error('Please select an attribute and provide a value');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('variation_attribute_values')
        .insert({
          attribute_id: selectedAttributeId,
          value: newValueText.toLowerCase().replace(/\s+/g, '_'),
          display_value: newValueText,
          sort_order: 0,
          core_item_id: coreItemId
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This attribute value already exists for this item');
          return;
        }
        throw error;
      }

      
      setNewValueText('');
      setSelectedAttributeId('');
      setShowValueDialog(false);
      fetchAttributes();
    } catch (error) {
      console.error('Error creating attribute value:', error);
      toast.error('Failed to create attribute value');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVariation = async () => {
    if (!variationName.trim() || Object.keys(selectedAttributes).length === 0) {
      toast.error('Variation name and at least one attribute are required');
      return;
    }

    setLoading(true);
    try {
      const { data: variationData, error } = await supabase
        .from('variation_instances')
        .insert({
          core_item_id: coreItemId,
          item_type: itemType,
          name: variationName,
          description: variationDescription || null,
          sku: variationSku || null,
          photo_url: variationPhotoUrl || null,
          attributes: selectedAttributes
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('A variation with this name already exists');
          return;
        }
        throw error;
      }

      // If this is a tool variation, trigger price scraping
      if (itemType === 'tools' && variationData) {
        try {
          await supabase.functions.invoke('scrape-tool-pricing', {
            body: {
              variation_id: variationData.id,
              tool_name: coreItemName,
              brand: selectedAttributes.brand || selectedAttributes.manufacturer,
              model: selectedAttributes.model || selectedAttributes.model_number
            }
          });
          toast.success('Variation created and price scraping started');
        } catch (scrapeError) {
          console.error('Price scraping failed:', scrapeError);
          toast.success('Variation created (price scraping failed)');
        }
      } else {
        toast.success('Variation created successfully');
      }
      
      setVariationName('');
      setVariationDescription('');
      setVariationSku('');
      setVariationPhotoUrl('');
      setSelectedAttributes({});
      setShowVariationDialog(false);
      fetchVariations();
      onVariationUpdate?.();
    } catch (error) {
      console.error('Error creating variation:', error);
      toast.error('Failed to create variation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVariation = async (variationId: string) => {
    if (!confirm('Are you sure you want to delete this variation?')) return;

    try {
      const { error } = await supabase
        .from('variation_instances')
        .delete()
        .eq('id', variationId);

      if (error) throw error;

      
      fetchVariations();
      onVariationUpdate?.();
    } catch (error) {
      console.error('Error deleting variation:', error);
      toast.error('Failed to delete variation');
    }
  };

  const handleDeleteAttribute = async (attributeId: string) => {
    if (!confirm('Are you sure you want to delete this attribute? This will also delete all its values.')) return;

    try {
      // Delete values first
      await supabase
        .from('variation_attribute_values')
        .delete()
        .eq('attribute_id', attributeId)
        .eq('core_item_id', coreItemId);

      // Then delete attribute if no other core items use it
      const { data: otherValues } = await supabase
        .from('variation_attribute_values')
        .select('id')
        .eq('attribute_id', attributeId)
        .neq('core_item_id', coreItemId);

      if (!otherValues || otherValues.length === 0) {
        await supabase
          .from('variation_attributes')
          .delete()
          .eq('id', attributeId);
      }

      
      fetchAttributes();
    } catch (error) {
      console.error('Error deleting attribute:', error);
      toast.error('Failed to delete attribute');
    }
  };

  const handleDeleteAttributeValue = async (valueId: string) => {
    if (!confirm('Are you sure you want to delete this attribute value?')) return;

    try {
      const { error } = await supabase
        .from('variation_attribute_values')
        .delete()
        .eq('id', valueId);

      if (error) throw error;

      
      fetchAttributes();
    } catch (error) {
      console.error('Error deleting attribute value:', error);
      toast.error('Failed to delete attribute value');
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${coreItemId}-${Date.now()}.${fileExt}`;
      const filePath = `variations/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('library-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('library-photos')
        .getPublicUrl(filePath);

      setVariationPhotoUrl(publicUrl);
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const generateVariationName = () => {
    const attributeStrings = Object.entries(selectedAttributes).map(([attrName, valueKey]) => {
      const attribute = attributes.find(a => a.name === attrName);
      const value = attribute?.values.find(v => v.value === valueKey);
      return value?.display_value || valueKey;
    });
    
    // Common acronyms that should remain in all caps
    const acronyms = [
      'CFM', 'PSI', 'RPM', 'GPM', 'BTU', 'HP', 'AC', 'DC', 'LED', 'LCD', 
      'USB', 'WIFI', 'GPS', 'GPS', 'ABS', 'PVC', 'HVAC', 'DIY', 'EMF',
      'UV', 'IR', 'RF', 'AM', 'FM', 'TV', 'DVD', 'CD', 'MP3', 'HD',
      'UHD', '4K', '8K', 'AI', 'API', 'CPU', 'GPU', 'RAM', 'SSD', 'HDD',
      'AWG', 'NM', 'MM', 'CM', 'KG', 'LB', 'OZ', 'FT', 'IN', 'YD',
      'V', 'A', 'W', 'KW', 'MW', 'GW', 'HZ', 'KHZ', 'MHZ', 'GHZ'
    ];
    
    // Enhanced title case function that preserves acronyms
    const toTitleCaseWithAcronyms = (str: string) => {
      return str.replace(/\w+/g, (word) => {
        const upperWord = word.toUpperCase();
        // Check if this word is a known acronym
        if (acronyms.includes(upperWord)) {
          return upperWord;
        }
        // Otherwise, apply normal title case
        return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
      });
    };
    
    const generatedName = toTitleCaseWithAcronyms(`${attributeStrings.join(' ')} ${coreItemName}`);
    setVariationName(generatedName);
  };

  // Get all global attributes for the add value dialog
  const [globalAttributes, setGlobalAttributes] = useState<VariationAttribute[]>([]);

  const fetchGlobalAttributes = async () => {
    try {
      const { data, error } = await supabase
        .from('variation_attributes')
        .select('*')
        .order('display_name');

      if (error) throw error;
      setGlobalAttributes((data || []).map(attr => ({
        ...attr,
        values: []
      })));
    } catch (error) {
      console.error('Error fetching global attributes:', error);
    }
  };

  React.useEffect(() => {
    fetchGlobalAttributes();
  }, []);

  return (
    <div className="space-y-6">
      {/* Manage Attributes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            Variation Attributes
            <div className="space-x-2">
              <Dialog open={showAttributeDialog} onOpenChange={setShowAttributeDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Attribute
                  </Button>
                </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Attribute</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Common Attributes</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                          {commonAttributes.map(attr => (
                            <div key={attr.name} className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant={selectedCommonAttributes.includes(attr.name) ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  setSelectedCommonAttributes(prev => 
                                    prev.includes(attr.name) 
                                      ? prev.filter(a => a !== attr.name)
                                      : [...prev, attr.name]
                                  );
                                }}
                                className="flex-1 justify-start"
                              >
                                <Plus className={`h-3 w-3 mr-2 ${selectedCommonAttributes.includes(attr.name) ? 'rotate-45' : ''}`} />
                                {attr.display_name}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="attr-name">Or Create Custom Attribute</Label>
                        <Input
                          id="attr-name"
                          value={newAttributeName}
                          onChange={(e) => setNewAttributeName(e.target.value)}
                          placeholder="e.g., Custom Property"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => {
                          setShowAttributeDialog(false);
                          setSelectedCommonAttributes([]);
                          setNewAttributeName('');
                        }}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateAttribute} disabled={loading}>
                          Create Attributes
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
              </Dialog>

              <Dialog open={showValueDialog} onOpenChange={setShowValueDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Value
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Attribute Value</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="select-attr">Attribute</Label>
                      <Select value={selectedAttributeId} onValueChange={setSelectedAttributeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select attribute" />
                        </SelectTrigger>
                        <SelectContent>
                          {attributes.map(attr => (
                            <SelectItem key={attr.id} value={attr.id}>
                              {attr.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="value-text">Value</Label>
                      <Input
                        id="value-text"
                        value={newValueText}
                        onChange={(e) => setNewValueText(e.target.value)}
                        placeholder="e.g., 10 inch"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowValueDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateAttributeValue} disabled={loading}>
                        Add Value
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attributes.map(attr => (
              <div key={attr.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{attr.display_name}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAttribute(attr.id)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {attr.values.map(value => (
                    <div key={value.id} className="flex items-center">
                      <Badge variant="secondary" className="text-xs">
                        {value.display_value}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAttributeValue(value.id)}
                        className="h-4 w-4 p-0 ml-1 text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {attr.values.length === 0 && (
                    <span className="text-sm text-muted-foreground">No values yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Variation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            Variations for {coreItemName}
            <div className="flex items-center space-x-2">
              <Dialog open={showVariationDialog} onOpenChange={setShowVariationDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs">
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Variation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Attribute Selection */}
                  <div className="space-y-3">
                    <Label>Select Attributes</Label>
                    {attributes.filter(attr => attr.values.length > 0).map(attr => (
                      <div key={attr.id} className="space-y-2">
                        <Label className="text-sm font-medium">{attr.display_name}</Label>
                        <Select
                          value={selectedAttributes[attr.name] || ''}
                          onValueChange={(value) => {
                            setSelectedAttributes(prev => ({
                              ...prev,
                              [attr.name]: value
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${attr.display_name.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {attr.values.map(value => (
                              <SelectItem key={value.id} value={value.value}>
                                {value.display_value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    {attributes.filter(attr => attr.values.length > 0).length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No attributes with values available. Create attribute values first.
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="var-name">Variation Name</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="var-name"
                        value={variationName}
                        onChange={(e) => setVariationName(e.target.value)}
                        placeholder="Enter variation name"
                      />
                      <Button variant="outline" onClick={generateVariationName} disabled={Object.keys(selectedAttributes).length === 0}>
                        Auto-generate
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="var-desc">Description (Optional)</Label>
                    <Input
                      id="var-desc"
                      value={variationDescription}
                      onChange={(e) => setVariationDescription(e.target.value)}
                      placeholder="Additional description"
                    />
                  </div>

                  <div>
                    <Label htmlFor="var-sku">Recommended Model Names (Optional)</Label>
                    <Input
                      id="var-sku"
                      value={variationSku}
                      onChange={(e) => setVariationSku(e.target.value)}
                      placeholder="Product SKU or model number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="var-photo">Photo (Optional)</Label>
                    <div className="space-y-2">
                      <Input
                        id="var-photo"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={loading}
                      />
                      {variationPhotoUrl && (
                        <div className="flex items-center space-x-2">
                          <img
                            src={variationPhotoUrl}
                            alt="Variation preview"
                            className="h-16 w-16 object-cover rounded-md"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setVariationPhotoUrl('')}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowVariationDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateVariation} disabled={loading}>
                      Create Variation
                    </Button>
                  </div>
                </div>
              </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-4">
                {variations.map(variation => (
                <div key={variation.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex flex-1 space-x-3">
                    {variation.photo_url && (
                      <img
                        src={variation.photo_url}
                        alt={variation.name}
                        className="h-16 w-16 object-cover rounded-md flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{variation.name}</div>
                      {variation.description && (
                        <div className="text-sm text-muted-foreground">{variation.description}</div>
                      )}
                      {variation.sku && (
                        <div className="text-xs text-muted-foreground">SKU: {variation.sku}</div>
                      )}
                       {/* Display weight and pricing if available */}
                       <div className="flex flex-wrap gap-2 mt-2">
                         {(variation.weight_lbs || variation.estimated_weight_lbs) && (
                           <Badge variant="outline" className="text-xs">
                             Weight: {variation.weight_lbs || variation.estimated_weight_lbs} lbs
                           </Badge>
                         )}
                        {variation.estimated_rental_lifespan_days && (
                          <Badge variant="outline" className="text-xs">
                            Rental Life: {variation.estimated_rental_lifespan_days} days
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(variation.attributes).map(([key, value]) => {
                          const attr = attributes.find(a => a.name === key);
                          const attrValue = attr?.values.find(v => v.value === value);
                          return (
                            <Badge key={key} variant="outline" className="text-xs">
                              {attr?.display_name || key}: {attrValue?.display_value || value}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingVariation(variation)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteVariation(variation.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            {variations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No variations created yet. Click "Create Variation" to get started.
              </div>
            )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Variation Editor Dialog */}
      {editingVariation && (
        <VariationEditor
          open={!!editingVariation}
          onOpenChange={(open) => !open && setEditingVariation(null)}
          variation={editingVariation}
          onSave={() => {
            setEditingVariation(null);
            fetchVariations();
            onVariationUpdate?.();
          }}
        />
      )}
    </div>
  );
}