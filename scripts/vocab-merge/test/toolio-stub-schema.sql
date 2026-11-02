-- Local stand-in for the Toolio tables the toolio-export query reads (syntax and shape check only).
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku text, name text NOT NULL, parent_inventory_item_id uuid,
  product_type text, fulfillment_method text, offers_rental boolean, offers_sales boolean, lifecycle_status text,
  equipment_category_slug text, discovery_tags text[], use_cases text[], description text, updated_at timestamptz
);
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text, name text NOT NULL, description text, catalog_visibility text,
  project_kind text, content_foundation_project_id uuid, parent_id uuid, discovery_tags text[], updated_at timestamptz
);
CREATE TABLE public.project_catalog_parent_links (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), child_project_id uuid, parent_project_id uuid);
CREATE TABLE public.project_composite_members (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), composite_project_id uuid, member_project_id uuid, sort_order int);
CREATE TABLE public.ordering_sections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid, slug text, is_visible boolean, standard_section_id uuid);
CREATE TABLE public.section_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), section_id uuid, inventory_item_id uuid, package_type text, is_sales_item boolean, is_visible boolean);
CREATE TABLE public.standard_ordering_sections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text);
CREATE TABLE public.standard_section_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), standard_section_id uuid, inventory_item_id uuid, package_type text, is_sales_item boolean, is_visible boolean);
CREATE TABLE public.project_section_overrides (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid, ordering_section_id uuid, is_visible boolean);
CREATE TABLE public.project_section_item_overrides (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid, section_item_id uuid, standard_section_item_id uuid, is_visible boolean, package_type text);
CREATE TABLE public.inventory_item_variant_definitions (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.inventory_item_variant_options (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.inventory_item_relevant_models (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.ordering_customization_questions (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.ordering_customization_options (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.ordering_customization_rules (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_number bigint, project_slug text);
CREATE TABLE public.order_line_pricing (line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inventory_item_id uuid);
CREATE FUNCTION public.inventory_item_name_comparison_key(p_name text) RETURNS text LANGUAGE sql IMMUTABLE
  AS $$ SELECT lower(regexp_replace(btrim(p_name), '\s+', ' ', 'g')) $$;

INSERT INTO public.inventory_items (sku, name, product_type, discovery_tags) VALUES ('power-drill', 'Power Drill', 'product', ARRAY['drill']);
INSERT INTO public.projects (slug, name, discovery_tags) VALUES ('tile-flooring', 'Tile Flooring', ARRAY['tile']);
INSERT INTO public.orders (order_number, project_slug) VALUES (1001, 'gone-project');
