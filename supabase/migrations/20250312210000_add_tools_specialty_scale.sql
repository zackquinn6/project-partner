-- Add specialty scale for tools (1 = common, 2 = standard, 3 = specialty).
-- 1 = common tools, shown in quick-add when adding to library.

ALTER TABLE tools
  ADD COLUMN specialty_scale smallint NOT NULL DEFAULT 2
  CHECK (specialty_scale BETWEEN 1 AND 3);

COMMENT ON COLUMN tools.specialty_scale IS '1=common (quick-add), 2=standard, 3=specialty';
