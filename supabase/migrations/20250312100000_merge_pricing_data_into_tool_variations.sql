-- Merge pricing_data into tool_variations: add pricing JSONB column and migrate data.

-- Add pricing column (array of { id, model_id, retailer, price, currency, availability_status, product_url, last_scraped_at })
ALTER TABLE tool_variations
  ADD COLUMN IF NOT EXISTS pricing jsonb DEFAULT '[]'::jsonb;

-- Migrate existing pricing_data into tool_variations.pricing (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pricing_data') THEN
    WITH pricing_by_variation AS (
      SELECT
        t.variation_instance_id AS variation_id,
        jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'model_id', p.model_id,
            'retailer', p.retailer,
            'price', p.price,
            'currency', p.currency,
            'availability_status', p.availability_status,
            'product_url', p.product_url,
            'last_scraped_at', p.last_scraped_at
          )
          ORDER BY p.retailer, p.model_id
        ) AS pricing_array
      FROM pricing_data p
      JOIN tools t ON t.id = p.model_id
      GROUP BY t.variation_instance_id
    )
    UPDATE tool_variations tv
    SET pricing = pbv.pricing_array
    FROM pricing_by_variation pbv
    WHERE tv.id = pbv.variation_id;

    DROP TABLE pricing_data;
  END IF;
END $$;
