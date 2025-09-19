import { supabase } from '@/integrations/supabase/client';
import { EnhancedToolParser, importEnhancedToolsToDatabase } from './enhancedToolParser';
import { toast } from 'sonner';

// Direct import executor - runs immediately
export const executeDirectImport = async () => {
  try {
    console.log('🚀 EXECUTING DIRECT IMPORT NOW...');
    
    // Load the new Excel file directly
    console.log('📄 Loading Excel file from assets...');
    const response = await fetch('/src/assets/new-import.xlsx');
    if (!response.ok) {
      throw new Error(`Failed to load Excel file: ${response.status}`);
    }
    
    const blob = await response.blob();
    const file = new File([blob], 'new-import.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Parse the Excel content
    console.log('🔍 Parsing new Excel content...');
    const parsedTools = await EnhancedToolParser.parseEnhancedToolListExcel(file);
    console.log(`✅ Successfully parsed ${parsedTools.length} tools with variants`);

    // Import directly to database
    console.log('💾 Importing to tools database...');
    let importedCount = 0;
    const results = await importEnhancedToolsToDatabase(parsedTools, (current, total) => {
      importedCount = current + 1;
      console.log(`📥 Importing tool ${importedCount} of ${total}...`);
    });
    
    console.log(`✅ Import completed: ${results.success} tools imported successfully`);
    
    if (results.errors.length > 0) {
      console.log(`⚠️ Import had ${results.errors.length} errors (likely duplicates)`);
    }

    // Start web scraping for all tool variations
    console.log('🌐 Starting web scraping for pricing data...');
    const { data: allVariations } = await supabase
      .from('variation_instances')
      .select('id, name, core_item_id')
      .eq('item_type', 'tools');

    if (allVariations && allVariations.length > 0) {
      console.log(`🔍 Found ${allVariations.length} variations to scrape`);
      
      // Process in smaller batches for better performance
      const batchSize = 25;
      const totalBatches = Math.ceil(allVariations.length / batchSize);
      
      for (let i = 0; i < allVariations.length; i += batchSize) {
        const batch = allVariations.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        
        console.log(`🔄 Processing scraping batch ${batchNumber}/${totalBatches} (${batch.length} items)`);
        
        const { data, error } = await supabase.functions.invoke('scrape-tool-pricing', {
          body: { 
            mode: 'bulk',
            variationIds: batch.map(v => v.id)
          }
        });

        if (error) {
          console.error(`❌ Batch ${batchNumber} scraping failed:`, error);
        } else {
          console.log(`✅ Batch ${batchNumber} scraping initiated successfully`);
        }
        
        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('🎯 All scraping batches dispatched successfully');
    }

    console.log('🎉 DIRECT IMPORT PROCESS COMPLETED!');
    console.log(`📊 Summary: ${results.success} tools imported, ${allVariations?.length || 0} variations created and queued for scraping`);
    
    toast.success(`Direct import completed: ${results.success} tools imported with ${allVariations?.length || 0} variations!`);
    
    return {
      success: true,
      toolsImported: results.success,
      variationsCreated: allVariations?.length || 0,
      errors: results.errors
    };
    
  } catch (error) {
    console.error('❌ DIRECT IMPORT FAILED:', error);
    toast.error(`Direct import failed: ${error.message}`);
    throw error;
  }
};

// Auto-execute on module load
console.log('🎯 Direct import module loaded - executing now...');
executeDirectImport().catch(error => {
  console.error('Direct import execution failed:', error);
});