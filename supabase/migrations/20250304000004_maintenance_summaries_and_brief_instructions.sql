-- Update maintenance_templates: 2-line summaries (task + benefits; "Critical: " when high), brief instructions (2-3 lines).
-- Ensure columns exist in case 20250304000003 was not run.

ALTER TABLE public.maintenance_templates
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS repair_cost_savings TEXT;

ALTER TABLE public.user_maintenance_tasks
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS repair_cost_savings TEXT;

-- High criticality (3): Test smoke alarms, Test CO detectors, Replace smoke alarm batteries, Check fire extinguisher,
-- Test water heater pressure relief valve, Inspect sump pump, Test GFCI outlets.

UPDATE public.maintenance_templates SET
  summary = 'Replace or clean the HVAC air filter to maintain airflow and air quality.' || E'\n' || 'Better airflow and air quality; system lasts longer.',
  instructions = 'Turn off system. Remove old filter, note size. Insert new filter with arrow toward blower. Check monthly in peak season.'
WHERE title = 'Replace HVAC filter';

UPDATE public.maintenance_templates SET
  summary = 'Professional inspection and service of heating and cooling system.' || E'\n' || 'Catch issues early; extend life and keep efficiency.',
  instructions = 'Schedule in spring for AC, fall for furnace. Technician checks refrigerant, electrical, ductwork, and cleans components.'
WHERE title = 'Schedule HVAC tune-up';

UPDATE public.maintenance_templates SET
  summary = 'Maintain whole-house or furnace humidifier for proper moisture levels.' || E'\n' || 'Proper moisture levels; unit runs clean and lasts longer.',
  instructions = 'Turn off water and power. Remove pad or evaporator, rinse or replace per manufacturer. Clean reservoir and reassemble.'
WHERE title = 'Clean or replace humidifier pad';

UPDATE public.maintenance_templates SET
  summary = 'Clean condenser coils so the fridge runs efficiently and lasts longer.' || E'\n' || 'Runs cooler and more efficiently; extends life.',
  instructions = 'Unplug or turn off. Pull fridge out. Use coil brush or vacuum on rear or front-bottom coils. Do not bend fins.'
WHERE title = 'Vacuum refrigerator coils';

UPDATE public.maintenance_templates SET
  summary = 'Remove lint from dryer vent duct and exterior vent to prevent fire and improve drying.' || E'\n' || 'Reduces fire risk; faster drying and longer dryer life.',
  instructions = 'Disconnect vent from dryer. Use vent brush or vacuum from both ends. Clear exterior hood; ensure damper moves freely.'
WHERE title = 'Clean dryer vent';

UPDATE public.maintenance_templates SET
  summary = 'Clear lint from the in-drum filter after every load; inspect housing monthly.' || E'\n' || 'Safer operation; faster drying.',
  instructions = 'Remove lint screen; wipe or brush off lint. Run under water to check for clogged mesh; replace if damaged.'
WHERE title = 'Clean dryer lint screen';

UPDATE public.maintenance_templates SET
  summary = 'Remove food debris from filter and spray arms for better cleaning.' || E'\n' || 'Cleaner dishes; fewer clogs and odors.',
  instructions = 'Remove bottom rack and filter per manual. Rinse filter and clean spray arm holes. Wipe door gasket.'
WHERE title = 'Clean dishwasher filter and spray arms';

UPDATE public.maintenance_templates SET
  summary = 'Degrease or replace range hood filter to maintain airflow and reduce fire risk.' || E'\n' || 'Better ventilation; lower fire risk.',
  instructions = 'Remove metal or charcoal filter. Soak metal in hot soapy water or replace charcoal per manufacturer.'
WHERE title = 'Clean range hood filter';

UPDATE public.maintenance_templates SET
  summary = 'Run a hot clean cycle to remove detergent and debris from drum and hoses.' || E'\n' || 'Cleaner loads; fewer odors and buildup.',
  instructions = 'Use washer cleaner or vinegar/baking soda per manual. Run empty on hottest cycle. Wipe drum and door seal.'
WHERE title = 'Run washing machine clean cycle';

UPDATE public.maintenance_templates SET
  summary = 'Critical: Test all smoke detectors to ensure they sound.' || E'\n' || 'Reliable early warning in a fire.',
  instructions = 'Press test button on each unit. Replace batteries if needed. Replace units per manufacturer (often 10 years).'
WHERE title = 'Test smoke alarms';

UPDATE public.maintenance_templates SET
  summary = 'Critical: Test carbon monoxide detectors and replace batteries if needed.' || E'\n' || 'Reliable CO detection; peace of mind.',
  instructions = 'Press test button. Replace batteries per schedule (often annually). Replace units per manufacturer date.'
WHERE title = 'Test CO detectors';

UPDATE public.maintenance_templates SET
  summary = 'Critical: Replace batteries in battery-operated smoke and CO detectors.' || E'\n' || 'Alarms work when you need them.',
  instructions = 'Replace with fresh batteries on a set date (e.g. daylight saving). Note expiration date on units.'
WHERE title = 'Replace smoke alarm batteries';

UPDATE public.maintenance_templates SET
  summary = 'Critical: Verify pressure and accessibility of kitchen and garage extinguishers.' || E'\n' || 'Working extinguisher when you need it.',
  instructions = 'Check gauge in green zone. Ensure pin and seal intact. Shake dry chemical units per instructions. Replace if expired.'
WHERE title = 'Check fire extinguisher';

UPDATE public.maintenance_templates SET
  summary = 'Drain sediment from the tank to improve efficiency and extend life.' || E'\n' || 'Extend tank life from ~10 to 15–20 yrs; better efficiency.',
  instructions = 'Turn off gas or power and cold supply. Attach hose to drain valve; open and drain until clear. Close valve, refill, relight or re-power.'
WHERE title = 'Flush water heater';

UPDATE public.maintenance_templates SET
  summary = 'Critical: Lift the T&P valve briefly to ensure it opens and closes and drains safely.' || E'\n' || 'Pressure relief works in an emergency; safer tank.',
  instructions = 'Place bucket under discharge pipe. Lift valve lever briefly; release. Water should flow then stop. If it leaks or does not operate, replace valve.'
WHERE title = 'Test water heater pressure relief valve';

UPDATE public.maintenance_templates SET
  summary = 'Inspect pipes, traps, and shutoffs under all sinks.' || E'\n' || 'Catch leaks early; avoid costly water damage.',
  instructions = 'Look for drips, corrosion, or moisture. Tighten connections if needed. Fix or replace leaking parts promptly.'
WHERE title = 'Check under sinks for leaks';

UPDATE public.maintenance_templates SET
  summary = 'Remove and rinse aerators to restore flow and remove sediment.' || E'\n' || 'Better flow; cleaner water at tap.',
  instructions = 'Unscrew aerator from faucet (cloth to protect finish). Rinse screen; remove debris. Reinstall.'
WHERE title = 'Clean faucet aerators';

UPDATE public.maintenance_templates SET
  summary = 'Critical: Test sump pump and discharge line so it runs when needed.' || E'\n' || 'Sump works when it rains; avoid flooding.',
  instructions = 'Pour water into sump to trigger float. Confirm pump runs and discharges outside. Check discharge line for obstructions.'
WHERE title = 'Inspect sump pump';

UPDATE public.maintenance_templates SET
  summary = 'Remove leaves and debris from gutters and downspouts so water drains properly.' || E'\n' || 'Water directed away; less rot and foundation issues.',
  instructions = 'Safely access roof or use ladder. Scoop debris; flush with hose. Check downspouts and splash blocks. Repair sagging or leaks.'
WHERE title = 'Clean gutters';

UPDATE public.maintenance_templates SET
  summary = 'Walk the roof or use binoculars to check for missing or damaged shingles and flashing.' || E'\n' || 'Catch damage early; cheaper repairs.',
  instructions = 'Look for lifted, cracked, or missing shingles; damaged flashing; and debris. Note any issues for repair.'
WHERE title = 'Inspect roof';

UPDATE public.maintenance_templates SET
  summary = 'Check siding and trim for damage and gaps; recaulk as needed.' || E'\n' || 'Sealed envelope; less moisture and pests.',
  instructions = 'Look for cracks, gaps, or rot. Remove old caulk; apply new where needed. Paint or repair damaged areas.'
WHERE title = 'Inspect siding and caulk';

UPDATE public.maintenance_templates SET
  summary = 'Look for cracks, moisture, or pests along foundation and in basement.' || E'\n' || 'Catch cracks and moisture early; protect structure.',
  instructions = 'Walk perimeter; note cracks or water stains. Check basement walls and floor. Address moisture or structural issues.'
WHERE title = 'Check foundation and basement';

UPDATE public.maintenance_templates SET
  summary = 'Critical: Trip and reset GFCI outlets to confirm they protect against shock.' || E'\n' || 'GFCIs trip when needed; safer outlets.',
  instructions = 'Press TEST; outlet should trip. Press RESET to restore. If it does not trip or reset, replace the outlet.'
WHERE title = 'Test GFCI outlets';

UPDATE public.maintenance_templates SET
  summary = 'Visual check of panel for burning smell, corrosion, or tripped breakers.' || E'\n' || 'Spot issues early; safer electrical system.',
  instructions = 'Do not remove cover if unsure. Look for tripped breakers, labels, and signs of overheating. Call electrician for issues.'
WHERE title = 'Inspect electrical panel';

UPDATE public.maintenance_templates SET
  summary = 'Replace evaporator pad in furnace-mounted humidifier.' || E'\n' || 'Consistent humidity; unit lasts longer.',
  instructions = 'Turn off water and power. Remove old pad; install new one per manufacturer. Reconnect and turn on.'
WHERE title = 'Replace furnace humidifier pad';

UPDATE public.maintenance_templates SET
  summary = 'Drain and protect hose bibs and irrigation from freezing.' || E'\n' || 'Outdoor faucets and pipes survive winter.',
  instructions = 'Shut off supply to exterior; open faucet to drain. Install frost-free bibs or insulated covers where needed.'
WHERE title = 'Winterize outdoor faucets';

UPDATE public.maintenance_templates SET
  summary = 'Turn on and check irrigation system after last frost.' || E'\n' || 'Even coverage; no surprise leaks or dry spots.',
  instructions = 'Turn water on; run each zone. Check for broken heads or leaks. Adjust spray pattern and timer.'
WHERE title = 'Dewinterize irrigation';

UPDATE public.maintenance_templates SET
  summary = 'Change oil, sharpen blade, and check air filter and spark plug.' || E'\n' || 'Starts reliably; cleaner cut; longer mower life.',
  instructions = 'Drain old oil; refill per manual. Remove and sharpen or replace blade. Replace air filter and spark plug if needed.'
WHERE title = 'Service lawn mower';

UPDATE public.maintenance_templates SET
  summary = 'Check attic for leaks, pests, insulation damage, and adequate ventilation.' || E'\n' || 'Catch leaks and pests early; better insulation.',
  instructions = 'Safely access attic. Look for stains, daylight, or pest signs. Check insulation and vents. Address moisture or pests.'
WHERE title = 'Inspect attic';

UPDATE public.maintenance_templates SET
  summary = 'Inspect and replace failed caulk to prevent water damage.' || E'\n' || 'Water stays in tub; no hidden mold or rot.',
  instructions = 'Remove cracked or moldy caulk. Clean and dry. Apply new silicone caulk; smooth bead. Allow cure before use.'
WHERE title = 'Check caulk around tub and shower';
