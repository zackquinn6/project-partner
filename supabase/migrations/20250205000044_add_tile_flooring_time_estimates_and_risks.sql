-- Migration: Add time estimates and project risks for Tile Flooring Installation
-- Project ID: 9c04c190-9409-4eeb-98db-36426aacb39f

-- ============================================
-- PART 0: Create project_template_risks table if it doesn't exist
-- ============================================

CREATE TABLE IF NOT EXISTS public.project_template_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  risk_title TEXT NOT NULL,
  risk_description TEXT,
  likelihood TEXT CHECK (likelihood IN ('low', 'medium', 'high')),
  impact TEXT CHECK (impact IN ('low', 'medium', 'high')),
  budget_impact_low NUMERIC(10, 2),
  budget_impact_high NUMERIC(10, 2),
  schedule_impact_low_days INTEGER,
  schedule_impact_high_days INTEGER,
  mitigation_strategy TEXT,
  mitigation_cost NUMERIC(10, 2),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_template_risks_project_id ON public.project_template_risks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_template_risks_display_order ON public.project_template_risks(project_id, display_order);

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
  'Inadequate Subfloor Preparation',
  'Installing tiles on soft, uneven, damp, or structurally weak subfloor causes movement, leading to cracked tiles, lippage (uneven edges), and grout failure. Not using leveling compounds, failing to repair damaged surfaces, or ignoring moisture issues.',
  'high',
  'high',
  300.00,
  1200.00,
  2,
  5,
  'Thorough subfloor inspection before starting, use leveling compounds for uneven floors, address moisture issues, repair damaged surfaces. Budget 15-20% contingency for subfloor preparation.',
  50.00,
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
  'Poor Layout & Planning',
  'Rushing the design, not planning cuts, or relying on eyeballing leads to off-center tiles, awkward cuts around fixtures, wasted materials, and unprofessional appearance. Not dry-laying large tiles, failing to account for room symmetry, or underestimating tile needs.',
  'medium',
  'high',
  200.00,
  800.00,
  1,
  3,
  'Dry-lay tiles before installation, plan cuts and layout on paper, account for room symmetry, order 10% extra tiles. Use layout lines, spacers, and check alignment frequently.',
  0.00,
  4
),
(
  '9c04c190-9409-4eeb-98db-36426aacb39f',
  'Grouting Too Soon',
  'Applying grout before adhesive cures or without proper cleaning causes discoloration, bonding issues, and premature failure. Can lead to grout cracking, tile movement, and complete rework.',
  'medium',
  'high',
  100.00,
  600.00,
  2,
  5,
  'Wait 24-48 hours after tile installation before grouting, ensure proper adhesive cure time, clean tile surfaces thoroughly before grouting. Follow manufacturer instructions for cure times.',
  0.00,
  5
),
(
  '9c04c190-9409-4eeb-98db-36426aacb39f',
  'Incorrect Material Selection & Application',
  'Using wrong adhesive, mortar, or grout for specific tile type and setting (like wet areas) results in poor bonding, stains, discoloration, or premature failure. Wrong trowel size for adhesive coverage, improper mixing ratios, or skipping proper curing/sealing.',
  'medium',
  'high',
  150.00,
  700.00,
  1,
  4,
  'Select materials appropriate for tile type and installation area (wet vs dry), use correct trowel size for proper coverage, follow mixing ratios precisely, allow proper curing time. Consult manufacturer specifications.',
  25.00,
  6
),
(
  '9c04c190-9409-4eeb-98db-36426aacb39f',
  'Tool Failure or Damage',
  'Wet saw or other critical tools break during project, causing delays and additional rental costs',
  'low',
  'medium',
  100.00,
  400.00,
  0,
  1,
  'Have backup tools available, rent quality equipment from reputable suppliers, test tools before starting project',
  0.00,
  7
),
(
  '9c04c190-9409-4eeb-98db-36426aacb39f',
  'Material Shortage or Delivery Delays',
  'Insufficient materials or delivery delays causing project delays and potential work stoppage',
  'medium',
  'medium',
  0.00,
  150.00,
  1,
  4,
  'Order all materials upfront with 10% buffer, verify quantities, allow buffer time for delivery, order from multiple suppliers if needed',
  0.00,
  8
),
(
  '9c04c190-9409-4eeb-98db-36426aacb39f',
  'Weather and Temperature Issues',
  'Extreme temperatures affecting mortar curing and installation quality, leading to weak bonds and potential failure',
  'low',
  'medium',
  0.00,
  250.00,
  1,
  3,
  'Plan installation during moderate weather (50-80°F), use climate control if needed, protect work area from extreme conditions',
  50.00,
  9
),
(
  '9c04c190-9409-4eeb-98db-36426aacb39f',
  'Safety Hazards',
  'Cuts from sharp tiles, burns from cement, dust inhalation, and back strain. Can result in medical costs, work stoppage, and project delays.',
  'high',
  'medium',
  0.00,
  500.00,
  0,
  2,
  'Wear proper PPE (safety glasses, gloves, respirator, knee pads), use proper lifting techniques, ensure adequate ventilation, keep first aid kit on hand',
  75.00,
  10
);

-- ============================================
-- PART 3: Update project_challenges as summary field for kickoff
-- ============================================

UPDATE projects
SET project_challenges = 'Tile Flooring Installation presents several key challenges that require careful planning:

• Subfloor preparation is critical - soft, uneven, or damp surfaces cause tile movement and failure
• Material selection must match tile type and installation area (wet vs dry)
• Proper layout and planning prevent wasted materials and unprofessional appearance
• Adhesive and grout curing times must be respected to avoid bonding failures
• Safety hazards from sharp tiles, cement burns, and dust require proper PPE
• Weather and temperature conditions affect mortar curing and installation quality

Budget for 15-20% contingency to handle subfloor repairs, material waste, tool needs, and safety equipment. Allow extra time for subfloor preparation, proper curing phases, and careful planning.'
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

