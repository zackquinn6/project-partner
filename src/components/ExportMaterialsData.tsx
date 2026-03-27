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
        .order('name');

      if (materialsError) throw materialsError;

      const materialIds = (materials || []).map(m => m.id);
      const { data: variations, error: variationsError } =
        materialIds.length === 0
          ? { data: [] as any[], error: null }
          : await supabase
              .from('materials_variants')
              .select('*')
              .in('material_id', materialIds)
              .order('name');

      if (variationsError) throw variationsError;

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Materials sheet
      const materialsData = (materials || []).map(material => ({
        'Material Name': material.name,
        'Description': material.description || '',
        'Unit Size': material.unit || '',
        'Photo URL': material.photo_url || '',
        'Created At': new Date(material.created_at).toLocaleDateString(),
        'Updated At': new Date(material.updated_at).toLocaleDateString()
      }));

      const materialsSheet = XLSX.utils.json_to_sheet(materialsData);
      XLSX.utils.book_append_sheet(workbook, materialsSheet, 'Materials');

      // Variations sheet
      const variationsData = (variations || []).map(variation => {
        const material = materials?.find(m => m.id === variation.material_id);
        const attributeStrings: string[] = [];
        
        // Definitions are stored on each tool_variations row (kept in sync).
        if (variation.attributes && typeof variation.attributes === 'object') {
          const attributeDefinitions = (variation.attribute_definitions as any[]) || [];
          Object.entries(variation.attributes).forEach(([attrName, valueKey]) => {
            const attribute = attributeDefinitions.find((a: any) => a.name === attrName);
            const value = attribute?.values?.find((v: any) => v.value === valueKey);
            const displayName = attribute?.display_name || attrName;
            const displayValue = value?.display_value || valueKey;
            attributeStrings.push(`${displayName}: ${displayValue}`);
          });
        }

        return {
          'Material Name': material?.name || '',
          'Variation Name': variation.name,
          'Description': variation.description || '',
          'SKU/Part Numbers': variation.sku || '',
          'Attributes': attributeStrings.join('; '),
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