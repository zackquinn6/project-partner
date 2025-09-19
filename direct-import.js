// Direct import script - Execute immediately
import { supabase } from './src/integrations/supabase/client.js';
import { EnhancedToolParser } from './src/utils/enhancedToolParser.js';
import { importEnhancedToolsToDatabase } from './src/utils/enhancedToolParser.js';

const executeDirectImport = async () => {
  try {
    console.log('🚀 DIRECT IMPORT: Starting immediate tool import...');
    
    // Load the new Excel file
    console.log('📄 Loading new Excel file...');
    const response = await fetch('/src/assets/new-import.xlsx');
    const blob = await response.blob();
    const file = new File([blob], 'new-import.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Parse the Excel file
    console.log('🔍 Parsing Excel content...');
    const parsedTools = await EnhancedToolParser.parseEnhancedToolListExcel(file);
    console.log(`✅ Parsed ${parsedTools.length} tools with variants from new file`);

    // Import to database
    console.log('💾 Importing directly to database...');
    const results = await importEnhancedToolsToDatabase(parsedTools, (current, total) => {
      console.log(`📥 Processing tool ${current + 1} of ${total}...`);
    });
    console.log(`✅ Successfully imported ${results.success} tools`);

    if (results.errors.length > 0) {
      console.log(`⚠️ ${results.errors.length} import errors occurred`);
      results.errors.forEach(error => console.log(`  - ${error}`));
    }

    // Trigger web scraping for all new variations
    console.log('🌐 Initiating web scraping for pricing and estimates...');
    const { data: variations } = await supabase
      .from('variation_instances')
      .select('id, name')
      .eq('item_type', 'tools');

    if (variations && variations.length > 0) {
      console.log(`🔍 Starting scrape for ${variations.length} tool variations...`);
      
      // Trigger scraping in batches to handle large datasets
      const batchSize = 50;
      for (let i = 0; i < variations.length; i += batchSize) {
        const batch = variations.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(variations.length/batchSize)} (${batch.length} items)`);
        
        const { data, error } = await supabase.functions.invoke('scrape-tool-pricing', {
          body: { 
            mode: 'bulk',
            variationIds: batch.map(v => v.id)
          }
        });

        if (error) {
          console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} scraping failed:`, error);
        } else {
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} scraping initiated`);
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('🎉 DIRECT IMPORT COMPLETED SUCCESSFULLY!');
    console.log(`📊 Final stats: ${results.success} tools imported, ${variations?.length || 0} variations created`);
    
  } catch (error) {
    console.error('❌ DIRECT IMPORT FAILED:', error);
    throw error;
  }
};

// Execute immediately
executeDirectImport().catch(console.error);