-- Add summary (table display) vs instructions (detail-only), and repair_cost_savings.
-- Summary is short; instructions are step-by-step and shown when user opens the task.

ALTER TABLE public.maintenance_templates
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS repair_cost_savings TEXT;

ALTER TABLE public.user_maintenance_tasks
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS repair_cost_savings TEXT;

-- Backfill summary from description (short line for table), then apply full content updates.
UPDATE public.maintenance_templates SET summary = 'Replace or clean the HVAC air filter for airflow and air quality.' WHERE title = 'Replace HVAC filter';
UPDATE public.maintenance_templates SET summary = 'Professional inspection and service of heating and cooling system.' WHERE title = 'Schedule HVAC tune-up';
UPDATE public.maintenance_templates SET summary = 'Maintain whole-house or furnace humidifier for proper moisture levels.' WHERE title = 'Clean or replace humidifier pad';
UPDATE public.maintenance_templates SET summary = 'Clean condenser coils so the fridge runs efficiently and lasts longer.' WHERE title = 'Vacuum refrigerator coils';
UPDATE public.maintenance_templates SET summary = 'Remove lint from dryer vent duct and exterior vent to prevent fire.' WHERE title = 'Clean dryer vent';
UPDATE public.maintenance_templates SET summary = 'Clear lint from the in-drum filter; inspect housing monthly.' WHERE title = 'Clean dryer lint screen';
UPDATE public.maintenance_templates SET summary = 'Remove food debris from filter and spray arms for better cleaning.' WHERE title = 'Clean dishwasher filter and spray arms';
UPDATE public.maintenance_templates SET summary = 'Degrease or replace range hood filter for airflow and fire safety.' WHERE title = 'Clean range hood filter';
UPDATE public.maintenance_templates SET summary = 'Run a hot clean cycle to remove buildup from drum and hoses.' WHERE title = 'Run washing machine clean cycle';
UPDATE public.maintenance_templates SET summary = 'Test all smoke detectors to ensure they sound.' WHERE title = 'Test smoke alarms';
UPDATE public.maintenance_templates SET summary = 'Test carbon monoxide detectors and replace batteries if needed.' WHERE title = 'Test CO detectors';
UPDATE public.maintenance_templates SET summary = 'Replace batteries in battery-operated smoke and CO detectors.' WHERE title = 'Replace smoke alarm batteries';
UPDATE public.maintenance_templates SET summary = 'Verify pressure and accessibility of kitchen and garage extinguishers.' WHERE title = 'Check fire extinguisher';
UPDATE public.maintenance_templates SET summary = 'Drain sediment from the tank to improve efficiency and extend life.' WHERE title = 'Flush water heater';
UPDATE public.maintenance_templates SET summary = 'Lift the T&P valve briefly to ensure it opens and drains safely.' WHERE title = 'Test water heater pressure relief valve';
UPDATE public.maintenance_templates SET summary = 'Inspect pipes, traps, and shutoffs under all sinks.' WHERE title = 'Check under sinks for leaks';
UPDATE public.maintenance_templates SET summary = 'Remove and rinse aerators to restore flow and remove sediment.' WHERE title = 'Clean faucet aerators';
UPDATE public.maintenance_templates SET summary = 'Test sump pump and discharge line so it runs when needed.' WHERE title = 'Inspect sump pump';
UPDATE public.maintenance_templates SET summary = 'Remove leaves and debris from gutters and downspouts.' WHERE title = 'Clean gutters';
UPDATE public.maintenance_templates SET summary = 'Check for missing or damaged shingles and flashing.' WHERE title = 'Inspect roof';
UPDATE public.maintenance_templates SET summary = 'Check siding and trim for damage and gaps; recaulk as needed.' WHERE title = 'Inspect siding and caulk';
UPDATE public.maintenance_templates SET summary = 'Look for cracks, moisture, or pests along foundation and basement.' WHERE title = 'Check foundation and basement';
UPDATE public.maintenance_templates SET summary = 'Trip and reset GFCI outlets to confirm they protect against shock.' WHERE title = 'Test GFCI outlets';
UPDATE public.maintenance_templates SET summary = 'Visual check of panel for overheating or tripped breakers.' WHERE title = 'Inspect electrical panel';
UPDATE public.maintenance_templates SET summary = 'Replace evaporator pad in furnace-mounted humidifier.' WHERE title = 'Replace furnace humidifier pad';
UPDATE public.maintenance_templates SET summary = 'Drain and protect hose bibs and irrigation from freezing.' WHERE title = 'Winterize outdoor faucets';
UPDATE public.maintenance_templates SET summary = 'Turn on and check irrigation system after last frost.' WHERE title = 'Dewinterize irrigation';
UPDATE public.maintenance_templates SET summary = 'Change oil, sharpen blade, check air filter and spark plug.' WHERE title = 'Service lawn mower';
UPDATE public.maintenance_templates SET summary = 'Check attic for leaks, pests, insulation damage, and ventilation.' WHERE title = 'Inspect attic';
UPDATE public.maintenance_templates SET summary = 'Inspect and replace failed caulk to prevent water damage.' WHERE title = 'Check caulk around tub and shower';

-- Enrich benefits, risks, criticality (already seeded); add repair_cost_savings and expanded instructions.
UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Clean filters can cut AC energy use 5–15%; avoid costly blower and coil repairs.',
  instructions = '1. Turn off the HVAC system at the thermostat. 2. Locate the filter (in return duct, blower compartment, or wall mount). 3. Remove the old filter and note its size (printed on the frame). 4. Insert the new filter with the arrow pointing toward the blower. 5. Close the compartment and turn the system back on. Check monthly in peak season; replace when dirty or per manufacturer (often every 90 days).'
WHERE title = 'Replace HVAC filter';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Annual tune-ups can extend system life and avoid $200–$2,000+ repair or early replacement.',
  instructions = '1. Schedule in spring for AC, fall for furnace. 2. Technician will check refrigerant charge, electrical connections, ductwork, and clean coils and components. 3. Ask for a written report and any recommended repairs. 4. Keep a record of service dates for warranty and resale.'
WHERE title = 'Schedule HVAC tune-up';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'A working humidifier reduces dry-air complaints and can prolong wood and finish life.',
  instructions = '1. Turn off water supply and power to the humidifier. 2. Open the cover and remove the pad or evaporator panel. 3. Rinse with water or replace per manufacturer (typically annually). 4. Wipe or flush the reservoir to remove scale. 5. Reinstall the pad and reassemble. 6. Turn water and power back on; set desired humidity (often 30–50%).'
WHERE title = 'Clean or replace humidifier pad';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Clean coils help the fridge run efficiently and can delay or avoid $200–$1,000+ compressor failure.',
  instructions = '1. Unplug the refrigerator or turn it off at the circuit. 2. Pull the fridge out carefully to access rear or front-bottom coils. 3. Use a coil brush or vacuum with brush attachment to remove dust and lint. 4. Avoid bending the fins. 5. Push the fridge back and plug in. Do this every 6–12 months.'
WHERE title = 'Vacuum refrigerator coils';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Reduces fire risk and can prevent dryer motor or heating element failure ($100–$400+).',
  instructions = '1. Disconnect the vent duct from the back of the dryer. 2. Use a vent brush or vacuum from the dryer side, then from the exterior hood. 3. Clear the exterior hood screen and ensure the damper opens and closes. 4. Reconnect the duct with a clamp; avoid kinks or long runs. 5. Run a load and confirm warm air exits outside.'
WHERE title = 'Clean dryer vent';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Prevents fire and extends dryer life; minimal cost vs. repair or replacement.',
  instructions = '1. Remove the lint screen after every load. 2. Wipe or brush off lint. 3. Monthly: run the screen under water to check for clogged mesh (water should pass through). 4. Replace the screen if damaged or if flow is blocked. 5. Clean the lint trap housing with a damp cloth if needed.'
WHERE title = 'Clean dryer lint screen';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Prevents clogs and pump wear; avoids service calls ($75–$150) or replacement.',
  instructions = '1. Remove the bottom rack. 2. Locate and remove the filter and any spin basket per your manual. 3. Rinse the filter under running water; clear spray arm holes with a toothpick or soft brush. 4. Wipe the door gasket and interior. 5. Reinstall the filter and rack. Run an empty hot cycle monthly if recommended.'
WHERE title = 'Clean dishwasher filter and spray arms';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Maintains ventilation and reduces grease fire risk; replacement filters are low cost.',
  instructions = '1. Turn off the range hood. 2. Remove the metal or charcoal filter (often slide-out or clips). 3. Metal: soak in hot soapy water, then rinse. 4. Charcoal: replace per manufacturer (usually every few months). 5. Dry and reinstall. Check your manual for filter type and interval.'
WHERE title = 'Clean range hood filter';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Reduces odors and residue that can damage seals and hoses ($50–$200 to repair).',
  instructions = '1. Use a washer cleaner or 2 cups vinegar or baking soda per manual. 2. Run an empty hot cycle on the heaviest setting. 3. Wipe the drum and door seal with a damp cloth. 4. Leave the door ajar between loads to reduce mold. Do every 1–3 months depending on use.'
WHERE title = 'Run washing machine clean cycle';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Working alarms save lives; battery replacement is minimal cost.',
  instructions = '1. Press the test button on each smoke alarm. 2. Alarms should sound; if not, replace batteries or the unit. 3. Replace batteries at least annually (e.g. daylight saving). 4. Replace units per manufacturer date (often 10 years from manufacture). 5. Install alarms in every bedroom, outside sleeping areas, and on each level.'
WHERE title = 'Test smoke alarms';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'CO detectors can prevent poisoning; replace batteries and units per date.',
  instructions = '1. Press the test button on each CO detector. 2. Replace batteries per schedule (often annually). 3. Replace units per manufacturer date (often 5–7 years). 4. Install near sleeping areas and per local code. 5. If alarm sounds, get everyone out and call 911; do not re-enter until cleared.'
WHERE title = 'Test CO detectors';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Fresh batteries ensure alarms work in an emergency.',
  instructions = '1. Choose a set date (e.g. daylight saving). 2. Replace batteries in all battery-operated smoke and CO detectors. 3. Test each unit after replacing. 4. Note expiration dates on units and replace when due.'
WHERE title = 'Replace smoke alarm batteries';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'A working extinguisher can limit fire damage; replacement cost is low.',
  instructions = '1. Check the gauge is in the green zone. 2. Ensure the pin and seal are intact. 3. Shake dry-chemical units per manufacturer instructions. 4. Replace if expired, damaged, or after use. 5. Keep one in kitchen and garage; ensure everyone knows how to use it (PASS: Pull, Aim, Squeeze, Sweep).'
WHERE title = 'Check fire extinguisher';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Flushing can extend tank life from ~10 to 15–20 years; avoids $1,000–$2,500+ replacement.',
  instructions = '1. Turn off gas or power to the water heater and the cold water supply. 2. Attach a garden hose to the drain valve; run to floor drain or outside. 3. Open the drain and a hot water tap to break vacuum; drain until water runs clear. 4. Close the drain valve, refill the tank, then relight or re-power. 5. Check the T&P valve and area for leaks.'
WHERE title = 'Flush water heater';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'A working T&P valve prevents tank overpressure and rupture (catastrophic cost).',
  instructions = '1. Place a bucket under the discharge pipe. 2. Lift the T&P valve lever briefly; release. 3. Water should flow then stop when released. 4. If it leaks afterward or does not operate, replace the valve. 5. Do not cap or block the discharge pipe; it must terminate safely.'
WHERE title = 'Test water heater pressure relief valve';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Catching leaks early can prevent $500–$10,000+ in water damage and mold remediation.',
  instructions = '1. Look under each sink for drips, corrosion, or moisture. 2. Check supply lines, traps, and shutoff valves. 3. Tighten connections gently if needed; do not over-tighten. 4. Fix or replace leaking parts promptly. 5. Consider a water alarm under sinks and near the water heater.'
WHERE title = 'Check under sinks for leaks';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Clean aerators restore flow and reduce sediment; replacement aerators are inexpensive.',
  instructions = '1. Wrap a cloth around the aerator to protect the finish. 2. Unscrew the aerator (often counterclockwise). 3. Rinse the screen and remove debris. 4. Soak in vinegar if mineral buildup remains. 5. Reinstall and run water to check flow.'
WHERE title = 'Clean faucet aerators';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'A working sump can prevent $5,000–$25,000+ in basement flooding and damage.',
  instructions = '1. Pour water into the sump pit to trigger the float. 2. Confirm the pump runs and discharges water outside. 3. Check the discharge line for obstructions or freezing. 4. Test the backup system if present. 5. Consider a battery or water-powered backup for power outages.'
WHERE title = 'Inspect sump pump';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Clean gutters prevent overflow, roof leaks, and foundation issues ($500–$5,000+ to fix).',
  instructions = '1. Safely access the roof or use a stable ladder. 2. Scoop leaves and debris into a bucket or tarp. 3. Flush gutters and downspouts with a hose. 4. Check downspouts and splash blocks direct water away. 5. Repair sagging sections or leaks; consider gutter guards if needed.'
WHERE title = 'Clean gutters';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Early detection of roof issues can avoid $3,000–$15,000+ in repairs or replacement.',
  instructions = '1. From the ground, use binoculars to scan for missing or damaged shingles and flashing. 2. If safe, walk the roof and look for lifted, cracked, or missing shingles; damaged flashing; and debris. 3. Note any issues for repair. 4. Do not walk on a wet or steep roof; hire a pro if unsure.'
WHERE title = 'Inspect roof';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Good caulk and siding reduce water intrusion and pest entry ($500–$5,000+ to remedy).',
  instructions = '1. Walk the exterior and look for cracks, gaps, or rot in siding and trim. 2. Remove old caulk with a putty knife or tool. 3. Clean and dry the area. 4. Apply new caulk (paintable silicone or acrylic) and smooth the bead. 5. Paint or repair damaged areas as needed.'
WHERE title = 'Inspect siding and caulk';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Catching foundation and moisture issues early can prevent $5,000–$30,000+ in structural and mold work.',
  instructions = '1. Walk the perimeter and note cracks or water stains. 2. Check basement walls and floor for moisture, efflorescence, or pests. 3. Address moisture sources (gutters, grading, plumbing). 4. Have significant cracks or movement evaluated by a structural engineer or foundation pro.'
WHERE title = 'Check foundation and basement';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'GFCIs prevent shock and fire; outlet replacement is typically $50–$150 per circuit.',
  instructions = '1. Press the TEST button on each GFCI outlet. 2. The outlet should trip (power off). 3. Press RESET to restore power. 4. If it does not trip or reset, replace the outlet or call an electrician. 5. Test all GFCIs in bathrooms, kitchen, garage, and outdoors per code.'
WHERE title = 'Test GFCI outlets';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Catching panel issues early can prevent fire or repeated outages; pro inspection is $100–$300.',
  instructions = '1. Do not remove the cover if unsure; call an electrician. 2. Look for tripped breakers and ensure the panel is labeled. 3. Check for burning smell, corrosion, or overheating. 4. Note any breakers that trip frequently for evaluation. 5. Ensure the panel has capacity for your loads.'
WHERE title = 'Inspect electrical panel';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'A fresh pad improves humidity and prevents mineral buildup in the unit.',
  instructions = '1. Turn off water supply and power to the humidifier. 2. Remove the old evaporator pad per manufacturer. 3. Install the new pad; ensure it seats correctly. 4. Reconnect and turn on. 5. Set humidity level (often 30–50%); adjust in winter as needed.'
WHERE title = 'Replace furnace humidifier pad';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Prevents burst pipes and water damage ($500–$5,000+); winterizing is low cost.',
  instructions = '1. Shut off the water supply to exterior faucets (indoor valve or at fixture). 2. Open the outdoor faucet to drain the line. 3. Install frost-free bibs or insulated covers where needed. 4. Drain irrigation systems per manufacturer. 5. Store hoses indoors.'
WHERE title = 'Winterize outdoor faucets';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Catching broken heads and leaks saves water and avoids dead zones; repairs are modest.',
  instructions = '1. After the last frost, turn the water supply to the irrigation system on. 2. Run each zone and check for broken heads, leaks, or misdirected spray. 3. Replace or adjust heads as needed. 4. Update the timer for the season. 5. Winterize again before freezing weather.'
WHERE title = 'Dewinterize irrigation';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Regular service extends mower life and ensures a clean cut; neglect can mean $100–$400 in repairs.',
  instructions = '1. Drain the old oil and refill per manual (often 5W-30 or specified). 2. Remove the blade; sharpen or replace. 3. Replace the air filter and spark plug if worn. 4. Check the wheels and cables. 5. Store with empty fuel or use stabilizer if stored with fuel.'
WHERE title = 'Service lawn mower';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Early detection of attic leaks and pests can prevent $1,000–$10,000+ in damage.',
  instructions = '1. Safely access the attic (use a stable ladder and watch for nails). 2. Look for stains, daylight, or pest signs. 3. Check insulation and ventilation. 4. Address moisture sources (roof leaks, bath fans). 5. Have pest or structural issues handled by a pro.'
WHERE title = 'Inspect attic';

UPDATE public.maintenance_templates SET
  repair_cost_savings = 'Good caulk keeps water in the tub and prevents $500–$5,000+ in hidden mold and rot.',
  instructions = '1. Remove cracked or moldy caulk with a utility knife or caulk remover. 2. Clean and dry the joint thoroughly. 3. Apply new silicone caulk in a smooth bead. 4. Smooth with a finger or tool; allow to cure per product (often 24–48 hours). 5. Do not use the shower until cured.'
WHERE title = 'Check caulk around tub and shower';
