-- One scoring scale per risk component, so a quality score and a schedule score are
-- comparable and can feed the same Action Priority table.
--
-- Existing rows are the quality scale and are labelled as such. Safety anchors on injury
-- and code, schedule on days lost against the step's committed window, budget on dollars
-- against planned spend.

ALTER TABLE public.pfmea_scoring
  ADD COLUMN dimension text;

UPDATE public.pfmea_scoring SET dimension = 'quality' WHERE dimension IS NULL;

ALTER TABLE public.pfmea_scoring
  ALTER COLUMN dimension SET NOT NULL;

ALTER TABLE public.pfmea_scoring
  ADD CONSTRAINT pfmea_scoring_dimension_check
  CHECK (dimension IN ('quality', 'safety', 'schedule', 'budget'));

ALTER TABLE public.pfmea_scoring
  ADD CONSTRAINT pfmea_scoring_criterion_type_check
  CHECK (criterion_type IN ('severity', 'occurrence', 'detection'));

ALTER TABLE public.pfmea_scoring
  ADD CONSTRAINT pfmea_scoring_score_range CHECK (score BETWEEN 1 AND 10);

CREATE UNIQUE INDEX pfmea_scoring_dimension_criterion_score_key
  ON public.pfmea_scoring (dimension, criterion_type, score);

-- ---------------------------------------------------------------------------
-- Safety severity
-- ---------------------------------------------------------------------------
INSERT INTO public.pfmea_scoring (dimension, criterion_type, score, process_effects, quality_effects, process_examples)
VALUES
  ('safety', 'severity', 10, 'Injury needing emergency care, or a code violation that fails inspection and must be torn out', 'Work cannot be signed off', 'Contact with live service, structural member cut, fall from height'),
  ('safety', 'severity',  9, 'Injury needing medical attention, or work that violates code and cannot be certified', 'Rework plus an inspection cycle', 'Gas fitting disturbed, load-bearing element altered'),
  ('safety', 'severity',  8, 'Injury risk that requires stopping and changing method', 'Step must be replanned', 'Unsupported load overhead, ladder work at reach limit'),
  ('safety', 'severity',  7, 'Cut, burn, or sprain likely without correct protection or a second person', 'Step delayed while help is found', 'Sheet goods handled alone, blade work without a guard'),
  ('safety', 'severity',  6, 'Repeated strain or exposure that forces an unplanned break', 'Pace drops for the rest of the session', 'Sustained overhead work, poor ventilation with solvents'),
  ('safety', 'severity',  5, 'Minor cut or irritation treated on the spot', 'Short interruption', 'Skin contact with mortar, small splinter or nick'),
  ('safety', 'severity',  4, 'Discomfort that slows the work', 'Slightly slower work', 'Awkward reach, kneeling without padding'),
  ('safety', 'severity',  3, 'Mild fatigue or nuisance dust', 'No practical effect', 'Dust without a vacuum attachment'),
  ('safety', 'severity',  2, 'Noticeable but harmless', 'No effect', 'Tool noise without ear protection for short bursts'),
  ('safety', 'severity',  1, 'No safety consequence', 'No effect', 'Routine handling');

-- ---------------------------------------------------------------------------
-- Schedule severity, anchored on days lost against the step's committed window
-- ---------------------------------------------------------------------------
INSERT INTO public.pfmea_scoring (dimension, criterion_type, score, process_effects, quality_effects, process_examples)
VALUES
  ('schedule', 'severity', 10, 'Work stops until a professional or an inspection can be scheduled, weeks lost', 'Project abandoned or handed off', 'Permit rejected, specialist trade required'),
  ('schedule', 'severity',  9, 'More than two weeks lost', 'Plan rebuilt around a new finish date', 'Special-order material back-ordered'),
  ('schedule', 'severity',  8, 'One to two weeks lost', 'Downstream steps resequenced', 'Wrong material delivered, return and reorder'),
  ('schedule', 'severity',  7, 'Four to seven days lost', 'Weekend plan missed', 'Substrate must dry again before continuing'),
  ('schedule', 'severity',  6, 'Two to three days lost', 'Additional work session needed', 'Extra prep discovered after demolition'),
  ('schedule', 'severity',  5, 'One full working day lost', 'One session added', 'Tool rental returned before the work finished'),
  ('schedule', 'severity',  4, 'About half a day lost', 'Session runs long', 'Second trip for a missing fastener size'),
  ('schedule', 'severity',  3, 'Two to four hours lost', 'Finish later than planned', 'Cleanup and reset after a spill'),
  ('schedule', 'severity',  2, 'Under an hour lost', 'Barely noticeable', 'Re-cutting one piece'),
  ('schedule', 'severity',  1, 'No schedule impact', 'No effect', 'Absorbed by normal working time');

-- ---------------------------------------------------------------------------
-- Budget severity, anchored on dollars against planned spend
-- ---------------------------------------------------------------------------
INSERT INTO public.pfmea_scoring (dimension, criterion_type, score, process_effects, quality_effects, process_examples)
VALUES
  ('budget', 'severity', 10, 'Cost more than doubles, or a professional must be hired to recover the work', 'Budget no longer viable', 'Failed installation torn out and redone by a trade'),
  ('budget', 'severity',  9, 'Overrun above half of planned spend', 'Budget rebuilt', 'Full material replacement across the whole area'),
  ('budget', 'severity',  8, 'Overrun of thirty to fifty percent', 'Other work cut to pay for it', 'Substrate repair not in the original plan'),
  ('budget', 'severity',  7, 'Overrun of twenty to thirty percent', 'Contingency consumed', 'Second full box of tile plus extra setting material'),
  ('budget', 'severity',  6, 'Overrun of ten to twenty percent', 'Most of the contingency used', 'Additional tool rental period'),
  ('budget', 'severity',  5, 'Overrun of five to ten percent', 'Noticeable but absorbable', 'Replacement blade and extra fasteners'),
  ('budget', 'severity',  4, 'Overrun under five percent, one item reordered in full', 'Minor', 'One material item reordered'),
  ('budget', 'severity',  3, 'One extra material run', 'Minor', 'Extra trip for consumables'),
  ('budget', 'severity',  2, 'Small consumable overage', 'Negligible', 'Extra tube of sealant'),
  ('budget', 'severity',  1, 'No cost impact', 'No effect', 'Within planned quantities');

-- ---------------------------------------------------------------------------
-- Occurrence for the three register components.
-- Occurrence carries more weight than before because the Action Priority table is
-- occurrence-weighted, so the frequency language is explicit rather than relative.
-- ---------------------------------------------------------------------------
INSERT INTO public.pfmea_scoring
  (dimension, criterion_type, score, occurrence_frequency_scale, occurrence_time_scale, mistake_proofing_requirement, prevention_control_examples)
SELECT
  d.dimension, 'occurrence', o.score, o.frequency, o.time_scale, o.proofing, o.examples
FROM (VALUES ('safety'), ('schedule'), ('budget')) AS d(dimension)
CROSS JOIN (VALUES
  (10, 'Almost every attempt', 'Expect it this run', 'Design the step so it cannot happen', 'Change the method, not the checking'),
  ( 9, 'More than half of attempts', 'Expect it most runs', 'Design the step so it cannot happen', 'Substitute an easier approach or tool'),
  ( 8, 'About one in three attempts', 'Several times a year of similar work', 'Remove the opportunity for the error', 'Jig, template, or pre-cut material'),
  ( 7, 'About one in five attempts', 'Once or twice a year of similar work', 'Remove the opportunity for the error', 'Stop block, marked reference, staged layout'),
  ( 6, 'About one in ten attempts', 'Occasionally across similar projects', 'Make the correct action the easy one', 'Pre-measured spacers, labelled parts'),
  ( 5, 'About one in twenty attempts', 'Rarely across similar projects', 'Make the correct action the easy one', 'Written sequence followed in order'),
  ( 4, 'About one in fifty attempts', 'Seldom', 'Standard practice is sufficient', 'Normal instruction and setup'),
  ( 3, 'About one in a hundred attempts', 'Seldom', 'Standard practice is sufficient', 'Normal instruction and setup'),
  ( 2, 'About one in five hundred attempts', 'Almost never', 'Standard practice is sufficient', 'Normal instruction and setup'),
  ( 1, 'Effectively never with normal practice', 'Not expected', 'No specific control needed', 'Normal instruction and setup')
) AS o(score, frequency, time_scale, proofing, examples);

-- ---------------------------------------------------------------------------
-- Detection for the three register components.
-- Detection is deliberately the weakest lever in the Action Priority table; these notes
-- say so, so an author does not reach for another inspection first.
-- ---------------------------------------------------------------------------
INSERT INTO public.pfmea_scoring
  (dimension, criterion_type, score, failure_mode_detection, cause_detection, detection_method_guidance, typical_detection_note)
SELECT
  d.dimension, 'detection', dt.score, dt.fm_detect, dt.cause_detect, dt.guidance, dt.note
FROM (VALUES ('safety'), ('schedule'), ('budget')) AS d(dimension)
CROSS JOIN (VALUES
  (10, 'No way to notice before the consequence lands', 'Cause is invisible', 'No detection is possible; reduce occurrence instead', 'Detection cannot help here'),
  ( 9, 'Very unlikely to notice in time', 'Cause is nearly invisible', 'Reduce occurrence instead of adding a check', 'Detection cannot help much here'),
  ( 8, 'Unlikely to notice without luck', 'Cause found only by chance', 'Reduce occurrence first', 'A check here is weak'),
  ( 7, 'Visible only after the fact', 'Cause seen only in hindsight', 'Reduce occurrence first', 'A check here is weak'),
  ( 6, 'Noticeable with a deliberate check', 'Cause found by a deliberate check', 'Add the check, but prevention still matters more', 'Useful only when occurrence is already low'),
  ( 5, 'A routine check usually catches it', 'Cause usually found by routine check', 'Add the check, but prevention still matters more', 'Useful only when occurrence is already low'),
  ( 4, 'A standard check catches it', 'Cause found by standard check', 'Standard check is adequate', 'Counts only at low occurrence'),
  ( 3, 'An obvious signal makes it clear', 'Cause is obvious when present', 'Standard check is adequate', 'Counts only at low occurrence'),
  ( 2, 'Hard to miss', 'Cause is hard to miss', 'No extra check needed', 'Counts only at low occurrence'),
  ( 1, 'A hard stop or gauge prevents proceeding', 'Cause cannot pass undetected', 'Already mistake-proofed', 'Counts only at low occurrence')
) AS dt(score, fm_detect, cause_detect, guidance, note);
