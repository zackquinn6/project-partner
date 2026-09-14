-- Home maintenance catalog: industry-standard frequency and guidance fixes,
-- missing system-specific templates, and modern-home technology tasks.
--
-- Research sources (2026-09-14 review):
--   USFA and CPSC: smoke and CO monthly test, yearly batteries, 10-year unit replace; dryer vent yearly
--   ENERGY STAR: HVAC filter check monthly, replace by about 90 days; annual HVAC tune-up
--   EPA WaterSense: water heater and softener annual service guidance
--   NFPA 211: chimney inspected annually
--   Manufacturer guidance: garage door auto-reverse typically monthly
--   DIY and smart-home checklists: camera verify, sensor batteries, leak sensors, EVSE visual check, UPS test
--
-- Idempotent: UPDATE by title; INSERT only when title does not exist.
-- Does NOT mutate existing user_maintenance_tasks rows.
-- Avoid slash characters in runnable SQL (some SQL editors mishandle them).

-- ---------------------------------------------------------------------------
-- A) Frequency and guidance fixes for existing templates
-- ---------------------------------------------------------------------------

-- CPSC: clean dryer exhaust vent at least yearly (more often if heavy use).
UPDATE public.maintenance_templates
SET
  frequency_days = 365,
  summary = 'Clear lint from the dryer vent and duct at least yearly.',
  instructions = '1. Unplug the dryer (and shut off gas if applicable). 2. Disconnect the transition duct and remove lint from the dryer outlet and duct. 3. Clear the outdoor vent hood so the flap opens freely. 4. Reconnect with a short, rigid or semi-rigid metal duct - do not use plastic foil. 5. Run a cycle and confirm strong airflow outside. Heavy use, pets, or long ducts: clean every 6 months. Call a pro if the run is long, inaccessible, or airflow stays weak.',
  risks_of_skipping = 'Lint buildup is a leading cause of dryer fires and long dry times.',
  benefits_of_maintenance = 'Lowers fire risk and keeps drying efficient.',
  repair_cost_savings = 'Avoids dryer fires, motor strain, and premature dryer replacement.',
  updated_at = now()
WHERE lower(trim(title)) IN ('clean dryer vent');

-- Manufacturer safety guidance: test auto-reverse monthly.
UPDATE public.maintenance_templates
SET
  frequency_days = 30,
  summary = 'Confirm the garage door reverses when it hits an obstruction.',
  instructions = '1. Place a sturdy object (such as a 2x4 laid flat) in the door path. 2. Close the door using the opener. 3. The door must reverse immediately on contact. 4. Test photo-eye sensors by interrupting the beam while closing - the door should reverse. 5. If either test fails, stop using the opener and have it serviced before relying on it.',
  risks_of_skipping = 'A door that does not reverse can injure people or pets and damage vehicles.',
  benefits_of_maintenance = 'Confirms the primary safety feature still works.',
  repair_cost_savings = 'Prevents injury and avoids damage claims from a failed opener.',
  updated_at = now()
WHERE lower(trim(title)) IN ('test garage door auto reverse');

-- Visible plumbing leak check: monthly on Essential plans.
UPDATE public.maintenance_templates
SET
  frequency_days = 30,
  summary = 'Check fixtures and visible pipes for drips or moisture each month.',
  instructions = '1. Look under sinks, around toilets, at the water heater, and at visible supply lines for drips or stains. 2. Check for soft flooring or musty smells near plumbing. 3. Note water meter movement with all fixtures off if you suspect a hidden leak. 4. Tighten accessible connections only if you know they are designed to be adjusted; otherwise call a plumber.',
  risks_of_skipping = 'Small leaks cause mold, rot, and high water bills when ignored.',
  benefits_of_maintenance = 'Catches leaks early while repairs are still small.',
  repair_cost_savings = 'Avoids water damage restoration that can cost thousands.',
  updated_at = now()
WHERE lower(trim(title)) IN ('check plumbing for leaks', 'inspect plumbing for leaks');

-- Align Inspect -> Check title if any remain for plumbing leaks.
UPDATE public.maintenance_templates
SET title = 'Check plumbing for leaks', updated_at = now()
WHERE lower(trim(title)) = 'inspect plumbing for leaks';

-- Smoke and CO batteries: clarify sealed 10-year units vs replaceable batteries.
UPDATE public.maintenance_templates
SET
  summary = 'Replace replaceable smoke and CO batteries yearly; skip sealed 10-year units.',
  instructions = '1. Identify each smoke and CO alarm type. Sealed 10-year lithium units do not get yearly battery swaps - replace the whole unit at end of life. 2. For battery-powered or hardwired-with-backup alarms, install fresh manufacturer-recommended batteries. 3. Close covers fully and press test on every unit until it sounds. 4. Vacuum dust from vents. 5. Note install or manufacture dates for the 10-year unit replacement task.',
  risks_of_skipping = 'Dead backup batteries leave hardwired alarms silent during outages; dead battery-only alarms provide no warning.',
  benefits_of_maintenance = 'Keeps detection working when you need it most.',
  repair_cost_savings = 'Working alarms are among the highest-ROI life-safety upgrades in a home.',
  updated_at = now()
-- Avoid slash in the matcher string (some SQL editors mishandle it). Match existing catalog title.
WHERE lower(trim(title)) LIKE 'replace smoke%batteries';

-- DIY-safe wording for furnace annual check.
UPDATE public.maintenance_templates
SET
  title = CASE WHEN title ~* '^Inspect\s+' THEN regexp_replace(title, '^Inspect\s+', 'Check ', 'i') ELSE title END,
  summary = 'Do an annual DIY visual check; schedule a licensed HVAC tune-up for combustion equipment.',
  instructions = '1. Replace or confirm a clean filter before heating season. 2. Keep clearances around the furnace; remove stored items. 3. Listen for unusual noises on startup. 4. Check for soot, rust, or water near the unit. 5. For gas or oil equipment, schedule a licensed HVAC technician for burner, heat exchanger, and safety control inspection - do not open sealed combustion chambers yourself.',
  risks_of_skipping = 'Neglected furnaces run inefficiently and can create carbon monoxide or fire hazards.',
  benefits_of_maintenance = 'Improves safety, comfort, and equipment life.',
  repair_cost_savings = 'Annual service costs far less than heat exchanger or full system replacement.',
  updated_at = now()
WHERE lower(trim(title)) IN ('inspect furnace', 'check furnace');

-- DIY-safe wording for AC annual check.
UPDATE public.maintenance_templates
SET
  title = CASE WHEN title ~* '^Inspect\s+' THEN regexp_replace(title, '^Inspect\s+', 'Check ', 'i') ELSE title END,
  summary = 'Prepare cooling season with a DIY check and professional service as needed.',
  instructions = '1. Turn power off at the disconnect before cleaning near the outdoor unit. 2. Clear leaves and debris 2 feet around the condenser. 3. Gently rinse coils with a hose from the inside out if accessible - no pressure washer. 4. Confirm indoor vents are open and the filter is clean. 5. Schedule a licensed HVAC tech for refrigerant, electrical, and performance checks if cooling is weak or the system is older.',
  updated_at = now()
WHERE lower(trim(title)) IN ('inspect ac unit', 'check ac unit');

-- DIY-safe wording for electrical panel (visual only).
UPDATE public.maintenance_templates
SET
  title = CASE WHEN title ~* '^Inspect\s+' THEN regexp_replace(title, '^Inspect\s+', 'Check ', 'i') ELSE title END,
  summary = 'Yearly visual check of the panel; leave internal work to a licensed electrician.',
  instructions = '1. With dry hands, open the panel door only (do not remove the dead-front cover). 2. Look for tripped breakers, burning smell, rust, or signs of moisture. 3. Confirm labels are readable. 4. Test that spare breakers are not warm with no load. 5. If you see scorching, buzzing, warmth, or corrosion, stop and call a licensed electrician - do not tighten lugs or remove covers yourself.',
  risks_of_skipping = 'Ignored panel problems can cause shocks, fires, or outage-prone circuits.',
  benefits_of_maintenance = 'Spots warning signs early while they are still visible DIY checks.',
  repair_cost_savings = 'Early electrician visits beat fire damage and full panel replacements.',
  updated_at = now()
WHERE lower(trim(title)) IN ('inspect electrical panel', 'check electrical panel');

-- Align dryer exhaust duct title after Inspect -> Check rename.
UPDATE public.maintenance_templates
SET title = 'Check dryer exhaust duct', updated_at = now()
WHERE lower(trim(title)) = 'inspect dryer exhaust duct';

UPDATE public.maintenance_templates
SET title = 'Check dishwasher door seal and connections', updated_at = now()
WHERE lower(trim(title)) = 'inspect dishwasher door seal and connections';

UPDATE public.maintenance_templates
SET title = 'Check home security system', updated_at = now()
WHERE lower(trim(title)) = 'inspect home security system';

UPDATE public.maintenance_templates
SET title = 'Check sump pump', updated_at = now()
WHERE lower(trim(title)) = 'inspect sump pump';

UPDATE public.maintenance_templates
SET title = 'Check fire extinguishers', updated_at = now()
WHERE lower(trim(title)) IN ('inspect fire extinguishers');

-- Align older chimney title with catalog name used by the plan wizard.
UPDATE public.maintenance_templates
SET title = 'Chimney inspection and cleaning', updated_at = now()
WHERE lower(trim(title)) = 'chimney cleaning';

-- ---------------------------------------------------------------------------
-- B) Missing system-specific templates + modern-home technology tasks
-- ---------------------------------------------------------------------------

INSERT INTO public.maintenance_templates (
  title,
  description,
  summary,
  instructions,
  category,
  frequency_days,
  criticality,
  risks_of_skipping,
  benefits_of_maintenance,
  repair_cost_savings,
  typical_season
)
SELECT
  v.title,
  v.description,
  v.summary,
  v.instructions,
  v.category,
  v.frequency_days,
  v.criticality,
  v.risks_of_skipping,
  v.benefits_of_maintenance,
  v.repair_cost_savings,
  v.typical_season
FROM (VALUES
  -- Missing system-specific (wizard already expected several of these)
  (
    'Water softener maintenance',
    'Keep salt levels correct and confirm the softener is regenerating as designed.',
    'Check salt and basic softener function yearly.',
    '1. Check the salt level and refill with the salt type listed in the manual. 2. Break up salt bridges with a broom handle if present. 3. Confirm the bypass valve is in service position. 4. Look for error codes or unusual regeneration frequency. 5. Schedule professional service about yearly per EPA WaterSense guidance if the unit underperforms.',
    'plumbing',
    365,
    2,
    'A neglected softener wastes water and salt and can send hard water that scales fixtures and appliances.',
    'Protects plumbing and appliances from scale and keeps softener efficiency.',
    'Avoids scale damage to water heaters and fixtures.',
    NULL
  ),
  (
    'Check septic system',
    'Walk the drain field and tank area for odors, soggy ground, or backups.',
    'Yearly homeowner check of septic tank and drain field.',
    '1. Locate the tank and drain field. 2. Look for lush wet spots, sewage odors, or slow drains house-wide. 3. Confirm access lids are secure and not buried beyond reach. 4. Review household habits (no grease, wipes, or harsh chemicals). 5. Arrange pumping based on tank size and household use - commonly every 3-5 years.',
    'plumbing',
    365,
    3,
    'Failing septics contaminate yards and groundwater and can shut down plumbing.',
    'Catches early signs before a full system failure.',
    'Avoids drain-field replacement that can cost tens of thousands.',
    NULL
  ),
  (
    'Pump septic tank',
    'Have the septic tank pumped on a multi-year cycle suited to household size.',
    'Pump the septic tank about every 3 years (adjust for use).',
    '1. Hire a licensed septic pumper. 2. Ask them to note sludge and scum depth and inspect baffles if accessible. 3. Keep a written record of pump dates and tank size. 4. Adjust the interval if the pumper finds rapid sludge buildup. 5. Never enter a septic tank yourself.',
    'plumbing',
    1095,
    3,
    'Overfull tanks send solids to the drain field and destroy it.',
    'Extends drain-field life and prevents sewage backups.',
    'Pumping is far cheaper than drain-field replacement.',
    NULL
  ),
  (
    'Chimney inspection and cleaning',
    'Annual chimney check for creosote, blockages, and sound masonry (NFPA 211).',
    'Inspect the chimney yearly; sweep when creosote builds up.',
    '1. Before heating season, look for nesting, damaged caps, and cracked masonry from the ground. 2. Hire a qualified chimney sweep for interior inspection and cleaning of wood-burning fireplaces and stoves. 3. Confirm carbon monoxide alarms near sleeping areas. 4. Do not burn trash or wet wood. 5. Stop use if you smell smoke indoors or see gaps in the flue.',
    'safety',
    365,
    3,
    'Creosote and blockages cause chimney fires and carbon monoxide intrusion.',
    'Keeps solid-fuel appliances safer to operate.',
    'Prevents chimney fires and CO incidents that dwarf sweep costs.',
    'fall'
  ),
  (
    'Lubricate garage door openers',
    'Lubricate rollers, hinges, and opener chain or screw drive on a quarterly cycle.',
    'Lubricate moving garage door parts every few months.',
    '1. Disconnect power if you will work near the opener motor. 2. Apply garage-door lubricant (not grease) to hinges, rollers, and springs per manufacturer guidance - never remove torsion springs yourself. 3. Wipe excess to avoid drips. 4. Lubricate the chain or screw drive as the manual specifies. 5. Cycle the door and listen for grinding or binding.',
    'safety',
    90,
    2,
    'Dry hardware wears faster and can bind or fail mid-cycle.',
    'Quieter operation and longer life for tracks and opener.',
    'Avoids premature opener and hardware replacement.',
    NULL
  ),
  (
    'Clean solar panels',
    'Remove dust, pollen, and debris so panels produce as designed.',
    'Clean accessible panels about twice yearly.',
    '1. Check the inverter first for production faults. 2. Clean from the ground with a soft brush and deionized or soft water when panels are cool - early morning is best. 3. Follow manufacturer rules; many roof arrays need a qualified tech. 4. Never walk on panels or use abrasive pads or pressure washers. 5. Trim shade growth that has grown over the array.',
    'exterior',
    182,
    2,
    'Dirty or shaded panels cut production and stretch payback time.',
    'Restores expected energy output.',
    'Recovers lost generation without new equipment.',
    'spring'
  ),
  (
    'Exercise standby generator',
    'Run and exercise a standby or portable generator so it starts in an outage.',
    'Exercise the generator monthly under load when safe.',
    '1. Follow the manufacturer exercise schedule. 2. For standby units, confirm automatic exercise ran and review the controller for faults. 3. For portables, start outdoors, never in a garage, and use a CO alarm. 4. Check oil, fuel treatment, and battery tender status. 5. Transfer switches and gas connections belong to qualified techs - do not improvise backfeeding.',
    'electrical',
    30,
    3,
    'An unexercised generator often fails exactly when power is out.',
    'Proves the unit will start and carry load when needed.',
    'Avoids food loss, flooded basements, and emergency rental generators.',
    NULL
  ),
  (
    'Pool chemistry and equipment check',
    'Test water chemistry and confirm pumps, filters, and safety covers work.',
    'Check pool water and equipment on a frequent summer cadence.',
    '1. Test free chlorine (or other sanitizer), pH, and alkalinity; adjust per your pool type. 2. Empty skimmer and pump baskets. 3. Note filter pressure and backwash or clean when the manufacturer says to. 4. Confirm drains and covers are intact. 5. Store chemicals dry and locked away from kids.',
    'exterior',
    7,
    2,
    'Poor chemistry damages surfaces and equipment and can make water unsafe.',
    'Keeps water swimmable and equipment running.',
    'Avoids plaster, liner, and heater damage from chemistry swings.',
    'summer'
  ),
  (
    'Winterize or open pool',
    'Close the pool for freeze season and reopen with balanced water in spring.',
    'Winterize and open the pool on a twice-yearly seasonal cycle.',
    '1. Follow your climate and equipment manual for blow-outs, antifreeze, and cover placement. 2. At opening, remove the cover carefully, reconnect equipment, and balance chemistry before swimming. 3. Inspect for cracks, loose fittings, and animal damage. 4. Hire a pool pro for freeze-prone plumbing if you are unsure. 5. Never leave standing water in exposed lines where hard freezes occur.',
    'exterior',
    182,
    2,
    'Skipped winterizing cracks plumbing; rushed openings risk cloudy unsafe water.',
    'Protects equipment through freeze-thaw and speeds spring ready-to-swim.',
    'Avoids freeze-broken pipes and pumps.',
    'fall'
  ),

  -- Modern home technology
  (
    'Replace smoke and CO alarm units (10-year life)',
    'Replace smoke and CO alarms at end of rated life, usually 10 years from the manufacture date.',
    'Replace alarm units about every 10 years from the date on the back.',
    '1. Read the manufacture date on each alarm. 2. Replace any unit at or past its rated life (commonly 10 years for smoke; follow the label for CO). 3. Install new alarms on every level, inside bedrooms, and outside sleeping areas per local code and manufacturer instructions. 4. Interconnect where required. 5. Test every new unit and recycle old alarms per local rules.',
    'safety',
    3650,
    3,
    'Sensors fail with age even if the test button still beeps.',
    'Restores reliable detection for the next decade.',
    'Working detectors prevent the highest-cost outcomes: injury and total loss fires.',
    NULL
  ),
  (
    'Verify security cameras and doorbell',
    'Confirm live view, motion alerts, recording, and night illumination still work.',
    'Quarterly proof that cameras and video doorbells still capture and alert.',
    '1. Open the camera app and confirm each device is online. 2. Walk the detection zone and verify an alert arrives. 3. Open live view and a recent recording; check timestamp and clarity. 4. Test night mode after dark or by covering the light sensor. 5. Fix Wi-Fi, power, or mount issues before relying on the system.',
    'security',
    90,
    2,
    'Silent camera failures leave you assuming coverage you no longer have.',
    'Proves recording and alerts before you need evidence.',
    'Avoids blind spots that undermine a paid monitoring or cloud plan.',
    NULL
  ),
  (
    'Clean camera and doorbell lenses and check night vision',
    'Clean lenses and IR windows so night video stays usable.',
    'Clean camera optics about twice yearly.',
    '1. Power-safe wipe lenses and IR windows with a microfiber cloth. 2. Clear spider webs and dirt from housings. 3. Confirm night video is not washed out by nearby lights. 4. Re-aim if foliage or new fixtures block the view. 5. Avoid solvents that haze plastic domes.',
    'security',
    182,
    1,
    'Dirty lenses and glare make recordings useless at night.',
    'Keeps video sharp for identification.',
    'Restores usable footage without buying new cameras.',
    NULL
  ),
  (
    'Check smart lock and entry keypad batteries',
    'Replace smart lock and keypad batteries on a schedule and confirm unlock still works.',
    'Check lock batteries about twice yearly.',
    '1. Review battery level in the lock app. 2. Replace with the size and chemistry the manufacturer specifies. 3. Test lock, unlock, keypad codes, and auto-lock. 4. Confirm mechanical key override still works. 5. Update firmware when the maker recommends it, then retest.',
    'security',
    182,
    2,
    'Dead lock batteries can lock you out or leave the door unsecured.',
    'Keeps entry reliable for family and emergency access.',
    'Avoids lockout service calls and forced-entry repairs.',
    NULL
  ),
  (
    'Check wireless security sensor batteries',
    'Replace batteries in door, window, and motion sensors before they die.',
    'Review sensor batteries every quarter.',
    '1. In the security or smart-home app, list sensors below about 20% battery. 2. Replace with approved cells and polarity. 3. Close covers fully and clear tamper alerts. 4. Open and close each protected opening to confirm the zone reports. 5. Cold garages and exterior sensors may need more frequent changes.',
    'security',
    90,
    2,
    'Dead sensors create silent gaps in intrusion and open-door alerts.',
    'Keeps the monitored perimeter honest.',
    'Prevents false confidence in a system that is partly offline.',
    NULL
  ),
  (
    'Test water leak sensors and alerts',
    'Prove leak sensors still notify you and trigger shutoff if installed.',
    'Test leak sensors and phone alerts quarterly.',
    '1. Place a damp cloth or a few drops of water on each sensor per the manual. 2. Confirm the app alert arrives within about a minute. 3. If you have an automatic shutoff valve, test it only after you understand how to reopen water safely. 4. Replace weak batteries. 5. Reposition sensors that never see drips under sinks, near the water heater, and at the washer.',
    'plumbing',
    90,
    3,
    'A silent leak sensor is as useful as no sensor during a supply-line break.',
    'Validates early warning that can stop major water damage.',
    'Leak stops and early alerts prevent catastrophic flooring and drywall claims.',
    NULL
  ),
  (
    'Check fridge and freezer water filter',
    'Replace the refrigerator water filter on the interval the maker specifies.',
    'Replace or check the fridge water filter about every 6 months.',
    '1. Read the filter reset interval in the manual or on the filter housing. 2. Shut off the supply if required, swap the cartridge, and check for leaks. 3. Flush several gallons as directed. 4. Reset the filter indicator. 5. If ice taste is poor after a new filter, flush again or check the ice bin.',
    'appliances',
    182,
    2,
    'Spent filters reduce flow and can affect water taste and ice quality.',
    'Keeps drinking water and ice tasting fresh.',
    'Protects the dispenser system from sediment-related failures.',
    NULL
  ),
  (
    'Check washing machine hoses',
    'Inspect washer supply hoses for cracks, bulges, and drips; replace aging rubber hoses.',
    'Yearly check of washing machine supply hoses.',
    '1. Turn off supply valves and look at both hoses for cracks, rusted fittings, or bulges. 2. Prefer braided stainless hoses and replace rubber hoses that are older than about 5 years. 3. Check the drain hose routing so it cannot slip out of the standpipe. 4. Run a fill cycle and recheck for drips. 5. Consider a pan or leak sensor under the washer.',
    'appliances',
    365,
    3,
    'Burst washer hoses are a top cause of sudden indoor flooding.',
    'Spots weak hoses before they fail.',
    'A hose swap costs little compared with flooded flooring and drywall.',
    NULL
  ),
  (
    'Inspect EV charger cable and connections',
    'Visually check the EVSE cable, connector, and mount for damage or overheating signs.',
    'Quarterly visual safety check of a home EV charger.',
    '1. Inspect the cable for cuts, crushed spots, or exposed conductors. 2. Check the connector pins for corrosion, bent contacts, or melted plastic. 3. Confirm the mount is solid and the housing is dry. 4. Note error lights or repeated breaker trips - stop use and call a qualified electrician. 5. Keep connectors off the ground and clear of standing water; never pressure-wash the unit.',
    'electrical',
    90,
    2,
    'Damaged EVSE cables and wet connections are shock and fire hazards.',
    'Catches cable and connector wear before a charge session fails unsafely.',
    'Avoids vehicle downtime and electrical repairs from ignored damage.',
    NULL
  ),
  (
    'Test UPS and network battery backup',
    'Self-test UPS units that protect modem, router, and critical networking gear.',
    'Test UPS runtime and replace aging batteries about twice yearly.',
    '1. Confirm modem, router, and critical nodes are actually plugged into battery-backed outlets. 2. Run the UPS self-test or simulate a brief outage and note runtime. 3. Replace sealed lead-acid batteries on the manufacturer interval (often 3-5 years). 4. Check for swelling, alarms, or failed self-tests. 5. Update UPS firmware if the vendor provides it.',
    'electrical',
    182,
    2,
    'A dead UPS battery means cameras, phones, and leak alerts drop offline in the first minutes of an outage.',
    'Keeps networking and security online through short outages.',
    'Avoids blind security and missed leak alerts during power blips.',
    NULL
  ),
  (
    'Update smart home hub firmware and review devices',
    'Apply hub firmware updates and remove orphaned or offline devices.',
    'Quarterly smart-home hygiene: firmware, offline devices, and key automations.',
    '1. Update hub or controller firmware from the vendor app when updates are available. 2. Review the device list for offline or renamed nodes. 3. Re-test critical automations (entry locks, leak alerts, camera recording). 4. Remove devices you no longer own. 5. Change default passwords on any gear that still has them.',
    'security',
    90,
    1,
    'Stale firmware and ghost devices break automations and leave security holes.',
    'Keeps the smart home predictable and patchable.',
    'Prevents silent automation failures that undermine paid devices.',
    NULL
  ),
  (
    'Clean mini-split filters',
    'Wash or vacuum mini-split indoor filters so the system can move air.',
    'Clean mini-split filters about every 3 months.',
    '1. Open the indoor unit cover and remove washable filters. 2. Vacuum or rinse per the manual; dry fully before reinstalling. 3. Wipe the return grille. 4. Keep outdoor clearance clear of leaves. 5. Call a tech for coil cleaning if airflow stays weak after clean filters.',
    'hvac',
    90,
    2,
    'Clogged mini-split filters cut capacity and can freeze coils.',
    'Restores airflow and efficiency.',
    'Avoids service calls caused only by dirty filters.',
    NULL
  ),
  (
    'Check heat pump outdoor unit clearance',
    'Keep the heat pump outdoor unit clear of debris, snow, and vegetation.',
    'Check outdoor unit clearance every quarter.',
    '1. Shut power off at the disconnect before reaching into the cabinet area. 2. Remove leaves, grass, and toys from around the unit - aim for about 2 feet of clearance. 3. In winter, clear snow and ice from the sides and top without bending fins. 4. Straighten bent fins gently with a fin comb if needed. 5. Listen for ice buildup that never clears - that needs an HVAC tech.',
    'hvac',
    90,
    2,
    'Blocked outdoor units short-cycle, ice up, and wear compressors.',
    'Protects heating and cooling capacity year-round.',
    'Prevents compressor damage from chronic airflow restriction.',
    NULL
  ),
  (
    'Check whole-house surge protector indicators',
    'Confirm whole-house surge protector status lights still show protection active.',
    'Yearly check of surge protector indicator lights.',
    '1. Locate the whole-house surge device at the panel or meter. 2. Confirm status LEDs match the manufacturer meaning for protected. 3. If indicators show end-of-life, schedule an electrician to replace the module. 4. Point-of-use strips also expire - replace after a major surge or when lights fail. 5. Do not open the electrical panel cover yourself.',
    'electrical',
    365,
    1,
    'A spent surge protector leaves electronics exposed while appearing installed.',
    'Verifies surge protection is still active.',
    'Protects HVAC boards, appliances, and electronics from the next surge.',
    NULL
  ),
  (
    'Verify garage door opener remote and keypad batteries',
    'Replace batteries in remotes and outdoor keypads before they fail.',
    'Yearly battery check for garage remotes and keypads.',
    '1. Replace remote and keypad batteries with the size listed in the manual. 2. Reprogram codes only if the manufacturer requires it after a battery change. 3. Test from typical parking distance. 4. Confirm the vacation lock or lock button state if equipped. 5. Wipe the keypad and check mounting screws.',
    'safety',
    365,
    1,
    'Dead remotes and keypads force unsafe workarounds or locked-out vehicles.',
    'Keeps everyday access reliable.',
    'Avoids locksmith or opener service calls for a simple battery.',
    NULL
  )
) AS v(
  title,
  description,
  summary,
  instructions,
  category,
  frequency_days,
  criticality,
  risks_of_skipping,
  benefits_of_maintenance,
  repair_cost_savings,
  typical_season
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.maintenance_templates mt
  WHERE lower(trim(mt.title)) = lower(trim(v.title))
);
