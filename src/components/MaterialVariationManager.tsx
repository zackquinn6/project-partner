import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  countVariationsForCoreItem,
  countMaterialVariantsForMaterial,
  fetchAttributeDefinitionsForMaterial,
  syncAttributeDefinitionsToAllMaterialVariants,
} from '@/utils/variationAttributeDefinitions';
import { MaterialVariationEditor } from './MaterialVariationEditor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';

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
  material_id?: string;
}

interface VariationInstance {
  id: string;
  material_id: string;
  name: string;
  description?: string;
  sku?: string;
  photo_url?: string;
  attributes: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

interface MaterialVariationManagerProps {
  materialId: string;
  materialName: string;
  onVariationUpdate?: () => void;
}

export function MaterialVariationManager({ materialId, materialName, onVariationUpdate }: MaterialVariationManagerProps) {
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
  }, [materialId]);

  // Reset selected attribute if it no longer exists in the updated attributes list
  useEffect(() => {
    if (selectedAttributeId && !attributes.find(attr => attr.id === selectedAttributeId)) {
      setSelectedAttributeId('');
    }
  }, [attributes]);

  const fetchAttributes = async () => {
    try {
      const defs = (await fetchAttributeDefinitionsForMaterial(
        supabase,
        materialId
      )) as any[];
      const formattedAttributes: VariationAttribute[] = defs.map((attr: any) => ({
        id: attr.id,
        name: attr.name,
        display_name: attr.display_name,
        attribute_type: attr.attribute_type,
        values: (attr.values || []).map((v: any) => ({
          id: v.id,
          attribute_id: attr.id,
          value: v.value,
          display_value: v.display_value,
          sort_order: v.sort_order,
          material_id: v.material_id
        }))
      }));

      setAttributes(formattedAttributes);
    } catch (error) {
      console.error('Error fetching attributes:', error);
      toast.error('Failed to fetch variation attributes');
    }
  };

  const fetchVariations = async () => {
    try {
      const { data, error } = await supabase
        .from('materials_variants')
        .select('*')
        .eq('material_id', materialId);

      if (error) throw error;
      setVariations((data || []).map(item => ({
        ...item,
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
      const variationCount = await countVariationsForCoreItem(supabase, materialId);
      if (variationCount === 0) {
        toast.error('Create at least one variation before defining attribute types.');
        return;
      }

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

      const defs = (await fetchAttributeDefinitionsForMaterial(
        supabase,
        materialId
      )) as any[];

      for (const attrData of attributesToCreate) {
        const existingAttr = defs.find((a: any) => a.name === attrData.name);
        if (!existingAttr) {
          defs.push({
            id: crypto.randomUUID(),
            name: attrData.name,
            display_name: attrData.display_name,
            attribute_type: attrData.attribute_type,
            values: []
          });
        }
      }

      await syncAttributeDefinitionsToAllMaterialVariants(supabase, materialId, defs);

      setNewAttributeName('');
      setSelectedCommonAttributes([]);
      setShowAttributeDialog(false);
      fetchAttributes();
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
      const variationCount = await countVariationsForCoreItem(supabase, materialId);
      if (variationCount === 0) {
        toast.error('Create at least one variation before adding attribute values.');
        return;
      }

      const defs = (await fetchAttributeDefinitionsForMaterial(
        supabase,
        materialId
      )) as any[];
      const attrIndex = defs.findIndex((a: any) => a.id === selectedAttributeId);
      if (attrIndex === -1) {
        throw new Error('Selected attribute was not found. Please refresh and try again.');
      }

      const attr = defs[attrIndex];
      const values = attr.values || [];

      const canonicalValue = newValueText.toLowerCase().replace(/\s+/g, '_');
      if (!values.some((v: any) => v.value === canonicalValue)) {
        values.push({
          id: crypto.randomUUID(),
          value: canonicalValue,
          display_value: newValueText,
          sort_order: values.length,
          material_id: materialId
        });
      }

      defs[attrIndex] = { ...attr, values };

      await syncAttributeDefinitionsToAllMaterialVariants(supabase, materialId, defs);
      
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
    if (!variationName.trim()) {
      toast.error('Variation name is required');
      return;
    }

    setLoading(true);
    try {
      const defsForNewRow = await fetchAttributeDefinitionsForMaterial(
        supabase,
        materialId
      );

      const { error } = await supabase
        .from('materials_variants')
        .insert({
          id: crypto.randomUUID(),
          material_id: materialId,
          name: variationName,
          description: variationDescription || null,
          sku: variationSku || null,
          photo_url: variationPhotoUrl || null,
          attributes: selectedAttributes,
          attribute_definitions: defsForNewRow,
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

      toast.success('Material variant created');
      
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
        .from('materials_variants')
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
      const variationCount = await countVariationsForCoreItem(supabase, materialId);
      if (variationCount === 0) {
        toast.error('No variations to update.');
        return;
      }

      const defs = (
        (await fetchAttributeDefinitionsForMaterial(supabase, materialId)) as any[]
      ).filter((a: any) => a.id !== attributeId);
      await syncAttributeDefinitionsToAllMaterialVariants(supabase, materialId, defs);

      fetchAttributes();
    } catch (error) {
      console.error('Error deleting attribute:', error);
      toast.error('Failed to delete attribute');
    }
  };

  const handleDeleteAttributeValue = async (valueId: string) => {
    if (!confirm('Are you sure you want to delete this attribute value?')) return;

    try {
      const variationCount = await countVariationsForCoreItem(supabase, materialId);
      if (variationCount === 0) {
        toast.error('No variations to update.');
        return;
      }

      const defs = (await fetchAttributeDefinitionsForMaterial(
        supabase,
        materialId
      )) as any[];
      const nextDefs = defs.map((attr: any) => ({
        ...attr,
        values: (attr.values || []).filter((v: any) => v.id !== valueId)
      }));

      await syncAttributeDefinitionsToAllMaterialVariants(supabase, materialId, nextDefs);

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
      const fileName = `${materialId}-${Date.now()}.${fileExt}`;
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
    
    // If no attributes are selected, generate a "Standard" variation name
    if (attributeStrings.length === 0) {
      const generatedName = toTitleCaseWithAcronyms(`Standard ${materialName}`);
      setVariationName(generatedName);
    } else {
      const generatedName = toTitleCaseWithAcronyms(`${attributeStrings.join(' ')} ${materialName}`);
      setVariationName(generatedName);
    }
  };

  return (
    <div className="space-y-6">
      {/* Manage Attributes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            Variation Attributes
            <div className="flex space-x-2 ml-auto pl-8">
              <Dialog open={showAttributeDialog} onOpenChange={setShowAttributeDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-3 py-1">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Attribute
                  </Button>
                </DialogTrigger>
                <DialogPortal>
                  <DialogOverlay className="z-[150]" />
                  <DialogContent className="z-[151]">
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
                </DialogPortal>
              </Dialog>

              <Dialog open={showValueDialog} onOpenChange={setShowValueDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-3 py-1">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Value
                  </Button>
                </DialogTrigger>
                <DialogPortal>
                  <DialogOverlay className="z-[150]" />
                  <DialogContent className="z-[151]">
                    <DialogHeader>
                      <DialogTitle>Add Attribute Value</DialogTitle>
                    </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="select-attr">Attribute</Label>
                      <Select 
                        key={`attr-select-${attributes.map(a => a.id).join('|')}`}
                        value={selectedAttributeId} 
                        onValueChange={setSelectedAttributeId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={attributes.length === 0 ? "No attributes available. Create an attribute first." : "Select attribute"} />
                        </SelectTrigger>
                        <SelectContent>
                          {attributes.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No attributes available. Create an attribute first.
                            </div>
                          ) : (
                            attributes.map(attr => (
                              <SelectItem key={attr.id} value={attr.id}>
                                {attr.display_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {attributes.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          You need to create an attribute before adding values. Use the "Add Attribute" button above.
                        </p>
                      )}
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
                      <Button variant="outline" onClick={() => {
                        setShowValueDialog(false);
                        setSelectedAttributeId('');
                        setNewValueText('');
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateAttributeValue} disabled={loading || !selectedAttributeId || attributes.length === 0}>
                        Add Value
                      </Button>
                    </div>
                  </div>
                </DialogContent>
                </DialogPortal>
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
            Variations for {materialName}
            <div className="flex items-center space-x-2">
              <Dialog open={showVariationDialog} onOpenChange={setShowVariationDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs">
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogPortal>
                <DialogOverlay className="z-[150]" />
                <DialogContent className="max-w-2xl z-[151]">
                  <DialogHeader>
                    <DialogTitle>Create New Variation</DialogTitle>
                  </DialogHeader>
                <div className="space-y-4">
                  {/* Attribute Selection */}
                  <div className="space-y-3">
                    <Label>Select Attributes (Optional)</Label>
                    {attributes.filter(attr => attr.values.length > 0).length > 0 ? (
                      <>
                        {/* Standard Option */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Type</Label>
                          <Select
                            value={Object.keys(selectedAttributes).length === 0 ? 'standard' : ''}
                            onValueChange={(value) => {
                              if (value === 'standard') {
                                setSelectedAttributes({});
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select variation type" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border z-50">
                              <SelectItem value="standard">Standard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Attribute Options */}
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
                              <SelectContent className="bg-background border z-50">
                                {attr.values.map(value => (
                                  <SelectItem key={value.id} value={value.value}>
                                    {value.display_value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Type</Label>
                        <Select value="standard" disabled>
                          <SelectTrigger>
                            <SelectValue placeholder="Standard (no attributes configured)" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-50">
                            <SelectItem value="standard">Standard</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-muted-foreground">
                          No attributes configured yet. This will create a standard variation.
                        </div>
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
                      <Button variant="outline" onClick={generateVariationName}>
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
              </DialogPortal>
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
                      <div className="mt-2 flex flex-wrap gap-1">
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
        <MaterialVariationEditor
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