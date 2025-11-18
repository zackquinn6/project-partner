import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

interface ParsedTool {
  name: string;
  description?: string;
  category?: string;
  variations: Array<{
    brand: string;
    model: string;
    attributes: Record<string, string>;
  }>;
}

interface ExcelRow {
  [key: string]: any;
}

export async function parseToolListExcel(file: File): Promise<ParsedTool[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with proper headers
        const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: ''
        });

        if (jsonData.length < 2) {
          throw new Error('Excel file must have at least a header row and one data row');
        }

        // Get headers from first row
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);

        // Convert to objects using headers
        const rowObjects: ExcelRow[] = dataRows.map(row => {
          const obj: ExcelRow = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });

        const tools = parseRowsToTools(rowObjects, headers);
        resolve(tools);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

function parseRowsToTools(rows: ExcelRow[], headers: string[]): ParsedTool[] {
  const toolsMap = new Map<string, ParsedTool>();

  // Identify standard columns
  const toolNameColumn = findColumn(headers, ['tool name', 'tool', 'name', 'item']);
  const descriptionColumn = findColumn(headers, ['description', 'desc']);
  const brandColumn = findColumn(headers, ['brand', 'manufacturer', 'make']);
  const modelColumn = findColumn(headers, ['model', 'model number', 'model name']);
  const categoryColumn = findColumn(headers, ['category', 'type', 'category type']);

  // Identify attribute columns (everything else)
  const attributeColumns = headers.filter(header => 
    header !== toolNameColumn && 
    header !== descriptionColumn && 
    header !== brandColumn && 
    header !== modelColumn &&
    header !== categoryColumn &&
    header.trim() !== ''
  );

  rows.forEach(row => {
    const toolName = row[toolNameColumn] || 'Unknown Tool';
    const description = row[descriptionColumn] || '';
    const brand = row[brandColumn] || 'Generic';
    const model = row[modelColumn] || 'Standard';
    const category = row[categoryColumn] || '';

    // Build attributes from remaining columns
    const attributes: Record<string, string> = {};
    attributeColumns.forEach(column => {
      const value = row[column];
      if (value && value.toString().trim()) {
        // Clean column name for attribute key
        const attributeKey = column.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '_')
          .trim();
        
        if (attributeKey) {
          attributes[attributeKey] = value.toString().trim();
        }
      }
    });

    // Get or create tool entry
    if (!toolsMap.has(toolName)) {
      toolsMap.set(toolName, {
        name: toolName,
        description: description || undefined,
        category: category || undefined,
        variations: []
      });
    }

    const tool = toolsMap.get(toolName)!;
    
    // Add variation if we have brand/model or attributes
    if (brand !== 'Generic' || model !== 'Standard' || Object.keys(attributes).length > 0) {
      tool.variations.push({
        brand,
        model,
        attributes
      });
    }
  });

  return Array.from(toolsMap.values());
}

function findColumn(headers: string[], possibleNames: string[]): string {
  for (const name of possibleNames) {
    const found = headers.find(header => 
      header.toLowerCase().includes(name.toLowerCase())
    );
    if (found) return found;
  }
  return headers[0] || ''; // Fallback to first column
}

export async function importToolsToDatabase(
  tools: ParsedTool[],
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; errors: string[] }> {
  const results = { success: 0, errors: [] as string[] };
  
  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    onProgress?.(i + 1, tools.length);
    
    try {
      // Create the core tool
      const { data: coreToolData, error: coreToolError } = await supabase
        .from('tools')
        .insert({
          name: tool.name,
          description: tool.description,
          example_models: tool.variations.length > 0 
            ? tool.variations.slice(0, 3).map(v => `${v.brand} ${v.model}`).join(', ')
            : undefined
        } as any)
        .select()
        .single();

      if (coreToolError) {
        if (coreToolError.code === '23505') {
          // Tool already exists, skip
          results.errors.push(`Tool "${tool.name}" already exists`);
          continue;
        }
        throw coreToolError;
      }

      const coreToolId = coreToolData.id;

      // Create variations if any
      if (tool.variations.length > 0) {
        for (const variation of tool.variations) {
          try {
            // Create variation instance
            const { data: variationData, error: variationError } = await supabase
              .from('variation_instances')
              .insert({
                core_item_id: coreToolId,
                item_type: 'tools',
                name: `${variation.brand} ${variation.model} ${tool.name}`,
                description: `${variation.brand} ${variation.model} variant`,
                attributes: variation.attributes
              })
              .select()
              .single();

            if (variationError) {
              if (variationError.code !== '23505') { // Ignore duplicates
                console.error('Variation error:', variationError);
              }
              continue;
            }

            // Create tool model entry
            await supabase
              .from('tool_models')
              .insert({
                variation_instance_id: variationData.id,
                model_name: `${variation.brand} ${variation.model}`,
                manufacturer: variation.brand,
                model_number: variation.model
              });

            // Create attributes and values as needed
            await createAttributesAndValues(coreToolId, variation.attributes);

          } catch (variationError) {
            console.error('Error creating variation:', variationError);
            // Don't fail the whole tool for a variation error
          }
        }
      }

      results.success++;
      
    } catch (error) {
      console.error('Error importing tool:', error);
      results.errors.push(`Failed to import "${tool.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}

async function createAttributesAndValues(coreItemId: string, attributes: Record<string, string>) {
  for (const [attrKey, attrValue] of Object.entries(attributes)) {
    if (!attrValue) continue;

    try {
      // Create or get attribute
      const { data: attrData, error: attrError } = await supabase
        .from('variation_attributes')
        .upsert({
          name: attrKey,
          display_name: attrKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          attribute_type: 'text'
        }, {
          onConflict: 'name',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (attrError) {
        console.error('Attribute error:', attrError);
        continue;
      }

      // Create attribute value
      const valueKey = attrValue.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      await supabase
        .from('variation_attribute_values')
        .upsert({
          attribute_id: attrData.id,
          value: valueKey,
          display_value: attrValue,
          core_item_id: coreItemId,
          sort_order: 0
        }, {
          onConflict: 'attribute_id,value,core_item_id',
          ignoreDuplicates: true
        });

    } catch (error) {
      console.error('Error creating attribute/value:', error);
      // Continue with other attributes
    }
  }
}