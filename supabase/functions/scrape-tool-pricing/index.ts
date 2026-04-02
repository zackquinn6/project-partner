import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { verifyAdmin } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetailerScraper {
  name: string;
  scrapeUrl: (searchTerm: string) => string;
  extractPricing: (html: string) => Promise<PricingResult[]>;
}

interface PricingResult {
  price: number;
  availability: string;
  productUrl: string;
  title: string;
}

// Define scraping configurations for each retailer
const RETAILERS: RetailerScraper[] = [
  {
    name: 'Home Depot',
    scrapeUrl: (searchTerm: string) => 
      `https://www.homedepot.com/s/${encodeURIComponent(searchTerm)}?NCNI-5`,
    extractPricing: async (html: string) => {
      const results: PricingResult[] = [];
      // Basic regex extraction for Home Depot pricing
      const priceMatches = html.matchAll(/\$(\d+(?:\.\d{2})?)/g);
      const titleMatches = html.matchAll(/<span[^>]*data-testid="product-title"[^>]*>([^<]+)<\/span>/gi);
      
      let priceIndex = 0;
      for (const titleMatch of titleMatches) {
        const priceMatch = Array.from(priceMatches)[priceIndex];
        if (priceMatch && titleMatch) {
          results.push({
            price: parseFloat(priceMatch[1]),
            availability: 'Available',
            productUrl: '',
            title: titleMatch[1]
          });
          priceIndex++;
        }
        if (priceIndex >= 3) break; // Limit to first 3 results
      }
      return results;
    }
  },
  {
    name: 'Lowes',
    scrapeUrl: (searchTerm: string) => 
      `https://www.lowes.com/search?searchTerm=${encodeURIComponent(searchTerm)}`,
    extractPricing: async (html: string) => {
      const results: PricingResult[] = [];
      const priceMatches = html.matchAll(/\$(\d+(?:\.\d{2})?)/g);
      const titleMatches = html.matchAll(/product-title[^>]*>([^<]+)/gi);
      
      let priceIndex = 0;
      for (const titleMatch of titleMatches) {
        const priceMatch = Array.from(priceMatches)[priceIndex];
        if (priceMatch && titleMatch) {
          results.push({
            price: parseFloat(priceMatch[1]),
            availability: 'Available',
            productUrl: '',
            title: titleMatch[1]
          });
          priceIndex++;
        }
        if (priceIndex >= 3) break;
      }
      return results;
    }
  },
  {
    name: 'Amazon',
    scrapeUrl: (searchTerm: string) => 
      `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}&ref=nb_sb_noss`,
    extractPricing: async (html: string) => {
      const results: PricingResult[] = [];
      // Amazon has anti-scraping measures, so this is a simplified approach
      const priceMatches = html.matchAll(/\$(\d+(?:\.\d{2})?)/g);
      
      let count = 0;
      for (const match of priceMatches) {
        if (count >= 3) break;
        const price = parseFloat(match[1]);
        if (price > 0 && price < 10000) { // Reasonable price range
          results.push({
            price,
            availability: 'Available',
            productUrl: '',
            title: 'Amazon Product'
          });
          count++;
        }
      }
      return results;
    }
  },
  {
    name: 'Tractor Supply',
    scrapeUrl: (searchTerm: string) => 
      `https://www.tractorsupply.com/tsc/search/${encodeURIComponent(searchTerm)}`,
    extractPricing: async (html: string) => {
      const results: PricingResult[] = [];
      const priceMatches = html.matchAll(/\$(\d+(?:\.\d{2})?)/g);
      
      let count = 0;
      for (const match of priceMatches) {
        if (count >= 2) break;
        results.push({
          price: parseFloat(match[1]),
          availability: 'Available',
          productUrl: '',
          title: 'Tractor Supply Product'
        });
        count++;
      }
      return results;
    }
  },
  {
    name: 'Ace Hardware',
    scrapeUrl: (searchTerm: string) => 
      `https://www.acehardware.com/search?query=${encodeURIComponent(searchTerm)}`,
    extractPricing: async (html: string) => {
      const results: PricingResult[] = [];
      const priceMatches = html.matchAll(/\$(\d+(?:\.\d{2})?)/g);
      
      let count = 0;
      for (const match of priceMatches) {
        if (count >= 2) break;
        results.push({
          price: parseFloat(match[1]),
          availability: 'Available',
          productUrl: '',
          title: 'Ace Hardware Product'
        });
        count++;
      }
      return results;
    }
  },
  {
    name: 'Acme Tools',
    scrapeUrl: (searchTerm: string) => 
      `https://www.acmetools.com/search?q=${encodeURIComponent(searchTerm)}`,
    extractPricing: async (html: string) => {
      const results: PricingResult[] = [];
      const priceMatches = html.matchAll(/\$(\d+(?:\.\d{2})?)/g);
      
      let count = 0;
      for (const match of priceMatches) {
        if (count >= 2) break;
        results.push({
          price: parseFloat(match[1]),
          availability: 'Available', 
          productUrl: '',
          title: 'Acme Tools Product'
        });
        count++;
      }
      return results;
    }
  }
];

async function scrapeRetailerPricing(retailer: RetailerScraper, searchTerm: string): Promise<PricingResult[]> {
  try {
    console.log(`Scraping ${retailer.name} for: ${searchTerm}`);
    
    const url = retailer.scrapeUrl(searchTerm);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch from ${retailer.name}: ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    const results = await retailer.extractPricing(html);
    
    console.log(`Found ${results.length} results from ${retailer.name}`);
    return results;
  } catch (error) {
    console.error(`Error scraping ${retailer.name}:`, error);
    return [];
  }
}

async function estimateWeightFromWeb(searchTerm: string): Promise<number | null> {
  try {
    // Simple weight estimation based on web search results
    const response = await fetch(`https://www.google.com/search?q=${encodeURIComponent(searchTerm + ' weight specifications')}`);
    const html = await response.text();
    
    // Look for weight mentions in pounds
    const weightMatches = html.matchAll(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kg)/gi);
    const weights: number[] = [];
    
    for (const match of weightMatches) {
      let weight = parseFloat(match[1]);
      if (match[0].toLowerCase().includes('kg')) {
        weight *= 2.20462; // Convert kg to lbs
      }
      if (weight > 0.1 && weight < 500) { // Reasonable weight range
        weights.push(weight);
      }
    }
    
    if (weights.length > 0) {
      return weights.reduce((a, b) => a + b) / weights.length; // Average
    }
    
    return null;
  } catch (error) {
    console.error('Error estimating weight:', error);
    return null;
  }
}

async function estimateRentalLifespanFromWeb(searchTerm: string): Promise<number | null> {
  try {
    // Simple lifespan estimation based on tool type and web research
    const response = await fetch(`https://www.google.com/search?q=${encodeURIComponent(searchTerm + ' rental duration professional use')}`);
    const html = await response.text();
    
    // Look for duration mentions
    const durationMatches = html.matchAll(/(\d+)\s*(?:days?|weeks?|months?)/gi);
    
    for (const match of durationMatches) {
      const value = parseInt(match[1]);
      const unit = match[0].toLowerCase();
      
      if (unit.includes('day') && value <= 365) return value;
      if (unit.includes('week') && value <= 52) return value * 7;
      if (unit.includes('month') && value <= 12) return value * 30;
    }
    
    return null;
  } catch (error) {
    console.error('Error estimating rental lifespan:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await verifyAdmin(req);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { mode, variationIds, modelId, searchTerm, includeEstimates = true } = body;

    console.log(`Starting price scraping - Mode: ${mode}`);

    // Handle bulk mode processing
    if (mode === 'bulk' && variationIds) {
      console.log(`Processing ${variationIds.length} variations in bulk mode`);
      let processedCount = 0;
      
      for (const variationId of variationIds) {
        try {
          const { data: variation, error: variationError } = await supabase
            .from('tool_variations')
            .select('id, name, attributes, estimated_weight_lbs, estimated_rental_lifespan_days, core_item_id')
            .eq('id', variationId)
            .single();

          if (variationError || !variation) {
            console.log(`Skipping variation ${variationId}: ${variationError?.message || 'not found'}`);
            continue;
          }

          let coreToolName: string | null = null;
          if (variation.core_item_id) {
            const { data: toolRow } = await supabase
              .from('tools')
              .select('name')
              .eq('id', variation.core_item_id)
              .maybeSingle();
            coreToolName = toolRow?.name ?? null;
          }

          const toolSearchTerm = [coreToolName, variation.name]
            .filter((x): x is string => Boolean(x && String(x).trim()))
            .join(' ')
            .trim();

          if (!toolSearchTerm) {
            console.log(`Skipping variation ${variationId}: no name for search`);
            continue;
          }

          console.log(`Processing variation: ${toolSearchTerm}`);

          // Only estimate if not already present
          let needsWeightEstimate = !variation.estimated_weight_lbs;
          let needsLifespanEstimate = !variation.estimated_rental_lifespan_days;

          const estimates = await Promise.all([
            needsWeightEstimate ? estimateWeightFromWeb(toolSearchTerm) : Promise.resolve(null),
            needsLifespanEstimate ? estimateRentalLifespanFromWeb(toolSearchTerm) : Promise.resolve(null)
          ]);

          // Update variation with estimates only if needed
          const updateData: any = {};
          if (needsWeightEstimate && estimates[0]) updateData.estimated_weight_lbs = estimates[0];
          if (needsLifespanEstimate && estimates[1]) updateData.estimated_rental_lifespan_days = estimates[1];

          if (Object.keys(updateData).length > 0) {
            await supabase
              .from('tool_variations')
              .update(updateData)
              .eq('id', variationId);
            console.log(`Updated variation ${variationId} with estimates:`, updateData);
          }

          const pricingModelKey = variation.id;

          const retailerPromises = RETAILERS.slice(0, 3).map((retailer) =>
            scrapeRetailerPricing(retailer, toolSearchTerm)
          );

          const retailerResults = await Promise.allSettled(retailerPromises);

          for (let i = 0; i < retailerResults.length; i++) {
            const retailer = RETAILERS[i];
            const result = retailerResults[i];

            if (result.status === 'fulfilled' && result.value.length > 0) {
              const pricingResult = result.value[0];

              if (pricingResult.price > 0) {
                const { data: varRow } = await supabase
                  .from('tool_variations')
                  .select('pricing')
                  .eq('id', variationId)
                  .single();
                const pricing = (varRow?.pricing || []) as any[];
                const without = pricing.filter((p: any) =>
                  !(p.model_id === pricingModelKey && p.retailer === retailer.name)
                );
                const updated = [...without, {
                  id: crypto.randomUUID(),
                  model_id: pricingModelKey,
                  retailer: retailer.name,
                  price: pricingResult.price,
                  currency: 'USD',
                  availability_status: pricingResult.availability,
                  product_url: pricingResult.productUrl,
                  last_scraped_at: new Date().toISOString()
                }];
                await supabase
                  .from('tool_variations')
                  .update({ pricing: updated })
                  .eq('id', variationId);
                console.log(`Saved pricing for variation ${variationId}: $${pricingResult.price} from ${retailer.name}`);
              }
            }
          }

          processedCount++;
          if (processedCount % 10 === 0) {
            console.log(`Processed ${processedCount}/${variationIds.length} variations`);
          }
          
        } catch (error) {
          console.error(`Error processing variation ${variationId}:`, error);
        }
      }

      console.log(`Bulk processing completed: ${processedCount}/${variationIds.length} variations processed`);
      
      return new Response(JSON.stringify({
        success: true,
        processedCount,
        totalCount: variationIds.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const camelVariationTarget = body.variationId as string | undefined;
    const snakeVariationTarget = body.variation_id as string | undefined;
    const currentModelId = modelId as string | undefined;

    const resolvedSearchTerm = (
      typeof searchTerm === 'string' && searchTerm.trim()
        ? searchTerm.trim()
        : [body.brand, body.model, body.tool_name].filter(Boolean).map(String).join(' ').trim()
    );

    let variationRowId: string;
    let pricingModelKey: string;

    if (camelVariationTarget && currentModelId) {
      variationRowId = camelVariationTarget;
      pricingModelKey = currentModelId;
    } else if (snakeVariationTarget && !currentModelId) {
      variationRowId = snakeVariationTarget;
      pricingModelKey = snakeVariationTarget;
    } else if (snakeVariationTarget && currentModelId) {
      variationRowId = snakeVariationTarget;
      pricingModelKey = currentModelId;
    } else if (currentModelId) {
      const { data: asVar } = await supabase
        .from('tool_variations')
        .select('id')
        .eq('id', currentModelId)
        .maybeSingle();
      if (asVar) {
        variationRowId = currentModelId;
        pricingModelKey = currentModelId;
      } else {
        const { data: asTool } = await supabase
          .from('tools')
          .select('id')
          .eq('id', currentModelId)
          .maybeSingle();
        if (!asTool) {
          throw new Error('modelId is not a tools or tool_variations id');
        }
        throw new Error('Pass variationId when modelId is a catalog tools row id');
      }
    } else {
      throw new Error('modelId or variation_id is required');
    }

    if (!resolvedSearchTerm) {
      throw new Error('searchTerm (or tool_name / brand / model) is required');
    }

    console.log(
      `Starting price scrape variationRowId=${variationRowId} pricingModelKey=${pricingModelKey} search=${resolvedSearchTerm}`
    );

    const results = {
      pricingData: [] as any[],
      estimatedWeight: null as number | null,
      estimatedLifespan: null as number | null
    };

    const scrapingPromises = RETAILERS.map((retailer) =>
      scrapeRetailerPricing(retailer, resolvedSearchTerm)
    );

    const retailerResults = await Promise.allSettled(scrapingPromises);

    for (let i = 0; i < RETAILERS.length; i++) {
      const retailer = RETAILERS[i];
      const result = retailerResults[i];

      if (result.status === 'fulfilled' && result.value.length > 0) {
        const pricingResult = result.value[0];
        if (pricingResult.price > 0) {
          const { data: varRow } = await supabase
            .from('tool_variations')
            .select('pricing')
            .eq('id', variationRowId)
            .single();
          const pricing = (varRow?.pricing || []) as any[];
          const without = pricing.filter((p: any) =>
            !(p.model_id === pricingModelKey && p.retailer === retailer.name)
          );
          const updated = [...without, {
            id: crypto.randomUUID(),
            model_id: pricingModelKey,
            retailer: retailer.name,
            price: pricingResult.price,
            currency: 'USD',
            availability_status: pricingResult.availability,
            product_url: pricingResult.productUrl,
            last_scraped_at: new Date().toISOString()
          }];
          const { error: updateError } = await supabase
            .from('tool_variations')
            .update({ pricing: updated })
            .eq('id', variationRowId);
          if (!updateError) {
            results.pricingData.push({
              retailer: retailer.name,
              price: pricingResult.price,
              availability: pricingResult.availability
            });
          }
        }
      }
    }

    if (includeEstimates) {
      const [weightEstimate, lifespanEstimate] = await Promise.all([
        estimateWeightFromWeb(resolvedSearchTerm),
        estimateRentalLifespanFromWeb(resolvedSearchTerm)
      ]);

      results.estimatedWeight = weightEstimate;
      results.estimatedLifespan = lifespanEstimate;

      if (weightEstimate || lifespanEstimate) {
        const updateData: any = {};
        if (weightEstimate) updateData.estimated_weight_lbs = weightEstimate;
        if (lifespanEstimate) updateData.estimated_rental_lifespan_days = lifespanEstimate;

        await supabase
          .from('tool_variations')
          .update(updateData)
          .eq('id', variationRowId);
      }
    }

    console.log(`Completed scraping. Found ${results.pricingData.length} pricing results`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scrape-tool-pricing function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status =
      message === 'Missing authorization header' || message === 'Invalid or expired token'
        ? 401
        : message === 'Admin access required'
          ? 403
          : 500;

    return new Response(
      JSON.stringify({ 
        error: message,
        pricingData: [],
        estimatedWeight: null,
        estimatedLifespan: null
      }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});