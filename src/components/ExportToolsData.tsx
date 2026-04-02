import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ExportToolsDataProps {
  className?: string;
}

export function ExportToolsData({ className = "" }: ExportToolsDataProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const exportData = async () => {
    setIsExporting(true);
    try {
      // Fetch all tools
      const { data: tools, error: toolsError } = await supabase
        .from('tools')
        .select('*')
        .order('name');

      if (toolsError) throw toolsError;

      // Fetch all variations with their attributes (from unified tool_variations)
      const { data: variations, error: variationsError } = await supabase
        .from('tool_variations')
        .select('*')
        .order('name');

      if (variationsError) throw variationsError;

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Tools sheet with each variant on separate rows
      const toolsWithVariants = [];
      for (const tool of tools || []) {
        const toolVariations = variations?.filter(v => v.core_item_id === tool.id) || [];
        
        if (toolVariations.length === 0) {
          // Tool with no variants
          toolsWithVariants.push({
            'Tool Name': tool.name,
            'Description': tool.description || '',
            'Variant Name': 'No variants',
            'Created At': new Date(tool.created_at).toLocaleDateString(),
            'Updated At': new Date(tool.updated_at).toLocaleDateString()
          });
        } else {
          // Each variant gets its own row
          for (const variation of toolVariations) {
            toolsWithVariants.push({
              'Tool Name': tool.name,
              'Description': tool.description || '',
              'Variant Name': variation.name,
              'Created At': new Date(tool.created_at).toLocaleDateString(),
              'Updated At': new Date(tool.updated_at).toLocaleDateString()
            });
          }
        }
      }

      const toolsSheet = XLSX.utils.json_to_sheet(toolsWithVariants);
      XLSX.utils.book_append_sheet(workbook, toolsSheet, 'Tools');

      // Variations sheet
      const variationsData = (variations || []).map(variation => {
        const tool = tools?.find(t => t.id === variation.core_item_id);
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
          'Tool Name': tool?.name || '',
          'Variation Name': variation.name,
          'Description': variation.description || '',
          'SKU/Model Numbers': variation.sku || '',
          'Attributes': attributeStrings.join('; '),
          'Weight (lbs)':
            variation.estimated_weight_lbs != null
              ? Number(variation.estimated_weight_lbs).toFixed(1)
              : '',
          'Estimated Rental Lifespan (days)': variation.estimated_rental_lifespan_days || '',
          'Warning Flags': (variation.warning_flags as string[] || []).join(', '),
          'Created At': new Date(variation.created_at).toLocaleDateString(),
          'Updated At': new Date(variation.updated_at).toLocaleDateString()
        };
      });

      const variationsSheet = XLSX.utils.json_to_sheet(variationsData);
      XLSX.utils.book_append_sheet(workbook, variationsSheet, 'Variations');

      // Models sheet — one row per variation (SKU / identity lives on tool_variations, not a separate models table)
      const modelsData = (variations || []).map((variation) => {
        const tool = tools?.find(t => t.id === variation.core_item_id);
        return {
          'Tool Name': tool?.name || '',
          'Variation Name': variation.name,
          'SKU/Model Numbers': variation.sku || '',
          'Created At': new Date(variation.created_at).toLocaleDateString(),
          'Updated At': new Date(variation.updated_at).toLocaleDateString(),
        };
      });

      const modelsSheet = XLSX.utils.json_to_sheet(modelsData);
      XLSX.utils.book_append_sheet(workbook, modelsSheet, 'Models');

      // Pricing sheet (pricing entries include model_id; variations already loaded)
      const pricingData = (variations || []).flatMap((variation) => {
        const tool = tools?.find(t => t.id === variation.core_item_id);
        const list = (variation.pricing as any[] | null) || [];
        return list.map((price: any) => ({
          'Tool Name': tool?.name || '',
          'Variation Name': variation.name,
          'Pricing key (model_id)': price.model_id ?? '',
          'Retailer': price.retailer,
          'Price': price.price ?? '',
          'Currency': price.currency ?? '',
          'Availability Status': price.availability_status ?? '',
          'Product URL': price.product_url ?? '',
          'Last Scraped': price.last_scraped_at
            ? new Date(price.last_scraped_at).toLocaleDateString()
            : '',
        }));
      });

      const pricingSheet = XLSX.utils.json_to_sheet(pricingData);
      XLSX.utils.book_append_sheet(workbook, pricingSheet, 'Pricing');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:\-T]/g, '');
      const filename = `tools_export_${timestamp}.xlsx`;

      // Write and download file
      XLSX.writeFile(workbook, filename);
      
      toast.success(`Tools data exported successfully to ${filename}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export tools data');
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