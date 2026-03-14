-- Instructions content for tools and variants (text, videos, photos, links).
-- Same structure as workflow step content_sections: array of { type, content, title?, ... }.

ALTER TABLE tools
  ADD COLUMN instructions jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tools.instructions IS 'Rich instructions: text, image, video, link sections (ContentSection[]).';

ALTER TABLE tool_variations
  ADD COLUMN instructions jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tool_variations.instructions IS 'Variant-specific instructions: text, image, video, link sections (ContentSection[]).';
