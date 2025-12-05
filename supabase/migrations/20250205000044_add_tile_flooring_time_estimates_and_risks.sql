-- Migration: Add time estimates and project risks for Tile Flooring Installation
-- Project ID: 9c04c190-9409-4eeb-98db-36426aacb39f

-- ============================================
-- PART 1: Update time estimates for all steps (per square foot)
-- Time estimates are in hours per square foot for scaled steps
-- ============================================

-- Note: All time estimates are per square foot (scaling unit)
-- For scaled steps: time_estimate values are hours per sq ft
-- For prime steps: time_estimate values are total hours

-- Prep Phase Steps
UPDATE operation_steps
SET 
  time_estimate_low = 0.003,  -- 0.18 min = ~11 seconds per sq ft
  time_estimate_med = 0.005,  -- 0.3 min = ~18 seconds per sq ft
  time_estimate_high = 0.008  -- 0.48 min = ~29 seconds per sq ft
WHERE id IN (
  SELECT os.id
  FROM operation_steps os
  JOIN phase_operations po ON os.operation_id = po.id
  JOIN project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = '9c04c190-9409-4eeb-98db-36426aacb39f'
    AND pp.name = 'Prep'
    AND os.step_type = 'scaled'
    AND os.step_title ILIKE '%clean%'
);

-- Measure and layout steps (scaled)
UPDATE operation_steps
SET 
  time_estimate_low = 0.003,  -- 0.18 min per sq ft
  time_estimate_med = 0.005,  -- 0.3 min per sq ft
  time_estimate_high = 0.008  -- 0.48 min per sq ft
WHERE id IN (
  SELECT os.id
  FROM operation_steps os
  JOIN phase_operations po ON os.operation_id = po.id
  JOIN project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = '9c04c190-9409-4eeb-98db-36426aacb39f'
    AND os.step_type = 'scaled'
    AND (os.step_title ILIKE '%measure%' OR os.step_title ILIKE '%layout%' OR os.step_title ILIKE '%mark%')
);

-- Install Phase - Mortar/Thinset Application (scaled)
UPDATE operation_steps
SET 
  time_estimate_low = 0.05,   -- 3 min per sq ft (experienced)
  time_estimate_med = 0.08,   -- 4.8 min per sq ft (average)
  time_estimate_high = 0.12   -- 7.2 min per sq ft (beginner)
WHERE id IN (
  SELECT os.id
  FROM operation_steps os
  JOIN phase_operations po ON os.operation_id = po.id
  JOIN project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = '9c04c190-9409-4eeb-98db-36426aacb39f'
    AND os.step_type = 'scaled'
    AND (os.step_title ILIKE '%mortar%' OR os.step_title ILIKE '%thinset%' OR os.step_title ILIKE '%apply%')
);

-- Install Phase - Tile Setting (scaled) - Main installation step
UPDATE operation_steps
SET 
  time_estimate_low = 0.083,  -- 5 min per sq ft (experienced, 12x12 tiles)
  time_estimate_med = 0.125,  -- 7.5 min per sq ft (average)
  time_estimate_high = 0.25   -- 15 min per sq ft (beginner)
WHERE id IN (
  SELECT os.id
  FROM operation_steps os
  JOIN phase_operations po ON os.operation_id = po.id
  JOIN project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = '9c04c190-9409-4eeb-98db-36426aacb39f'
    AND os.step_type = 'scaled'
    AND (os.step_title ILIKE '%set%tile%' OR os.step_title ILIKE '%place%tile%' OR os.step_title ILIKE '%install%tile%')
);

-- Install Phase - Tile Cutting (per tile, but scaled by area)
-- Average 12x12 tile = 1 sq ft, so estimates are per sq ft
UPDATE operation_steps
SET 
  time_estimate_low = 0.033,  -- 2 min per sq ft (straight cuts, experienced)
  time_estimate_med = 0.05,   -- 3 min per sq ft (average)
  time_estimate_high = 0.083   -- 5 min per sq ft (complex cuts, beginner)
WHERE id IN (
  SELECT os.id
  FROM operation_steps os
  JOIN phase_operations po ON os.operation_id = po.id
  JOIN project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = '9c04c190-9409-4eeb-98db-36426aacb39f'
    AND os.step_type = 'scaled'
    AND (os.step_title ILIKE '%cut%' OR os.step_title ILIKE '%trim%')
);

-- Install Phase - Leveling and Alignment (scaled)
UPDATE operation_steps
SET 
  time_estimate_low = 0.017,  -- 1 min per sq ft
  time_estimate_med = 0.025,  -- 1.5 min per sq ft
  time_estimate_high = 0.033   -- 2 min per sq ft
WHERE id IN (
  SELECT os.id
  FROM operation_steps os
  JOIN phase_operations po ON os.operation_id = po.id
  JOIN project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = '9c04c190-9409-4eeb-98db-36426aacb39f'
    AND os.step_type = 'scaled'
    AND (os.step_title ILIKE '%level%' OR os.step_title ILIKE '%align%' OR os.step_title ILIKE '%spacer%')
);

-- Finish Phase - Grouting (scaled)
UPDATE operation_steps
SET 
  time_estimate_low = 0.05,   -- 3 min per sq ft
  time_estimate_med = 0.083,  -- 5 min per sq ft
  time_estimate_high = 0.125  -- 7.5 min per sq ft
WHERE id IN (
  SELECT os.id
  FROM operation_steps os
  JOIN phase_operations po ON os.operation_id = po.id
  JOIN project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = '9c04c190-9409-4eeb-98db-36426aacb39f'
    AND os.step_type = 'scaled'
    AND (os.step_title ILIKE '%grout%' OR os.step_title ILIKE '%fill%joint%')
);

-- Finish Phase - Sealing (scaled)
UPDATE operation_steps
SET 
  time_estimate_low = 0.017,  -- 1 min per sq ft
  time_estimate_med = 0.025,  -- 1.5 min per sq ft
  time_estimate_high = 0.033  -- 2 min per sq ft
WHERE id IN (
  SELECT os.id
  FROM operation_steps os
  JOIN phase_operations po ON os.operation_id = po.id
  JOIN project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = '9c04c190-9409-4eeb-98db-36426aacb39f'
    AND os.step_type = 'scaled'
    AND os.step_title ILIKE '%seal%'
);

-- Prime steps (non-scaling) - set total time estimates
-- These are one-time operations regardless of project size
UPDATE operation_steps
SET 
  time_estimate_low = 0.5,    -- 30 min total
  time_estimate_med = 1.0,    -- 1 hour total
  time_estimate_high = 1.5    -- 1.5 hours total
WHERE id IN (
  SELECT os.id
  FROM operation_steps os
  JOIN phase_operations po ON os.operation_id = po.id
  JOIN project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = '9c04c190-9409-4eeb-98db-36426aacb39f'
    AND os.step_type = 'prime'
    AND (os.step_title ILIKE '%plan%' OR os.step_title ILIKE '%prepare%' OR os.step_title ILIKE '%setup%')
);

-- Default for any remaining scaled steps without specific matches
UPDATE operation_steps
SET 
  time_estimate_low = 0.008,  -- 0.48 min per sq ft
  time_estimate_med = 0.017,  -- 1 min per sq ft
  time_estimate_high = 0.033  -- 2 min per sq ft
WHERE id IN (
  SELECT os.id
  FROM operation_steps os
  JOIN phase_operations po ON os.operation_id = po.id
  JOIN project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = '9c04c190-9409-4eeb-98db-36426aacb39f'
    AND os.step_type = 'scaled'
    AND (os.time_estimate_low IS NULL OR os.time_estimate_med IS NULL OR os.time_estimate_high IS NULL)
);

-- ============================================
-- PART 2: Add project risks to template_risks table
-- ============================================

-- Insert risks into project_template_risks table
-- These will be copied to project runs when users start a project

INSERT INTO public.project_template_risks (
  project_id,
  risk_title,
  risk_description,
  likelihood,
  impact,
  budget_impact_low,
  budget_impact_high,
  schedule_impact_low_days,
  schedule_impact_high_days,
  mitigation_strategy,
  mitigation_cost,
  display_order
) VALUES
(
  '9c04c190-9409-4eeb-98db-36426aacb39f',
  'Subfloor Preparation Issues',
  'Uneven or damaged subfloor requiring extensive repair before tile installation',
  'medium',
  'high',
  200.00,
  800.00,
  1,
  3,
  'Thorough inspection before starting, budget 10% contingency for subfloor repairs',
  0.00,
  1
),
(
  '9c04c190-9409-4eeb-98db-36426aacb39f',
  'Tile Breakage During Installation',
  'Tiles crack or break during cutting or installation, requiring replacement',
  'high',
  'medium',
  50.00,
  300.00,
  0,
  1,
  'Order 10% extra tiles for waste, practice cutting techniques on scrap pieces',
  0.00,
  2
),
(
  '9c04c190-9409-4eeb-98db-36426aacb39f',
  'Mortar/Thinset Curing Issues',
  'Improper mixing or application leading to weak bond, requiring removal and reinstallation',
  'low',
  'high',
  100.00,
  500.00,
  2,
  5,
  'Follow manufacturer instructions precisely, use proper mixing tools and timing',
  0.00,
  3
),
(
  '9c04c190-9409-4eeb-98db-36426aacb39f',
  'Layout and Alignment Errors',
  'Tiles not properly aligned, requiring removal and resetting',
  'medium',
  'medium',
  150.00,
  600.00,
  1,
  2,
  'Use layout lines and spacers, check alignment frequently during installation',
  0.00,
  4
),
(
  '9c04c190-9409-4eeb-98db-36426aacb39f',
  'Grouting and Sealing Problems',
  'Grout cracking, discoloration, or improper sealing requiring correction',
  'medium',
  'low',
  50.00,
  200.00,
  0,
  1,
  'Use quality grout products, follow sealing instructions carefully',
  0.00,
  5
),
(
  '9c04c190-9409-4eeb-98db-36426aacb39f',
  'Tool Failure or Damage',
  'Wet saw or other critical tools break during project',
  'low',
  'medium',
  100.00,
  400.00,
  0,
  1,
  'Have backup tools available, rent quality equipment from reputable suppliers',
  0.00,
  6
),
(
  '9c04c190-9409-4eeb-98db-36426aacb39f',
  'Material Shortage or Delivery Delays',
  'Insufficient materials or delivery delays causing project delays',
  'medium',
  'medium',
  0.00,
  100.00,
  1,
  3,
  'Order all materials upfront, verify quantities, allow buffer time for delivery',
  0.00,
  7
),
(
  '9c04c190-9409-4eeb-98db-36426aacb39f',
  'Weather and Temperature Issues',
  'Extreme temperatures affecting mortar curing and installation quality',
  'low',
  'medium',
  0.00,
  200.00,
  1,
  2,
  'Plan installation during moderate weather, use climate control if needed',
  0.00,
  8
);

-- ============================================
-- PART 3: Update project_challenges as summary field for kickoff
-- ============================================

UPDATE projects
SET project_challenges = 'Tile Flooring Installation presents several key challenges that require careful planning:

• Subfloor preparation is critical - uneven surfaces can cause tile failure
• Precise layout and alignment prevent costly corrections later
• Proper mortar mixing and curing ensure long-term durability
• Weather and temperature conditions affect installation quality
• Material waste and breakage should be anticipated (10% buffer recommended)

Budget for 10-15% contingency to handle unexpected subfloor repairs, material waste, and tool needs. Allow extra time for subfloor preparation and curing phases.'
WHERE id = '9c04c190-9409-4eeb-98db-36426aacb39f';

-- Verify updates
DO $$
DECLARE
  updated_steps_count INTEGER;
  risks_count INTEGER;
  project_name TEXT;
BEGIN
  SELECT COUNT(*) INTO updated_steps_count
  FROM operation_steps os
  JOIN phase_operations po ON os.operation_id = po.id
  JOIN project_phases pp ON po.phase_id = pp.id
  WHERE pp.project_id = '9c04c190-9409-4eeb-98db-36426aacb39f'
    AND os.time_estimate_low IS NOT NULL
    AND os.time_estimate_med IS NOT NULL
    AND os.time_estimate_high IS NOT NULL;
  
  SELECT COUNT(*) INTO risks_count
  FROM project_template_risks
  WHERE project_id = '9c04c190-9409-4eeb-98db-36426aacb39f';
  
  SELECT name INTO project_name
  FROM projects
  WHERE id = '9c04c190-9409-4eeb-98db-36426aacb39f';
  
  RAISE NOTICE 'Updated time estimates for % steps in project: %', updated_steps_count, project_name;
  RAISE NOTICE 'Inserted % template risks for project: %', risks_count, project_name;
  RAISE NOTICE 'Updated project_challenges summary field for kickoff display';
END $$;

