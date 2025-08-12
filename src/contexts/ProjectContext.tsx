import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Project } from '@/interfaces/Project';

// Import placeholder images
import interiorPaintingPlaceholder from '@/assets/interior-painting-placeholder.jpg';
import tileFlooringPlaceholder from '@/assets/tile-flooring-placeholder.jpg';
import lvpFlooringPlaceholder from '@/assets/lvp-flooring-placeholder.jpg';
import tileBacksplashPlaceholder from '@/assets/tile-backsplash-placeholder.jpg';
import landscapingPlaceholder from '@/assets/landscaping-placeholder.jpg';
import powerWashingPlaceholder from '@/assets/power-washing-placeholder.jpg';
import smartHomePlaceholder from '@/assets/smart-home-placeholder.jpg';
import drywallPlaceholder from '@/assets/drywall-placeholder.jpg';
import lightingPlaceholder from '@/assets/lighting-placeholder.jpg';
import homeMaintenancePlaceholder from '@/assets/home-maintenance-placeholder.jpg';

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([
    // Template projects from catalog (published status)
    {
      id: 'template-interior-painting',
      name: 'Interior Painting',
      description: 'Transform your space with professional interior painting techniques',
      image: interiorPaintingPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Interior',
      difficulty: 'Beginner',
      estimatedTime: '2-3 days',
      phases: []
    },
    {
      id: 'template-tile-flooring',
      name: 'Tile Flooring',
      description: 'Complete tile flooring installation from planning to finish',
      image: tileFlooringPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Flooring',
      difficulty: 'Intermediate',
      estimatedTime: '1-2 weeks',
      phases: [
        {
          id: 'planning-phase',
          name: 'Planning & Preparation',
          description: 'Plan layout, select materials, and prepare the workspace',
          operations: [
            {
              id: 'material-selection-op',
              name: 'Material Selection & Planning',
              description: 'Choose tiles, calculate quantities, and plan layout',
              steps: [
                {
                  id: 'room-measurement',
                  step: 'Measure and Map Room',
                  description: 'Accurately measure room dimensions and create a detailed floor plan',
                  contentType: 'text',
                  content: 'Use a measuring tape to record the length and width of the room. Measure any alcoves, closets, or irregular areas. Note the location of permanent fixtures like cabinets, toilets, or built-ins that will affect tile layout.\n\nCreate a scaled drawing on graph paper showing:\n- Overall room dimensions\n- Location of doors and transitions\n- Fixed obstacles\n- Direction of tile layout\n\nCalculate total square footage and add 10-15% for waste factor.',
                  materials: [
                    { id: 'm1', name: 'Measuring Tape', description: '25ft metal tape measure', category: 'Hardware', required: true },
                    { id: 'm2', name: 'Graph Paper', description: 'For creating scaled layout drawings', category: 'Consumable', required: true },
                    { id: 'm3', name: 'Pencil & Eraser', description: 'For marking and corrections', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 't1', name: 'Calculator', description: 'For square footage calculations', category: 'Other', required: true },
                    { id: 't2', name: 'Level', description: '2ft or 4ft level for checking floor flatness', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o1', name: 'Room Measurements', description: 'Accurate dimensions of all areas to be tiled', type: 'performance-durability', potentialEffects: 'Incorrect material orders, wasted tiles, project delays', mustGetRight: 'Measurements accurate to 1/8 inch', qualityChecks: 'Double-check all measurements twice' },
                    { id: 'o2', name: 'Layout Plan', description: 'Scaled drawing showing tile placement and cuts', type: 'major-aesthetics' }
                  ]
                },
                {
                  id: 'tile-selection',
                  step: 'Select Tiles and Materials',
                  description: 'Choose appropriate tiles based on room usage and personal preference',
                  contentType: 'text',
                  content: 'Consider these factors when selecting tiles:\n\n**Tile Type:**\n- Ceramic: Good for most areas, budget-friendly\n- Porcelain: More durable, better for high-traffic areas\n- Natural stone: Premium look but requires more maintenance\n\n**Size Considerations:**\n- Larger tiles (12"+ squares) make small rooms appear bigger\n- Smaller tiles provide better traction in wet areas\n- Rectangular tiles can elongate a space\n\n**Finish:**\n- Glossy: Easy to clean but shows scratches\n- Matte: Hides dirt better, less slippery when wet\n- Textured: Best slip resistance for bathrooms\n\n**Color/Pattern:**\n- Light colors make rooms appear larger\n- Dark colors hide dirt but show scratches\n- Consider maintenance requirements',
                  materials: [
                    { id: 'm4', name: 'Floor Tiles', description: 'Primary flooring material - quantity based on room measurements', category: 'Hardware', required: true },
                    { id: 'm5', name: 'Tile Spacers', description: '1/16" to 1/4" depending on tile style', category: 'Hardware', required: true },
                    { id: 'm6', name: 'Grout', description: 'Sanded or non-sanded based on joint width', category: 'Consumable', required: true },
                    { id: 'm7', name: 'Tile Adhesive', description: 'Modified thin-set mortar for floor installation', category: 'Consumable', required: true }
                  ],
                  tools: [],
                  outputs: [
                    { id: 'o3', name: 'Material List', description: 'Complete list of tiles and supplies needed', type: 'performance-durability' },
                    { id: 'o4', name: 'Tile Samples', description: 'Physical samples for final color/texture approval', type: 'major-aesthetics' }
                  ]
                }
              ]
            },
            {
              id: 'workspace-prep-op',
              name: 'Workspace Preparation',
              description: 'Clear and prepare the room for tile installation',
              steps: [
                {
                  id: 'room-clearing',
                  step: 'Clear and Clean Room',
                  description: 'Remove all furniture, fixtures, and debris from the installation area',
                  contentType: 'text',
                  content: 'Remove all moveable furniture and belongings from the room. If installing in a bathroom, remove the toilet and any other fixtures that will interfere with tile installation.\n\nClean the entire floor thoroughly:\n- Sweep up all debris\n- Vacuum thoroughly, especially corners and edges\n- Mop with degreasing cleaner if needed\n- Allow floor to dry completely\n\nProtect adjacent areas:\n- Cover furniture in adjoining rooms\n- Install plastic sheeting in doorways\n- Protect walls with painter\'s tape and plastic',
                  materials: [
                    { id: 'm8', name: 'Plastic Sheeting', description: 'For protecting adjacent areas', category: 'Other', required: true },
                    { id: 'm9', name: 'Painter\'s Tape', description: 'For securing protective materials', category: 'Consumable', required: true },
                    { id: 'm10', name: 'Cleaning Supplies', description: 'Broom, vacuum, mop, cleaner', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 't3', name: 'Shop Vacuum', description: 'For thorough debris removal', category: 'Power Tool', required: false }
                  ],
                  outputs: [
                    { id: 'o5', name: 'Clean Workspace', description: 'Room cleared and cleaned for installation', type: 'performance-durability' }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 'substrate-prep-phase',
          name: 'Substrate Preparation',
          description: 'Prepare the floor surface for tile installation',
          operations: [
            {
              id: 'floor-assessment-op',
              name: 'Floor Assessment & Leveling',
              description: 'Check floor flatness and make necessary repairs',
              steps: [
                {
                  id: 'flatness-check',
                  step: 'Check Floor Flatness',
                  description: 'Assess existing floor for level and identify high/low spots',
                  contentType: 'text',
                  content: 'Check floor flatness using a 4-foot level or straight edge:\n\n**Acceptable Tolerance:** No more than 1/4" variance over 10 feet, or 1/8" over 2 feet\n\n**Check Method:**\n1. Place level at multiple locations across the floor\n2. Look for gaps under the level indicating low spots\n3. Mark high spots where level rocks\n4. Pay special attention to transitions and doorways\n\n**Common Issues:**\n- Sagging subfloor (may need structural repair)\n- High spots from old flooring adhesive\n- Low spots from settling or poor installation\n- Uneven joists (professional evaluation needed)\n\nDocument all problem areas for repair planning.',
                  materials: [
                    { id: 'm11', name: 'Chalk or Marker', description: 'For marking problem areas', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 't4', name: '4-foot Level', description: 'For checking floor flatness', category: 'Hand Tool', required: true },
                    { id: 't5', name: 'Feeler Gauges', description: 'For measuring gap sizes', category: 'Hand Tool', required: false }
                  ],
                  outputs: [
                    { id: 'o6', name: 'Floor Assessment', description: 'Documentation of all high/low spots needing attention', type: 'performance-durability', potentialEffects: 'Cracked tiles, lippage, poor appearance', mustGetRight: 'Floor must be flat within tolerance', qualityChecks: 'Re-check with level after corrections' }
                  ]
                },
                {
                  id: 'floor-leveling',
                  step: 'Level Floor Surface',
                  description: 'Correct high spots and fill low areas to create level surface',
                  contentType: 'text',
                  content: '**Correcting High Spots:**\n- Sand down minor high spots with belt sander\n- Grind concrete high spots with concrete grinder\n- Remove protruding nails or screws\n- Plane down wood high spots carefully\n\n**Filling Low Spots:**\n- Use self-leveling compound for areas larger than 2 square feet\n- Use floor patch compound for smaller areas\n- Follow manufacturer\'s mixing instructions exactly\n- Pour compound slightly higher than surrounding floor\n- Use gauge rake to spread evenly\n- Allow full cure time before proceeding\n\n**Priming:**\n- Prime all patched areas according to compound manufacturer\n- Prime entire floor if required by adhesive manufacturer\n- Allow primer to dry completely',
                  materials: [
                    { id: 'm12', name: 'Self-Leveling Compound', description: 'For correcting major low spots', category: 'Other', required: false },
                    { id: 'm13', name: 'Floor Patch Compound', description: 'For small holes and low areas', category: 'Other', required: true },
                    { id: 'm14', name: 'Primer', description: 'As required by patch/adhesive manufacturer', category: 'Other', required: false },
                    { id: 'm15', name: 'Mixing Water', description: 'Clean water for compound mixing', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 't6', name: 'Belt Sander', description: 'For removing high spots', category: 'Power Tool', required: false },
                    { id: 't7', name: 'Mixing Bucket', description: 'For preparing compounds', category: 'Other', required: true },
                    { id: 't8', name: 'Gauge Rake', description: 'For spreading self-leveling compound', category: 'Hand Tool', required: false },
                    { id: 't9', name: 'Trowel', description: 'For applying patch compound', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o7', name: 'Level Floor Surface', description: 'Floor flat within acceptable tolerance', type: 'performance-durability', mustGetRight: 'Must meet flatness requirements for tile installation', qualityChecks: 'Re-check with 4-foot level' }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 'layout-phase',
          name: 'Layout & Reference Lines',
          description: 'Establish reference lines and plan tile layout',
          operations: [
            {
              id: 'reference-lines-op',
              name: 'Create Reference Lines',
              description: 'Establish accurate reference lines for tile placement',
              steps: [
                {
                  id: 'center-lines',
                  step: 'Establish Center Lines',
                  description: 'Create perpendicular center lines as reference for tile layout',
                  contentType: 'text',
                  content: 'Create accurate center reference lines:\n\n**Find Room Center:**\n1. Measure and mark the center point of each wall\n2. Snap chalk lines between opposite wall centers\n3. Check that lines are perpendicular using 3-4-5 triangle method\n4. Measure diagonals - they should be equal in a square room\n\n**3-4-5 Square Check:**\n- Mark 3 feet along one line from center\n- Mark 4 feet along perpendicular line from center\n- Diagonal between marks should be exactly 5 feet\n- Adjust lines if necessary\n\n**Alternative Starting Points:**\n- Start from most visible wall if room is significantly out of square\n- Consider starting from focal wall or room entrance\n- Avoid small cuts at prominent locations',
                  materials: [
                    { id: 'm16', name: 'Chalk Line', description: 'For snapping reference lines', category: 'Hardware', required: true },
                    { id: 'm17', name: 'Chalk Powder', description: 'Colored chalk for visibility', category: 'Consumable', required: true }
                  ],
                  tools: [
                    { id: 't10', name: 'Measuring Tape', description: '25ft tape for room measurements', category: 'Hand Tool', required: true },
                    { id: 't11', name: 'Speed Square', description: 'For checking perpendicular lines', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o8', name: 'Reference Lines', description: 'Accurate perpendicular lines for tile layout', type: 'performance-durability', mustGetRight: 'Lines must be perfectly perpendicular and accurately positioned', qualityChecks: 'Check square with 3-4-5 triangle method' }
                  ]
                },
                {
                  id: 'dry-layout',
                  step: 'Perform Dry Layout',
                  description: 'Test tile layout to minimize cuts and ensure good appearance',
                  contentType: 'text',
                  content: 'Test your tile layout before starting installation:\n\n**Layout Process:**\n1. Start at center point intersection\n2. Lay out tiles in both directions without adhesive\n3. Use spacers to maintain consistent gaps\n4. Continue until you reach all walls\n\n**Evaluate Cut Sizes:**\n- Avoid cuts smaller than 1/2 tile width\n- Try to make end cuts equal on opposite sides\n- Consider starting layout differently if cuts are too small\n\n**Adjust as Needed:**\n- Shift center lines to improve cut sizes\n- Consider different tile orientation\n- Plan layout to avoid small cuts at doorways\n\n**Mark Starting Point:**\n- Mark the actual starting tile position\n- This may not be at the center intersection\n- Ensure first course is perfectly straight',
                  materials: [
                    { id: 'm18', name: 'Sample Tiles', description: 'Few tiles for layout testing', category: 'Hardware', required: true },
                    { id: 'm19', name: 'Tile Spacers', description: 'For consistent spacing during layout', category: 'Hardware', required: true }
                  ],
                  tools: [],
                  outputs: [
                    { id: 'o9', name: 'Finalized Layout', description: 'Confirmed tile layout with acceptable cut sizes', type: 'major-aesthetics' },
                    { id: 'o10', name: 'Starting Point', description: 'Marked location for first tile installation', type: 'performance-durability' }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 'installation-phase',
          name: 'Tile Installation',
          description: 'Install tiles following proper techniques',
          operations: [
            {
              id: 'adhesive-application-op',
              name: 'Adhesive Application & First Tiles',
              description: 'Apply adhesive and install initial tiles',
              steps: [
                {
                  id: 'adhesive-mixing',
                  step: 'Mix Tile Adhesive',
                  description: 'Prepare tile adhesive according to manufacturer specifications',
                  contentType: 'text',
                  content: 'Proper adhesive mixing is critical for success:\n\n**Mixing Guidelines:**\n- Only mix what you can use in 30 minutes\n- Use clean mixing bucket and paddle\n- Add powder to water, not water to powder\n- Follow exact water ratios on package\n- Mix for full time specified (usually 2-3 minutes)\n- Let slake for 5 minutes, then re-mix briefly\n\n**Consistency Check:**\n- Should hold trowel ridges without slumping\n- Not too wet (won\'t hold ridges)\n- Not too dry (difficult to spread)\n- Should transfer cleanly from trowel\n\n**Working Time:**\n- Open time: 15-20 minutes typical\n- Skin check: gently touch adhesive - shouldn\'t transfer to finger\n- Remove and re-apply if skinned over',
                  materials: [
                    { id: 'm20', name: 'Modified Thin-set Mortar', description: 'Floor-rated tile adhesive', category: 'Consumable', required: true },
                    { id: 'm21', name: 'Clean Water', description: 'For mixing adhesive', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 't12', name: 'Mixing Bucket', description: '5-gallon bucket for adhesive', category: 'Other', required: true },
                    { id: 't13', name: 'Mixing Paddle', description: 'For drill or hand mixing', category: 'Hand Tool', required: true },
                    { id: 't14', name: 'Drill (optional)', description: 'For power mixing larger batches', category: 'Power Tool', required: false }
                  ],
                  outputs: [
                    { id: 'o11', name: 'Mixed Adhesive', description: 'Properly mixed tile adhesive ready for application', type: 'performance-durability', mustGetRight: 'Correct consistency and working time', qualityChecks: 'Trowel ridge test' }
                  ]
                },
                {
                  id: 'first-tiles',
                  step: 'Install First Section of Tiles',
                  description: 'Apply adhesive and install first tiles with proper technique',
                  contentType: 'text',
                  content: 'Install your first tiles with precision:\n\n**Adhesive Application:**\n1. Start in a 3x3 tile area\n2. Spread adhesive with flat side of trowel\n3. Comb with notched side at 45° angle\n4. Create uniform ridges - no bare spots\n5. Work in sections you can tile within 15 minutes\n\n**Tile Installation:**\n1. Place first tile at starting mark\n2. Lower into place - don\'t slide\n3. Twist slightly and press firmly\n4. Check for full adhesive contact\n5. Install spacers immediately\n6. Continue with adjacent tiles\n\n**Checking Work:**\n- Lift periodic tiles to verify 95% adhesive coverage\n- Keep surface level - check with straight edge\n- Clean excess adhesive from joints immediately\n- Maintain consistent spacing',
                  materials: [
                    { id: 'm22', name: 'Floor Tiles', description: 'Tiles for installation', category: 'Hardware', required: true },
                    { id: 'm23', name: 'Tile Spacers', description: 'Consistent spacing between tiles', category: 'Hardware', required: true }
                  ],
                  tools: [
                    { id: 't15', name: 'Notched Trowel', description: '1/4" x 3/8" notched trowel for floor tiles', category: 'Hand Tool', required: true },
                    { id: 't16', name: 'Rubber Mallet', description: 'For seating tiles without damage', category: 'Hand Tool', required: true },
                    { id: 't17', name: 'Level/Straight Edge', description: 'For checking tile alignment', category: 'Hand Tool', required: true },
                    { id: 't18', name: 'Sponge & Bucket', description: 'For cleaning excess adhesive', category: 'Other', required: true }
                  ],
                  outputs: [
                    { id: 'o12', name: 'First Tile Section', description: 'Successfully installed first section of tiles', type: 'performance-durability', mustGetRight: 'Level, properly spaced, full adhesive contact', qualityChecks: 'Check level, spacing, and adhesive coverage' }
                  ]
                }
              ]
            },
            {
              id: 'field-tile-installation-op',
              name: 'Field Tile Installation',
              description: 'Complete installation of full field tiles',
              steps: [
                {
                  id: 'field-tiles',
                  step: 'Install Field Tiles',
                  description: 'Complete installation of all full-size tiles in the main field',
                  contentType: 'text',
                  content: 'Continue installing field tiles systematically:\n\n**Installation Pattern:**\n- Work in pyramid pattern from starting point\n- Complete one section before moving to next\n- Maintain straight lines in both directions\n- Step back periodically to check overall alignment\n\n**Quality Control:**\n- Check level frequently with straight edge\n- Ensure consistent grout joint width\n- Remove excess adhesive immediately\n- Don\'t allow adhesive to cure in joints\n- Test tiles periodically for proper adhesion\n\n**Avoiding Problems:**\n- Don\'t kneel or walk on newly set tiles\n- Keep work area well-lit\n- Maintain consistent trowel technique\n- Replace any cracked or damaged tiles immediately\n\n**Progress Tracking:**\n- Complete full tiles before starting any cuts\n- Save perimeter tiles for last\n- Mark tiles needing cuts for later reference',
                  materials: [
                    { id: 'm24', name: 'Additional Tiles', description: 'Remaining field tiles', category: 'Hardware', required: true },
                    { id: 'm25', name: 'Extra Spacers', description: 'Sufficient spacers for entire installation', category: 'Hardware', required: true }
                  ],
                  tools: [
                    { id: 't19', name: 'Knee Pads', description: 'For comfortable kneeling during installation', category: 'Other', required: true },
                    { id: 't20', name: 'Utility Knife', description: 'For cutting spacers and cleaning joints', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o13', name: 'Completed Field Tiles', description: 'All full-size tiles installed correctly', type: 'performance-durability', mustGetRight: 'Level surface with consistent spacing', qualityChecks: 'Check with long straight edge across multiple tiles' }
                  ]
                }
              ]
            },
            {
              id: 'cut-tile-installation-op',
              name: 'Cut Tile Installation',
              description: 'Measure, cut, and install perimeter tiles',
              steps: [
                {
                  id: 'measuring-cuts',
                  step: 'Measure and Mark Cut Tiles',
                  description: 'Accurately measure each cut tile to ensure proper fit',
                  contentType: 'text',
                  content: 'Precise measurement is crucial for professional-looking cuts:\n\n**Measuring Technique:**\n1. Place tile to be cut against wall\n2. Account for spacer width in measurement\n3. Mark cut line on back of tile with pencil\n4. Double-check measurement before cutting\n5. Number tiles if cutting multiple similar pieces\n\n**Cut Types:**\n- Straight cuts: Use tile cutter or wet saw\n- L-shaped cuts: Multiple straight cuts or angle grinder\n- Curved cuts: Angle grinder with diamond blade\n- Holes for pipes: Diamond hole saw\n\n**Safety Reminders:**\n- Always wear safety glasses\n- Use dust mask when dry cutting\n- Ensure adequate ventilation\n- Keep cutting area clean and organized',
                  materials: [
                    { id: 'm26', name: 'Tiles for Cutting', description: 'Extra tiles designated for cuts', category: 'Hardware', required: true },
                    { id: 'm27', name: 'Pencil/Marker', description: 'For marking cut lines', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 't21', name: 'Tile Cutter', description: 'Manual cutter for straight cuts', category: 'Hand Tool', required: true },
                    { id: 't22', name: 'Wet Saw (optional)', description: 'For precise cuts and hard tiles', category: 'Power Tool', required: false },
                    { id: 't23', name: 'Angle Grinder', description: 'For irregular cuts and holes', category: 'Power Tool', required: false },
                    { id: 't24', name: 'Safety Glasses', description: 'Eye protection during cutting', category: 'Other', required: true }
                  ],
                  outputs: [
                    { id: 'o14', name: 'Cut Tiles', description: 'Properly sized tiles for perimeter installation', type: 'major-aesthetics', qualityChecks: 'Test fit each cut tile before installation' }
                  ]
                },
                {
                  id: 'installing-cuts',
                  step: 'Install Cut Tiles',
                  description: 'Install all cut tiles around perimeter and obstacles',
                  contentType: 'text',
                  content: 'Complete the installation with cut tiles:\n\n**Installation Process:**\n1. Test fit each cut tile before applying adhesive\n2. Apply adhesive to small areas for cut tiles\n3. Back-butter individual tiles if needed\n4. Install cut tiles with same spacing as field tiles\n5. Maintain level with adjacent full tiles\n\n**Finishing Touches:**\n- Remove all spacers before adhesive fully cures\n- Clean any adhesive from tile surfaces\n- Check for any loose or unlevel tiles\n- Allow adhesive to cure per manufacturer recommendations\n\n**Final Inspection:**\n- Walk entire floor checking for loose tiles\n- Verify consistent joint widths throughout\n- Ensure all tiles are level and properly aligned\n- Note any issues that need attention before grouting',
                  materials: [],
                  tools: [
                    { id: 't25', name: 'Spacer Removal Tool', description: 'For removing spacers from joints', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o15', name: 'Complete Tile Installation', description: 'All tiles installed and ready for grouting', type: 'performance-durability', mustGetRight: 'All tiles properly adhered and level', qualityChecks: 'Final inspection for loose or uneven tiles' }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 'finishing-phase',
          name: 'Grouting & Finishing',
          description: 'Complete the installation with grouting and final details',
          operations: [
            {
              id: 'grouting-op',
              name: 'Grout Installation',
              description: 'Mix and apply grout to complete the tile installation',
              steps: [
                {
                  id: 'grout-mixing',
                  step: 'Mix and Apply Grout',
                  description: 'Prepare grout and fill all joints between tiles',
                  contentType: 'text',
                  content: 'Proper grouting technique ensures long-lasting results:\n\n**Grout Preparation:**\n- Wait 24 hours minimum after tile installation\n- Remove all spacers and clean joints of debris\n- Mix only amount usable in 30 minutes\n- Follow water ratios exactly per manufacturer\n- Mix thoroughly and let slake 10 minutes\n\n**Application Technique:**\n1. Spread grout diagonally across tiles\n2. Press firmly to completely fill joints\n3. Work in small sections (3x3 feet)\n4. Remove excess grout with rubber float at 45° angle\n5. Don\'t drag grout out of joints\n\n**Initial Cleaning:**\n- Wait 15-20 minutes for grout to firm up\n- Clean tile surfaces with damp sponge\n- Rinse sponge frequently in clean water\n- Avoid removing grout from joints',
                  materials: [
                    { id: 'm28', name: 'Grout', description: 'Sanded or non-sanded based on joint width', category: 'Consumable', required: true },
                    { id: 'm29', name: 'Clean Water', description: 'For mixing and cleaning', category: 'Other', required: true },
                    { id: 'm30', name: 'Grout Sponges', description: 'Large pore sponges for cleaning', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 't26', name: 'Grout Float', description: 'Rubber float for grout application', category: 'Hand Tool', required: true },
                    { id: 't27', name: 'Mixing Bucket', description: 'Clean bucket for grout mixing', category: 'Other', required: true },
                    { id: 't28', name: 'Grout Mixing Paddle', description: 'For thorough grout mixing', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o16', name: 'Grouted Tile Surface', description: 'All joints filled with grout and initially cleaned', type: 'performance-durability', mustGetRight: 'Complete joint filling without voids', qualityChecks: 'Check for consistent grout level in all joints' }
                  ]
                },
                {
                  id: 'final-cleaning',
                  step: 'Final Cleaning and Sealing',
                  description: 'Complete final cleaning and apply sealer if required',
                  contentType: 'text',
                  content: 'Complete the project with thorough cleaning and protection:\n\n**Grout Haze Removal:**\n- Wait 2-4 hours for grout to cure\n- Clean grout haze with clean damp sponge\n- Use diagonal wiping motion across tiles\n- Change water frequently\n- Buff with clean cloth if needed\n\n**Final Curing:**\n- Keep foot traffic light for 24 hours\n- Avoid heavy traffic for 72 hours\n- Don\'t mop for at least 72 hours\n- Allow grout to cure 7-14 days before sealing\n\n**Sealing (if required):**\n- Natural stone tiles: Apply penetrating sealer\n- Grout joints: Apply grout sealer after full cure\n- Follow sealer manufacturer instructions\n- Ensure adequate ventilation during application\n\n**Final Inspection:**\n- Check for any remaining grout haze\n- Verify all joints are properly filled\n- Test for any loose tiles\n- Document completion date for warranty',
                  materials: [
                    { id: 'm31', name: 'Grout Sealer', description: 'For protecting grout joints (if required)', category: 'Other', required: false },
                    { id: 'm32', name: 'Stone Sealer', description: 'For natural stone tiles (if applicable)', category: 'Other', required: false },
                    { id: 'm33', name: 'Clean Cloths', description: 'For final buffing and cleaning', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 't29', name: 'Applicator Brush', description: 'For applying sealer', category: 'Hand Tool', required: false }
                  ],
                  outputs: [
                    { id: 'o17', name: 'Completed Tile Floor', description: 'Fully finished and cleaned tile installation', type: 'major-aesthetics', mustGetRight: 'Professional appearance without haze or defects', qualityChecks: 'Final walkthrough and quality inspection' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'template-lvp-flooring',
      name: 'LVP Flooring',
      description: 'Luxury vinyl plank flooring installation made simple',
      image: lvpFlooringPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Flooring',
      difficulty: 'Beginner',
      estimatedTime: '3-5 days',
      phases: []
    },
    {
      id: 'template-tile-backsplash',
      name: 'Tile Backsplash',
      description: 'Add style and protection with a beautiful tile backsplash',
      image: tileBacksplashPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Kitchen',
      difficulty: 'Intermediate',
      estimatedTime: '1-2 days',
      phases: []
    },
    {
      id: 'template-landscaping',
      name: 'Landscaping',
      description: 'Design and create beautiful outdoor spaces',
      image: landscapingPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Exterior',
      difficulty: 'Intermediate',
      estimatedTime: '1-3 weeks',
      phases: []
    },
    {
      id: 'template-power-washing',
      name: 'Power Washing',
      description: 'Restore surfaces with proper power washing techniques',
      image: powerWashingPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Exterior',
      difficulty: 'Beginner',
      estimatedTime: '1 day',
      phases: []
    },
    {
      id: 'template-smart-home',
      name: 'Smart Home',
      description: 'Install and configure smart home automation systems',
      image: smartHomePlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Technology',
      difficulty: 'Advanced',
      estimatedTime: '1-2 weeks',
      phases: []
    },
    {
      id: 'template-drywall',
      name: 'Drywall',
      description: 'Master drywall installation and finishing techniques',
      image: drywallPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Interior',
      difficulty: 'Intermediate',
      estimatedTime: '1 week',
      phases: []
    },
    {
      id: 'template-lighting',
      name: 'Lighting',
      description: 'Install and upgrade lighting fixtures safely',
      image: lightingPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Electrical',
      difficulty: 'Intermediate',
      estimatedTime: '1-2 days',
      phases: []
    },
    {
      id: 'template-home-maintenance',
      name: 'Home Maintenance',
      description: 'Essential maintenance tasks to keep your home in top condition',
      image: homeMaintenancePlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Maintenance',
      difficulty: 'Beginner',
      estimatedTime: 'Ongoing',
      phases: []
    },
    // Legacy project with full workflow (keep for demo purposes)
    {
      id: 'demo-tile-flooring',
      name: 'Tile Flooring Install (Demo)',
      description: 'Complete tile flooring installation project from planning to finish - with full workflow',
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date('2024-02-01'),
      planEndDate: new Date('2024-03-15'),
      status: 'not-started' as const,
      publishStatus: 'draft' as const,
      category: 'Flooring',
      difficulty: 'Intermediate',
      estimatedTime: '1-2 weeks',
      phases: [
        {
          id: 'plan-phase',
          name: 'Plan',
          description: 'Planning and preparation phase for tile installation',
          operations: [
            {
              id: 'pick-materials-op',
              name: 'Pick Materials',
              description: 'Select and calculate all materials needed for the project',
              steps: [
                {
                  id: 'measure-space',
                  step: 'Measure Space',
                  description: 'Accurately measure the room dimensions and calculate square footage',
                  contentType: 'text',
                  content: 'Measure length and width of each room. Account for closets, alcoves, and irregular spaces. Add 10% waste factor.',
                  materials: [
                    { id: 'm1', name: 'Measuring Tape', description: '25ft tape measure', category: 'Hardware', required: true },
                    { id: 'm2', name: 'Graph Paper', description: 'For sketching layout', category: 'Consumable', required: true }
                  ],
                  tools: [
                    { id: 't1', name: 'Calculator', description: 'For square footage calculations', category: 'Other', required: true },
                    { id: 't2', name: 'Pencil', description: 'For marking measurements', category: 'Other', required: true }
                  ],
                  outputs: [
                    { id: 'o1', name: 'Room Measurements', description: 'Accurate room dimensions', type: 'performance-durability', potentialEffects: 'Incorrect material orders, project delays', photosOfEffects: 'measurement-errors.jpg', mustGetRight: 'Precise measurements within 1/4 inch', qualityChecks: 'Double-check all measurements' },
                    { id: 'o2', name: 'Layout Sketch', description: 'Hand-drawn room layout', type: 'none' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]);
  
  const [currentProject, setCurrentProject] = useState<Project | null>(projects[0] || null);

  const addProject = (project: Project) => {
    setProjects(prev => [...prev, project]);
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(prev => 
      prev.map(project => 
        project.id === updatedProject.id ? updatedProject : project
      )
    );
    if (currentProject?.id === updatedProject.id) {
      setCurrentProject(updatedProject);
    }
  };

  const deleteProject = (projectId: string) => {
    setProjects(prev => {
      const updatedProjects = prev.filter(project => project.id !== projectId);
      
      // If the deleted project was the current project, set a new current project
      if (currentProject?.id === projectId) {
        setCurrentProject(updatedProjects[0] || null);
      }
      
      return updatedProjects;
    });
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      setCurrentProject,
      addProject,
      updateProject,
      deleteProject
    }}>
      {children}
    </ProjectContext.Provider>
  );
};