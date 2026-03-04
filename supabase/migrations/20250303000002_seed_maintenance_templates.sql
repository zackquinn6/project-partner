-- Seed maintenance_templates with common home maintenance tasks and typical frequencies.
-- Users see these when adding a new task in Home Maintenance Manager (AddMaintenanceTaskDialog).
-- Idempotent: only inserts rows that do not already exist (by title).

INSERT INTO public.maintenance_templates (title, description, category, frequency_days, instructions)
SELECT v.title, v.description, v.category, v.frequency_days, v.instructions
FROM (VALUES
    ('Replace HVAC filter', 'Replace or clean HVAC system air filter to maintain airflow and air quality.', 'hvac', 90, 'Turn off system. Remove old filter, note size. Insert new filter with arrow pointing toward blower. Check monthly in peak season; replace when dirty.'),
    ('Schedule HVAC tune-up', 'Professional inspection and service of heating and cooling system.', 'hvac', 365, 'Schedule in spring for AC, fall for furnace. Technician will check refrigerant, electrical, ductwork, and clean components.'),
    ('Clean or replace humidifier pad', 'Maintain whole-house or furnace-mounted humidifier for proper moisture levels.', 'hvac', 365, 'Turn off water and power. Remove pad or evaporator, rinse or replace per manufacturer. Clean reservoir; reassemble.'),
    ('Vacuum refrigerator coils', 'Clean condenser coils so the fridge runs efficiently and lasts longer.', 'appliances', 180, 'Unplug or turn off. Pull fridge out. Use coil brush or vacuum on rear or front bottom coils. Do not bend fins.'),
    ('Clean dryer vent', 'Remove lint from dryer vent duct and exterior vent to prevent fire and improve drying.', 'appliances', 180, 'Disconnect vent from dryer. Use vent brush or vacuum from both ends. Clear exterior hood; ensure damper moves freely. Reconnect securely.'),
    ('Clean dryer lint screen', 'Clear lint from the in-drum filter after every load; inspect housing monthly.', 'appliances', 30, 'Remove lint screen; wipe or brush off lint. Run under water to check for clogged mesh; replace if damaged.'),
    ('Clean dishwasher filter and spray arms', 'Remove food debris from filter and spray arms for better cleaning.', 'appliances', 90, 'Remove bottom rack and filter per manual. Rinse filter and clean spray arm holes. Wipe door gasket.'),
    ('Clean range hood filter', 'Degrease or replace range hood filter to maintain airflow and reduce fire risk.', 'appliances', 90, 'Remove metal or charcoal filter. Soak metal in hot soapy water or replace charcoal filter per manufacturer.'),
    ('Run washing machine clean cycle', 'Run a hot clean cycle to remove detergent and debris from drum and hoses.', 'appliances', 180, 'Use washer cleaner or vinegar/baking soda per manual. Run empty on hottest cycle. Wipe drum and door seal.'),
    ('Test smoke alarms', 'Test all smoke detectors to ensure they sound.', 'safety', 30, 'Press test button on each unit. Replace batteries if needed. Replace units per manufacturer (often 10 years).'),
    ('Test CO detectors', 'Test carbon monoxide detectors and replace batteries if needed.', 'safety', 180, 'Press test button. Replace batteries per schedule (often annually). Replace units per manufacturer date.'),
    ('Replace smoke alarm batteries', 'Replace batteries in battery-operated smoke and CO detectors.', 'safety', 365, 'Replace with fresh batteries on a set date (e.g. daylight saving). Note expiration date on units.'),
    ('Check fire extinguisher', 'Verify pressure and accessibility of kitchen and garage extinguishers.', 'safety', 365, 'Check gauge in green zone. Ensure pin and seal intact. Shake dry chemical units per instructions. Replace if expired or damaged.'),
    ('Flush water heater', 'Drain sediment from the tank to improve efficiency and extend life.', 'plumbing', 365, 'Turn off gas or power and cold supply. Attach hose to drain valve; open and drain until clear. Close valve, refill, relight or re-power.'),
    ('Test water heater pressure relief valve', 'Lift the T&P valve briefly to ensure it opens and closes and drains safely.', 'plumbing', 365, 'Place bucket under discharge pipe. Lift valve lever briefly; release. Water should flow then stop. If it leaks or does not operate, replace valve.'),
    ('Check under sinks for leaks', 'Inspect pipes, traps, and shutoffs under all sinks.', 'plumbing', 90, 'Look for drips, corrosion, or moisture. Tighten connections if needed. Fix or replace leaking parts promptly.'),
    ('Clean faucet aerators', 'Remove and rinse aerators to restore flow and remove sediment.', 'plumbing', 180, 'Unscrew aerator from faucet (cloth to protect finish). Rinse screen; remove debris. Reinstall.'),
    ('Inspect sump pump', 'Test sump pump and discharge line so it runs when needed.', 'plumbing', 365, 'Pour water into sump to trigger float. Confirm pump runs and discharges outside. Check discharge line for obstructions.'),
    ('Clean gutters', 'Remove leaves and debris from gutters and downspouts so water drains properly.', 'exterior', 180, 'Safely access roof or use ladder. Scoop debris; flush with hose. Check downspouts and splash blocks. Repair sagging or leaks.'),
    ('Inspect roof', 'Walk the roof or use binoculars to check for missing or damaged shingles and flashing.', 'exterior', 365, 'Look for lifted, cracked, or missing shingles; damaged flashing; and debris. Note any issues for repair.'),
    ('Inspect siding and caulk', 'Check siding and trim for damage and gaps; recaulk as needed.', 'exterior', 365, 'Look for cracks, gaps, or rot. Remove old caulk; apply new where needed. Paint or repair damaged areas.'),
    ('Check foundation and basement', 'Look for cracks, moisture, or pests along foundation and in basement.', 'exterior', 365, 'Walk perimeter; note cracks or water stains. Check basement walls and floor. Address moisture or structural issues.'),
    ('Test GFCI outlets', 'Trip and reset GFCI outlets to confirm they protect against shock.', 'electrical', 90, 'Press TEST; outlet should trip. Press RESET to restore. If it does not trip or reset, replace the outlet.'),
    ('Inspect electrical panel', 'Visual check of panel for burning smell, corrosion, or tripped breakers.', 'electrical', 365, 'Do not remove cover if unsure. Look for tripped breakers, labels, and signs of overheating. Call electrician for issues.'),
    ('Replace furnace humidifier pad', 'Replace evaporator pad in furnace-mounted humidifier.', 'hvac', 365, 'Turn off water and power. Remove old pad; install new one per manufacturer. Reconnect and turn on.'),
    ('Winterize outdoor faucets', 'Drain and protect hose bibs and irrigation from freezing.', 'plumbing', 365, 'Shut off supply to exterior; open faucet to drain. Install frost-free bibs or insulated covers where needed.'),
    ('Dewinterize irrigation', 'Turn on and check irrigation system after last frost.', 'outdoor', 365, 'Turn water on; run each zone. Check for broken heads or leaks. Adjust spray pattern and timer.'),
    ('Service lawn mower', 'Change oil, sharpen blade, and check air filter and spark plug.', 'outdoor', 365, 'Drain old oil; refill per manual. Remove and sharpen or replace blade. Replace air filter and spark plug if needed.'),
    ('Inspect attic', 'Check attic for leaks, pests, insulation damage, and adequate ventilation.', 'interior', 365, 'Safely access attic. Look for stains, daylight, or pest signs. Check insulation and vents. Address moisture or pests.'),
    ('Check caulk around tub and shower', 'Inspect and replace failed caulk to prevent water damage.', 'interior', 365, 'Remove cracked or moldy caulk. Clean and dry. Apply new silicone caulk; smooth bead. Allow cure before use.')
) AS v(title, description, category, frequency_days, instructions)
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_templates mt WHERE mt.title = v.title);
