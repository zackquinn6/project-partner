import * as XLSX from 'xlsx';

export interface EnhancedParsedTool {
  name: string;
  description?: string;
  category?: string;
  coreToolName: string;
  variants: EnhancedToolVariant[];
}

export interface EnhancedToolVariant {
  name: string;
  attributes: Record<string, string>;
  models: ToolModel[];
  warningFlags: string[];
  estimatedRentalLifespanDays?: number;
  estimatedWeightLbs?: number;
}

export interface ToolModel {
  manufacturer?: string;
  modelName: string;
  modelNumber?: string;
  upcCode?: string;
}

export interface VariantParsingResult {
  coreToolName: string;
  size?: string;
  powerSource?: string;
  application?: string;
  toothCount?: string;
  capacity?: string;
  length?: string;
  diameter?: string;
  material?: string;
  finish?: string;
  attributes: Record<string, string>;
}

export class EnhancedToolParser {
  
  static parseVariantFromName(toolName: string): VariantParsingResult {
    const parts = toolName.split(' - ').map(p => p.trim());
    const coreToolName = parts[0];
    const attributes: Record<string, string> = {};
    
    let size: string | undefined;
    let powerSource: string | undefined;
    let application: string | undefined;
    let toothCount: string | undefined;
    let capacity: string | undefined;
    let length: string | undefined;
    let diameter: string | undefined;
    let material: string | undefined;
    let finish: string | undefined;

    // Parse each variant part
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i].toLowerCase();
      
      // Power source detection
      if (part.includes('battery') || part.includes('cordless')) {
        powerSource = 'Battery';
        attributes.powerSource = 'Battery';
      } else if (part.includes('plug-in') || part.includes('corded') || part.includes('electric')) {
        powerSource = 'Plug-in';
        attributes.powerSource = 'Plug-in';
      } else if (part.includes('gas') || part.includes('gasoline')) {
        powerSource = 'Gas';
        attributes.powerSource = 'Gas';
      }
      
      // Size/dimension detection (inches, feet, gallons, etc.)
      const sizeMatch = part.match(/(\d+[\-\d\/]*\"?(?:\s*x\s*\d+[\-\d\/]*\"?)?|\d+[\.\d]*\s*gal|\d+[\.\d]*\s*ft|\d+[\.\d]*\s*in)/i);
      if (sizeMatch) {
        size = sizeMatch[1];
        if (part.includes('gal')) attributes.capacity = sizeMatch[1];
        else if (part.includes('ft')) attributes.length = sizeMatch[1];
        else if (part.includes('"') || part.includes('in')) attributes.size = sizeMatch[1];
      }
      
      // Tooth count detection
      const toothMatch = part.match(/(\d+)\s*tooth/i);
      if (toothMatch) {
        toothCount = `${toothMatch[1]} tooth`;
        attributes.toothCount = toothMatch[1];
      }
      
      // Application/material detection
      if (part.includes('plywood')) {
        application = 'Plywood';
        attributes.application = 'Plywood';
      } else if (part.includes('concrete') || part.includes('masonry')) {
        application = 'Concrete';
        attributes.application = 'Concrete';
      } else if (part.includes('framing')) {
        application = 'Framing';
        attributes.application = 'Framing';
      } else if (part.includes('metal')) {
        application = 'Metal';
        attributes.application = 'Metal';
      } else if (part.includes('wood')) {
        application = 'Wood';
        attributes.application = 'Wood';
      } else if (part.includes('tile')) {
        application = 'Tile';
        attributes.application = 'Tile';
      } else if (part.includes('furniture')) {
        application = 'Furniture';
        attributes.application = 'Furniture';
      } else if (part.includes('countertops')) {
        application = 'Countertops';
        attributes.application = 'Countertops';
      }
      
      // Special attributes for specific tools
      if (part.includes('fine cut')) attributes.cutType = 'Fine';
      if (part.includes('ultra fine')) attributes.cutType = 'Ultra Fine';
      if (part.includes('hardie')) attributes.material = 'Hardie Board';
      if (part.includes('diamond')) attributes.material = 'Diamond';
      if (part.includes('wire brush')) attributes.type = 'Wire Brush';
      if (part.includes('flap wheel')) attributes.type = 'Flap Wheel';
      if (part.includes('grinding wheel')) attributes.type = 'Grinding Wheel';
      if (part.includes('cutoff') || part.includes('cut off')) attributes.type = 'Cutoff';
      
      // Add the raw part as an attribute if it doesn't match any pattern
      if (!sizeMatch && !toothMatch && !powerSource && !application && i === parts.length - 1) {
        attributes.specification = parts[i];
      }
    }

    return {
      coreToolName,
      size,
      powerSource,
      application,
      toothCount,
      capacity,
      length,
      diameter,
      material,
      finish,
      attributes
    };
  }

  static inferWarningFlags(toolName: string, variant: VariantParsingResult): string[] {
    const flags: string[] = [];
    const lowerName = toolName.toLowerCase();
    const lowerVariant = JSON.stringify(variant).toLowerCase();

    // Sharp tools
    if (lowerName.includes('saw') || lowerName.includes('blade') || lowerName.includes('cutter') || 
        lowerName.includes('knife') || lowerName.includes('axe') || lowerName.includes('grinder') ||
        lowerName.includes('chisel')) {
      flags.push('sharp');
    }

    // Chemical exposure
    if (lowerName.includes('paint') || lowerName.includes('stain') || lowerName.includes('chemical') ||
        lowerName.includes('solvent') || lowerName.includes('cleaner')) {
      flags.push('chemical');
    }

    // Hot surfaces
    if (lowerName.includes('torch') || lowerName.includes('welder') || lowerName.includes('heat') ||
        lowerName.includes('burner') || lowerVariant.includes('gas')) {
      flags.push('hot');
    }

    // Heavy items
    if (lowerName.includes('mixer') || lowerName.includes('compressor') || lowerName.includes('jackhammer') ||
        lowerName.includes('generator') || lowerName.includes('demo') || 
        (variant.capacity && parseFloat(variant.capacity) > 5)) {
      flags.push('heavy');
    }

    // Battery powered
    if (variant.powerSource === 'Battery' || lowerVariant.includes('battery') || lowerVariant.includes('cordless')) {
      flags.push('battery');
    }

    // Electric/gas powered
    if (variant.powerSource === 'Plug-in' || variant.powerSource === 'Gas' || 
        lowerVariant.includes('electric') || lowerVariant.includes('powered')) {
      flags.push('powered');
    }

    return [...new Set(flags)]; // Remove duplicates
  }

  static estimateRentalLifespan(toolName: string, variant: VariantParsingResult): number {
    const lowerName = toolName.toLowerCase();
    
    // High-wear consumables
    if (lowerName.includes('blade') || lowerName.includes('wheel') || lowerName.includes('bit')) {
      return 7; // 1 week
    }
    
    // Medium-wear hand tools
    if (lowerName.includes('wrench') || lowerName.includes('pliers') || lowerName.includes('hammer') ||
        lowerName.includes('screwdriver')) {
      return 180; // 6 months
    }
    
    // Power tools - battery
    if (variant.powerSource === 'Battery') {
      return 90; // 3 months
    }
    
    // Power tools - corded/gas
    if (variant.powerSource === 'Plug-in' || variant.powerSource === 'Gas') {
      return 60; // 2 months
    }
    
    // Heavy equipment
    if (lowerName.includes('compressor') || lowerName.includes('mixer') || lowerName.includes('generator')) {
      return 30; // 1 month
    }
    
    // Default
    return 90; // 3 months
  }

  static estimateWeight(toolName: string, variant: VariantParsingResult): number {
    const lowerName = toolName.toLowerCase();
    
    // Estimate based on tool type and size
    if (lowerName.includes('compressor')) {
      if (variant.capacity && parseFloat(variant.capacity) >= 6) return 85;
      return 35; // Smaller compressors
    }
    
    if (lowerName.includes('mixer') && lowerName.includes('cement')) {
      return 150;
    }
    
    if (lowerName.includes('chainsaw')) {
      if (lowerName.includes('pole')) return 15;
      return 12;
    }
    
    if (lowerName.includes('circular saw')) return 8.5;
    if (lowerName.includes('angle grinder')) {
      if (variant.size?.includes('7')) return 6.5;
      return 4.2;
    }
    
    if (lowerName.includes('drill')) {
      if (lowerName.includes('hammer')) return 8.5;
      return 3.5;
    }
    
    // Blade/consumables
    if (lowerName.includes('blade') || lowerName.includes('wheel') || lowerName.includes('bit')) {
      return 0.5;
    }
    
    // Hand tools
    if (lowerName.includes('wrench') || lowerName.includes('hammer') || lowerName.includes('clamp')) {
      if (variant.length && parseFloat(variant.length) > 24) return 5;
      return 2;
    }
    
    // Default estimate
    return 2.5;
  }

  static parseModelFromString(modelStr: string): ToolModel[] {
    if (!modelStr || modelStr.trim() === '') return [];
    
    const models: ToolModel[] = [];
    
    // Handle multiple models separated by newlines or numbers
    const modelLines = modelStr.split(/\n|(?:\d+\)\s*)/g).filter(line => line.trim());
    
    for (const line of modelLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Extract manufacturer and model
      const parts = trimmed.split(/\s+/);
      let manufacturer: string | undefined;
      let modelName = trimmed;
      let modelNumber: string | undefined;
      
      // Common manufacturers
      const knownManufacturers = ['DeWalt', 'Ridgid', 'Rigid', 'Klein', 'Stanley', 'Crescent', 'Husky', 'Diablo', 'Irwin', 'Anvil', 'Knipex', 'Milescraft', 'QEP'];
      
      for (const mfg of knownManufacturers) {
        if (trimmed.toLowerCase().includes(mfg.toLowerCase())) {
          manufacturer = mfg;
          // Extract model number after manufacturer
          const regex = new RegExp(`${mfg}\\s+([A-Z0-9\\-]+)`, 'i');
          const match = trimmed.match(regex);
          if (match) {
            modelNumber = match[1];
          }
          break;
        }
      }
      
      models.push({
        manufacturer,
        modelName,
        modelNumber
      });
    }
    
    return models.length > 0 ? models : [{ modelName: modelStr }];
  }

  static async parseEnhancedToolListExcel(file: File): Promise<EnhancedParsedTool[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
          
          const tools: EnhancedParsedTool[] = [];
          const toolGroups = new Map<string, EnhancedParsedTool>();
          
          // Skip header row
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row[0]) continue;
            
            const toolName = row[0].trim();
            const modelStr = row[1] || '';
            
            const variantInfo = this.parseVariantFromName(toolName);
            const coreToolName = variantInfo.coreToolName;
            
            // Get or create tool group
            if (!toolGroups.has(coreToolName)) {
              toolGroups.set(coreToolName, {
                name: coreToolName,
                coreToolName,
                category: this.inferCategory(coreToolName),
                variants: []
              });
            }
            
            const tool = toolGroups.get(coreToolName)!;
            
            // Create variant name from attributes
            const variantNameParts: string[] = [];
            if (variantInfo.size) variantNameParts.push(variantInfo.size);
            if (variantInfo.powerSource) variantNameParts.push(variantInfo.powerSource);
            if (variantInfo.application) variantNameParts.push(variantInfo.application);
            if (variantInfo.toothCount) variantNameParts.push(variantInfo.toothCount);
            
            const variantName = variantNameParts.length > 0 
              ? `${coreToolName} - ${variantNameParts.join(' - ')}`
              : coreToolName;
            
            const variant: EnhancedToolVariant = {
              name: variantName,
              attributes: variantInfo.attributes,
              models: this.parseModelFromString(modelStr),
              warningFlags: this.inferWarningFlags(toolName, variantInfo),
              estimatedRentalLifespanDays: this.estimateRentalLifespan(toolName, variantInfo),
              estimatedWeightLbs: this.estimateWeight(toolName, variantInfo)
            };
            
            tool.variants.push(variant);
          }
          
          resolve(Array.from(toolGroups.values()));
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  static inferCategory(toolName: string): string {
    const lower = toolName.toLowerCase();
    
    if (lower.includes('saw') || lower.includes('blade')) return 'Cutting Tools';
    if (lower.includes('drill') || lower.includes('bit')) return 'Drilling Tools';
    if (lower.includes('grinder') || lower.includes('sander')) return 'Grinding & Sanding';
    if (lower.includes('hammer') || lower.includes('nailer')) return 'Fastening Tools';
    if (lower.includes('wrench') || lower.includes('pliers')) return 'Hand Tools';
    if (lower.includes('compressor') || lower.includes('pump')) return 'Pneumatic Tools';
    if (lower.includes('mixer') || lower.includes('vibrator')) return 'Concrete Tools';
    if (lower.includes('brush') || lower.includes('roller')) return 'Painting Tools';
    if (lower.includes('clamp')) return 'Clamping Tools';
    if (lower.includes('measuring') || lower.includes('level')) return 'Measuring Tools';
    
    return 'General Tools';
  }
}

// Enhanced import function that creates the full database structure
export async function importEnhancedToolsToDatabase(
  tools: EnhancedParsedTool[], 
  progressCallback?: (current: number, total: number) => void
): Promise<{ success: number; errors: string[] }> {
  const { supabase } = await import('@/integrations/supabase/client');
  const results = { success: 0, errors: [] as string[] };
  
  for (let i = 0; i < tools.length; i++) {
    try {
      const tool = tools[i];
      progressCallback?.(i, tools.length);
      
      // Create or get core tool
      const { data: coreTools, error: coreError } = await supabase
        .from('tools')
        .select('id')
        .eq('item', tool.coreToolName)
        .maybeSingle();
      
      if (coreError && coreError.code !== 'PGRST116') {
        throw coreError;
      }
      
      let coreToolId: string;
      
      if (coreTools) {
        coreToolId = coreTools.id;
      } else {
        const { data: newCoreTool, error: insertError } = await supabase
          .from('tools')
          .insert({
            item: tool.coreToolName,
            description: `${tool.category} - ${tool.name}`,
            example_models: tool.variants.map(v => v.models.map(m => m.modelName).join(', ')).join('; ')
          })
          .select('id')
          .single();
        
        if (insertError) throw insertError;
        coreToolId = newCoreTool.id;
      }
      
      // Create variants
      for (const variant of tool.variants) {
        const { data: variationInstance, error: variantError } = await supabase
          .from('variation_instances')
          .insert({
            core_item_id: coreToolId,
            item_type: 'tools',
            name: variant.name,
            description: `${Object.entries(variant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
            attributes: variant.attributes,
            warning_flags: variant.warningFlags,
            estimated_rental_lifespan_days: variant.estimatedRentalLifespanDays,
            estimated_weight_lbs: variant.estimatedWeightLbs
          })
          .select('id')
          .single();
        
        if (variantError) throw variantError;
        
        // Create models for this variant
        for (const model of variant.models) {
          const { error: modelError } = await supabase
            .from('tool_models')
            .insert({
              variation_instance_id: variationInstance.id,
              model_name: model.modelName,
              manufacturer: model.manufacturer,
              model_number: model.modelNumber,
              upc_code: model.upcCode
            });
          
          if (modelError) throw modelError;
        }
      }
      
      results.success++;
    } catch (error) {
      console.error(`Error importing ${tools[i].name}:`, error);
      results.errors.push(`Failed to import ${tools[i].name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  progressCallback?.(tools.length, tools.length);
  return results;
}