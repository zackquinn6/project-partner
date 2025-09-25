-- Add Flying debris and Airborne particles warning flags
INSERT INTO public.warning_flags (name, description, icon_class, color_class, is_predefined) VALUES
('Flying debris', 'Risk of flying debris during operation', 'Shield', 'text-orange-500', true),
('Airborne particles', 'May generate airborne particles or dust', 'Wind', 'text-amber-500', true);