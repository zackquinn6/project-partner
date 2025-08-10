import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Project } from '@/interfaces/Project';

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
    {
      id: '1',
      name: 'Software Development Project',
      description: 'Complete software development lifecycle',
      createdAt: new Date(),
      updatedAt: new Date(),
      phases: [
        {
          id: '1',
          name: 'Discovery',
          description: 'Project discovery and planning phase',
          operations: [
            {
              id: '1',
              name: 'Requirements Gathering',
              description: 'Collect and document project requirements',
              steps: [
                {
                  id: '1',
                  step: 'Stakeholder Interviews',
                  description: 'Conduct interviews with key stakeholders',
                  contentType: 'text',
                  content: 'Schedule and conduct 1-on-1 interviews with each stakeholder',
                  materials: [
                    { id: '1', name: 'Interview Template', description: 'Standardized questions', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: '1', name: 'Recording Device', description: 'Digital recorder', category: 'Hardware', required: false },
                    { id: '2', name: 'Video Conferencing', description: 'Zoom, Teams, or similar', category: 'Software', required: true }
                  ],
                  outputs: [
                    { id: '1', name: 'Interview Notes', description: 'Documented responses', type: 'none' },
                    { id: '2', name: 'Requirements List', description: 'Initial requirements list', type: 'performance-durability', potentialEffects: 'Project delays, scope creep', photosOfEffects: 'timeline-issues.jpg', mustGetRight: 'Complete stakeholder buy-in', qualityChecks: 'Review with all stakeholders' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: '2',
      name: 'Tile Flooring Install',
      description: 'Complete tile flooring installation project from planning to finish',
      createdAt: new Date(),
      updatedAt: new Date(),
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
                },
                {
                  id: 'select-tiles',
                  step: 'Select Tiles and Materials',
                  description: 'Choose tiles, adhesive, grout, and other materials based on room requirements',
                  contentType: 'text',
                  content: 'Consider room moisture, traffic level, and aesthetic preferences. Select appropriate tile size and material.',
                  materials: [
                    { id: 'm3', name: 'Tile Samples', description: 'Various tile options', category: 'Other', required: true },
                    { id: 'm4', name: 'Material Spec Sheets', description: 'Technical specifications', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 't3', name: 'Smartphone', description: 'For photos and research', category: 'Hardware', required: true }
                  ],
                  outputs: [
                    { id: 'o3', name: 'Material List', description: 'Complete list of tiles and supplies', type: 'performance-durability', potentialEffects: 'Wrong materials, delays, cost overruns', photosOfEffects: 'wrong-materials.jpg', mustGetRight: 'Correct quantities and specifications', qualityChecks: 'Verify compatibility and quantities' },
                    { id: 'o4', name: 'Cost Estimate', description: 'Total material cost breakdown', type: 'none' }
                  ]
                }
              ]
            },
            {
              id: 'order-tools-op',
              name: 'Order Tools',
              description: 'Acquire all necessary tools and equipment for installation',
              steps: [
                {
                  id: 'tool-inventory',
                  step: 'Inventory Existing Tools',
                  description: 'Check what tools you already have and identify what needs to be purchased or rented',
                  contentType: 'text',
                  content: 'Go through your tool collection and make a list of what you have vs. what you need.',
                  materials: [
                    { id: 'm5', name: 'Checklist', description: 'Tool inventory checklist', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 't4', name: 'Existing Tools', description: 'Your current tool collection', category: 'Other', required: false }
                  ],
                  outputs: [
                    { id: 'o5', name: 'Tool Inventory', description: 'List of owned vs needed tools', type: 'none' },
                    { id: 'o6', name: 'Shopping List', description: 'Tools to purchase or rent', type: 'performance-durability', potentialEffects: 'Missing tools, work delays', photosOfEffects: 'missing-tools.jpg', mustGetRight: 'Complete tool list', qualityChecks: 'Cross-reference with installation steps' }
                  ]
                },
                {
                  id: 'acquire-tools',
                  step: 'Purchase/Rent Tools',
                  description: 'Buy or rent the required tools for the tile installation',
                  contentType: 'text',
                  content: 'Purchase basic tools and rent expensive equipment like wet saws. Test all tools before starting work.',
                  materials: [
                    { id: 'm6', name: 'Tool Receipts', description: 'Purchase documentation', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 't5', name: 'Vehicle', description: 'For tool transportation', category: 'Other', required: true }
                  ],
                  outputs: [
                    { id: 'o7', name: 'Complete Tool Set', description: 'All required tools acquired', type: 'safety', potentialEffects: 'Tool failures, safety hazards, project delays', photosOfEffects: 'tool-failure.jpg', mustGetRight: 'Quality tools in working condition', qualityChecks: 'Test all tools before use' },
                    { id: 'o8', name: 'Tool Organization', description: 'Tools organized and ready', type: 'none' }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 'prep-phase',
          name: 'Prep',
          description: 'Preparation of the space and surface for tile installation',
          operations: [
            {
              id: 'demo-op',
              name: 'Demo',
              description: 'Remove existing flooring and prepare subfloor',
              steps: [
                {
                  id: 'remove-flooring',
                  step: 'Remove Existing Flooring',
                  description: 'Carefully remove old flooring material without damaging subfloor',
                  contentType: 'video',
                  content: 'https://example.com/flooring-removal-video',
                  materials: [
                    { id: 'm7', name: 'Drop Cloths', description: 'Protect adjacent areas', category: 'Consumable', required: true },
                    { id: 'm8', name: 'Disposal Bags', description: 'For debris removal', category: 'Consumable', required: true }
                  ],
                  tools: [
                    { id: 't6', name: 'Pry Bar', description: 'For removing flooring', category: 'Hand Tool', required: true },
                    { id: 't7', name: 'Hammer', description: 'For demo work', category: 'Hand Tool', required: true },
                    { id: 't8', name: 'Knee Pads', description: 'Safety equipment', category: 'Other', required: true }
                  ],
                  outputs: [
                    { id: 'o9', name: 'Clean Subfloor', description: 'Exposed and clean subfloor', type: 'performance-durability', potentialEffects: 'Poor tile adhesion, uneven installation', photosOfEffects: 'dirty-subfloor.jpg', mustGetRight: 'Completely clean surface', qualityChecks: 'Visual inspection for debris and damage' },
                    { id: 'o10', name: 'Debris Removal', description: 'All old materials disposed', type: 'none' }
                  ]
                },
                {
                  id: 'inspect-subfloor',
                  step: 'Inspect and Repair Subfloor',
                  description: 'Check subfloor for damage, squeaks, and level issues',
                  contentType: 'text',
                  content: 'Walk the entire floor checking for squeaks, soft spots, or damage. Repair any issues before proceeding.',
                  materials: [
                    { id: 'm9', name: 'Wood Screws', description: 'For securing loose boards', category: 'Hardware', required: false },
                    { id: 'm10', name: 'Wood Filler', description: 'For gap filling', category: 'Consumable', required: false }
                  ],
                  tools: [
                    { id: 't9', name: 'Level', description: 'Check floor flatness', category: 'Hand Tool', required: true },
                    { id: 't10', name: 'Drill', description: 'For securing subfloor', category: 'Power Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o11', name: 'Subfloor Assessment', description: 'Documented condition report', type: 'performance-durability', potentialEffects: 'Tile cracking, uneven installation', photosOfEffects: 'subfloor-damage.jpg', mustGetRight: 'Level and secure subfloor', qualityChecks: 'Level check every 4 feet' },
                    { id: 'o12', name: 'Repair Plan', description: 'List of required repairs', type: 'none' }
                  ]
                }
              ]
            },
            {
              id: 'layout-op',
              name: 'Layout',
              description: 'Plan and mark the tile layout pattern',
              steps: [
                {
                  id: 'find-center',
                  step: 'Find Room Center',
                  description: 'Locate the center point of the room and establish reference lines',
                  contentType: 'text',
                  content: 'Measure and mark the center of each wall. Snap chalk lines to create center reference lines.',
                  materials: [
                    { id: 'm11', name: 'Chalk Line', description: 'For marking straight lines', category: 'Hardware', required: true },
                    { id: 'm12', name: 'Chalk', description: 'Blue chalk powder', category: 'Consumable', required: true }
                  ],
                  tools: [
                    { id: 't11', name: 'Measuring Tape', description: '25ft tape measure', category: 'Hand Tool', required: true },
                    { id: 't12', name: 'Square', description: 'Framing square for 90° angles', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o13', name: 'Center Lines', description: 'Chalk lines marking room center', type: 'performance-durability', potentialEffects: 'Crooked tile installation, poor aesthetics', photosOfEffects: 'crooked-layout.jpg', mustGetRight: 'Perfect 90° intersecting lines', qualityChecks: 'Verify with 3-4-5 triangle method' },
                    { id: 'o14', name: 'Reference Points', description: 'Marked starting points', type: 'none' }
                  ]
                },
                {
                  id: 'dry-layout',
                  step: 'Dry Layout Tiles',
                  description: 'Place tiles without adhesive to plan the final layout',
                  contentType: 'text',
                  content: 'Lay out tiles from center lines to walls. Adjust layout to avoid small cuts at visible edges.',
                  materials: [
                    { id: 'm13', name: 'Sample Tiles', description: 'Few tiles for layout test', category: 'Other', required: true },
                    { id: 'm14', name: 'Tile Spacers', description: 'For consistent gaps', category: 'Hardware', required: true }
                  ],
                  tools: [
                    { id: 't13', name: 'Tile Saw', description: 'For test cuts', category: 'Power Tool', required: false }
                  ],
                  outputs: [
                    { id: 'o15', name: 'Final Layout Plan', description: 'Optimized tile arrangement', type: 'major-aesthetics', potentialEffects: 'Poor visual appearance, small edge pieces', photosOfEffects: 'bad-layout.jpg', mustGetRight: 'Balanced layout with good edge pieces', qualityChecks: 'Client approval of layout' },
                    { id: 'o16', name: 'Cut List', description: 'List of tiles needing cuts', type: 'none' }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 'set-phase',
          name: 'Set',
          description: 'Cut tiles and set them in place with adhesive',
          operations: [
            {
              id: 'cut-op',
              name: 'Cut',
              description: 'Cut tiles to fit the layout plan',
              steps: [
                {
                  id: 'setup-cutting',
                  step: 'Setup Cutting Station',
                  description: 'Prepare wet saw and cutting area for safe and accurate cuts',
                  contentType: 'text',
                  content: 'Set up wet saw in well-ventilated area with proper drainage. Check blade and water flow.',
                  materials: [
                    { id: 'm15', name: 'Water', description: 'For saw cooling', category: 'Consumable', required: true },
                    { id: 'm16', name: 'Extension Cord', description: 'Heavy duty, GFCI protected', category: 'Hardware', required: true }
                  ],
                  tools: [
                    { id: 't14', name: 'Wet Saw', description: 'Tile cutting saw', category: 'Power Tool', required: true },
                    { id: 't15', name: 'Safety Glasses', description: 'Eye protection', category: 'Other', required: true },
                    { id: 't16', name: 'Hearing Protection', description: 'Ear plugs or muffs', category: 'Other', required: true }
                  ],
                  outputs: [
                    { id: 'o17', name: 'Safe Cutting Setup', description: 'Properly configured cutting station', type: 'safety', potentialEffects: 'Accidents, injuries, equipment damage', photosOfEffects: 'unsafe-setup.jpg', mustGetRight: 'All safety protocols followed', qualityChecks: 'Safety checklist verification' },
                    { id: 'o18', name: 'Blade Check', description: 'Sharp, properly installed blade', type: 'none' }
                  ]
                },
                {
                  id: 'cut-tiles',
                  step: 'Cut Tiles to Size',
                  description: 'Make precise cuts according to the layout plan',
                  contentType: 'video',
                  content: 'https://example.com/tile-cutting-techniques',
                  materials: [
                    { id: 'm17', name: 'Marker', description: 'For marking cut lines', category: 'Consumable', required: true },
                    { id: 'm18', name: 'Straight Edge', description: 'For marking straight lines', category: 'Hardware', required: true }
                  ],
                  tools: [
                    { id: 't17', name: 'Wet Saw', description: 'Tile cutting saw', category: 'Power Tool', required: true },
                    { id: 't18', name: 'Tile Nippers', description: 'For small cuts and curves', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o19', name: 'Cut Tiles', description: 'All tiles cut to proper sizes', type: 'major-aesthetics', potentialEffects: 'Poor fit, visible gaps, unprofessional appearance', photosOfEffects: 'bad-cuts.jpg', mustGetRight: 'Precise cuts within 1/16 inch', qualityChecks: 'Test fit each cut piece' },
                    { id: 'o20', name: 'Cut Quality', description: 'Clean, chip-free cuts', type: 'none' }
                  ]
                }
              ]
            },
            {
              id: 'mix-op',
              name: 'Mix',
              description: 'Prepare tile adhesive and other setting materials',
              steps: [
                {
                  id: 'prepare-adhesive',
                  step: 'Mix Tile Adhesive',
                  description: 'Prepare the correct amount of tile adhesive for the work session',
                  contentType: 'text',
                  content: 'Mix only what can be used in 30 minutes. Follow manufacturer ratios exactly.',
                  materials: [
                    { id: 'm19', name: 'Tile Adhesive', description: 'Modified thinset mortar', category: 'Consumable', required: true },
                    { id: 'm20', name: 'Clean Water', description: 'For mixing adhesive', category: 'Consumable', required: true }
                  ],
                  tools: [
                    { id: 't19', name: 'Mixing Bucket', description: 'Clean 5-gallon bucket', category: 'Hardware', required: true },
                    { id: 't20', name: 'Paddle Mixer', description: 'Drill attachment for mixing', category: 'Power Tool', required: true },
                    { id: 't21', name: 'Measuring Cup', description: 'For water measurement', category: 'Other', required: true }
                  ],
                  outputs: [
                    { id: 'o21', name: 'Mixed Adhesive', description: 'Properly mixed tile adhesive', type: 'performance-durability', potentialEffects: 'Poor adhesion, tile failure', photosOfEffects: 'adhesive-failure.jpg', mustGetRight: 'Correct consistency and mixture', qualityChecks: 'Check mix consistency against manufacturer specs' },
                    { id: 'o22', name: 'Work Time Planning', description: 'Planned adhesive usage timeline', type: 'none' }
                  ]
                },
                {
                  id: 'test-consistency',
                  step: 'Test Adhesive Consistency',
                  description: 'Verify the adhesive has the proper consistency for installation',
                  contentType: 'text',
                  content: 'Adhesive should hold notch trowel ridges without slumping. Adjust with small amounts of water or powder.',
                  materials: [
                    { id: 'm21', name: 'Test Tile', description: 'Sample tile for testing', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 't22', name: 'Notched Trowel', description: '3/16" V-notch trowel', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o23', name: 'Adhesive Approval', description: 'Verified proper consistency', type: 'performance-durability', potentialEffects: 'Poor tile adhesion, installation failure', photosOfEffects: 'wrong-consistency.jpg', mustGetRight: 'Perfect ridges that support tile', qualityChecks: 'Ridge test and tile pull test' },
                    { id: 'o24', name: 'Application Technique', description: 'Confirmed trowel technique', type: 'none' }
                  ]
                }
              ]
            },
            {
              id: 'set-op',
              name: 'Set Tiles',
              description: 'Install tiles in the adhesive following the layout plan',
              steps: [
                {
                  id: 'install-first-tiles',
                  step: 'Install First Row',
                  description: 'Set the first row of tiles along the center reference line',
                  contentType: 'text',
                  content: 'Start at center intersection and work outward. Use spacers and check level frequently.',
                  materials: [
                    { id: 'm22', name: 'Tiles', description: 'Floor tiles as selected', category: 'Consumable', required: true },
                    { id: 'm23', name: 'Tile Spacers', description: 'For consistent gaps', category: 'Hardware', required: true }
                  ],
                  tools: [
                    { id: 't23', name: 'Notched Trowel', description: '3/16" V-notch trowel', category: 'Hand Tool', required: true },
                    { id: 't24', name: 'Rubber Mallet', description: 'For setting tiles', category: 'Hand Tool', required: true },
                    { id: 't25', name: 'Level', description: 'For checking tile level', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o25', name: 'First Row Set', description: 'Properly installed first row', type: 'performance-durability', potentialEffects: 'Crooked installation, level issues', photosOfEffects: 'crooked-first-row.jpg', mustGetRight: 'Perfectly straight and level', qualityChecks: 'Level check every 3 tiles' },
                    { id: 'o26', name: 'Reference Standard', description: 'First row as guide for others', type: 'none' }
                  ]
                },
                {
                  id: 'continue-installation',
                  step: 'Complete Tile Installation',
                  description: 'Install remaining tiles following the established pattern',
                  contentType: 'text',
                  content: 'Work in small sections, maintaining consistent spacing and level. Clean excess adhesive as you go.',
                  materials: [
                    { id: 'm24', name: 'Remaining Tiles', description: 'All tiles for the room', category: 'Consumable', required: true },
                    { id: 'm25', name: 'Clean Rags', description: 'For cleaning excess adhesive', category: 'Consumable', required: true }
                  ],
                  tools: [
                    { id: 't26', name: 'Notched Trowel', description: '3/16" V-notch trowel', category: 'Hand Tool', required: true },
                    { id: 't27', name: 'Grout Float', description: 'For pressing tiles', category: 'Hand Tool', required: false },
                    { id: 't28', name: 'Clean Bucket', description: 'For clean-up water', category: 'Hardware', required: true }
                  ],
                  outputs: [
                    { id: 'o27', name: 'Complete Tile Field', description: 'All tiles installed', type: 'major-aesthetics', potentialEffects: 'Uneven surface, poor appearance', photosOfEffects: 'uneven-tiles.jpg', mustGetRight: 'Level, straight, consistent spacing', qualityChecks: 'Final level check across entire floor' },
                    { id: 'o28', name: 'Clean Installation', description: 'Excess adhesive removed', type: 'none' }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 'finish-phase',
          name: 'Finish',
          description: 'Complete the installation with grouting and final touches',
          operations: [
            {
              id: 'grout-op',
              name: 'Grout',
              description: 'Fill joints between tiles with grout',
              steps: [
                {
                  id: 'mix-grout',
                  step: 'Mix Grout',
                  description: 'Prepare grout mixture according to manufacturer specifications',
                  contentType: 'text',
                  content: 'Mix only enough grout for 30-45 minutes of work. Consistency should be like thick peanut butter.',
                  materials: [
                    { id: 'm26', name: 'Grout', description: 'Sanded or unsanded as appropriate', category: 'Consumable', required: true },
                    { id: 'm27', name: 'Clean Water', description: 'For mixing grout', category: 'Consumable', required: true }
                  ],
                  tools: [
                    { id: 't29', name: 'Mixing Bucket', description: 'Clean bucket for grout', category: 'Hardware', required: true },
                    { id: 't30', name: 'Mixing Paddle', description: 'For mixing grout', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o29', name: 'Mixed Grout', description: 'Properly mixed grout', type: 'performance-durability', potentialEffects: 'Poor joint filling, color variation', photosOfEffects: 'bad-grout-mix.jpg', mustGetRight: 'Consistent, lump-free mixture', qualityChecks: 'Texture and color consistency check' },
                    { id: 'o30', name: 'Grout Timing', description: 'Planned application schedule', type: 'none' }
                  ]
                },
                {
                  id: 'apply-grout',
                  step: 'Apply and Clean Grout',
                  description: 'Fill joints with grout and clean excess from tile surface',
                  contentType: 'video',
                  content: 'https://example.com/grout-application-technique',
                  materials: [
                    { id: 'm28', name: 'Grout Sponges', description: 'Clean, large-pore sponges', category: 'Consumable', required: true },
                    { id: 'm29', name: 'Clean Water Buckets', description: 'For sponge cleaning', category: 'Hardware', required: true }
                  ],
                  tools: [
                    { id: 't31', name: 'Grout Float', description: 'For applying grout', category: 'Hand Tool', required: true },
                    { id: 't32', name: 'Grout Strike Tool', description: 'For shaping joints', category: 'Hand Tool', required: false }
                  ],
                  outputs: [
                    { id: 'o31', name: 'Grouted Joints', description: 'Completely filled tile joints', type: 'performance-durability', potentialEffects: 'Water damage, loose tiles', photosOfEffects: 'incomplete-grout.jpg', mustGetRight: 'Complete joint filling without voids', qualityChecks: 'Inspect every joint for completeness' },
                    { id: 'o32', name: 'Clean Tile Surface', description: 'Grout haze removed from tiles', type: 'major-aesthetics', potentialEffects: 'Permanent haze, poor appearance', photosOfEffects: 'grout-haze.jpg', mustGetRight: 'Crystal clear tile surface', qualityChecks: 'Visual inspection under good lighting' }
                  ]
                }
              ]
            },
            {
              id: 'caulk-op',
              name: 'Caulk',
              description: 'Seal perimeter joints and transitions',
              steps: [
                {
                  id: 'prep-caulk-areas',
                  step: 'Prepare Caulk Areas',
                  description: 'Clean and prepare all areas that need caulking',
                  contentType: 'text',
                  content: 'Remove any grout from perimeter joints. Clean all surfaces thoroughly.',
                  materials: [
                    { id: 'm30', name: 'Masking Tape', description: 'For clean caulk lines', category: 'Consumable', required: true },
                    { id: 'm31', name: 'Cleaning Rags', description: 'For surface preparation', category: 'Consumable', required: true }
                  ],
                  tools: [
                    { id: 't33', name: 'Grout Removal Tool', description: 'For cleaning joints', category: 'Hand Tool', required: true },
                    { id: 't34', name: 'Vacuum', description: 'For debris removal', category: 'Power Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o33', name: 'Clean Joints', description: 'Prepared joints ready for caulk', type: 'performance-durability', potentialEffects: 'Poor caulk adhesion, water infiltration', photosOfEffects: 'dirty-joints.jpg', mustGetRight: 'Completely clean, dry surfaces', qualityChecks: 'Visual inspection of all joints' },
                    { id: 'o34', name: 'Taped Edges', description: 'Masking tape applied for clean lines', type: 'none' }
                  ]
                },
                {
                  id: 'apply-caulk',
                  step: 'Apply Caulk',
                  description: 'Apply caulk to all perimeter and transition joints',
                  contentType: 'text',
                  content: 'Apply steady, consistent bead. Tool immediately for smooth finish. Remove tape while caulk is wet.',
                  materials: [
                    { id: 'm32', name: 'Silicone Caulk', description: 'Color-matched to grout', category: 'Consumable', required: true },
                    { id: 'm33', name: 'Caulk Backing Rod', description: 'For deep joints', category: 'Consumable', required: false }
                  ],
                  tools: [
                    { id: 't35', name: 'Caulk Gun', description: 'For applying caulk', category: 'Hand Tool', required: true },
                    { id: 't36', name: 'Caulk Tool', description: 'For smoothing joints', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o35', name: 'Sealed Perimeter', description: 'All perimeter joints sealed', type: 'safety', potentialEffects: 'Water damage, mold growth, structural issues', photosOfEffects: 'water-damage.jpg', mustGetRight: 'Complete water-tight seal', qualityChecks: 'Water test after cure time' },
                    { id: 'o36', name: 'Professional Finish', description: 'Smooth, consistent caulk lines', type: 'major-aesthetics', potentialEffects: 'Unprofessional appearance', photosOfEffects: 'messy-caulk.jpg', mustGetRight: 'Smooth, straight caulk lines', qualityChecks: 'Visual inspection from multiple angles' }
                  ]
                }
              ]
            },
            {
              id: 'cleanup-op',
              name: 'Final Cleanup',
              description: 'Complete project cleanup and protection',
              steps: [
                {
                  id: 'final-cleaning',
                  step: 'Deep Clean Floor',
                  description: 'Thoroughly clean the entire tiled surface',
                  contentType: 'text',
                  content: 'Remove all construction dust and residue. Use appropriate tile cleaner for final cleaning.',
                  materials: [
                    { id: 'm34', name: 'Tile Cleaner', description: 'pH-neutral tile cleaner', category: 'Consumable', required: true },
                    { id: 'm35', name: 'Clean Mops', description: 'Microfiber mops', category: 'Consumable', required: true }
                  ],
                  tools: [
                    { id: 't37', name: 'Mop Bucket', description: 'For cleaning solution', category: 'Hardware', required: true },
                    { id: 't38', name: 'Vacuum', description: 'For final debris removal', category: 'Power Tool', required: true }
                  ],
                  outputs: [
                    { id: 'o37', name: 'Clean Floor', description: 'Spotless tiled surface', type: 'major-aesthetics', potentialEffects: 'Poor first impression, customer dissatisfaction', photosOfEffects: 'dirty-floor.jpg', mustGetRight: 'Pristine, ready-to-use surface', qualityChecks: 'White-glove cleanliness test' },
                    { id: 'o38', name: 'Protected Surface', description: 'Floor protected during cure time', type: 'none' }
                  ]
                },
                {
                  id: 'project-completion',
                  step: 'Project Documentation',
                  description: 'Document completed work and provide maintenance instructions',
                  contentType: 'text',
                  content: 'Take final photos, create maintenance schedule, and document warranty information.',
                  materials: [
                    { id: 'm36', name: 'Care Instructions', description: 'Maintenance guide printout', category: 'Other', required: true },
                    { id: 'm37', name: 'Warranty Docs', description: 'Material warranties', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 't39', name: 'Camera', description: 'For final documentation', category: 'Hardware', required: true }
                  ],
                  outputs: [
                    { id: 'o39', name: 'Completed Project', description: 'Fully installed tile floor', type: 'performance-durability', potentialEffects: 'Long-term performance issues', photosOfEffects: 'project-completion.jpg', mustGetRight: 'Quality installation meeting all standards', qualityChecks: 'Final walkthrough and sign-off' },
                    { id: 'o40', name: 'Project Documentation', description: 'Photos and maintenance guides', type: 'none' }
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
    setProjects(prev => prev.filter(project => project.id !== projectId));
    if (currentProject?.id === projectId) {
      const remainingProjects = projects.filter(p => p.id !== projectId);
      setCurrentProject(remainingProjects[0] || null);
    }
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