-- Create warning flags table
CREATE TABLE public.warning_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_class TEXT,
  color_class TEXT DEFAULT 'text-yellow-500',
  is_predefined BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Insert predefined warning flags
INSERT INTO public.warning_flags (name, description, icon_class, is_predefined, created_by) VALUES
('sharp', 'Sharp edges or cutting surfaces', 'knife', true, NULL),
('chemical', 'Contains or uses hazardous chemicals', 'flask', true, NULL),
('hot', 'Generates heat or has hot surfaces', 'flame', true, NULL),
('heavy', 'Heavy item requiring lifting assistance', 'weight', true, NULL),
('battery', 'Contains lithium or other batteries', 'battery', true, NULL),
('powered', 'Electrically powered equipment', 'zap', true, NULL);

-- Create models table for actual product models
CREATE TABLE public.tool_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variation_instance_id UUID NOT NULL REFERENCES public.variation_instances(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  manufacturer TEXT,
  model_number TEXT,
  upc_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create pricing data table
CREATE TABLE public.pricing_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES public.tool_models(id) ON DELETE CASCADE,
  retailer TEXT NOT NULL,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  availability_status TEXT DEFAULT 'unknown',
  product_url TEXT,
  last_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to variation_instances table
ALTER TABLE public.variation_instances ADD COLUMN IF NOT EXISTS estimated_rental_lifespan_days INTEGER;
ALTER TABLE public.variation_instances ADD COLUMN IF NOT EXISTS estimated_weight_lbs DECIMAL(6,2);
ALTER TABLE public.variation_instances ADD COLUMN IF NOT EXISTS warning_flags TEXT[] DEFAULT '{}';

-- Create junction table for variation warning flags
CREATE TABLE public.variation_warning_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variation_instance_id UUID NOT NULL REFERENCES public.variation_instances(id) ON DELETE CASCADE,
  warning_flag_id UUID NOT NULL REFERENCES public.warning_flags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(variation_instance_id, warning_flag_id)
);

-- Create market pricing summary view
CREATE OR REPLACE VIEW public.market_pricing_summary AS
SELECT 
  m.id as model_id,
  m.model_name,
  m.manufacturer,
  vi.id as variation_id,
  vi.name as variation_name,
  COUNT(pd.id) as retailer_count,
  AVG(pd.price) as average_price,
  MIN(pd.price) as min_price,
  MAX(pd.price) as max_price,
  MAX(pd.last_scraped_at) as last_updated
FROM public.tool_models m
JOIN public.variation_instances vi ON m.variation_instance_id = vi.id
LEFT JOIN public.pricing_data pd ON m.id = pd.model_id
GROUP BY m.id, m.model_name, m.manufacturer, vi.id, vi.name;

-- Add indexes for performance
CREATE INDEX idx_tool_models_variation ON public.tool_models(variation_instance_id);
CREATE INDEX idx_pricing_data_model ON public.pricing_data(model_id);
CREATE INDEX idx_pricing_data_retailer ON public.pricing_data(retailer);
CREATE INDEX idx_variation_warning_flags_variation ON public.variation_warning_flags(variation_instance_id);
CREATE INDEX idx_variation_instances_core_item ON public.variation_instances(core_item_id);

-- Enable RLS
ALTER TABLE public.warning_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variation_warning_flags ENABLE ROW LEVEL SECURITY;

-- RLS policies for warning_flags
CREATE POLICY "Everyone can view warning flags" ON public.warning_flags FOR SELECT USING (true);
CREATE POLICY "Admins can manage warning flags" ON public.warning_flags FOR ALL USING (is_admin(auth.uid()));

-- RLS policies for tool_models
CREATE POLICY "Everyone can view tool models" ON public.tool_models FOR SELECT USING (true);
CREATE POLICY "Admins can manage tool models" ON public.tool_models FOR ALL USING (is_admin(auth.uid()));

-- RLS policies for pricing_data
CREATE POLICY "Everyone can view pricing data" ON public.pricing_data FOR SELECT USING (true);
CREATE POLICY "Admins can manage pricing data" ON public.pricing_data FOR ALL USING (is_admin(auth.uid()));

-- RLS policies for variation_warning_flags
CREATE POLICY "Everyone can view variation warning flags" ON public.variation_warning_flags FOR SELECT USING (true);
CREATE POLICY "Admins can manage variation warning flags" ON public.variation_warning_flags FOR ALL USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_warning_flags_updated_at BEFORE UPDATE ON public.warning_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tool_models_updated_at BEFORE UPDATE ON public.tool_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pricing_data_updated_at BEFORE UPDATE ON public.pricing_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get average market price for a variation
CREATE OR REPLACE FUNCTION public.get_average_market_price(variation_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE sql
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