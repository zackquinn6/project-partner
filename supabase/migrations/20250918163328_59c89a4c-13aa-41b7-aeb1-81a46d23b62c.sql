-- Fix the security definer view by recreating the market_pricing_summary view without security definer
DROP VIEW IF EXISTS public.market_pricing_summary;

-- Recreate the view without security definer (it was implicitly created as security definer)
CREATE VIEW public.market_pricing_summary AS
SELECT 
    tm.id as model_id,
    tm.variation_instance_id as variation_id,
    tm.model_name,
    tm.manufacturer,
    vi.name as variation_name,
    COUNT(pd.id) as retailer_count,
    AVG(pd.price)::DECIMAL(10,2) as average_price,
    MIN(pd.price)::DECIMAL(10,2) as min_price,
    MAX(pd.price)::DECIMAL(10,2) as max_price,
    MAX(pd.last_scraped_at) as last_updated
FROM public.tool_models tm
LEFT JOIN public.pricing_data pd ON tm.id = pd.model_id
LEFT JOIN public.variation_instances vi ON tm.variation_instance_id = vi.id
WHERE pd.price > 0
GROUP BY tm.id, tm.variation_instance_id, tm.model_name, tm.manufacturer, vi.name;