-- Create comprehensive tile flooring installation project
INSERT INTO public.projects (
  name, 
  description, 
  category, 
  difficulty, 
  effort_level, 
  estimated_time, 
  scaling_unit, 
  estimated_time_per_unit, 
  publish_status,
  phases
) VALUES (
  'Professional Tile Flooring Installation',
  'Complete guide for installing ceramic or porcelain tile flooring from subfloor preparation to final finishing. This comprehensive project covers all aspects including decision trees for different scenarios, proper tool usage, and professional techniques for a durable, long-lasting installation.',
  'Flooring',
  'Intermediate',
  'High',
  '2-4 days',
  'per 10x10 room',
  16.0,
  'published',
  '[
    {
      "id": "prep-phase",
      "name": "Preparation & Planning",
      "description": "Assessment of existing conditions, material planning, and workspace preparation",
      "operations": [
        {
          "id": "subfloor-assessment",
          "name": "Subfloor Assessment & Preparation",
          "description": "Evaluate and prepare the subfloor for tile installation",
          "steps": [
            {
              "id": "inspect-subfloor",
              "step": "Inspect Subfloor Condition",
              "description": "Thoroughly examine the existing subfloor for structural integrity, flatness, and moisture issues",
              "contentType": "text",
              "content": "Check for any flex, squeaks, or movement in the subfloor. The subfloor must be at least 1 1/8 inches thick for tile installation. Test by jumping on it - if there is any movement, the subfloor needs reinforcement. Look for water damage, rot, or other structural issues that must be addressed before proceeding.",
              "materials": [{"id": "mat1", "name": "Leveling Compound", "description": "For filling low spots", "category": "Consumable", "required": false}],
              "tools": [{"id": "tool1", "name": "4-foot Level", "description": "Check floor flatness", "category": "Hand Tool", "required": true}],
              "outputs": [{"id": "out1", "name": "Subfloor Assessment", "description": "Documentation of subfloor condition", "type": "performance-durability"}],
              "flowType": "prime",
              "isDecisionPoint": true,
              "decisionPoint": {
                "id": "subfloor-condition",
                "question": "What is the current subfloor condition?",
                "description": "Assess the structural integrity and readiness of the subfloor",
                "stage": "initial-planning",
                "options": [
                  {"id": "opt1", "label": "Concrete - Good Condition", "value": "concrete-good", "nextStepId": "measure-room"},
                  {"id": "opt2", "label": "Wood - Needs Backer Board", "value": "wood-backer", "nextStepId": "install-backer"},
                  {"id": "opt3", "label": "Uneven - Needs Leveling", "value": "uneven", "nextStepId": "level-subfloor"}
                ],
                "allowFreeText": false
              },
              "timeEstimation": {
                "variableTime": {"low": 1, "medium": 2, "high": 3},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            },
            {
              "id": "level-subfloor",
              "step": "Level Uneven Subfloor",
              "description": "Apply leveling compound to create a flat surface for tile installation",
              "contentType": "text",
              "content": "Use self-leveling compound to fill low spots and create a flat surface. The floor must be flat within 1/4 inch over 10 feet. Clean the subfloor thoroughly, apply primer if required, and pour leveling compound according to manufacturer directions.",
              "materials": [{"id": "mat2", "name": "Leveling Compound", "description": "Self-leveling compound", "category": "Consumable", "required": true}],
              "tools": [{"id": "tool2", "name": "Mixing Paddle", "description": "Mix leveling compound", "category": "Power Tool", "required": true}],
              "outputs": [{"id": "out2", "name": "Level Subfloor", "description": "Flat, even surface ready for tile", "type": "major-aesthetics"}],
              "flowType": "alternate",
              "condition": "Subfloor is uneven",
              "timeEstimation": {
                "variableTime": {"low": 3, "medium": 4, "high": 6},
                "lagTime": {"low": 24, "medium": 24, "high": 24}
              }
            },
            {
              "id": "install-backer",
              "step": "Install Cement Backer Board",
              "description": "Install water-resistant backer board over wood subfloors in wet areas",
              "contentType": "text",
              "content": "Cut cement backer board to fit the room, leaving 1/4 inch gaps at walls. Attach with appropriate screws every 6-8 inches along edges and 8-12 inches in field. Seal joints with mesh tape and thin-set mortar.",
              "materials": [
                {"id": "mat3", "name": "Cement Backer Board", "description": "Water-resistant underlayment", "category": "Hardware", "required": true},
                {"id": "mat4", "name": "Backer Board Screws", "description": "Corrosion-resistant screws", "category": "Hardware", "required": true},
                {"id": "mat5", "name": "Fiberglass Mesh Tape", "description": "Joint sealing tape", "category": "Consumable", "required": true}
              ],
              "tools": [
                {"id": "tool3", "name": "Drill Driver", "description": "Drive screws", "category": "Power Tool", "required": true},
                {"id": "tool4", "name": "Manual Tile Cutter", "description": "Cut backer board", "category": "Hand Tool", "required": true}
              ],
              "outputs": [{"id": "out3", "name": "Backer Board Installation", "description": "Water-resistant substrate", "type": "performance-durability"}],
              "flowType": "alternate",
              "condition": "Wood subfloor in wet area",
              "timeEstimation": {
                "variableTime": {"low": 4, "medium": 6, "high": 8},
                "lagTime": {"low": 2, "medium": 4, "high": 6}
              }
            }
          ]
        },
        {
          "id": "layout-planning",
          "name": "Layout Planning & Measurement",
          "description": "Plan tile layout and calculate materials needed",
          "steps": [
            {
              "id": "measure-room",
              "step": "Measure Room & Calculate Materials",
              "description": "Accurately measure the room and calculate tile, adhesive, and grout quantities",
              "contentType": "text",
              "content": "Measure length and width of the room. Calculate square footage and add 10% for waste and future repairs. Account for door openings and fixtures. Create a scale drawing on graph paper to plan the layout.",
              "materials": [],
              "tools": [{"id": "tool5", "name": "Chalk Line", "description": "Mark layout lines", "category": "Hand Tool", "required": true}],
              "outputs": [{"id": "out4", "name": "Room Measurements", "description": "Accurate measurements and material list", "type": "none"}],
              "flowType": "prime",
              "timeEstimation": {
                "variableTime": {"low": 1, "medium": 1.5, "high": 2},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            },
            {
              "id": "layout-center",
              "step": "Find Center Point & Mark Layout Lines",
              "description": "Establish the center point and snap chalk lines for tile layout",
              "contentType": "text",
              "content": "Find the midpoint of each wall and snap intersecting chalk lines. Use the 3-4-5 triangle method to ensure lines are square. Adjust layout to minimize cut tiles at visible edges.",
              "materials": [],
              "tools": [{"id": "tool6", "name": "Chalk Line", "description": "Mark reference lines", "category": "Hand Tool", "required": true}],
              "outputs": [{"id": "out5", "name": "Layout Lines", "description": "Square reference lines for tile placement", "type": "major-aesthetics"}],
              "flowType": "prime",
              "timeEstimation": {
                "variableTime": {"low": 0.5, "medium": 1, "high": 1.5},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            },
            {
              "id": "dry-layout",
              "step": "Perform Dry Layout Test",
              "description": "Lay tiles without adhesive to test the layout and make adjustments",
              "contentType": "text",
              "content": "Place tiles along the layout lines without adhesive. Use spacers to maintain consistent gaps. Check that cut tiles at edges will be at least half a tile width. Adjust center lines if needed to optimize the layout.",
              "materials": [{"id": "mat6", "name": "Tile Spacers", "description": "Maintain consistent gaps", "category": "Hardware", "required": true}],
              "tools": [],
              "outputs": [{"id": "out6", "name": "Verified Layout", "description": "Confirmed tile placement plan", "type": "major-aesthetics"}],
              "flowType": "inspection",
              "timeEstimation": {
                "variableTime": {"low": 1, "medium": 1.5, "high": 2},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            }
          ]
        }
      ]
    },
    {
      "id": "installation-phase",
      "name": "Tile Installation",
      "description": "Setting tiles with adhesive, cutting, and leveling",
      "operations": [
        {
          "id": "adhesive-prep",
          "name": "Adhesive Preparation & Application",
          "description": "Mix and apply thin-set mortar for tile bonding",
          "steps": [
            {
              "id": "mix-adhesive",
              "step": "Mix Thin-set Mortar",
              "description": "Prepare thin-set mortar to proper consistency for tile installation",
              "contentType": "text",
              "content": "Mix thin-set mortar with water according to package directions to achieve mayonnaise-like consistency. Mix only what can be used in 30 minutes. Allow slake time (5-10 minutes) before use. Use polymer-modified thin-set for porcelain tiles.",
              "materials": [
                {"id": "mat7", "name": "Modified Thinset Mortar", "description": "Tile adhesive", "category": "Consumable", "required": true}
              ],
              "tools": [{"id": "tool7", "name": "Mixing Paddle", "description": "Mix adhesive", "category": "Power Tool", "required": true}],
              "outputs": [{"id": "out7", "name": "Mixed Adhesive", "description": "Ready-to-use thin-set mortar", "type": "none"}],
              "flowType": "prime",
              "isDecisionPoint": true,
              "decisionPoint": {
                "id": "tile-type",
                "question": "What type of tiles are being installed?",
                "description": "Different tile types require different adhesive formulations",
                "stage": "execution",
                "options": [
                  {"id": "opt4", "label": "Ceramic Tiles", "value": "ceramic", "nextStepId": "apply-adhesive"},
                  {"id": "opt5", "label": "Porcelain Tiles", "value": "porcelain", "nextStepId": "apply-adhesive"},
                  {"id": "opt6", "label": "Natural Stone", "value": "stone", "nextStepId": "prime-stone"}
                ],
                "allowFreeText": false
              },
              "timeEstimation": {
                "variableTime": {"low": 0.5, "medium": 0.75, "high": 1},
                "lagTime": {"low": 0.17, "medium": 0.17, "high": 0.17}
              }
            },
            {
              "id": "prime-stone",
              "step": "Prime Natural Stone",
              "description": "Apply sealer to natural stone before installation to prevent staining",
              "contentType": "text",
              "content": "Natural stone tiles should be sealed before installation to prevent staining from adhesive. Apply stone sealer according to manufacturer directions and allow to cure completely before proceeding with installation.",
              "materials": [{"id": "mat8", "name": "Tile Primer/Sealer", "description": "Stone sealer", "category": "Consumable", "required": true}],
              "tools": [],
              "outputs": [{"id": "out8", "name": "Sealed Stone", "description": "Protected stone tiles", "type": "performance-durability"}],
              "flowType": "alternate",
              "condition": "Natural stone tiles being installed",
              "timeEstimation": {
                "variableTime": {"low": 1, "medium": 1.5, "high": 2},
                "lagTime": {"low": 2, "medium": 4, "high": 6}
              }
            },
            {
              "id": "apply-adhesive",
              "step": "Apply Thin-set with Notched Trowel",
              "description": "Spread thin-set mortar evenly using proper trowel technique",
              "contentType": "text",
              "content": "Use notched trowel at 45-degree angle to spread thin-set. Apply flat side first to fill substrate, then comb with notched side in one direction. Work in small sections (3-4 tiles at a time for beginners). Do not let adhesive skin over.",
              "materials": [],
              "tools": [
                {"id": "tool8", "name": "Notched Trowel", "description": "Spread adhesive evenly", "category": "Hand Tool", "required": true},
                {"id": "tool9", "name": "Margin Trowel", "description": "Load trowel with adhesive", "category": "Hand Tool", "required": true}
              ],
              "outputs": [{"id": "out9", "name": "Applied Adhesive", "description": "Even adhesive bed ready for tiles", "type": "performance-durability"}],
              "flowType": "prime",
              "timeEstimation": {
                "variableTime": {"low": 2, "medium": 3, "high": 4},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            }
          ]
        },
        {
          "id": "tile-setting",
          "name": "Setting Tiles",
          "description": "Installing tiles with proper spacing and leveling",
          "steps": [
            {
              "id": "set-first-tile",
              "step": "Set First Reference Tile",
              "description": "Install the first tile at the center point intersection",
              "contentType": "text",
              "content": "Place first tile at intersection of layout lines. Press down firmly and twist slightly to spread adhesive. Check that tile is level and aligned with chalk lines. This tile establishes the reference for all others.",
              "materials": [{"id": "mat9", "name": "Ceramic Floor Tile", "description": "Floor tiles", "category": "Consumable", "required": true}],
              "tools": [{"id": "tool10", "name": "Rubber Mallet", "description": "Adjust tile position", "category": "Hand Tool", "required": true}],
              "outputs": [{"id": "out10", "name": "Reference Tile", "description": "First tile properly positioned", "type": "major-aesthetics"}],
              "flowType": "prime",
              "timeEstimation": {
                "variableTime": {"low": 0.25, "medium": 0.5, "high": 0.75},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            },
            {
              "id": "set-tiles",
              "step": "Install Full Tiles in Sequence",
              "description": "Continue installing whole tiles working outward from center",
              "contentType": "text",
              "content": "Work outward from first tile, installing complete rows. Insert spacers at tile corners. Check alignment frequently. Use leveling system for large format tiles to prevent lippage. Keep grout lines straight and consistent.",
              "materials": [{"id": "mat10", "name": "Tile Spacers", "description": "Maintain gaps", "category": "Hardware", "required": true}],
              "tools": [
                {"id": "tool11", "name": "Tile Level System", "description": "Prevent lippage", "category": "Hand Tool", "required": false},
                {"id": "tool12", "name": "4-foot Level", "description": "Check tile alignment", "category": "Hand Tool", "required": true}
              ],
              "outputs": [{"id": "out11", "name": "Installed Field Tiles", "description": "Full tiles properly set", "type": "major-aesthetics"}],
              "flowType": "repeat",
              "timeEstimation": {
                "variableTime": {"low": 6, "medium": 8, "high": 12},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            },
            {
              "id": "level-tiles",
              "step": "Level and Adjust Tiles",
              "description": "Ensure all tiles are level and properly embedded in adhesive",
              "contentType": "text",
              "content": "Place straight edge across multiple tiles and tap with rubber mallet to level. Check for lippage and adjust as needed while adhesive is workable. Remove excess adhesive from joints before it hardens.",
              "materials": [],
              "tools": [
                {"id": "tool13", "name": "Rubber Mallet", "description": "Level tiles", "category": "Hand Tool", "required": true},
                {"id": "tool14", "name": "4-foot Level", "description": "Check level", "category": "Hand Tool", "required": true}
              ],
              "outputs": [{"id": "out12", "name": "Level Tile Surface", "description": "Smooth, even tile installation", "type": "major-aesthetics"}],
              "flowType": "inspection",
              "timeEstimation": {
                "variableTime": {"low": 1, "medium": 2, "high": 3},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            }
          ]
        },
        {
          "id": "cutting-tiles",
          "name": "Cutting & Installing Edge Tiles",
          "description": "Measuring, cutting, and installing perimeter tiles",
          "steps": [
            {
              "id": "measure-cuts",
              "step": "Measure and Mark Cut Tiles",
              "description": "Accurately measure spaces for cut tiles at room perimeter",
              "contentType": "text",
              "content": "Measure each cut tile individually - rooms are rarely perfectly square. Account for grout joint width and expansion gap at walls (typically 1/4 inch). Mark cutting lines clearly on tile face or back as appropriate.",
              "materials": [],
              "tools": [{"id": "tool15", "name": "Chalk Line", "description": "Mark cutting lines", "category": "Hand Tool", "required": true}],
              "outputs": [{"id": "out13", "name": "Measured Cut Tiles", "description": "Tiles marked for accurate cutting", "type": "major-aesthetics"}],
              "flowType": "prime",
              "timeEstimation": {
                "variableTime": {"low": 1, "medium": 2, "high": 3},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            },
            {
              "id": "cut-tiles",
              "step": "Cut Tiles to Size",
              "description": "Cut tiles using appropriate cutting method for tile type and cut complexity",
              "contentType": "text",
              "content": "Use wet saw for porcelain and natural stone. Manual cutter works for straight cuts in ceramic tile. Use nippers for curves and notches around pipes or fixtures. Always wear safety glasses and follow tool safety procedures.",
              "materials": [],
              "tools": [
                {"id": "tool16", "name": "Wet Tile Saw", "description": "Cut hard tiles", "category": "Power Tool", "required": false},
                {"id": "tool17", "name": "Manual Tile Cutter", "description": "Straight cuts", "category": "Hand Tool", "required": false},
                {"id": "tool18", "name": "Tile Nippers", "description": "Curves and notches", "category": "Hand Tool", "required": false},
                {"id": "tool19", "name": "Safety Glasses", "description": "Eye protection", "category": "Other", "required": true}
              ],
              "outputs": [{"id": "out14", "name": "Cut Tiles", "description": "Tiles cut to fit perimeter spaces", "type": "major-aesthetics"}],
              "flowType": "prime",
              "isDecisionPoint": true,
              "decisionPoint": {
                "id": "cut-type",
                "question": "What type of cuts are needed?",
                "description": "Choose cutting method based on tile material and cut complexity",
                "stage": "execution",
                "options": [
                  {"id": "opt7", "label": "Straight cuts only", "value": "straight", "nextStepId": "install-cut-tiles"},
                  {"id": "opt8", "label": "Curves around fixtures", "value": "curves", "nextStepId": "install-cut-tiles"},
                  {"id": "opt9", "label": "Complex notches", "value": "complex", "nextStepId": "install-cut-tiles"}
                ],
                "allowFreeText": false
              },
              "timeEstimation": {
                "variableTime": {"low": 2, "medium": 4, "high": 6},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            },
            {
              "id": "install-cut-tiles",
              "step": "Install Cut Tiles",
              "description": "Set cut tiles in remaining spaces around room perimeter",
              "contentType": "text",
              "content": "Apply thin-set to back of cut tiles (back-buttering) for better adhesion. Press firmly into place, maintaining proper spacing from walls and adjacent tiles. Check level and alignment with field tiles.",
              "materials": [],
              "tools": [],
              "outputs": [{"id": "out15", "name": "Complete Tile Installation", "description": "All tiles installed and level", "type": "major-aesthetics"}],
              "flowType": "prime",
              "timeEstimation": {
                "variableTime": {"low": 2, "medium": 3, "high": 4},
                "lagTime": {"low": 24, "medium": 24, "high": 24}
              }
            }
          ]
        }
      ]
    },
    {
      "id": "finishing-phase",
      "name": "Grouting & Finishing",
      "description": "Grouting joints, cleaning, and applying protective treatments",
      "operations": [
        {
          "id": "grouting",
          "name": "Grout Application",
          "description": "Mixing and applying grout to tile joints",
          "steps": [
            {
              "id": "remove-spacers",
              "step": "Remove Tile Spacers",
              "description": "Remove all spacers from joints before grouting",
              "contentType": "text",
              "content": "Carefully remove all tile spacers from joints. Use utility knife or spacer removal tool if spacers are stuck. Ensure joints are clean and free of adhesive residue before proceeding with grout application.",
              "materials": [],
              "tools": [],
              "outputs": [{"id": "out16", "name": "Clean Joints", "description": "Joints ready for grout", "type": "none"}],
              "flowType": "prime",
              "timeEstimation": {
                "variableTime": {"low": 0.5, "medium": 1, "high": 1.5},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            },
            {
              "id": "mix-grout",
              "step": "Mix Grout to Proper Consistency",
              "description": "Prepare grout according to manufacturer specifications",
              "contentType": "text",
              "content": "Mix grout with water to achieve smooth, lump-free consistency. Use sanded grout for joints 1/8 inch and wider, unsanded for narrower joints. Mix only amount that can be used in 30 minutes. Add grout additive if specified.",
              "materials": [
                {"id": "mat11", "name": "Sanded Grout", "description": "For wide joints", "category": "Consumable", "required": false},
                {"id": "mat12", "name": "Unsanded Grout", "description": "For narrow joints", "category": "Consumable", "required": false},
                {"id": "mat13", "name": "Grout Additive", "description": "Improve performance", "category": "Consumable", "required": false}
              ],
              "tools": [{"id": "tool20", "name": "Mixing Paddle", "description": "Mix grout", "category": "Power Tool", "required": true}],
              "outputs": [{"id": "out17", "name": "Mixed Grout", "description": "Ready-to-use grout", "type": "none"}],
              "flowType": "prime",
              "isDecisionPoint": true,
              "decisionPoint": {
                "id": "grout-type",
                "question": "What is the grout joint width?",
                "description": "Joint width determines grout type needed",
                "stage": "execution",
                "options": [
                  {"id": "opt10", "label": "Less than 1/8 inch", "value": "narrow", "nextStepId": "apply-grout"},
                  {"id": "opt11", "label": "1/8 inch or wider", "value": "wide", "nextStepId": "apply-grout"}
                ],
                "allowFreeText": false
              },
              "timeEstimation": {
                "variableTime": {"low": 0.5, "medium": 0.75, "high": 1},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            },
            {
              "id": "apply-grout",
              "step": "Apply Grout with Float",
              "description": "Spread grout into joints using rubber float",
              "contentType": "text",
              "content": "Using rubber grout float at 45-degree angle, spread grout diagonally across tiles to fill joints completely. Work in small sections. Press firmly to pack grout into joints and eliminate voids.",
              "materials": [],
              "tools": [
                {"id": "tool21", "name": "Rubber Grout Float", "description": "Apply grout", "category": "Hand Tool", "required": true},
                {"id": "tool22", "name": "Knee Pads", "description": "Protect knees", "category": "Other", "required": true}
              ],
              "outputs": [{"id": "out18", "name": "Grouted Joints", "description": "Joints filled with grout", "type": "performance-durability"}],
              "flowType": "prime",
              "timeEstimation": {
                "variableTime": {"low": 2, "medium": 3, "high": 4},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            },
            {
              "id": "clean-grout",
              "step": "Clean Excess Grout from Tile Surface",
              "description": "Remove grout haze and smooth joint surfaces",
              "contentType": "text",
              "content": "Wait 15-20 minutes for grout to firm up, then clean tile surface with barely damp grout sponge using light circular motions. Rinse sponge frequently in clean water. Shape and smooth grout joints with sponge or finger.",
              "materials": [],
              "tools": [{"id": "tool23", "name": "Grout Sponge", "description": "Clean tiles", "category": "Hand Tool", "required": true}],
              "outputs": [{"id": "out19", "name": "Clean Tile Surface", "description": "Tiles clean with smooth grout joints", "type": "major-aesthetics"}],
              "flowType": "prime",
              "timeEstimation": {
                "variableTime": {"low": 1.5, "medium": 2, "high": 3},
                "lagTime": {"low": 0.25, "medium": 0.33, "high": 0.5}
              }
            }
          ]
        },
        {
          "id": "final-finishing",
          "name": "Final Cleaning & Sealing",
          "description": "Final cleaning, caulking, and protective treatments",
          "steps": [
            {
              "id": "final-clean",
              "step": "Final Cleaning and Haze Removal",
              "description": "Remove any remaining grout haze and construction residue",
              "contentType": "text",
              "content": "After grout has cured for 1-2 hours, clean tiles with clean damp cloth to remove any remaining haze. Use tile cleaner if needed for stubborn residue. Allow grout to cure completely (24-48 hours) before sealing.",
              "materials": [{"id": "mat14", "name": "Tile Cleaner", "description": "Remove haze and residue", "category": "Consumable", "required": false}],
              "tools": [],
              "outputs": [{"id": "out20", "name": "Clean Installation", "description": "Spotless tile and grout", "type": "major-aesthetics"}],
              "flowType": "prime",
              "timeEstimation": {
                "variableTime": {"low": 1, "medium": 1.5, "high": 2},
                "lagTime": {"low": 1, "medium": 2, "high": 4}
              }
            },
            {
              "id": "caulk-perimeter",
              "step": "Caulk Perimeter and Transitions",
              "description": "Apply flexible caulk at wall junctions and transitions",
              "contentType": "text",
              "content": "Remove grout from expansion joints at walls, corners, and transitions. Apply color-matched silicone caulk to these areas. Smooth with finger or caulk tool for professional appearance.",
              "materials": [{"id": "mat15", "name": "Silicone Caulk", "description": "Flexible joint sealant", "category": "Consumable", "required": true}],
              "tools": [],
              "outputs": [{"id": "out21", "name": "Sealed Perimeter", "description": "Flexible sealed joints", "type": "performance-durability"}],
              "flowType": "prime",
              "timeEstimation": {
                "variableTime": {"low": 0.5, "medium": 1, "high": 1.5},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            },
            {
              "id": "seal-grout",
              "step": "Apply Grout Sealer",
              "description": "Seal grout joints to prevent stains and moisture penetration",
              "contentType": "text",
              "content": "After grout has cured completely (48-72 hours), apply penetrating grout sealer according to manufacturer directions. Use applicator bottle or brush to apply sealer only to grout lines, avoiding tile surfaces.",
              "materials": [{"id": "mat16", "name": "Grout Sealer", "description": "Protect grout from stains", "category": "Consumable", "required": true}],
              "tools": [],
              "outputs": [{"id": "out22", "name": "Sealed Grout", "description": "Protected, stain-resistant grout", "type": "performance-durability"}],
              "flowType": "prime",
              "timeEstimation": {
                "variableTime": {"low": 1, "medium": 1.5, "high": 2},
                "lagTime": {"low": 48, "medium": 60, "high": 72}
              }
            },
            {
              "id": "install-trim",
              "step": "Install Transition Strips and Trim",
              "description": "Add finishing touches with trim and transition pieces",
              "contentType": "text",
              "content": "Install transition strips at doorways between tile and other flooring materials. Add tile edge trim or baseboards as needed. Ensure all edges are properly finished for a professional appearance.",
              "materials": [
                {"id": "mat17", "name": "Transition Strips", "description": "Bridge to other flooring", "category": "Hardware", "required": false},
                {"id": "mat18", "name": "Tile Edge Trim", "description": "Finished edges", "category": "Hardware", "required": false}
              ],
              "tools": [],
              "outputs": [{"id": "out23", "name": "Finished Installation", "description": "Professional completed tile floor", "type": "major-aesthetics"}],
              "flowType": "if-necessary",
              "condition": "Transitions needed",
              "timeEstimation": {
                "variableTime": {"low": 1, "medium": 2, "high": 3},
                "lagTime": {"low": 0, "medium": 0, "high": 0}
              }
            }
          ]
        }
      ]
    }
  ]'::jsonb
);