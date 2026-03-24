-- Populate risk register for Standard Project Foundation (is_standard = true).
-- Inserts only missing risks (by project_id + risk_title) to remain idempotent.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.is_standard = true
  ) THEN
    RAISE EXCEPTION 'Cannot seed standard risk register: no project found with is_standard = true.';
  END IF;
END;
$$;

WITH standard_project AS (
  SELECT p.id
  FROM public.projects p
  WHERE p.is_standard = true
  ORDER BY p.created_at ASC
  LIMIT 1
),
risk_seed AS (
  SELECT
    r.display_order,
    r.risk_title,
    r.risk_description,
    r.impact,
    r.likelihood,
    r.severity,
    r.mitigation_strategy,
    r.mitigation_actions
  FROM (
    VALUES
      (
        0,
        'Friend doesn''t show up on time',
        'A slow-building anxiety. You keep glancing at the clock, pacing between the window and the project area. Tools are laid out, materials ready, but the silence in the house feels louder by the minute. You start imagining the whole day slipping away.',
        'Friend / Helper',
        'medium',
        'medium',
        'Clarify schedule expectations early and reconfirm before workday.',
        '[{"action":"Clarify expectations upfront","benefit":"Sets clear arrival and start expectations."},{"action":"Account for travel time and traffic","benefit":"Builds realistic timing into the day plan."},{"action":"Confirm the night before","benefit":"Catches conflicts before setup begins."}]'::jsonb
      ),
      (
        1,
        'Friend doesn''t perform work as expected',
        'A sinking disappointment. You watch a cut go slightly off or an application go wrong, and your stomach tightens. You start mentally calculating how much rework this will cause.',
        'Friend / Helper',
        'medium',
        'high',
        'Validate capability before assigning critical tasks.',
        '[{"action":"Verify skills beforehand","benefit":"Reduces mismatch between task complexity and ability."},{"action":"Ask for photos of past work","benefit":"Provides objective proof of quality."},{"action":"Talk through similar projects and lessons learned","benefit":"Reveals practical competence and judgment."}]'::jsonb
      ),
      (
        2,
        'Friend doesn''t work continuously',
        'Frustration mixed with guilt. Breaks and distractions slow progress while you feel pressure not to come across as bossy. Momentum drops and the day slips.',
        'Friend / Helper',
        'medium',
        'medium',
        'Align on reliability and output goals before starting.',
        '[{"action":"Clarify reliability expectations","benefit":"Creates shared accountability for pace."},{"action":"Set a morning meeting","benefit":"Locks in priorities and timing for the day."},{"action":"Agree on goals for the day","benefit":"Focuses effort on concrete outcomes."}]'::jsonb
      ),
      (
        3,
        'You get injured on the project',
        'Instant regret. A sharp sting or sudden pain is followed by replaying the moment and questioning the whole project. The workspace starts to feel hazardous.',
        'Safety',
        'low',
        'high',
        'Prioritize safe methods, equipment, and fatigue management.',
        '[{"action":"Use proper safety gear","benefit":"Reduces probability and severity of injury."},{"action":"Use advanced or safer equipment","benefit":"Lowers operational risk during difficult steps."},{"action":"Take breaks to avoid fatigue","benefit":"Prevents mistakes caused by tiredness."}]'::jsonb
      ),
      (
        4,
        'Budget tracking gets lost',
        'A foggy uncertainty. Receipts are scattered, numbers do not reconcile, and spending control feels lost.',
        'Budget & Material',
        'medium',
        'high',
        'Keep a single source of truth for all spend records.',
        '[{"action":"Use a weekly reminder to log expenses","benefit":"Prevents backlog and missing transactions."},{"action":"Use one credit card for all purchases","benefit":"Centralizes spending history."},{"action":"Record cash and friend payments immediately","benefit":"Avoids untraceable gaps in totals."}]'::jsonb
      ),
      (
        5,
        'Low-quality materials',
        'A wave of regret. Warped boards, uneven tiles, or poor coverage erase the excitement of getting a deal and create worry about future repairs.',
        'Budget & Material',
        'medium',
        'high',
        'Screen material quality before committing to purchase.',
        '[{"action":"Be critical of the lowest-cost options","benefit":"Avoids false economy purchases."},{"action":"Inspect materials before buying","benefit":"Catches defects at point of sale."},{"action":"Read reviews and check return policies","benefit":"Improves confidence and recovery options."}]'::jsonb
      ),
      (
        6,
        'Underestimating project time',
        'A creeping dread as daylight fades and the room is still torn apart. Pressure rises from household timelines and unfinished space.',
        'Planning & Scope',
        'high',
        'high',
        'Plan with explicit buffers and milestone-based sequencing.',
        '[{"action":"Add 30-50% buffer time","benefit":"Absorbs variability without immediate schedule failure."},{"action":"Break the project into smaller milestones","benefit":"Improves progress tracking and recovery decisions."},{"action":"Communicate timelines with household members","benefit":"Reduces friction caused by expectation gaps."}]'::jsonb
      ),
      (
        7,
        'Discovering hidden issues (rot, wiring, plumbing)',
        'A gut punch. Opening a wall or lifting tile reveals a deeper issue and turns a planned upgrade into an unexpected crisis.',
        'Planning & Scope',
        'medium',
        'high',
        'Assume uncertainty and prepare contingency before demolition.',
        '[{"action":"Research common hidden issues for your project type","benefit":"Improves early detection and preparedness."},{"action":"Have a small contingency budget","benefit":"Allows immediate response without stalling."},{"action":"Stop and assess before rushing into fixes","benefit":"Prevents compounding damage from reactive decisions."}]'::jsonb
      ),
      (
        8,
        'Running out of materials mid-project',
        'A mix of annoyance and embarrassment when momentum stops on a half-finished area and matching stock may be uncertain.',
        'Planning & Scope',
        'medium',
        'medium',
        'Estimate conservatively and preserve product matching info.',
        '[{"action":"Buy 10-15% extra","benefit":"Covers cuts, breakage, and measurement variance."},{"action":"Keep packaging labels for matching","benefit":"Speeds reorders with correct SKU and batch details."},{"action":"Measure twice, purchase once","benefit":"Reduces quantity calculation errors."}]'::jsonb
      ),
      (
        9,
        'Using the wrong tool for the job',
        'Confusion turns to frustration as the tool binds, slips, or gives poor results. Effort shifts from execution to fighting the setup.',
        'Tool & Equipment',
        'medium',
        'medium',
        'Match each step to correct tooling before execution.',
        '[{"action":"Research required tools beforehand","benefit":"Improves readiness and task fit."},{"action":"Rent specialty tools","benefit":"Enables quality outcomes without permanent purchase."},{"action":"Watch tool-specific tutorials","benefit":"Reduces misuse risk during operation."}]'::jsonb
      ),
      (
        10,
        'Tool failure or breakdown',
        'A sudden snap, grind, or stop halts work instantly and leaves you stranded mid-task.',
        'Tool & Equipment',
        'low',
        'high',
        'Pre-check equipment condition and define backup access.',
        '[{"action":"Inspect tools before starting","benefit":"Catches wear or faults before critical use."},{"action":"Keep backup blades/bits","benefit":"Prevents avoidable stoppages from consumable failure."},{"action":"Know where to rent replacements","benefit":"Restores progress quickly after breakdown."}]'::jsonb
      ),
      (
        11,
        'Realizing the design doesn''t look as good as expected',
        'A slow disappointment when the installed color, pattern, or finish feels wrong in the actual space.',
        'Design & Quality',
        'medium',
        'medium',
        'Validate design choices in real conditions before full commit.',
        '[{"action":"Test samples in real lighting","benefit":"Prevents surprises between store and home appearance."},{"action":"Mock up layouts with tape or cardboard","benefit":"Improves confidence in spacing and visual flow."},{"action":"Get a second opinion before committing","benefit":"Introduces external perspective before irreversible steps."}]'::jsonb
      ),
      (
        12,
        'Visible imperfections after installation',
        'A crooked line, uneven spacing, or small gap becomes impossible to ignore and keeps drawing attention.',
        'Design & Quality',
        'medium',
        'medium',
        'Use precision controls and immediate correction discipline.',
        '[{"action":"Use guides, spacers, and levels","benefit":"Maintains alignment consistency."},{"action":"Slow down during precision steps","benefit":"Reduces cumulative error from rushing."},{"action":"Fix small issues immediately before they compound","benefit":"Prevents minor defects from becoming structural rework."}]'::jsonb
      ),
      (
        13,
        'Family members frustrated by the disruption',
        'You hear the sighs, see the inconvenience, and feel pressure as key spaces become temporarily unusable.',
        'Household & Life',
        'high',
        'medium',
        'Coordinate household impact with visible expectations and alternatives.',
        '[{"action":"Communicate timelines","benefit":"Aligns expectations around disruption windows."},{"action":"Create temporary alternatives (e.g., mini kitchen setup)","benefit":"Maintains baseline household function."},{"action":"Schedule work around family routines","benefit":"Reduces peak-hour conflict and stress."}]'::jsonb
      ),
      (
        14,
        'Noise complaints or neighbor frustration',
        'A knock or message about noise causes immediate embarrassment and interruption.',
        'Household & Life',
        'medium',
        'low',
        'Set clear noise etiquette and proactive communication.',
        '[{"action":"Work within reasonable hours","benefit":"Minimizes preventable complaints."},{"action":"Warn neighbors ahead of time","benefit":"Builds tolerance through advance notice."},{"action":"Use quieter tools when possible","benefit":"Lowers disturbance during sensitive periods."}]'::jsonb
      ),
      (
        15,
        'Losing motivation mid-project',
        'The unfinished area becomes a daily reminder of guilt and dread as early excitement fades.',
        'Emotional & Momentum',
        'high',
        'medium',
        'Engineer momentum through small wins and accountability.',
        '[{"action":"Break tasks into small wins","benefit":"Creates frequent completion signals that sustain effort."},{"action":"Celebrate progress","benefit":"Reinforces positive momentum."},{"action":"Set deadlines or accountability check-ins","benefit":"Adds external structure to follow-through."}]'::jsonb
      ),
      (
        16,
        'Feeling overwhelmed by complexity',
        'You hit a step you do not understand and freeze, worrying that one mistake will cause costly damage.',
        'Emotional & Momentum',
        'high',
        'high',
        'Pause execution and escalate understanding before proceeding.',
        '[{"action":"Pause and research","benefit":"Converts uncertainty into an informed next step."},{"action":"Ask for help early","benefit":"Prevents avoidable mistakes from solo troubleshooting."},{"action":"Use AI or community forums for guidance","benefit":"Provides fast, practical problem-solving support."}]'::jsonb
      )
  ) AS r(
    display_order,
    risk_title,
    risk_description,
    impact,
    likelihood,
    severity,
    mitigation_strategy,
    mitigation_actions
  )
)
INSERT INTO public.project_risks (
  project_id,
  risk_title,
  risk_description,
  impact,
  likelihood,
  severity,
  mitigation_strategy,
  mitigation_actions,
  display_order
)
SELECT
  sp.id AS project_id,
  rs.risk_title,
  rs.risk_description,
  rs.impact,
  rs.likelihood,
  rs.severity,
  rs.mitigation_strategy,
  rs.mitigation_actions,
  rs.display_order
FROM standard_project sp
JOIN risk_seed rs ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.project_risks pr
  WHERE pr.project_id = sp.id
    AND pr.risk_title = rs.risk_title
);
