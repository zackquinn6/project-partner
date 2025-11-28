/**
 * ONE-TIME IMPORT PAGE - DELETE AFTER USE
 * Navigate to /import-tile-content to run the import
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface ExcelRow {
  phase: string;
  operation: string;
  step: string;
  description: string;
  outputs: string;
  inputs: string;
}

interface ConsolidatedStep {
  phase: string;
  operation: string;
  step: string;
  description: string;
  outputs: string[];
  inputs: string[];
}

const PROJECT_ID = '0c3cecc0-bf7d-49e7-a94a-071f5d80fea3';

export default function ImportTileContent() {
  const [importing, setImporting] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const { toast } = useToast();
  
  const addLog = (message: string) => {
    setLog(prev => [...prev, message]);
    console.log(message);
  };

  const consolidateSteps = (rows: ExcelRow[]): ConsolidatedStep[] => {
    const stepMap = new Map<string, ConsolidatedStep>();
    
    rows.forEach(row => {
      const key = `${row.phase}|${row.operation}|${row.step}`;
      
      if (!stepMap.has(key)) {
        stepMap.set(key, {
          phase: row.phase,
          operation: row.operation,
          step: row.step,
          description: row.description,
          outputs: [],
          inputs: []
        });
      }
      
      const consolidated = stepMap.get(key)!;
      
      if (row.outputs) {
        const outputs = row.outputs
          .split(/\n|<br\/?>/gi)
          .map(o => o.trim())
          .filter(o => o);
        consolidated.outputs.push(...outputs);
      }
      
      if (row.inputs) {
        const inputs = row.inputs
          .split(/\*/)
          .map(i => i.replace(/<br\/?>/gi, '').trim())
          .filter(i => i);
        consolidated.inputs.push(...inputs);
      }
    });
    
    return Array.from(stepMap.values());
  };

  const parseOutputs = (outputStrings: string[]) => {
    const uniqueOutputs = [...new Set(outputStrings)];
    return uniqueOutputs.map((output, idx) => ({
      id: `output-${idx}-${Math.random().toString(36).substring(2, 8)}`,
      name: output,
      description: output,
      type: 'none'
    }));
  };

  const createCustomStandardPhases = async () => {
    addLog('Creating custom standard phases...');
    
    const customPhases = [
      { name: 'Prep', description: 'Site preparation and substrate work', position_rule: 'nth', position_value: 3 },
      { name: 'Install', description: 'Tile installation and setting', position_rule: 'nth', position_value: 4 },
      { name: 'Finish', description: 'Grouting, sealing, and final touches', position_rule: 'last_minus_n', position_value: 1 }
    ];
    
    const phaseMapping: Record<string, string> = {};
    
    for (const phase of customPhases) {
      // Create phase in project_phases for this project
      const { data, error } = await supabase
        .from('project_phases')
        .insert({
          project_id: PROJECT_ID,
          name: phase.name,
          description: phase.description,
          position_rule: phase.position_rule,
          position_value: phase.position_value,
          is_standard: false,
          standard_phase_id: null,
          display_order: phase.position_value || 0
        })
        .select('id')
        .single();
      
      if (error) {
        addLog(`❌ Error creating phase ${phase.name}: ${error.message}`);
        throw error;
      } else {
        addLog(`✅ Created phase: ${phase.name}`);
        phaseMapping[phase.name] = data.id;
      }
    }
    
    return phaseMapping;
  };

  const runImport = async () => {
    setImporting(true);
    setLog([]);
    
    try {
      addLog('🚀 Starting import...');
      
      // Create custom standard phases
      const phaseMapping = await createCustomStandardPhases();
      
      // Parse raw data
      const excelData: ExcelRow[] = [];
      const rawData = `Prep|Project Setup|Furniture and belongings move|Remove furniture, fixtures, and personal items; protect adjacent surfaces|No personal areas affected by dust|* Furniture qty<br/>* Distance to project
If nec|Prep|Project Setup|Heavy appliance move|Remove large appliances such as refrigerators|No personal areas affected by dust|* Furniture qty<br/>* Distance to project
Prime|Prep|Project Setup|Work station setup|Position mixing tools, water supply, cutting tools, and waste bins within easy reach while keeping the main floor clear.|No personal areas affected by dust<br/>Driveway / hard surfaces protected from dust<br/>Setup:<br/>Workbench, mixing area with water supply, cutting table, re-useable scraps, and final waste tile.|* Distance to project
Prime|Prep|Project Setup|Materials staging|Lay out tile boxes in installation order; pre-open shrink wrap to acclimate tiles to room temperature and humidity.|No personal areas affected by dust<br/>Acclimation time passed mfg minimum|* Duration check method
IF nec|Prep|Hazardous materials removal|Remove hazardous materials|If old adhesives or flooring contain asbestos or lead, hire a certified abatement contractor and follow containment protocols.|Hazardous materials remove and disposed of in compliance with federal, state, and local building codes|* Compliance reqts<br/>* Hazardous material type
Prime|Prep|Demo|Remove non-hazardous materials|Strip carpet, vinyl, or existing tile down to the substrate; use scrapers and floor scrubbing tools to clear residue.|Old materials removed from floor|* Flooring materials volume<br/>* Material type<br/>* Nail volume
If nec|Prep|Demo|Remove tile (>100sqft)|Strip tile using machine|Tile removed from floor|* Flooring materials volume<br/>* Material type<br/>* Nail volume
IF nec|Prep|Demo|Remove wall trim and prepare walls|Remove trim and loose materials from walls|Old materials removed from wall<br/>No paint tears<br/>No dents to drywall above baseboard<br/>No cracking to baseboard materials|* Stud location marking<br/>* Caulk cutting/paint scoring<br/>* Nail volume
IF nec|Prep|Demo|Remove toilet|Remove toilet from bathroom floor|Toilet removed<br/>Wax residue removed<br/>Flange condition inspected and documented<br/>Toilet drain pipe plugged<br/>No water spilled in house|*Toilet type/install method<br/>*Bolt rust<br/>*Lifting method<br/>*Water level<br/>*Water valve control
Prime|Prep|Demo - wood floor|Detailed finishing and prep|Fill cracks or low spots with patching compound; sand protrusions to achieve a uniform, flat surface.|Nails removed<br/>No loose debris / contamination<br/>Loose boards screwed down|* Surface inspection method
IF nec|Prep|Subfloor prep|Prep concrete|If concrete surface is not smooth, grind concrete slabs to remove laitance and improve thinset adhesion.|Concrete surface roughness prepared for thinset - 100% coverage<br/>No high points >1/8" in 10ft for natural stone, 1/4" in 10ft for ceramic/porcelain|*Grinding method<br/>*High point marking<br/>*High point identification method<br/>*Verification method
Prime|Prep|Assess floor|Measure|Re-verify dimensions after demo to account for any substrate changes; adjust layout plans as needed. Check moisture using moisture meter.|Condition report:<br/>Moisture level<br/>Level<br/>Subfloor thickness<br/>Subfloor material<br/>Transition zones<br/>Moulding heights|* Inspection method
IF nec|Prep|Subfloor prep|Install plywood subfloor|If subfloor thickness is <1-1/4"<br/>Screw down exterior-grade plywood over joists to create a stiff, screw-retention layer under tile.|Subfloor total thickness >1-1/4", no layer <3/8"<br/>Screws at least every 6"; no closer than 1/2" from edge<br/>Construction adhesive 95% applied to joists / underlying base|* Adhevsive coverage and thickness<br/>* Screwing pattern
IF nec|Prep|Subfloor prep|Apply self-leveler|If subfloor flatness is not 1/8" in 10ft or not level,<br/>Pour and spread self-leveling compound to smooth minor dips|Smooth - 1/8" in 10ft<br/>Adhesion of layer in mfg spec<br/>No drips to lower levels/outside project floor<br/>Max thickness per mfg spec|* Surface cleanliness<br/>* Primer application<br/>* Mix consitnecy<br/>* Application time since mix<br/>* Mfg of self-leveler<br/>* Spread method<br/>* Gauge rake setting
Prime|Prep|Cleaning|Clean tools|Remove thinset from tools|Thinset completely removed from tools<br/>Thinset not settling in drains|* Thinset waste location; water rinse duration<br/>* Thinset removal accuracy
IF nec|Prep|Subfloor prep|Cure self leveler|Allow leveler cure time before proceeding.|Wait time passed in line with manufacturer recommendation|* Manufacturer specification<br/>* Time track method
Alt|Prep|Tile base install|Install concrete board|If using concrete board,<br/>Fasten cement board panels with corrosion-resistant screws; tape seams with fiber mesh to prevent movement cracks.|Screws every 6", not closer than 1" from edge<br/>Thinset coverage and strength<br/>Seam staggering<br/>Seam 100% coverage with tape<br/>Floor gaps 1/4"-1/2"|* Thinset coverage<br/>* Trowel size<br/>* Screw pattern<br/>* Layout plan
Alt|Prep|Tile base install|Install uncoupling membrane|If using uncoupling membrane,<br/>Roll out and bond a membrane to isolate tile from substrate stresses and manage moisture.|Thinset coverage and strength<br/>Seam 100% coverage with tape<br/>Floor gaps 1/4"-1/2"|* Trowel size<br/>* Trowel angle<br/>* Towel direction<br/>* Setting pressure<br/>* Setting force direction<br/>* Layout plan<br/>* Thinset type
Prime|Prep|Layout|Plan layout|Plan layout using digital tools|reference walls defined<br/>starting line defined<br/>min 2" or 1/3 width on all tiles<br/>balanced spacing<br/>setting order defined (planning for no-walk on tile)<br/>grout line per design; min 1/16"<br/>Movement joint every 25ft|* Accurate measurements w/ grout<br/>* Reference walls
Prime|Prep|Layout|Dry test layout|Test layout for critical zones|Layout plan<br/>No broken tiles|* Layout plan<br/>* Tile handling method
Prime|Install|Cut|Wet saw cut|Use a water-cooled tile saw for straight, precise cuts on ceramic, porcelain, or natural stone.|Cut according to size - +/-1/16"<br/>Round cut according to profile - +/-1/4"<br/>No cracking of tile in-plane|* Saw blade condition<br/>* Feed rate<br/>* Water flow<br/>* Cut location along marking line (+/- 1/16")<br/>* Guide fence<br/>* Layout: high-stress cuts<br/>* Plunge cuts and drilling
Prime|Install|Cut|Snap & score cut|For thinner tiles, use a handheld snap cutter: score the glaze, snap the tile along the line, and smooth edges with a rubbing stone.|Straight cut according to size - +/-1/16"<br/>No cracking of tile in-plane|* Marking layout - using wax pencil or sharpie<br/>* Roller wheel condition<br/>* Score pressure<br/>* Snap pressure<br/>* Cut location along marking line (+/- 1/16")<br/>* Guide fence
Prime|Install|Cut|Grinder cut|Use an angle grinder with a diamond blade for curved or notched cuts|Round cut according to size - +/-1/4"<br/>Straight cut according to size - +/-1/8"<br/>No cracking of tile in-plane|* Saw blade condition<br/>* Feed rate<br/>* Water flow<br/>* Cut location along marking line (+/- 1/16")<br/>* Wheel speed<br/>* Wheel feed
Prime|Install|Cut|Cut trim|For metal edge profiles, cut to size|Cut within +/-1/32"|* Marking layout<br/>* Cut location along marking line (+/- 1/16")
Prime|Install|Cut|Drill|Fit tiles to pipes or other fixtures by drilling pilot holes first, then widen with a diamond-tipped bit under water spray.|No cracking of tile in-plane<br/>Hole diameter outside of 1/4" from plan<br/>Hole true position within 1/8"|* Drill condition<br/>* Water flow<br/>* Drill pressure<br/>* Drill guide<br/>* Starting method<br/>* Drill spin speed
Prime|Install|Cut|Polish|Smooth cut edges and chamfers with a fine-grit diamond grinder or hand scraper for a professional finish.|No cracking of tile in-plane<br/>No visible chips on edge (no magnification, 4" distance)<br/>Inner corner radius maintained per layout<br/><1/64" matl removal|* UPSTREAM: Cut speed<br/>* UPSTREAM: Water flow<br/>* Polishing grit<br/>* Polishing speed<br/>* Polishing pressure<br/>* Polishing location
Repeat|Install|Mix|Mix thinset|Combine mortar and water to a lump-free, peanut-butter consistency; slake (rest) then remix before use.|Peanut-butter consistency and no unmixed contents<br/>End time of mix logged|* Water and thinset volume per mfg spec<br/>* Mix time (Min 5min)<br/>* Mix speed<br/>* Paddle type
Repeat|Install|Set|Clean floor|Clean floor|No contamination|
Repeat|Install|Set|Apply thinset|Spread mortar with a notched trowel at the correct angle and depth to achieve complete coverage and target bed thickness.|95% thinset coverage<br/>Thinset thickness <1/8"<br/>Tiles undamaged|* Time since mix completion<br/>* Trowel notch size<br/>* Trowel coverage<br/>* Handlnig method<br/>* Hard points near tile
Repeat|Install|Set|Set tile|Press and wiggle each tile into the mortar bed, maintaining consistent spacing with wedges or spacers and periodic level checks.|Lippage <1/32"<br/>Thinset coverage 95% in wet zones, 80% in dry zones<br/>Grout line size per spec (+/- <1/64")<br/>Layout per plan (+/- 1/4")<br/>Grout nominal centerline must be straight<br/>Thinset lower than 1/8" from tile suface<br/>Thinset time from mix within mfg spec - 1hr max duration<br/>No visible sheet lines|* UPSTREAM: Floor flatness<br/>* UPSTREAM: Layout pattern<br/>* UPSTREAM: Grout size<br/>* UPSTREAM: Tile flatness<br/>* Thinset volume<br/>* Thinset consistency<br/>* Thinset troweling<br/>* Thinset time since mix<br/>* Leveling system pressure<br/>* Location of leveling spacers<br/>* Tile setting pressure too low<br/>* Tile setting wiggle too little<br/>* Floor contamination<br/>* For sheet-tile/mosaics especially pebble - remove pieces and place indiviaully<br/>* Back butter application<br/>* Leveling system tightness<br/>* Thinset volume near clips<br/>* Thinset volume
Inspect|Install|Set|Verify tile coverage|Remove tile and check coverage according to plan, re-install|Coverage >80% in floor, 95% in bath|* Check-point adhserence
Inspect|Install|Set|Correct layout|Inspect grout lines and make ongoing corrections to align layout|Grout line size per plan|* Visual check<br/>* Layout plan
Alt|Install|Install tile trim and baseboard|Install tile trim and baseboard|Fit bullnose profiles or baseboards at tile edges for a clean termination and edge protection.|Lippage <1/32"<br/>Thinset coverage 95% in wet zones, 80% in dry zones<br/>Grout line size per spec (+/- <1/64")<br/>Layout per plan (+/- 1/4")<br/>Grout nominal centerline must be straight<br/>Thinset time from mix within mfg spec - 1hr max duration<br/>Seated to wall|* For sheet-tile/mosaics especially pebble - remove pieces and place indiviaully<br/>* Back butter application
Prime|Install|Set|Clean thinset from tile|Using sponge and toothbrush, clean thinset from tile tops and in grout lines|Thinset >1/8" from surface in grout line<br/>Thinset coverage removed from tile|* Cleaning pressure<br/>* UPSTREAM: Excess grout volume<br/>* Tile leveling spacer qty
IF nec|Install|Pausing mid-project|Prepare stop point|Cut space for leveling spacers and remove loose thinset|Thinset removed from flooring not covered by tile<br/>Leveling clip added where next layer will be<br/>Tile set tight to leveling clip|* Thinset removal accuracy<br/>* Tile setting pressure
Prime|Finish|Cleaning|Clean tools|Remove thinset from tools|Thinset completely removed from tools|* Thinset waste location; water rinse duration<br/>* Thinset removal accuracy
Prime|Install|Thinset curing|Cure thinset|Permanently set thinset|Tile lippage <1/32"<br/>Thinset 100% cured|* Wait time<br/>* Humidity<br/>* Ambient temp
Prime|Install|Leveling system removal|Remove leveling clips|Snap off and remove leveling clips from tile surface|Level clips 100% removed<br/>Breaklines >1/8" below surface|* Strike force<br/>* Strike angle
Prime|Finish|Grout & caulk|Tile cleaning|Remove excess thinset from tile surface and grout lines|Thinset >1/8" from surface in grout line<br/>Thinset coverage removed from tile|*UPSTREAM: Incomplete cleaning<br/>* Cleaning / scraping pressure
Prime|Finish|Grout & caulk|Grout|Fill joints with grout using a rubber float, working diagonally across tiles to compact and wipe excess grout from edges.|100% coverage of grout lines<br/>No grout on tile<br/>Tooled radius in grout line<br/>No grout in change of planes (corners)<br/>Grout integrity|* Time since mix completion<br/>* Grout float angle<br/>* Cleaning force<br/>* Grout line coverage
Prime|Finish|Grout & caulk|Caulk|Seal perimeter and transition joints with a flexible, mildew-resistant caulk that matches grout color to accommodate movement.|Caulk 100% covered<br/>Caulk shaped with no reversals, defects or tile coverage|* Grout tip size<br/>* Expelled volume<br/>* Tape / masking placement
If nec|Finish|Seal|Seal|Apply penetrating or topical sealer to grout (and natural stone) to protect against stains and moisture ingress.|Sealant applied to 100% of grout<br/>No sealant applied to tile<br/>Sealant protected from water and contamination for mfg-spec'd duration, at least 2hr|* Tape placement<br/>* Sealant application volume<br/>* Sealant coverage
Alt|Finish|Install wood trim and baseboard|Install wood trim and baseboard|Reattach or install new wood moldings, mitered at corners, and nail them to the wall studs clear of the tile field.|Moldings nailed per pattern<br/>Moldings tight to wall<br/>No visible gaps to wall or in wood trim<br/>No caulk applied to wood-plane|* Baseboard cut length<br/>* Baseboard miter angle<br/>* UPSTREAM: Wall flatness<br/>* UPSTREAM: tile floor flatness
If nec|Finish|Install toilet|Install toilet|Install toilet on to new toilet floor|Toilet bolts mounted tight<br/>Toilet flat<br/>Toilet gap <1/8"<br/>Toilet caulked to floor|* Flange height relative to finished floor<br/>* Toilet type<br/>* Toilet lift method<br/>* Toilet install method<br/>* Wax/seal type<br/>* Bolt length<br/>* Bolt alignment<br/>* Lifting mechanism vs weight
Prime|Finish|Complete project|Document completion|Using app, take photos, complete workflows, and provide feedback|Photos, workflow, feedback completed|* Flange height relative to finished floor<br/>* Toilet type<br/>* Toilet lift method<br/>* Toilet install method<br/>* Wax/seal type<br/>* Bolt length<br/>* Bolt alignment<br/>* Lifting mechanism vs weight
Prime|Finish|Prep for pickup|Prep for pickup|Clean tools and add to packaging|Tools cleaned per cleaning plan<br/>100% of tools returned|* Checklist & packaging method
Prime|Finish|Materials disposal|Store leftover materials|Maintain a small collection of materials for future reference and replacement|5 full pieces stored safely - packaged in bubblewrap|* Storage location<br/>* Storage packaging<br/>* Item volume
Prime|Finish|Materials disposal|Dispose of waste tile and leftover materials|Remove materials from property|Materials removed from property<br/>Nails not sticking out of wood/materials<br/>Local waste compliance met|* Waste compliance regulations<br/>* Disposal method
Prime|Finish|Post-install inspection|Inspect grout and tile|Check for cracks in grout and tile|100% inspection completed under standard conditions|* Inspection distance (spec: 36" from walls and 60" from floor)<br/>* Inspection coverage`;

      rawData.split('\n').forEach(line => {
        const parts = line.split('|');
        if (parts.length >= 6) {
          excelData.push({
            phase: parts[1].trim(),
            operation: parts[2].trim(),
            step: parts[3].trim(),
            description: parts[4].trim(),
            outputs: parts[5].trim(),
            inputs: parts[6]?.trim() || ''
          });
        }
      });
      
      // Consolidate steps
      const consolidated = consolidateSteps(excelData);
      addLog(`📊 Consolidated ${excelData.length} rows into ${consolidated.length} unique steps`);
      
      // Group by phase and operation
      const phaseGroups = new Map<string, Map<string, ConsolidatedStep[]>>();
      
      consolidated.forEach(step => {
        if (!phaseGroups.has(step.phase)) {
          phaseGroups.set(step.phase, new Map());
        }
        const operationMap = phaseGroups.get(step.phase)!;
        if (!operationMap.has(step.operation)) {
          operationMap.set(step.operation, []);
        }
        operationMap.get(step.operation)!.push(step);
      });
      
      // Import each phase
      for (const [phaseName, operationMap] of phaseGroups) {
        const standardPhaseId = phaseMapping[phaseName];
        if (!standardPhaseId) {
          addLog(`⚠️  No standard phase mapping for: ${phaseName}`);
          continue;
        }
        
        addLog(`\n📦 Importing phase: ${phaseName}`);
        let operationOrder = 0;
        
        for (const [operationName, steps] of operationMap) {
          addLog(`  ➕ Creating operation: ${operationName}`);
          
          const { data: operation, error: opError } = await supabase
            .from('template_operations')
            .insert({
              project_id: PROJECT_ID,
              standard_phase_id: standardPhaseId,
              name: operationName,
              description: steps[0]?.description || operationName,
              display_order: operationOrder++
            })
            .select('id')
            .single();
          
          if (opError || !operation) {
            addLog(`    ❌ Error creating operation ${operationName}: ${opError?.message}`);
            continue;
          }
          
          let stepOrder = 0;
          for (const step of steps) {
            const contentSections = [{
              id: `content-${Math.random().toString(36).substring(2, 8)}`,
              type: 'text',
              content: step.description
            }];
            
            const { error: stepError } = await supabase
              .from('template_steps')
              .insert({
                operation_id: operation.id,
                step_number: stepOrder + 1,
                step_title: step.step,
                description: step.description,
                content_sections: contentSections,
                materials: [],
                tools: [],
                outputs: parseOutputs(step.outputs),
                apps: [],
                display_order: stepOrder++
              });
            
            if (stepError) {
              addLog(`      ❌ Error creating step ${step.step}: ${stepError.message}`);
            } else {
              addLog(`      ✅ ${step.step} (${step.outputs.length} outputs)`);
            }
          }
        }
      }
      
      addLog('\n🎉 Import complete! The trigger will automatically rebuild the phases JSON.');
      addLog('🎉 The Tile Flooring project now has standard phases PLUS custom Prep/Install/Finish phases with all steps.');
      
      toast({
        title: "Import Complete!",
        description: "Excel content has been successfully imported into the Tile Flooring project.",
      });
      
    } catch (error) {
      addLog(`\n❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Import Tile Flooring Content</h1>
        <p className="text-sm text-muted-foreground mb-6">
          This page will import all phases, operations, and steps from the Excel file into the Tile Flooring project.
          <br />
          <strong>Note:</strong> This is a one-time operation. After running, delete this page and its route.
        </p>
        
        <Button 
          onClick={runImport} 
          disabled={importing}
          size="lg"
        >
          {importing ? 'Importing...' : 'Run Import'}
        </Button>
        
        {log.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h2 className="font-semibold mb-2">Import Log:</h2>
            <div className="font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
              {log.map((entry, idx) => (
                <div key={idx}>{entry}</div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
