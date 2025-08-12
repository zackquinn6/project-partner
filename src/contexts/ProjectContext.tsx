import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Project } from '@/interfaces/Project';

// Import placeholder images
import interiorPaintingPlaceholder from '@/assets/interior-painting-placeholder.jpg';
import tileFlooringPlaceholder from '@/assets/tile-flooring-placeholder.jpg';
import drywallPlaceholder from '@/assets/drywall-placeholder.jpg';
import powerWashingPlaceholder from '@/assets/power-washing-placeholder.jpg';

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
    // Keep only the fully built tile flooring project
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
    // New projects to be created
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
      publishStatus: 'draft' as const,
      category: 'Interior',
      difficulty: 'Intermediate',
      estimatedTime: '3-5 days',
      phases: []
    },
    {
      id: 'template-interior-painting',
      name: 'Interior Painting',
      description: 'Professional interior painting techniques for walls and trim',
      image: interiorPaintingPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      status: 'not-started' as const,
      publishStatus: 'draft' as const,
      category: 'Interior',
      difficulty: 'Beginner',
      estimatedTime: '2-3 days',
      phases: []
    },
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
      publishStatus: 'draft' as const,
      category: 'Exterior',
      difficulty: 'Beginner',
      estimatedTime: '1-2 days',
      phases: []
    }
  ]);
  
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const addProject = (project: Project) => {
    setProjects(prev => [...prev, project]);
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(project => 
      project.id === updatedProject.id ? updatedProject : project
    ));
    // If the updated project is the current project, update the current project as well
    if (currentProject?.id === updatedProject.id) {
      setCurrentProject(updatedProject);
    }
  };

  const deleteProject = (projectId: string) => {
    console.log('deleteProject called with projectId:', projectId);
    console.log('current projects before delete:', projects.map(p => p.id));
    setProjects(prev => {
      const updatedProjects = prev.filter(project => project.id !== projectId);
      console.log('updated projects after delete:', updatedProjects.map(p => p.id));
      
      // If the deleted project was the current project, set a new current project
      if (currentProject?.id === projectId) {
        console.log('deleted project was current project, setting new current project');
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
