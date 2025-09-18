import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeRequest {
  variation_id: string;
  tool_name: string;
  brand?: string;
  model?: string;
}

interface PricingData {
  retailer: string;
  price: number;
  currency: string;
  availability_status: string;
  product_url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { variation_id, tool_name, brand, model } = await req.json() as ScrapeRequest;

    if (!variation_id || !tool_name) {
      return new Response(
        JSON.stringify({ error: 'variation_id and tool_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting price scraping for: ${brand} ${model} ${tool_name}`);

    const pricingData: PricingData[] = [];
    
    // Get tool model data for more targeted search
    const { data: toolModel } = await supabase
      .from('tool_models')
      .select('*')
      .eq('variation_instance_id', variation_id)
      .single();

    // Search query combining available information
    const searchQuery = [brand, model, tool_name].filter(Boolean).join(' ');
    const manufacturerFilter = toolModel?.manufacturer || brand;
    const modelFilter = toolModel?.model_number || model;

    // Simulate scraping multiple retailers (in real implementation, these would be actual web scraping calls)
    const retailers = [
      { name: 'Home Depot', baseUrl: 'homedepot.com' },
      { name: 'Lowes', baseUrl: 'lowes.com' },
      { name: 'Amazon', baseUrl: 'amazon.com' },
      { name: 'Northern Tool', baseUrl: 'northerntool.com' }
    ];

    for (const retailer of retailers) {
      try {
        // In a real implementation, you would scrape the actual retailer websites here
        // For demo purposes, we'll simulate price data
        const simulatedPrice = await simulatePriceScraping(retailer.name, searchQuery);
        
        if (simulatedPrice) {
          pricingData.push({
            retailer: retailer.name,
            price: simulatedPrice.price,
            currency: 'USD',
            availability_status: simulatedPrice.available ? 'in_stock' : 'out_of_stock',
            product_url: `https://${retailer.baseUrl}/search?q=${encodeURIComponent(searchQuery)}`
          });
        }
      } catch (error) {
        console.error(`Error scraping ${retailer.name}:`, error);
        // Continue with other retailers even if one fails
      }
    }

    // Store pricing data in database
    if (pricingData.length > 0 && toolModel) {
      const pricingInserts = pricingData.map(data => ({
        model_id: toolModel.id,
        retailer: data.retailer,
        price: data.price,
        currency: data.currency,
        availability_status: data.availability_status,
        product_url: data.product_url,
        last_scraped_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('pricing_data')
        .upsert(pricingInserts, {
          onConflict: 'model_id,retailer',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.error('Error inserting pricing data:', insertError);
      } else {
        console.log(`Stored ${pricingData.length} pricing records`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        variation_id,
        pricing_data: pricingData,
        scraped_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrape-tool-pricing function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Simulate price scraping (replace with actual scraping logic)
async function simulatePriceScraping(retailer: string, searchQuery: string): Promise<{ price: number; available: boolean } | null> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
  
  // Simulate some retailers not having the product
  if (Math.random() < 0.3) {
    return null;
  }

  // Generate realistic price based on retailer
  const basePrices: Record<string, number> = {
    'Home Depot': 120,
    'Lowes': 118,
    'Amazon': 115,
    'Northern Tool': 125
  };

  const basePrice = basePrices[retailer] || 100;
  const priceVariation = (Math.random() - 0.5) * 0.3; // ±15% variation
  const finalPrice = Math.round(basePrice * (1 + priceVariation) * 100) / 100;

  return {
    price: finalPrice,
    available: Math.random() > 0.1 // 90% availability rate
  };
}