-- PFMEA reference scales: severity (S), occurrence (O), detection (D) for 1–10 scoring.
-- Home improvement / residential construction context; aligned with common FMEA practice.

CREATE TABLE public.pfmea_scoring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criterion_type text NOT NULL CHECK (criterion_type = ANY (ARRAY['severity'::text, 'occurrence'::text, 'detection'::text])),
  score smallint NOT NULL CHECK (score >= 1 AND score <= 10),
  process_effects text,
  process_examples text,
  quality_effects text,
  quality_examples text,
  occurrence_time_scale text,
  occurrence_frequency_scale text,
  mistake_proofing_requirement text,
  prevention_control_examples text,
  typical_occurrence_note text,
  failure_mode_detection text,
  cause_detection text,
  detection_method_guidance text,
  typical_detection_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pfmea_scoring_type_score_unique UNIQUE (criterion_type, score)
);

COMMENT ON TABLE public.pfmea_scoring IS 'Reference criteria for PFMEA S/O/D scoring (DIY / home improvement).';

CREATE INDEX pfmea_scoring_type_score_idx ON public.pfmea_scoring (criterion_type, score);

ALTER TABLE public.pfmea_scoring ENABLE ROW LEVEL SECURITY;

CREATE POLICY pfmea_scoring_select_authenticated
  ON public.pfmea_scoring
  FOR SELECT
  TO authenticated
  USING (true);

-- Severity: process vs quality impact (center column = score in app; stored per row)
INSERT INTO public.pfmea_scoring (criterion_type, score, process_effects, process_examples, quality_effects, quality_examples) VALUES
('severity', 1, 'No practical effect on workflow; no correction needed.', 'Tape line 1 mm off in closet shelf paint; scrap packaging left in yard.', 'Cosmetic only; not visible or customer explicitly accepts as-is.', 'Hidden closet corner paint touch-up; non-walked attic insulation compression.'),
('severity', 2, 'Trivial extra touch-up time; no schedule slip.', 'Minor caulk bead inconsistency behind toilet; label on breaker panel crooked.', 'Barely noticeable finish issue in low-visibility area.', 'Base shoe caulk gap in utility room; grout shade slightly uneven in pantry.'),
('severity', 3, 'Small rework same day; minimal material waste.', 'One cabinet door hinge adjusted; single tile re-cut.', 'Noticeable aesthetic issue in secondary space.', 'Visible paint roller texture on one wall in bedroom; grout haze in guest bath.'),
('severity', 4, 'Rework extends task; may affect dependent trades next day.', 'Subfloor patch re-level before LVP; flashing lap corrected before shingle course.', 'Functional annoyance or code-adjacent detail needing correction before closeout.', 'Door rubs jamb; downspout discharge within 6 ft of foundation without extension.'),
('severity', 5, 'Work stoppage on this scope until corrected; moderate rework cost.', 'Shower pan flood test failed; temporary power not GFCI where required.', 'Primary function degraded for that assembly until fixed.', 'Window leaks in wind-driven rain; HRV imbalance causing comfort complaint.'),
('severity', 6, 'Major rework; inspection re-check likely; schedule impact to phase.', 'Load path questioned—beam bearing recalculated; drain slope below 1/4" per ft redone.', 'Loss of intended performance of system (comfort, water management, security).', 'Furnace short-cycling from undersized return; sump discharges into sanitary by mistake.'),
('severity', 7, 'Property damage risk or significant code noncompliance before occupancy.', 'Open wall cavity left unprotected in rain; unsecured trench.', 'Water intrusion, mold risk, or security failure if not corrected.', 'Improper deck ledger bolting; missing fire blocking; backdrafting combustion air.'),
('severity', 8, 'Serious injury possible without immediate medical care; stop-work expected.', 'Live exposed conductors in reach; guard removed on running saw.', 'Occupant injury from trip/fall hazard or electrical shock under normal use.', 'Stair riser variance > code; missing stair rail; hot water scald risk.'),
('severity', 9, 'Severe injury or major structural failure under foreseeable misuse.', 'Unsupported span under live load test; gas line in contact with sharp edge.', 'Structural collapse or fire spread risk with normal occupancy.', 'Chimney liner failure with CO migration; overloaded deck party scenario.'),
('severity', 10, 'Catastrophic without warning; life safety emergency; legal/regulatory crisis.', 'Active gas explosion risk; excavation collapse with worker in trench.', 'Imminent life loss, total loss event, or evacuation.', 'Cross-connected potable/non-potable; illegal structural modification hiding rot.');

-- Occurrence: time/frequency, mistake proofing, prevention examples, typical scoring notes
INSERT INTO public.pfmea_scoring (criterion_type, score, occurrence_time_scale, occurrence_frequency_scale, mistake_proofing_requirement, prevention_control_examples, typical_occurrence_note) VALUES
('occurrence', 1, 'Years between events on similar jobs; industry rare when controls exist.', '~1 in 1 000 000 opportunities or less for this failure mode.', 'Requires strongest mistake-proofing (physical impossible wrong assembly, or hazard eliminated).', 'Keyed connectors only one orientation; gas cock interlock; torque-limited driver with OK signal.', 'Achieving O=1 usually needs error-proof fixture or elimination, not procedure alone.'),
('occurrence', 2, 'Rare on well-run residential jobs; one event per many projects.', '~1 in 100 000; formal checklist + independent verify.', 'Error-proof or redundant sensing on critical step.', 'Duplicate inspection (rough-in photo + QC sign-off); labeled breaker audit before energize.', 'Procedure + verification; written instruction alone is insufficient for O≤2.'),
('occurrence', 3, 'Infrequent; occasional across crew/year.', '~1 in 10 000; standardized work + training records.', 'Combination of fixture + supervision on critical characteristic.', 'Jig for stud layout; moisture meter log before tile; permit inspection as second layer.', 'Training + simple fixture; still not “paper only”.'),
('occurrence', 4, 'Happens on some jobs; known industry “gotcha”.', '~1 in 2 000; variation in materials or subs shows issue.', 'Standard work with periodic audit; first-piece inspection.', 'Written work instruction + photo standard + weekly site walk; torque checklist on anchors.', 'Written instructions / generic IMS alone typically floor at O≥4 unless paired with audit or fixture.'),
('occurrence', 5, 'Moderate; several times per year for active contractor.', '~1 in 500; dependent on crew mix and rush periods.', 'Training and supervision; no physical mistake-proofing.', 'Pre-task briefing; material substitution without engineer approval blocked by policy.', 'Relying only on “experienced tech” without standard work → often O≥5.'),
('occurrence', 6, 'Common under schedule pressure or partial training.', '~1 in 100; new hire season or stacked trades.', 'Weak controls; informal verbal only.', '“Eyeball” level for slope; skip of mid-point photo documentation.', 'Verbal-only handoff between trades → expect O≥6 for subtle errors.'),
('occurrence', 7, 'High; happens on many similar tasks without strong prevention.', '~1 in 50; commodity speed, lowest bid.', 'Little prevention beyond basic code minimum.', 'No pre-drywall walk checklist; reused fastener holes in PT lumber.', 'Absent independent inspection → O≥7 for critical fits.'),
('occurrence', 8, 'Very high; systemic process weakness.', '~1 in 20; known repeat customer complaints.', 'No defined sequence; rework normalized.', 'Same leak callback pattern; no root-cause tracking.', 'Normalizing rework hides true O; treat as high occurrence.'),
('occurrence', 9, 'Almost always if failure mode is possible at all.', '~1 in 10; wrong tool or material default stocked.', 'No prevention control documented.', 'Wrong VOC caulk on wet areas; wrong fastener pack grabbed from van.', 'No control = O approaches maximum for that cause.'),
('occurrence', 10, 'Inevitable each cycle without design change.', '~1 in 1 or continuous when step exists.', 'Failure built into current method.', 'Measuring with warped rule; cutting without square on out-of-plumb wall—accepted as “how we do it”.', 'Requires process redesign or elimination to reduce O.');

-- Detection: failure mode vs cause; measurement robustness; visual vs automated
INSERT INTO public.pfmea_scoring (criterion_type, score, failure_mode_detection, cause_detection, detection_method_guidance, typical_detection_note) VALUES
('detection', 1, 'Failure mode cannot reach customer; 100% automatic test with interlock.', 'Root cause caught at source with automated data capture.', 'In-line gauge, continuity tester with pass/fail lockout, or 100% imaging with reject.', 'Automated test with machine stop; SPC alarm on tool wear.', 'Scores 1–4 imply high robustness; automated or 100% hard gate.'),
('detection', 2, 'Failure mode detected in-process before cover-up; near-zero escape.', 'Cause identified before next operation through mandatory measurement.', 'Calibrated go/no-go fixture every unit; leak test every joint.', 'First-article + SPC on critical dimension.', 'Still automated or systematic 100% check—not spot visual.'),
('detection', 3, 'High probability of detection before concealment; structured inspection.', 'Cause found via required inspection point with defined acceptance.', 'Checklist at rough-in with photos; insulation baffle count before drywall.', 'Third-party rough inspection as formal detection (not prevention).', 'Strong process controls short of full automation.'),
('detection', 4, 'Good chance of detection before handover if inspection performed.', 'Cause may be inferred from tell-tale signs before finish.', 'Level/laser verification documented; thermal camera spot-check on envelope.', 'Drain line camera if gurgle noted during trim.', 'Below 5: still relatively strong method; not casual glance.'),
('detection', 5, 'Obvious failure mode to competent tradesperson at normal viewing distance.', 'Obvious cause if assembly opened (wrong part visually distinct).', 'Large leak under test; door obviously out of plumb swing.', 'Wrong paint sheen in room with good light.', 'Obvious visual defects often land D≈5; not “low” detection.'),
('detection', 6, 'Failure mode detectable with deliberate inspection; not obvious at walk-through.', 'Cause requires partial disassembly or test to see.', 'Smoke pencil at exterior door; moisture probe at baseboard.', 'Megger on suspect neutral; borescope for blocked duct.', 'Directed inspection beyond normal walk-through.'),
('detection', 7, 'Subtle failure mode; easy to miss without detailed examination.', 'Cause hidden (inside wall, interstitial).', 'Fine grout cracks; slight nail pop pattern; HRV imbalance without hood test.', 'Intermittent GFCI trip only under load mix.', 'Detailed visual or functional test—user said 7+ for detailed inspections.'),
('detection', 8, 'Failure mode rarely seen until occupancy or seasonal condition.', 'Cause not apparent until failure propagates.', 'Condensation in wall cavity after cold snap; ice dam leak.', 'Loose stab connection heating under load.', 'Seasonal or load-dependent—poor detection.'),
('detection', 9, 'Failure mode discovered by customer or after damage.', 'Cause only found after failure event.', 'Hidden leak into subfloor; structural creep over months.', 'CO alarm event traces to installation error.', 'Post-occupancy discovery; very weak detection.'),
('detection', 10, 'No chance of detection before catastrophic effect; no control.', 'Cause undetectable with current methods.', 'No test performed; work buried with no records.', 'Cryptic failure in embedded assembly with no access.', 'No detection control documented → D=10.');
