import { Project, Phase, Operation, WorkflowStep, LibraryTool, LibraryMaterial, Material, Tool, ContentSection } from '@/interfaces/Project';
import { addStandardPhasesToProjectRun } from './projectUtils';

// Tool references for tile installation
export const tileInstallationTools: LibraryTool[] = [
  {
    id: 'tile-cutter',
    item: 'Wet Tile Saw',
    description: 'Electric wet saw for cutting ceramic and porcelain tiles',
    example_models: 'DEWALT D24000, Ridgid R4092',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'notched-trowel',
    item: 'Notched Trowel',
    description: '1/4" x 3/8" notched trowel for spreading tile adhesive',
    example_models: 'Various manufacturers',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'rubber-float',
    item: 'Rubber Grout Float',
    description: 'Rubber float for applying grout between tiles',
    example_models: 'QEP 10-77, Marshalltown 145',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tile-spacers',
    item: 'Tile Spacers',
    description: 'Plastic spacers for consistent tile gaps',
    example_models: '1/16", 1/8", 3/16" sizes',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'chalk-line',
    item: 'Chalk Line',
    description: 'For marking layout lines on floor/wall',
    example_models: 'Irwin Strait-Line, Tajima',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'level-4ft',
    item: '4-Foot Level',
    description: 'For checking surface level and tile alignment',
    example_models: 'Stanley 42-324, Stabila 16',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'rubber-mallet',
    item: 'Rubber Mallet',
    description: 'For tapping tiles into place without damage',
    example_models: 'Estwing RWM-16, Stanley 57-529',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mixing-paddle',
    item: 'Mixing Paddle & Drill',
    description: 'Paddle attachment for mixing adhesive and grout',
    example_models: 'Marshalltown M687, QEP 10020Q',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'sponges',
    item: 'Grout Sponges',
    description: 'Large pore sponges for grout cleanup',
    example_models: 'QEP 70005Q, Goldblatt G02203',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Material references for tile installation  
export const tileInstallationMaterials: LibraryMaterial[] = [
  {
    id: 'floor-tiles',
    item: 'Ceramic/Porcelain Floor Tiles',
    description: 'Main flooring tiles - recommend 10% extra for cuts and waste',
    unit_size: 'Per square foot',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tile-adhesive',
    item: 'Tile Adhesive/Mortar',
    description: 'Premium grade tile adhesive suitable for floor installation',
    unit_size: 'Per 50 lb bag',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tile-grout',
    item: 'Sanded Grout',
    description: 'Sanded grout for joints 1/8" and larger',
    unit_size: 'Per 25 lb bag',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'grout-sealer',
    item: 'Grout Sealer',
    description: 'Penetrating sealer to protect grout lines',
    unit_size: 'Per quart',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'underlayment',
    item: 'Floor Underlayment',
    description: 'Cement backer board for subfloor preparation',
    unit_size: 'Per 3x5 sheet',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'transition-strips',
    item: 'Transition Strips',
    description: 'Metal or wood strips for transitions to other flooring',
    unit_size: 'Per linear foot',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const createTileInstallationProject = (): Project => {
  // Surface Preparation Phase
  const surfacePrepOperation: Operation = {
    id: 'surface-prep-operation',
    name: 'Surface Preparation',
    description: 'Prepare the subfloor for tile installation',
    steps: [
      {
        id: 'inspect-subfloor-step',
        step: 'Inspect and Clean Subfloor', 
        description: 'Thoroughly inspect subfloor for damage and clean completely',
        contentType: 'text' as const,
        content: 'Ensure your surface is clean, smooth, dry and free of wax, soap scum and grease. Any damaged, loose or uneven areas must be repaired, patched and leveled.',
        contentSections: [
          {
            id: 'inspect-content-1',
            type: 'text',
            content: 'Ensure your surface is clean, smooth, dry and free of wax, soap scum and grease. Any damaged, loose or uneven areas must be repaired, patched and leveled.'
          },
          {
            id: 'inspect-content-2', 
            type: 'text',
            content: 'Remove any moldings, trim, appliances, etc., which could interfere with installation. Door jambs may be undercut for tile to slip under.',
            title: 'Removal Preparation'
          }
        ],
        materials: [
          { id: 'cleaning-supplies', name: 'Floor Cleaning Supplies', description: 'Degreaser, scraper, vacuum', category: 'Consumable' as const, required: true }
        ],
        tools: [
          { id: 'putty-knife', name: 'Putty Knife', description: 'For scraping and removing debris', category: 'Hand Tool' as const, required: true },
          { id: 'vacuum', name: 'Shop Vacuum', description: 'For thorough cleaning', category: 'Power Tool' as const, required: true }
        ],
        outputs: [{
          id: 'clean-subfloor-output',
          name: 'Clean Subfloor',
          description: 'Subfloor cleaned and inspected, ready for underlayment',
          type: 'none' as const
        }]
      },
      {
        id: 'install-underlayment-step',
        step: 'Install Underlayment',
        description: 'Install cement backer board or appropriate underlayment',
        contentType: 'text' as const,
        content: 'Install cement backer board using appropriate screws every 8 inches. Stagger joints and leave 1/8" gaps between sheets.',
        contentSections: [
          {
            id: 'underlayment-content-1',
            type: 'text',
            content: 'Install cement backer board using appropriate screws every 8 inches. Stagger joints and leave 1/8" gaps between sheets.'
          },
          {
            id: 'underlayment-content-2',
            type: 'text', 
            content: 'Seal all joints with mesh tape and thinset mortar. Allow to cure according to manufacturer specifications.',
            title: 'Joint Sealing'
          }
        ],
        materials: [
          { id: 'underlayment', name: 'Floor Underlayment', description: 'Cement backer board', category: 'Hardware' as const, required: true },
          { id: 'backer-screws', name: 'Backer Board Screws', description: '1-1/4" cement board screws', category: 'Hardware' as const, required: true },
          { id: 'mesh-tape', name: 'Alkali-Resistant Mesh Tape', description: 'For sealing joints', category: 'Consumable' as const, required: true }
        ],
        tools: [
          { id: 'drill', name: 'Power Drill', description: 'For installing screws', category: 'Power Tool' as const, required: true },
          { id: 'utility-knife', name: 'Utility Knife', description: 'For cutting backer board', category: 'Hand Tool' as const, required: true }
        ],
        outputs: [{
          id: 'underlayment-output',
          name: 'Installed Underlayment',
          description: 'Underlayment installed and cured, ready for tile',
          type: 'none' as const
        }]
      }
    ]
  };

  const layoutPlanningOperation: Operation = {
    id: 'layout-planning-operation', 
    name: 'Layout Planning',
    description: 'Plan and mark tile layout for optimal appearance',
    steps: [
      {
        id: 'mark-center-lines-step',
        step: 'Mark Center Lines',
        description: 'Find and mark the center point and create layout lines',
        contentType: 'text' as const,
        content: 'Begin by marking the center point of all four walls. Snap chalk lines between the center points of opposite walls, which will intersect at the center of room.',
        contentSections: [
          {
            id: 'center-content-1',
            type: 'text',
            content: 'Begin by marking the center point of all four walls. Snap chalk lines between the center points of opposite walls, which will intersect at the center of room.'
          },
          {
            id: 'center-content-2',
            type: 'text',
            content: 'Make sure they\'re perfectly square, and adjust if necessary. Use the 3-4-5 triangle method to verify square.',
            title: 'Square Check'
          }
        ],
        materials: [],
        tools: [
          { id: 'chalk-line', name: 'Chalk Line', description: 'For marking layout lines', category: 'Hand Tool' as const, required: true },
          { id: 'measuring-tape', name: 'Measuring Tape', description: '25ft minimum', category: 'Hand Tool' as const, required: true },
          { id: 'square', name: 'Carpenter\'s Square', description: 'For checking right angles', category: 'Hand Tool' as const, required: true }
        ],
        outputs: [{
          id: 'center-lines-output',
          name: 'Layout Lines Marked',
          description: 'Center lines marked and verified square',
          type: 'none' as const
        }]
      },
      {
        id: 'dry-lay-tiles-step',
        step: 'Dry Lay Tiles',
        description: 'Lay out tiles without adhesive to plan cuts and spacing',
        contentType: 'text' as const,
        content: 'Next, lay out a row of loose tiles along the center lines in both directions, leaving spaces for uniform joints (use tile spacers).',
        contentSections: [
          {
            id: 'dry-lay-content-1',
            type: 'text',
            content: 'Next, lay out a row of loose tiles along the center lines in both directions, leaving spaces for uniform joints (use tile spacers).'
          },
          {
            id: 'dry-lay-content-2',
            type: 'text',
            content: 'If this layout leaves cuts smaller than 1/2 tile at walls, adjust the center line by snapping a new line 1/2 tile closer to the wall.',
            title: 'Adjusting Layout'
          },
          {
            id: 'dry-lay-content-3',
            type: 'text',
            content: 'Now divide the room into smaller grids (approx. 2\' x 3\') by snapping additional lines parallel to center lines.',
            title: 'Grid Creation'
          }
        ],
        materials: [
          { id: 'sample-tiles', name: 'Sample Tiles', description: 'Several tiles for layout planning', category: 'Consumable' as const, required: true }
        ],
        tools: [
          { id: 'tile-spacers', name: 'Tile Spacers', description: 'Various sizes for testing', category: 'Hardware' as const, required: true }
        ],
        outputs: [{
          id: 'dry-layout-output',
          name: 'Dry Layout Complete', 
          description: 'Tile layout planned and marked, ready for installation',
          type: 'none' as const
        }]
      }
    ]
  };

  const preparationPhase: Phase = {
    id: 'preparation-phase',
    name: 'Preparation',
    description: 'Prepare surface and plan tile layout',
    operations: [surfacePrepOperation, layoutPlanningOperation]
  };

  // Tile Installation Phase
  const adhesiveApplicationOperation: Operation = {
    id: 'adhesive-application-operation',
    name: 'Adhesive Application',
    description: 'Mix and apply tile adhesive properly',
    steps: [
      {
        id: 'mix-adhesive-step',
        step: 'Mix Tile Adhesive',
        description: 'Prepare tile adhesive according to manufacturer instructions',
        contentType: 'text' as const,
        content: 'Select the right adhesive for the substrate you\'re using. Carefully read and follow all instructions and precautions on the adhesive or mortar package.',
        contentSections: [
          {
            id: 'mix-content-1',
            type: 'text',
            content: 'Select the right adhesive for the substrate you\'re using. Carefully read and follow all instructions and precautions on the adhesive or mortar package.'
          },
          {
            id: 'mix-content-2',
            type: 'text',
            content: 'Mix only enough to be used within 30 minutes. Use a mixing paddle and drill for consistent texture.',
            title: 'Mixing Guidelines'
          }
        ],
        materials: [
          { id: 'tile-adhesive', name: 'Tile Adhesive/Mortar', description: 'Premium grade mortar', category: 'Consumable' as const, required: true }
        ],
        tools: [
          { id: 'mixing-paddle', name: 'Mixing Paddle & Drill', description: 'For consistent mixing', category: 'Power Tool' as const, required: true },
          { id: 'mixing-bucket', name: 'Mixing Bucket', description: 'Clean 5-gallon bucket', category: 'Hardware' as const, required: true }
        ],
        outputs: [{
          id: 'mixed-adhesive-output',
          name: 'Mixed Adhesive',
          description: 'Properly mixed adhesive ready for application',
          type: 'none' as const
        }]
      },
      {
        id: 'apply-adhesive-step',
        step: 'Apply Adhesive',
        description: 'Spread adhesive using proper troweling technique',
        contentType: 'text' as const,
        content: 'Using the type of trowel recommended on the adhesive package spread a 1/4" coat on the surface of one grid area, using the flat side of the trowel. Do not cover guidelines.',
        contentSections: [
          {
            id: 'apply-content-1',
            type: 'text',
            content: 'Using the type of trowel recommended on the adhesive package spread a 1/4" coat on the surface of one grid area, using the flat side of the trowel. Do not cover guidelines.'
          },
          {
            id: 'apply-content-2',
            type: 'text',
            content: 'Next, use the notched side of trowel to comb adhesive into standing ridges by holding trowel at a 45-degree angle.',
            title: 'Combing Technique'
          },
          {
            id: 'apply-content-3',
            type: 'text',
            content: 'Then remove excess adhesive, leaving a uniform, ridged setting bed. Don\'t spread a larger area than can be set in 15 minutes.',
            title: 'Working Time'
          }
        ],
        materials: [],
        tools: [
          { id: 'notched-trowel', name: 'Notched Trowel', description: '1/4" x 3/8" notched trowel', category: 'Hand Tool' as const, required: true }
        ],
        outputs: [{
          id: 'applied-adhesive-output',
          name: 'Applied Adhesive',
          description: 'Adhesive properly spread and combed for tile setting',
          type: 'none' as const
        }]
      }
    ]
  };

  const tileSettingOperation: Operation = {
    id: 'tile-setting-operation',
    name: 'Tile Setting',
    description: 'Install tiles with proper technique and spacing',
    steps: [
      {
        id: 'cut-tiles-step',
        step: 'Cut Tiles as Needed',
        description: 'Make necessary cuts for perimeter and obstacles',
        contentType: 'text' as const,
        content: 'Carefully measure tiles to be cut and mark with a pencil or felt-tip pen. Make straight or diagonal cuts with a tile cutter.',
        contentSections: [
          {
            id: 'cut-content-1',
            type: 'text',
            content: 'Carefully measure tiles to be cut and mark with a pencil or felt-tip pen. Make straight or diagonal cuts with a tile cutter.'
          },
          {
            id: 'cut-content-2', 
            type: 'text',
            content: 'For curved cuts use a nipper (chipping away small pieces for best results) and full-length curved cuts with a rod saw.',
            title: 'Curved Cuts'
          },
          {
            id: 'cut-content-3',
            type: 'text',
            content: 'Sharp-cut edges may be smoothed with a carborundum stone.',
            title: 'Edge Finishing'
          }
        ],
        materials: [],
        tools: [
          { id: 'tile-cutter', name: 'Wet Tile Saw', description: 'For cutting tiles to size', category: 'Power Tool' as const, required: true },
          { id: 'tile-nippers', name: 'Tile Nippers', description: 'For curved and small cuts', category: 'Hand Tool' as const, required: false }
        ],
        outputs: [{
          id: 'cut-tiles-output',
          name: 'Cut Tiles Ready',
          description: 'All necessary tiles cut and ready for installation',
          type: 'none' as const
        }]
      },
      {
        id: 'set-tiles-step',
        step: 'Set Tiles',
        description: 'Install tiles systematically using proper technique',
        contentType: 'text' as const,
        content: 'Variation of shades is an inherent characteristic of ceramic tile – mix tiles from several cartons as you set, for a blended effect.',
        contentSections: [
          {
            id: 'set-content-1',
            type: 'text',
            content: 'Variation of shades is an inherent characteristic of ceramic tile – mix tiles from several cartons as you set, for a blended effect.'
          },
          {
            id: 'set-content-2',
            type: 'text',
            content: 'Begin installing tiles in the center of the room, one grid at a time. Finish each grid before moving to the next.',
            title: 'Installation Sequence'
          },
          {
            id: 'set-content-3',
            type: 'text',
            content: 'Start with the first tile in the corner of the grid and work outward. Set tiles one at a time using a slight twisting motion. Don\'t slide tiles into place.',
            title: 'Setting Technique'
          },
          {
            id: 'set-content-4',
            type: 'text',
            content: 'Insert tile spacers as each tile is set, or leave equal joints between tiles. Fit perimeter tiles in each grid last, leaving 1/4" gap between tile and wall.',
            title: 'Spacing and Perimeter'
          }
        ],
        materials: [
          { id: 'floor-tiles', name: 'Floor Tiles', description: 'Main installation tiles', category: 'Consumable' as const, required: true }
        ],
        tools: [
          { id: 'tile-spacers', name: 'Tile Spacers', description: 'For consistent gaps', category: 'Hardware' as const, required: true },
          { id: 'rubber-mallet', name: 'Rubber Mallet', description: 'For setting tiles level', category: 'Hand Tool' as const, required: true },
          { id: 'level-4ft', name: '4-Foot Level', description: 'For checking tile plane', category: 'Hand Tool' as const, required: true }
        ],
        outputs: [{
          id: 'set-tiles-output',
          name: 'Tiles Set',
          description: 'All tiles properly set and leveled',
          type: 'major-aesthetics' as const
        }]
      },
      {
        id: 'level-and-clean-step',
        step: 'Level and Clean Tiles',
        description: 'Ensure tiles are level and clean excess adhesive',
        contentType: 'text' as const,
        content: 'When grid is completely installed, tap in all tiles with a rubber mallet or hammer and wood block to ensure a good bond and level plane.',
        contentSections: [
          {
            id: 'level-content-1',
            type: 'text',
            content: 'When grid is completely installed, tap in all tiles with a rubber mallet or hammer and wood block to ensure a good bond and level plane.'
          },
          {
            id: 'level-content-2',
            type: 'text',
            content: 'Remove excess adhesive from joints with a putty knife and from tile with a damp sponge.',
            title: 'Cleaning'
          },
          {
            id: 'level-content-3',
            type: 'text', 
            content: 'Do not walk on tiles until they are set (usually in 24 hours).',
            title: 'Curing Time'
          }
        ],
        materials: [],
        tools: [
          { id: 'rubber-mallet', name: 'Rubber Mallet', description: 'For final leveling', category: 'Hand Tool' as const, required: true },
          { id: 'putty-knife', name: 'Putty Knife', description: 'For cleaning joints', category: 'Hand Tool' as const, required: true }
        ],
        outputs: [{
          id: 'leveled-tiles-output',
          name: 'Leveled Clean Tiles', 
          description: 'All tiles properly leveled and excess adhesive removed',
          type: 'performance-durability' as const
        }]
      }
    ]
  };

  const installationPhase: Phase = {
    id: 'installation-phase',
    name: 'Installation',
    description: 'Apply adhesive and set tiles',
    operations: [adhesiveApplicationOperation, tileSettingOperation]
  };

  // Finishing Phase
  const groutingOperation: Operation = {
    id: 'grouting-operation',
    name: 'Grouting',
    description: 'Apply grout and finish tile installation',
    steps: [
      {
        id: 'prepare-grout-step',
        step: 'Prepare for Grouting',
        description: 'Remove spacers and prepare grout mixture',
        contentType: 'text' as const,
        content: 'Generally, you should wait about 24 hours before grouting (refer to the adhesive package for specifics). Remove tile spacers completely.',
        contentSections: [
          {
            id: 'prep-grout-content-1',
            type: 'text',
            content: 'Generally, you should wait about 24 hours before grouting (refer to the adhesive package for specifics). Remove tile spacers completely.'
          },
          {
            id: 'prep-grout-content-2',
            type: 'text',
            content: 'Carefully read and follow all instructions and precautions on the grout package. Make only enough to use in about 30 minutes.',
            title: 'Grout Mixing'
          }
        ],
        materials: [
          { id: 'tile-grout', name: 'Sanded Grout', description: 'For joints 1/8" and larger', category: 'Consumable' as const, required: true }
        ],
        tools: [
          { id: 'mixing-paddle', name: 'Mixing Paddle', description: 'For grout mixing', category: 'Power Tool' as const, required: true }
        ],
        outputs: [{
          id: 'grout-ready-output',
          name: 'Grout Prepared',
          description: 'Spacers removed and grout properly mixed',
          type: 'none' as const
        }]
      },
      {
        id: 'apply-grout-step',
        step: 'Apply Grout',
        description: 'Spread grout into joints using proper technique',
        contentType: 'text' as const,
        content: 'Spread grout on the tile surface, forcing down into joints with a rubber grout float or squeegee. Tilt the float at a 45-degree angle.',
        contentSections: [
          {
            id: 'apply-grout-content-1',
            type: 'text',
            content: 'Spread grout on the tile surface, forcing down into joints with a rubber grout float or squeegee. Tilt the float at a 45-degree angle.'
          },
          {
            id: 'apply-grout-content-2',
            type: 'text',
            content: 'Remove excess grout from surface immediately with the edge of float. Tilt it at a 90-degree angle and scrape it diagonally across tiles.',
            title: 'Excess Removal'
          }
        ],
        materials: [],
        tools: [
          { id: 'rubber-float', name: 'Rubber Grout Float', description: 'For applying grout', category: 'Hand Tool' as const, required: true }
        ],
        outputs: [{
          id: 'grout-applied-output',
          name: 'Grout Applied',
          description: 'Grout properly applied to all joints',
          type: 'major-aesthetics' as const
        }]
      },
      {
        id: 'clean-grout-step',
        step: 'Clean and Finish Grout',
        description: 'Clean grout haze and finish joints',
        contentType: 'text' as const,
        content: 'Wait 15-20 minutes for grout to set slightly, then use a damp sponge to clean grout residue from surface and smooth the grout joints.',
        contentSections: [
          {
            id: 'clean-grout-content-1',
            type: 'text',
            content: 'Wait 15-20 minutes for grout to set slightly, then use a damp sponge to clean grout residue from surface and smooth the grout joints.'
          },
          {
            id: 'clean-grout-content-2',
            type: 'text',
            content: 'Rinse sponge frequently and change water as needed. Let dry until grout is hard and haze forms on tile surface, then polish with a soft cloth.',
            title: 'Final Cleaning'
          },
          {
            id: 'clean-grout-content-3',
            type: 'text',
            content: 'Wait 72 hours for heavy use. Don\'t apply sealers or polishes for three weeks.',
            title: 'Curing Requirements'
          }
        ],
        materials: [],
        tools: [
          { id: 'sponges', name: 'Grout Sponges', description: 'Large pore sponges for cleanup', category: 'Hardware' as const, required: true }
        ],
        outputs: [{
          id: 'finished-grout-output',
          name: 'Finished Grout',
          description: 'Grout cleaned and finished, ready for sealing',
          type: 'major-aesthetics' as const
        }]
      }
    ]
  };

  const sealingOperation: Operation = {
    id: 'sealing-operation',
    name: 'Sealing and Final Steps',
    description: 'Apply sealer and complete installation',
    steps: [
      {
        id: 'apply-sealer-step',
        step: 'Apply Grout Sealer',
        description: 'Seal grout lines to prevent staining and moisture penetration',
        contentType: 'text' as const,
        content: 'Wait at least 48-72 hours after grouting before applying sealer. Clean the grout lines thoroughly before sealing.',
        contentSections: [
          {
            id: 'sealer-content-1',
            type: 'text',
            content: 'Wait at least 48-72 hours after grouting before applying sealer. Clean the grout lines thoroughly before sealing.'
          },
          {
            id: 'sealer-content-2',
            type: 'text',
            content: 'Apply penetrating sealer according to manufacturer instructions. Use brush or applicator to ensure complete coverage.',
            title: 'Application Method'
          }
        ],
        materials: [
          { id: 'grout-sealer', name: 'Grout Sealer', description: 'Penetrating sealer', category: 'Consumable' as const, required: true }
        ],
        tools: [
          { id: 'sealer-brush', name: 'Small Brush or Applicator', description: 'For precise sealer application', category: 'Hand Tool' as const, required: true }
        ],
        outputs: [{
          id: 'sealed-grout-output',
          name: 'Sealed Grout Lines',
          description: 'Grout properly sealed and protected',
          type: 'performance-durability' as const
        }]
      },
      {
        id: 'install-transitions-step',
        step: 'Install Transition Strips',
        description: 'Install transitions between tile and other flooring',
        contentType: 'text' as const,
        content: 'Install transition strips at doorways and where tile meets other flooring types. Measure and cut strips to fit precisely.',
        contentSections: [
          {
            id: 'transition-content-1',
            type: 'text',
            content: 'Install transition strips at doorways and where tile meets other flooring types. Measure and cut strips to fit precisely.'
          },
          {
            id: 'transition-content-2',
            type: 'text',
            content: 'Secure with appropriate fasteners, ensuring smooth transition and no trip hazards.',
            title: 'Installation Guidelines'
          }
        ],
        materials: [
          { id: 'transition-strips', name: 'Transition Strips', description: 'Metal or wood transitions', category: 'Hardware' as const, required: false }
        ],
        tools: [
          { id: 'drill', name: 'Power Drill', description: 'For securing transitions', category: 'Power Tool' as const, required: true }
        ],
        outputs: [{
          id: 'transitions-output',
          name: 'Installed Transitions',
          description: 'All transitions properly installed and secured',
          type: 'safety' as const
        }]
      },
      {
        id: 'final-planning-step',
        step: 'Final Project Assessment',
        description: 'Review project completion and finalize decisions',
        contentType: 'text' as const,
        content: 'Conduct final quality review and complete project documentation.',
        contentSections: [
          {
            id: 'final-assessment-content-1',
            type: 'text',
            content: 'Inspect all tile work for proper alignment, level surfaces, and complete grout coverage.'
          },
          {
            id: 'final-review-decisions-content',
            type: 'text',
            content: 'Make decisions on project customization by selecting the "Review Decisions" button',
            title: 'Final Project Decisions'
          },
          {
            id: 'final-assessment-content-2',
            type: 'text',
            content: 'Document any maintenance requirements and care instructions for future reference.',
            title: 'Project Documentation'
          }
        ],
        materials: [],
        tools: [],
        outputs: [{
          id: 'project-completed-output',
          name: 'Project Assessment Complete',
          description: 'Final project review and documentation completed',
          type: 'performance-durability' as const
        }]
      }
    ]
  };

  const finishingPhase: Phase = {
    id: 'finishing-phase',
    name: 'Finishing',
    description: 'Grout tiles and apply final treatments',
    operations: [groutingOperation, sealingOperation]
  };

  // Create the complete tile installation project
  const tilePhases = [preparationPhase, installationPhase, finishingPhase];
  const allPhases = addStandardPhasesToProjectRun(tilePhases);

  const tileInstallationProject: Project = {
    id: 'tile-installation-project',
    name: 'Tile Installation',
    description: 'Complete floor tile installation with professional techniques and materials. Includes surface preparation, layout planning, tile setting, grouting, and finishing.',
    image: '/placeholder.svg',
    category: 'Flooring',
    effortLevel: 'Medium',
    skillLevel: 'Intermediate',
    estimatedTime: '2-4 days',
    scalingUnit: 'per square foot',
    estimatedTimePerUnit: 0.5,
    status: 'not-started' as const,
    publishStatus: 'published' as const,
    phases: allPhases,
    createdAt: new Date(),
    updatedAt: new Date(),
    startDate: new Date(),
    planEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    endDate: undefined,
    revisionNumber: 1,
    parentProjectId: undefined,
    createdFromRevision: undefined,
    revisionNotes: undefined
  };

  return tileInstallationProject;
};