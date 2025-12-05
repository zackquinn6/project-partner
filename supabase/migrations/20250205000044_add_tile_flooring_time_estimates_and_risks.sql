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
-- PART 2: Add project risks with quantified impacts
-- ============================================

-- Update project_challenges field with comprehensive risk analysis
UPDATE projects
SET project_challenges = 'Tile Flooring Installation Project Risks:

1. SUBFLOOR PREPARATION ISSUES
   Risk: Uneven or damaged subfloor requiring extensive repair
   Budget Impact: $200-$800 for additional materials (leveling compound, plywood)
   Schedule Impact: 1-3 days delay for subfloor preparation and curing
   Mitigation: Thorough inspection before starting, budget 10% contingency

2. TILE BREAKAGE DURING INSTALLATION
   Risk: Tiles crack or break during cutting or installation
   Budget Impact: $50-$300 for replacement tiles (5-15% waste factor)
   Schedule Impact: 0.5-1 day delay for reordering and replacement
   Mitigation: Order 10% extra tiles, practice cutting techniques

3. MORTAR/THINSET CURING ISSUES
   Risk: Improper mixing or application leading to weak bond
   Budget Impact: $100-$500 for removal and reinstallation
   Schedule Impact: 2-5 days delay for removal, curing, and reinstallation
   Mitigation: Follow manufacturer instructions, use proper mixing tools

4. LAYOUT AND ALIGNMENT ERRORS
   Risk: Tiles not properly aligned, requiring removal and resetting
   Budget Impact: $150-$600 for additional materials and time
   Schedule Impact: 1-2 days delay for correction
   Mitigation: Use layout lines, check alignment frequently

5. GROUTING AND SEALING PROBLEMS
   Risk: Grout cracking, discoloration, or improper sealing
   Budget Impact: $50-$200 for grout removal and replacement
   Schedule Impact: 0.5-1 day delay for correction
   Mitigation: Use quality grout, follow sealing instructions

6. TOOL FAILURE OR DAMAGE
   Risk: Wet saw or other critical tools break during project
   Budget Impact: $100-$400 for tool rental or replacement
   Schedule Impact: 0.5-1 day delay for tool replacement
   Mitigation: Have backup tools, rent quality equipment

7. MATERIAL SHORTAGE OR DELAYS
   Risk: Insufficient materials or delivery delays
   Budget Impact: $0-$100 for expedited shipping
   Schedule Impact: 1-3 days delay for material delivery
   Mitigation: Order all materials upfront, verify quantities

8. WEATHER AND TEMPERATURE ISSUES
   Risk: Extreme temperatures affecting mortar curing
   Budget Impact: $0-$200 for climate control or delays
   Schedule Impact: 1-2 days delay for proper curing conditions
   Mitigation: Plan installation during moderate weather, use climate control if needed

TOTAL POTENTIAL BUDGET IMPACT: $650-$2,600 (13-52% of typical $5,000 project)
TOTAL POTENTIAL SCHEDULE IMPACT: 7-18 days delay on typical 2-week project'
WHERE id = '9c04c190-9409-4eeb-98db-36426aacb39f';

-- Verify updates
DO $$
DECLARE
  updated_steps_count INTEGER;
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
  
  SELECT name INTO project_name
  FROM projects
  WHERE id = '9c04c190-9409-4eeb-98db-36426aacb39f';
  
  RAISE NOTICE 'Updated time estimates for % steps in project: %', updated_steps_count, project_name;
  RAISE NOTICE 'Updated project_challenges with quantified risks';
END $$;

