-- First, let's add the warning flags table with pre-defined flags
INSERT INTO public.warning_flags (name, description, icon_class, color_class, is_predefined) VALUES
('sharp', 'Sharp edges or cutting surfaces present', 'AlertTriangle', 'text-red-500', true),
('chemical', 'Chemical exposure risk', 'Droplets', 'text-orange-500', true),
('hot', 'High temperature surfaces or exhaust', 'Flame', 'text-red-600', true),
('heavy', 'Heavy item requiring lifting assistance', 'Weight', 'text-blue-500', true),
('battery', 'Battery-powered tool requiring charged batteries', 'Battery', 'text-green-500', true),
('powered', 'Electric or gas-powered equipment', 'Zap', 'text-yellow-500', true)
ON CONFLICT (name) DO NOTHING;

-- Add columns to variation_instances for the new requirements
ALTER TABLE public.variation_instances ADD COLUMN IF NOT EXISTS estimated_rental_lifespan_days INTEGER;
ALTER TABLE public.variation_instances ADD COLUMN IF NOT EXISTS estimated_weight_lbs NUMERIC(10,2);
ALTER TABLE public.variation_instances ADD COLUMN IF NOT EXISTS warning_flags TEXT[] DEFAULT '{}';

-- Create enhanced tool models table with more detailed information
CREATE TABLE IF NOT EXISTS public.tool_models (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    variation_instance_id UUID NOT NULL REFERENCES public.variation_instances(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    manufacturer TEXT,
    model_number TEXT,
    upc_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID
);

-- Create pricing data table for market pricing information
CREATE TABLE IF NOT EXISTS public.pricing_data (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    model_id UUID NOT NULL REFERENCES public.tool_models(id) ON DELETE CASCADE,
    retailer TEXT NOT NULL,
    price NUMERIC(10,2),
    currency TEXT DEFAULT 'USD',
    availability_status TEXT DEFAULT 'unknown',
    product_url TEXT,
    last_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create market pricing summary view for easy access to pricing data
CREATE OR REPLACE VIEW public.market_pricing_summary AS
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

-- Add function to get average market price for a variation
CREATE OR REPLACE FUNCTION public.get_average_market_price(variation_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT AVG(pd.price)::DECIMAL(10,2)
  FROM public.tool_models tm
  JOIN public.pricing_data pd ON tm.id = pd.model_id
  WHERE tm.variation_instance_id = variation_id
    AND pd.price > 0;
$$;

-- Add RLS policies for tool_models
ALTER TABLE public.tool_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tool models" ON public.tool_models
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Everyone can view tool models" ON public.tool_models
FOR SELECT USING (true);

-- Add RLS policies for pricing_data
ALTER TABLE public.pricing_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pricing data" ON public.pricing_data
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Everyone can view pricing data" ON public.pricing_data
FOR SELECT USING (true);

-- Add triggers for updated_at columns
CREATE TRIGGER update_tool_models_updated_at
    BEFORE UPDATE ON public.tool_models
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_data_updated_at
    BEFORE UPDATE ON public.pricing_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();