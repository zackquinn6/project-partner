import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ZillowMatch {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  homeAge: number | null;
  squareFootage: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  zillowUrl: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { address } = await req.json();

    if (!address) {
      throw new Error('Address is required');
    }

    console.log('Searching Zillow for address:', address);

    // Construct Zillow search URL
    const searchQuery = encodeURIComponent(address);
    const zillowSearchUrl = `https://www.zillow.com/homes/${searchQuery}_rb/`;

    console.log('Zillow search URL:', zillowSearchUrl);

    // Fetch Zillow search results page with enhanced headers
    const response = await fetch(zillowSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
    });

    if (!response.ok) {
      console.error(`Zillow blocked request with status: ${response.status}`);
      // Return a partial result to allow manual entry
      return new Response(
        JSON.stringify({ 
          success: true,
          blocked: true,
          matches: [{
            address: address,
            city: '',
            state: '',
            zipCode: '',
            homeAge: null,
            squareFootage: null,
            bedrooms: null,
            bathrooms: null,
            zillowUrl: zillowSearchUrl,
          }],
          message: 'Could not automatically fetch data from Zillow. Please enter details manually or try again later.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const html = await response.text();
    console.log('Received HTML response, length:', html.length);

    // Parse the HTML to extract property data
    // Zillow embeds data in JSON-LD format or in script tags
    const matches: ZillowMatch[] = [];

    // Try to find JSON-LD structured data
    const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis);
    
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          const data = JSON.parse(jsonContent);
          
          if (data['@type'] === 'SingleFamilyResidence' || data['@type'] === 'Residence') {
            const addressParts = data.address || {};
            matches.push({
              address: addressParts.streetAddress || '',
              city: addressParts.addressLocality || '',
              state: addressParts.addressRegion || '',
              zipCode: addressParts.postalCode || '',
              homeAge: data.yearBuilt ? new Date().getFullYear() - data.yearBuilt : null,
              squareFootage: data.floorSize?.value || null,
              bedrooms: data.numberOfRooms || null,
              bathrooms: data.numberOfBathroomsTotal || null,
              zillowUrl: data.url || zillowSearchUrl,
            });
          }
        } catch (e) {
          console.error('Error parsing JSON-LD:', e);
        }
      }
    }

    // Fallback: Try to extract from search results data
    if (matches.length === 0) {
      // Look for the initial data script tag that Zillow uses
      const dataMatch = html.match(/!--(\{"queryState".*?)-->/s);
      
      if (dataMatch) {
        try {
          const dataStr = dataMatch[1];
          const data = JSON.parse(dataStr);
          
          if (data.cat1?.searchResults?.listResults) {
            const results = data.cat1.searchResults.listResults;
            
            for (const result of results.slice(0, 5)) { // Limit to top 5 results
              const addr = result.address || '';
              const yearBuilt = result.hdpData?.homeInfo?.yearBuilt;
              const livingArea = result.hdpData?.homeInfo?.livingArea;
              const bedrooms = result.beds;
              const bathrooms = result.baths;
              
              matches.push({
                address: addr,
                city: result.addressCity || '',
                state: result.addressState || '',
                zipCode: result.addressZipcode || '',
                homeAge: yearBuilt ? new Date().getFullYear() - yearBuilt : null,
                squareFootage: livingArea || null,
                bedrooms: bedrooms || null,
                bathrooms: bathrooms || null,
                zillowUrl: `https://www.zillow.com${result.detailUrl || ''}`,
              });
            }
          }
        } catch (e) {
          console.error('Error parsing search results data:', e);
        }
      }
    }

    // If still no matches, try to extract from property cards in HTML
    if (matches.length === 0) {
      const cardMatches = html.match(/<article[^>]*class="[^"]*list-card[^"]*"[^>]*>.*?<\/article>/gis);
      
      if (cardMatches) {
        for (const card of cardMatches.slice(0, 5)) {
          try {
            const addressMatch = card.match(/address[^>]*>([^<]+)</i);
            const bedsMatch = card.match(/(\d+)\s*bed/i);
            const bathsMatch = card.match(/(\d+(?:\.\d+)?)\s*bath/i);
            const sqftMatch = card.match(/(\d+(?:,\d+)?)\s*sqft/i);
            const urlMatch = card.match(/href="([^"]+)"/i);
            
            if (addressMatch) {
              matches.push({
                address: addressMatch[1].trim(),
                city: '',
                state: '',
                zipCode: '',
                homeAge: null,
                squareFootage: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, '')) : null,
                bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : null,
                bathrooms: bathsMatch ? parseFloat(bathsMatch[1]) : null,
                zillowUrl: urlMatch ? `https://www.zillow.com${urlMatch[1]}` : zillowSearchUrl,
              });
            }
          } catch (e) {
            console.error('Error parsing property card:', e);
          }
        }
      }
    }

    console.log(`Found ${matches.length} potential matches`);

    return new Response(
      JSON.stringify({ 
        success: true,
        matches: matches.length > 0 ? matches : [{
          address: address,
          city: '',
          state: '',
          zipCode: '',
          homeAge: null,
          squareFootage: null,
          bedrooms: null,
          bathrooms: null,
          zillowUrl: zillowSearchUrl,
        }],
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in scrape-zillow-data:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to scrape Zillow data',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});