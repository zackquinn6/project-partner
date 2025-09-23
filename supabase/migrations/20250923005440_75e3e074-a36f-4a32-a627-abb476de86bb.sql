-- Fix the ownership of the market_pricing_summary view
-- Change owner from postgres to anon role to remove security definer behavior  
ALTER VIEW public.market_pricing_summary OWNER TO anon;

-- Grant appropriate permissions
GRANT SELECT ON public.market_pricing_summary TO authenticated;
GRANT SELECT ON public.market_pricing_summary TO anon;