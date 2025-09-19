import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ExportMaterialsDataProps {
  className?: string;
}

export function ExportMaterialsData({ className = "" }: ExportMaterialsDataProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const exportData = async () => {
    setIsExporting(true);
    try {
      // Fetch all materials
      const { data: materials, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .order('item');

      if (materialsError) throw materialsError;

      // Fetch all material variations with their attributes
      const { data: variations, error: variationsError } = await supabase
        .from('variation_instances')
        .select('*')
        .eq('item_type', 'materials')
        .order('name');

      if (variationsError) throw variationsError;

      // Fetch attributes for display names
      const { data: attributes, error: attributesError } = await supabase
        .from('variation_attributes')
        .select(`
          *,
          variation_attribute_values(*)
        `);

      if (attributesError) throw attributesError;

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Materials sheet
      const materialsData = (materials || []).map(material => ({
        'Material Name': material.item,
        'Description': material.description || '',
        'Unit Size': material.unit_size || '',
        'Photo URL': material.photo_url || '',
        'Created At': new Date(material.created_at).toLocaleDateString(),
        'Updated At': new Date(material.updated_at).toLocaleDateString()
      }));

      const materialsSheet = XLSX.utils.json_to_sheet(materialsData);
      XLSX.utils.book_append_sheet(workbook, materialsSheet, 'Materials');

      // Variations sheet
      const variationsData = (variations || []).map(variation => {
        const material = materials?.find(m => m.id === variation.core_item_id);
        const attributeStrings: string[] = [];
        
        // Convert attributes object to readable format
        if (variation.attributes && typeof variation.attributes === 'object') {
          Object.entries(variation.attributes).forEach(([attrName, valueKey]) => {
            const attribute = attributes?.find(a => a.name === attrName);
            const value = attribute?.variation_attribute_values?.find((v: any) => v.value === valueKey);
            const displayName = attribute?.display_name || attrName;
            const displayValue = value?.display_value || valueKey;
            attributeStrings.push(`${displayName}: ${displayValue}`);
          });
        }

        return {
          'Material Name': material?.item || '',
          'Variation Name': variation.name,
          'Description': variation.description || '',
          'SKU/Part Numbers': variation.sku || '',
          'Attributes': attributeStrings.join('; '),
          'Estimated Weight (lbs)': variation.estimated_weight_lbs || '',
          'Warning Flags': (variation.warning_flags as string[] || []).join(', '),
          'Photo URL': variation.photo_url || '',
          'Created At': new Date(variation.created_at).toLocaleDateString(),
          'Updated At': new Date(variation.updated_at).toLocaleDateString()
        };
      });

      const variationsSheet = XLSX.utils.json_to_sheet(variationsData);
      XLSX.utils.book_append_sheet(workbook, variationsSheet, 'Material Variations');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:\-T]/g, '');
      const filename = `materials_export_${timestamp}.xlsx`;

      // Write and download file
      XLSX.writeFile(workbook, filename);
      
      toast.success(`Materials data exported successfully to ${filename}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export materials data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportData}
      disabled={isExporting}
      className={className}
    >
      <Download className="w-4 h-4 mr-1" />
      {isExporting ? 'Exporting...' : 'Export'}
    </Button>
  );
}