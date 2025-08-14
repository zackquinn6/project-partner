import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';

// Import placeholder images
import interiorPaintingPlaceholder from '@/assets/interior-painting-placeholder.jpg';
import tileFlooringPlaceholder from '@/assets/tile-flooring-placeholder.jpg';
import drywallPlaceholder from '@/assets/drywall-placeholder.jpg';
import powerWashingPlaceholder from '@/assets/power-washing-placeholder.jpg';
import homeMaintenancePlaceholder from '@/assets/home-maintenance-placeholder.jpg';
import landscapingPlaceholder from '@/assets/landscaping-placeholder.jpg';
import lightingPlaceholder from '@/assets/lighting-placeholder.jpg';
import lvpFlooringPlaceholder from '@/assets/lvp-flooring-placeholder.jpg';
import smartHomePlaceholder from '@/assets/smart-home-placeholder.jpg';
import tileBacksplashPlaceholder from '@/assets/tile-backsplash-placeholder.jpg';

// Import painting workflow images
import roomPrepImage from '@/assets/painting/room-prep.jpg';
import surfaceCleaningImage from '@/assets/painting/surface-cleaning.jpg';
import holeRepairImage from '@/assets/painting/hole-repair.jpg';
import primerApplicationImage from '@/assets/painting/primer-application.jpg';
import paintApplicationImage from '@/assets/painting/paint-application.jpg';
import cuttingInImage from '@/assets/painting/cutting-in.jpg';
import cleanupImage from '@/assets/painting/cleanup.jpg';
import beforeAfterImage from '@/assets/painting/before-after.jpg';
import poorPrimerCoverageImage from '@/assets/painting/poor-primer-coverage.jpg';
import poorSurfacePrepImage from '@/assets/painting/poor-surface-prep.jpg';
import poorPaintCoverageImage from '@/assets/painting/poor-paint-coverage.jpg';

interface ProjectContextType {
  projects: Project[];
  projectRuns: ProjectRun[];
  currentProject: Project | null;
  currentProjectRun: ProjectRun | null;
  setCurrentProject: (project: Project | null) => void;
  setCurrentProjectRun: (projectRun: ProjectRun | null) => void;
  addProject: (project: Project) => void;
  addProjectRun: (projectRun: ProjectRun) => void;
  updateProject: (project: Project) => void;
  updateProjectRun: (projectRun: ProjectRun) => void;
  deleteProject: (projectId: string) => void;
  deleteProjectRun: (projectRunId: string) => void;
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
    // 1. Interior Painting - Detailed project with full workflow
    {
      id: 'template-interior-painting',
      name: 'Interior Painting',
      description: 'Complete interior room painting from prep to finish',
      image: interiorPaintingPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Painting',
      difficulty: 'Beginner',
      estimatedTime: '3-5 days',
      phases: [
        {
          id: 'painting-prep-phase',
          name: 'Preparation',
          description: 'Prepare room and surfaces for painting',
          operations: [
            {
              id: 'room-prep-op',
              name: 'Room Preparation',
              description: 'Clear and protect the room for painting',
              steps: [
                {
                  id: 'furniture-removal',
                  step: 'Remove and Protect Furniture',
                  description: 'Clear room and protect remaining items',
                  contentType: 'image',
                  image: roomPrepImage,
                  content: 'Remove all furniture and belongings from the room when possible. For items that cannot be moved:\n\n• Move furniture to center of room\n• Cover with plastic sheeting or drop cloths\n• Secure coverings with painter\'s tape\n• Remove wall hangings, outlet covers, and switch plates\n• Store hardware in labeled bags\n\nProtect floors with:\n• Canvas drop cloths (better than plastic for walking)\n• Rosin paper for hard surfaces\n• Plastic sheeting only in low-traffic areas',
                  materials: [
                    { id: 'mp1', name: 'Drop Cloths', description: 'Canvas or plastic sheeting', category: 'Other', required: true },
                    { id: 'mp2', name: 'Painter\'s Tape', description: '1.5" wide masking tape', category: 'Consumable', required: true },
                    { id: 'mp3', name: 'Plastic Sheeting', description: 'For furniture protection', category: 'Other', required: true },
                    { id: 'mp4', name: 'Storage Bags', description: 'For hardware and small items', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 'tp1', name: 'Screwdriver Set', description: 'For removing outlet covers', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { 
                      id: 'op1', 
                      name: 'Protected Room', 
                      description: 'Room cleared and protected for painting', 
                      type: 'performance-durability',
                      requirement: 'All furniture removed or properly covered, floors protected with drop cloths, outlet covers and switch plates removed',
                      potentialEffects: 'Paint splatters on furniture and floors, damaged belongings, difficult cleanup, unprofessional appearance',
                      photosOfEffects: 'Images of paint damage on unprotected surfaces',
                      keyInputs: ['Drop cloth quality', 'Tape adhesion', 'Furniture weight', 'Room traffic'],
                      qualityChecks: 'Visual inspection - no exposed furniture or flooring, all hardware stored safely'
                    }
                  ]
                },
                {
                  id: 'surface-cleaning',
                  step: 'Clean Surfaces',
                  description: 'Clean walls and trim for proper paint adhesion',
                  contentType: 'image',
                  image: surfaceCleaningImage,
                  content: 'Clean all surfaces to be painted:\n\n**Wall Cleaning:**\n• Dust all surfaces with microfiber cloth\n• Wash with mild detergent solution (TSP substitute)\n• Pay attention to areas around light switches and door handles\n• Rinse with clean water\n• Allow to dry completely\n\n**Grease and Stains:**\n• Kitchen walls: Use degreasing cleaner\n• Crayon marks: Gentle scrubbing with baking soda paste\n• Water stains: Prime with stain-blocking primer\n\n**Mildew (bathrooms):**\n• Clean with bleach solution (1:10 ratio)\n• Ensure good ventilation\n• Allow to dry thoroughly before painting',
                  materials: [
                    { id: 'mp5', name: 'TSP Substitute', description: 'Wall cleaning solution', category: 'Consumable', required: true },
                    { id: 'mp6', name: 'Microfiber Cloths', description: 'For dusting and cleaning', category: 'Other', required: true },
                    { id: 'mp7', name: 'Sponges', description: 'For washing walls', category: 'Other', required: true },
                    { id: 'mp8', name: 'Bucket', description: 'For cleaning solution', category: 'Other', required: true }
                  ],
                  tools: [],
                  outputs: [
                    { 
                      id: 'op2', 
                      name: 'Clean Surfaces', 
                      description: 'Walls and trim clean and ready for painting', 
                      type: 'performance-durability', 
                      mustGetRight: 'All dirt, grease, and loose material removed',
                      requirement: 'All surfaces free of dust, grease, crayon marks, and mildew with smooth, clean finish',
                      potentialEffects: 'Poor paint adhesion, visible dirt under paint, uneven finish, premature paint failure',
                      photosOfEffects: poorSurfacePrepImage,
                      keyInputs: ['Surface condition', 'Cleaning solution strength', 'Scrubbing technique', 'Drying time'],
                      qualityChecks: 'Run hand over surface - should feel smooth with no gritty texture or sticky residue'
                    }
                  ]
                }
              ]
            },
            {
              id: 'surface-repair-op',
              name: 'Surface Repair',
              description: 'Repair holes, cracks, and imperfections',
              steps: [
                {
                  id: 'hole-repair',
                  step: 'Fill Holes and Cracks',
                  description: 'Repair nail holes, small cracks, and imperfections',
                  contentType: 'image',
                  image: holeRepairImage,
                  content: 'Repair different types of damage:\n\n**Small Nail Holes:**\n• Use lightweight spackling compound\n• Apply with putty knife slightly overfilled\n• Allow to dry completely\n• Sand smooth with fine grit sandpaper\n\n**Larger Holes (up to 1"):**\n• Use mesh patch or self-adhesive patch\n• Apply joint compound in thin coats\n• Sand between coats\n• Prime repaired areas\n\n**Cracks:**\n• Clean out loose material\n• Apply fiberglass tape for larger cracks\n• Cover with joint compound\n• Sand smooth when dry\n\n**Dents and Gouges:**\n• Clean area thoroughly\n• Apply wood filler for trim\n• Sand smooth and prime',
                  materials: [
                    { id: 'mp9', name: 'Spackling Compound', description: 'Lightweight filler for small holes', category: 'Other', required: true },
                    { id: 'mp10', name: 'Joint Compound', description: 'For larger repairs', category: 'Other', required: true },
                    { id: 'mp11', name: 'Mesh Patches', description: 'For holes larger than nail holes', category: 'Hardware', required: false },
                    { id: 'mp12', name: 'Sandpaper', description: '120 and 220 grit', category: 'Consumable', required: true }
                  ],
                  tools: [
                    { id: 'tp2', name: 'Putty Knives', description: '2" and 4" flexible blades', category: 'Hand Tool', required: true },
                    { id: 'tp3', name: 'Sanding Block', description: 'For smooth finish', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { 
                      id: 'op3', 
                      name: 'Smooth Surfaces', 
                      description: 'All holes and cracks filled and sanded smooth', 
                      type: 'major-aesthetics', 
                      mustGetRight: 'No visible imperfections after priming',
                      requirement: 'All nail holes, cracks, and dents completely filled, sanded flush, and invisible to touch',
                      potentialEffects: 'Visible holes and cracks show through paint, textured appearance, unprofessional finish',
                      photosOfEffects: poorSurfacePrepImage,
                      keyInputs: ['Spackling compound quality', 'Sanding grit', 'Fill depth', 'Cure time'],
                      qualityChecks: 'Run hand over repaired areas - should feel perfectly smooth and flush with surrounding surface'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 'priming-phase',
          name: 'Priming',
          description: 'Apply primer for proper paint adhesion',
          operations: [
            {
              id: 'primer-selection-op',
              name: 'Primer Selection and Application',
              description: 'Choose and apply appropriate primer',
              steps: [
                {
                  id: 'primer-application',
                  step: 'Apply Primer',
                  description: 'Prime all surfaces for optimal paint adhesion',
                  contentType: 'image',
                  image: primerApplicationImage,
                  content: 'Apply primer systematically:\n\n**Primer Selection:**\n• Water-based: For most interior surfaces\n• Oil-based: For stain blocking or glossy surfaces\n• High-hide: For color changes or covering stains\n• Bonding primer: For slick surfaces like semi-gloss paint\n\n**Application Process:**\n1. Start with cut-in around edges with angled brush\n2. Use roller for main wall areas\n3. Work in 4x4 foot sections\n4. Maintain wet edge to avoid lap marks\n5. Apply thin, even coats\n\n**Quality Checks:**\n• No missed spots or thin areas\n• Uniform coverage and sheen\n• Allow full cure time before painting',
                  materials: [
                    { id: 'mp13', name: 'Primer', description: 'High-quality interior primer', category: 'Consumable', required: true },
                    { id: 'mp14', name: 'Roller Covers', description: '3/8" nap for smooth surfaces', category: 'Consumable', required: true },
                    { id: 'mp15', name: 'Paint Tray', description: 'With liner for easy cleanup', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 'tp4', name: 'Angled Brush', description: '2.5" high-quality brush for cutting in', category: 'Hand Tool', required: true },
                    { id: 'tp5', name: 'Roller Frame', description: '9" frame with extension pole capability', category: 'Hand Tool', required: true },
                    { id: 'tp6', name: 'Extension Pole', description: '2-4 foot adjustable pole', category: 'Hand Tool', required: true }
                  ],
                  outputs: [
                    { 
                      id: 'op4', 
                      name: 'Primed Surfaces', 
                      description: 'All surfaces evenly primed and ready for paint', 
                      type: 'performance-durability', 
                      mustGetRight: 'Complete, uniform coverage with no missed spots',
                      requirement: 'Even primer coverage on all surfaces with no thin spots, streaks, or missed areas',
                      potentialEffects: 'Poor paint adhesion, color bleeding through, uneven final appearance, reduced durability',
                      photosOfEffects: poorPrimerCoverageImage,
                      keyInputs: ['Primer quality', 'Application technique', 'Coverage rate', 'Environmental conditions'],
                      qualityChecks: 'Inspect under angled lighting - uniform sheen and color with no visible substrate showing through'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 'painting-phase',
          name: 'Painting',
          description: 'Apply finish paint coats',
          operations: [
            {
              id: 'first-coat-op',
              name: 'First Paint Coat',
              description: 'Apply first coat of finish paint',
              steps: [
                {
                  id: 'first-coat-application',
                  step: 'Apply First Coat',
                  description: 'Apply first coat of finish paint using proper technique',
                  contentType: 'image',
                  image: paintApplicationImage,
                  content: 'Apply first coat systematically:\n\n**Preparation:**\n• Stir paint thoroughly\n• Pour into paint tray (don\'t dip directly)\n• Have brush and roller ready\n\n**Cutting In:**\n• Load brush with moderate amount of paint\n• Cut in 2-3 inches from edges, trim, and corners\n• Work in 4-foot sections\n• Maintain steady hand for clean lines\n\n**Rolling Technique:**\n• Load roller evenly (not dripping)\n• Start 2 feet from corner, roll up\n• Work in W or M pattern\n• Fill in pattern with parallel strokes\n• Finish with light strokes in same direction\n• Overlap slightly into wet cut-in areas\n\n**Quality Control:**\n• Watch for drips and sags\n• Maintain wet edge\n• Check coverage in different lighting',
                  materials: [
                    { id: 'mp16', name: 'Interior Paint', description: 'High-quality latex paint in chosen color', category: 'Consumable', required: true }
                  ],
                  tools: [],
                  outputs: [
                    { 
                      id: 'op5', 
                      name: 'First Coat Complete', 
                      description: 'First coat applied with good coverage', 
                      type: 'major-aesthetics',
                      requirement: 'Uniform first coat coverage with no drips, runs, or missed areas',
                      potentialEffects: 'Visible brush marks, uneven coverage in final coat, need for additional coats',
                      photosOfEffects: poorPaintCoverageImage,
                      keyInputs: ['Paint quality', 'Brush/roller technique', 'Loading amount', 'Application speed'],
                      qualityChecks: 'View from multiple angles under room lighting - should see consistent color with no substrate showing'
                    }
                  ]
                }
              ]
            },
            {
              id: 'second-coat-op',
              name: 'Second Paint Coat',
              description: 'Apply final coat for complete coverage',
              steps: [
                {
                  id: 'second-coat-application',
                  step: 'Apply Second Coat',
                  description: 'Apply final coat for complete, even coverage',
                  contentType: 'image',
                  image: cuttingInImage,
                  content: 'Apply second coat for professional finish:\n\n**Timing:**\n• Wait for first coat to dry completely (check manufacturer specs)\n• Usually 2-4 hours for latex paint\n• Test by touching in inconspicuous area\n\n**Application:**\n• Use same technique as first coat\n• Pay attention to areas that may need extra coverage\n• Maintain consistent pressure and speed\n• Work systematically to avoid missed areas\n\n**Final Quality Check:**\n• Inspect in various lighting conditions\n• Look for missed spots, thin coverage, or lap marks\n• Touch up as needed while paint is still wet\n• Check cut-in lines for crisp, straight edges',
                  materials: [],
                  tools: [],
                  outputs: [
                    { 
                      id: 'op6', 
                      name: 'Completed Paint Job', 
                      description: 'Professional-quality painted surfaces', 
                      type: 'major-aesthetics', 
                      mustGetRight: 'Even coverage, clean lines, no visible defects',
                      requirement: 'Perfect final coat with uniform coverage, crisp cut-in lines, and flawless finish',
                      potentialEffects: 'Uneven color, visible lap marks, poor durability, unprofessional appearance',
                      photosOfEffects: poorPaintCoverageImage,
                      keyInputs: ['Paint quality', 'Application technique', 'Environmental conditions', 'Surface preparation'],
                      qualityChecks: 'Inspect entire room under various lighting conditions - should show consistent color and sheen with crisp, straight lines'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 'cleanup-phase',
          name: 'Cleanup and Finishing',
          description: 'Complete the project with proper cleanup',
          operations: [
            {
              id: 'cleanup-op',
              name: 'Project Cleanup',
              description: 'Clean up and restore room',
              steps: [
                {
                  id: 'cleanup-restoration',
                  step: 'Clean Up and Restore',
                  description: 'Complete cleanup and room restoration',
                  contentType: 'image',
                  image: cleanupImage,
                  content: 'Complete the project professionally:\n\n**While Paint is Wet:**\n• Remove painter\'s tape at 45-degree angle\n• Clean brushes and rollers immediately\n• Dispose of materials properly\n\n**Tool Cleanup:**\n• Wash brushes and rollers with appropriate cleaner\n• Store brushes properly to maintain shape\n• Clean paint trays and buckets\n\n**Room Restoration:**\n• Remove drop cloths carefully\n• Reinstall outlet covers and switch plates\n• Replace wall hangings and decorations\n• Move furniture back into position\n• Vacuum any debris\n\n**Final Inspection:**\n• Check all painted surfaces in different lighting\n• Touch up any missed spots\n• Ensure clean, professional appearance\n• Store leftover paint with project details',
                  materials: [
                    { id: 'mp17', name: 'Brush Cleaner', description: 'For cleaning brushes and tools', category: 'Other', required: true }
                  ],
                  tools: [],
                  outputs: [
                    { 
                      id: 'op7', 
                      name: 'Completed Room', 
                      description: 'Room fully painted and restored to use', 
                      type: 'major-aesthetics',
                      requirement: 'Room completely cleaned, furniture returned, all materials properly stored',
                      potentialEffects: 'Messy appearance, damaged belongings, wasted materials, unsafe conditions',
                      photosOfEffects: 'Images of cluttered, unprofessional project completion',
                      keyInputs: ['Cleanup thoroughness', 'Material storage', 'Tool maintenance', 'Safety procedures'],
                      qualityChecks: 'Final walkthrough - room ready for immediate use with no visible project debris or materials'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    // 2. Tile Flooring - Keep existing detailed project
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
                  content: 'Use a measuring tape to record the length and width of the room. Measure any alcoves, closets, or irregular areas. Note the location of permanent fixtures like cabinets, toilets, or built-ins that will affect tile layout.\\n\\nCreate a scaled drawing on graph paper showing:\\n- Overall room dimensions\\n- Location of doors and transitions\\n- Fixed obstacles\\n- Direction of tile layout\\n\\nCalculate total square footage and add 10-15% for waste factor.',
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
                  content: 'Consider these factors when selecting tiles:\\n\\n**Tile Type:**\\n- Ceramic: Good for most areas, budget-friendly\\n- Porcelain: More durable, better for high-traffic areas\\n- Natural stone: Premium look but requires more maintenance\\n\\n**Size Considerations:**\\n- Larger tiles (12"+ squares) make small rooms appear bigger\\n- Smaller tiles provide better traction in wet areas\\n- Rectangular tiles can elongate a space\\n\\n**Finish:**\\n- Glossy: Easy to clean but shows scratches\\n- Matte: Hides dirt better, less slippery when wet\\n- Textured: Best slip resistance for bathrooms\\n\\n**Color/Pattern:**\\n- Light colors make rooms appear larger\\n- Dark colors hide dirt but show scratches\\n- Consider maintenance requirements',
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
                  content: 'Remove all moveable furniture and belongings from the room. If installing in a bathroom, remove the toilet and any other fixtures that will interfere with tile installation.\\n\\nClean the entire floor thoroughly:\\n- Sweep up all debris\\n- Vacuum thoroughly, especially corners and edges\\n- Mop with degreasing cleaner if needed\\n- Allow floor to dry completely\\n\\nProtect adjacent areas:\\n- Cover furniture in adjoining rooms\\n- Install plastic sheeting in doorways\\n- Protect walls with painter\'s tape and plastic',
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
                  content: 'Check floor flatness using a 4-foot level or straight edge:\\n\\n**Acceptable Tolerance:** No more than 1/4" variance over 10 feet, or 1/8" over 2 feet\\n\\n**Check Method:**\\n1. Place level at multiple locations across the floor\\n2. Look for gaps under the level indicating low spots\\n3. Mark high spots where level rocks\\n4. Pay special attention to transitions and doorways\\n\\n**Common Issues:**\\n- Sagging subfloor (may need structural repair)\\n- High spots from old flooring adhesive\\n- Low spots from settling or poor installation\\n- Uneven joists (professional evaluation needed)\\n\\nDocument all problem areas for repair planning.',
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
                  content: '**Correcting High Spots:**\\n- Sand down minor high spots with belt sander\\n- Grind concrete high spots with concrete grinder\\n- Remove protruding nails or screws\\n- Plane down wood high spots carefully\\n\\n**Filling Low Spots:**\\n- Use self-leveling compound for areas larger than 2 square feet\\n- Use floor patch compound for smaller areas\\n- Follow manufacturer\'s mixing instructions exactly\\n- Pour compound slightly higher than surrounding floor\\n- Use gauge rake to spread evenly\\n- Allow full cure time before proceeding\\n\\n**Priming:**\\n- Prime all patched areas according to compound manufacturer\\n- Prime entire floor if required by adhesive manufacturer\\n- Allow primer to dry completely',
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
                  content: 'Create accurate center reference lines:\\n\\n**Find Room Center:**\\n1. Measure and mark the center point of each wall\\n2. Snap chalk lines between opposite wall centers\\n3. Check that lines are perpendicular using 3-4-5 triangle method\\n4. Measure diagonals - they should be equal in a square room\\n\\n**3-4-5 Square Check:**\\n- Mark 3 feet along one line from center\\n- Mark 4 feet along perpendicular line from center\\n- Diagonal between marks should be exactly 5 feet\\n- Adjust lines if necessary\\n\\n**Alternative Starting Points:**\\n- Start from most visible wall if room is significantly out of square\\n- Consider starting from focal wall or room entrance\\n- Avoid small cuts at prominent locations',
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
                  content: 'Test your tile layout before starting installation:\\n\\n**Layout Process:**\\n1. Start at center point intersection\\n2. Lay out tiles in both directions without adhesive\\n3. Use spacers to maintain consistent gaps\\n4. Continue until you reach all walls\\n\\n**Evaluate Cut Sizes:**\\n- Avoid cuts smaller than 1/2 tile width\\n- Try to make end cuts equal on opposite sides\\n- Consider starting layout differently if cuts are too small\\n\\n**Adjust as Needed:**\\n- Shift center lines to improve cut sizes\\n- Consider different tile orientation\\n- Plan layout to avoid small cuts at doorways\\n\\n**Mark Starting Point:**\\n- Mark the actual starting tile position\\n- This may not be at the center intersection\\n- Ensure first course is perfectly straight',
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
              description: 'Apply adhesive and install the first tiles accurately',
              steps: [
                {
                  id: 'adhesive-mixing',
                  step: 'Mix Tile Adhesive',
                  description: 'Prepare tile adhesive according to manufacturer instructions',
                  contentType: 'text',
                  content: 'Proper adhesive mixing is critical for strong tile adhesion:\\n\\n**Preparation:**\\n- Read manufacturer instructions completely\\n- Check ambient temperature (usually 65-85°F range)\\n- Ensure mixing area is clean and dust-free\\n\\n**Mixing Process:**\\n1. Add specified amount of clean, cool water to mixing bucket\\n2. Slowly add powder while mixing to avoid lumps\\n3. Mix with paddle mixer at low speed (300 RPM max)\\n4. Mix for full time specified (usually 2-3 minutes)\\n5. Let stand for slake time (usually 5-10 minutes)\\n6. Remix briefly before use\\n\\n**Consistency Check:**\\n- Should hold peaks when mixed\\n- No dry powder lumps\\n- Smooth, creamy texture\\n- Use within pot life (usually 2-4 hours)',
                  materials: [
                    { id: 'm20', name: 'Tile Adhesive', description: 'Modified thin-set mortar appropriate for tile type', category: 'Consumable', required: true },
                    { id: 'm21', name: 'Clean Water', description: 'Potable water for mixing', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: 't12', name: 'Mixing Bucket', description: '5-gallon bucket for adhesive mixing', category: 'Other', required: true },
                    { id: 't13', name: 'Paddle Mixer', description: 'Electric drill with mixing paddle', category: 'Power Tool', required: true },
                    { id: 't14', name: 'Measuring Cup', description: 'For accurate water measurement', category: 'Other', required: true }
                  ],
                  outputs: [
                    { id: 'o11', name: 'Mixed Adhesive', description: 'Properly mixed tile adhesive ready for application', type: 'performance-durability', mustGetRight: 'Proper consistency critical for tile adhesion', qualityChecks: 'Check consistency and pot life' }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 'grouting-phase',
          name: 'Grouting & Finishing',
          description: 'Apply grout and complete final finishing touches',
          operations: [
            {
              id: 'grout-application-op',
              name: 'Grout Application',
              description: 'Apply and finish grout in tile joints',
              steps: [
                {
                  id: 'grout-preparation',
                  step: 'Prepare for Grouting',
                  description: 'Clean tiles and prepare grout mixture',
                  contentType: 'text',
                  content: 'Proper preparation ensures professional grouting results:\\n\\n**Pre-Grout Cleaning:**\\n- Remove all spacers carefully\\n- Clean adhesive from tile faces\\n- Vacuum all joints thoroughly\\n- Ensure joints are consistent depth\\n\\n**Grout Mixing:**\\n- Use clean water and mixing tools\\n- Add water gradually to powder\\n- Mix to peanut butter consistency\\n- No lumps or dry spots\\n- Let slake per manufacturer instructions\\n\\n**Setup:**\\n- Have clean sponges and buckets ready\\n- Work in manageable sections\\n- Keep grout covered when not in use',
                  materials: [
                    { id: 'm22', name: 'Grout', description: 'Sanded or unsanded based on joint width', category: 'Consumable', required: true },
                    { id: 'm23', name: 'Clean Water', description: 'For mixing and cleanup', category: 'Other', required: true },
                    { id: 'm24', name: 'Grout Sponges', description: 'High-quality sponges for cleanup', category: 'Consumable', required: true }
                  ],
                  tools: [
                    { id: 't15', name: 'Grout Float', description: 'Rubber float for grout application', category: 'Hand Tool', required: true },
                    { id: 't16', name: 'Mixing Bucket', description: 'Clean bucket for grout mixing', category: 'Other', required: true }
                  ],
                  outputs: [
                    { id: 'o12', name: 'Clean Tile Joints', description: 'Joints cleaned and ready for grout', type: 'major-aesthetics' },
                    { id: 'o13', name: 'Mixed Grout', description: 'Properly mixed grout ready for application', type: 'performance-durability' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    // 3. Drywall Installation & Finishing
    {
      id: 'template-drywall',
      name: 'Drywall Installation & Finishing',
      description: 'Complete drywall installation and finishing for interior walls',
      image: drywallPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Interior',
      difficulty: 'Intermediate',
      estimatedTime: '3-5 days',
      phases: []
    },
    // 4. Power Washing
    {
      id: 'template-power-washing',
      name: 'Power Washing',
      description: 'Exterior power washing for decks, driveways, and siding',
      image: powerWashingPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Exterior',
      difficulty: 'Beginner',
      estimatedTime: '1-2 days',
      phases: []
    },
    // 5. Kitchen Tile Backsplash
    {
      id: 'template-tile-backsplash',
      name: 'Kitchen Tile Backsplash',
      description: 'Install decorative tile backsplash in kitchen',
      image: tileBacksplashPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Kitchen',
      difficulty: 'Intermediate',
      estimatedTime: '2-3 days',
      phases: []
    },
    // 6. LVP Flooring Installation
    {
      id: 'template-lvp-flooring',
      name: 'LVP Flooring Installation',
      description: 'Install luxury vinyl plank flooring throughout home',
      image: lvpFlooringPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Flooring',
      difficulty: 'Intermediate',
      estimatedTime: '3-5 days',
      phases: []
    },
    // 7. Smart Home Setup
    {
      id: 'template-smart-home',
      name: 'Smart Home Setup',
      description: 'Install and configure smart home devices and automation',
      image: smartHomePlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Technology',
      difficulty: 'Advanced',
      estimatedTime: '2-4 days',
      phases: []
    },
    // 8. Lighting Installation
    {
      id: 'template-lighting',
      name: 'Lighting Installation',
      description: 'Install new light fixtures and electrical outlets',
      image: lightingPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Electrical',
      difficulty: 'Advanced',
      estimatedTime: '1-3 days',
      phases: []
    },
    // 9. Landscaping & Garden
    {
      id: 'template-landscaping',
      name: 'Landscaping & Garden',
      description: 'Design and install landscaping with plants and hardscaping',
      image: landscapingPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Exterior',
      difficulty: 'Intermediate',
      estimatedTime: '1-2 weeks',
      phases: []
    },
    // 10. Home Maintenance Checklist
    {
      id: 'template-home-maintenance',
      name: 'Home Maintenance Checklist',
      description: 'Seasonal home maintenance and preventive care tasks',
      image: homeMaintenancePlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Maintenance',
      difficulty: 'Beginner',
      estimatedTime: '1-2 days',
      phases: []
    }
  ]);
  
  const [projectRuns, setProjectRuns] = useState<ProjectRun[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentProjectRun, setCurrentProjectRun] = useState<ProjectRun | null>(null);

  const addProject = (project: Project) => {
    setProjects(prev => [...prev, project]);
  };

  const addProjectRun = (projectRun: ProjectRun) => {
    setProjectRuns(prev => [...prev, projectRun]);
  };

  const updateProject = (project: Project) => {
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    if (currentProject?.id === project.id) {
      setCurrentProject(project);
    }
  };

  const updateProjectRun = (projectRun: ProjectRun) => {
    // Auto-update status based on progress
    const updatedProjectRun = {
      ...projectRun,
      status: determineStatusFromProgress(projectRun.progress || 0) as ProjectRun['status']
    };
    
    setProjectRuns(prev => prev.map(pr => pr.id === projectRun.id ? updatedProjectRun : pr));
    if (currentProjectRun?.id === projectRun.id) {
      setCurrentProjectRun(updatedProjectRun);
    }
  };

  // Helper function to determine status based on progress
  const determineStatusFromProgress = (progress: number): string => {
    if (progress >= 100) {
      return 'complete';
    } else if (progress > 0) {
      return 'in-progress';
    } else {
      return 'not-started';
    }
  };

  const deleteProject = (projectId: string) => {
    console.log('deleteProject called with projectId:', projectId);
    console.log('current projects before delete:', projects.map(p => p.id));
    setProjects(prev => {
      const updatedProjects = prev.filter(project => project.id !== projectId);
      console.log('updated projects after delete:', updatedProjects.map(p => p.id));
      
      // If the deleted project was the current project, clear it instead of auto-selecting
      if (currentProject?.id === projectId) {
        console.log('deleted project was current project, clearing current project');
        setCurrentProject(null);
      }
      
      return updatedProjects;
    });
  };

  const deleteProjectRun = (projectRunId: string) => {
    setProjectRuns(prev => prev.filter(pr => pr.id !== projectRunId));
    if (currentProjectRun?.id === projectRunId) {
      setCurrentProjectRun(null);
    }
  };

  const handleSetCurrentProjectRun = (projectRun: ProjectRun | null) => {
    setCurrentProjectRun(projectRun);
    // Clear current project when setting a project run to use run data
    if (projectRun) {
      setCurrentProject(null);
    }
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      projectRuns,
      currentProject,
      currentProjectRun,
      setCurrentProject,
      setCurrentProjectRun: handleSetCurrentProjectRun,
      addProject,
      addProjectRun,
      updateProject,
      updateProjectRun,
      deleteProject,
      deleteProjectRun
    }}>
      {children}
    </ProjectContext.Provider>
  );
};
