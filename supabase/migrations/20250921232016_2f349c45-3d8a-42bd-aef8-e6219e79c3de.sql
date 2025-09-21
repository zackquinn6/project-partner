-- Update the tile flooring installation project to remove non-standard phases and import Excel data

-- Get the tile installation project ID (assuming we want the latest revision)
DO $$
DECLARE
    tile_project_id UUID;
    new_phases JSONB := '[]'::jsonb;
    prep_phase JSONB;
    install_phase JSONB;
    finish_phase JSONB;
    kickoff_phase JSONB;
    planning_phase JSONB;
    ordering_phase JSONB;
    closing_phase JSONB;
BEGIN
    -- Get the tile installation project
    SELECT id INTO tile_project_id 
    FROM projects 
    WHERE name LIKE '%Tile%Installation%' 
    ORDER BY created_at DESC 
    LIMIT 1;

    -- Build standard kickoff phase
    kickoff_phase := jsonb_build_object(
        'id', 'kickoff-phase',
        'name', 'Kickoff',
        'description', 'Project kickoff and initial planning',
        'operations', jsonb_build_array(
            jsonb_build_object(
                'id', 'project-overview-op',
                'name', 'Project Overview',
                'description', 'Review project scope and requirements',
                'steps', jsonb_build_array(
                    jsonb_build_object(
                        'id', 'project-overview-step',
                        'step', 'Project Overview',
                        'description', 'Review tile installation project scope, timeline, and requirements',
                        'contentType', 'text',
                        'content', 'Review the complete tile installation process, materials needed, and timeline.',
                        'materials', jsonb_build_array(),
                        'tools', jsonb_build_array(),
                        'outputs', jsonb_build_array(),
                        'flowType', 'prime'
                    )
                )
            )
        )
    );

    -- Build standard planning phase  
    planning_phase := jsonb_build_object(
        'id', 'planning-phase',
        'name', 'Planning', 
        'description', 'Detailed project planning and preparation',
        'operations', jsonb_build_array(
            jsonb_build_object(
                'id', 'initial-planning-op',
                'name', 'Initial Planning',
                'description', 'Initial project planning and assessment',
                'steps', jsonb_build_array()
            )
        )
    );

    -- Build standard ordering phase
    ordering_phase := jsonb_build_object(
        'id', 'ordering-phase',
        'name', 'Ordering',
        'description', 'Order tools and materials for the project',
        'operations', jsonb_build_array(
            jsonb_build_object(
                'id', 'ordering-op',
                'name', 'Tool & Material Ordering',
                'description', 'Order required tools and materials',
                'steps', jsonb_build_array()
            )
        )
    );

    -- Build Prep phase from Excel data
    prep_phase := jsonb_build_object(
        'id', 'prep-phase',
        'name', 'Prep',
        'description', 'Surface preparation and project setup',
        'operations', jsonb_build_array(
            -- Project Setup Operation
            jsonb_build_object(
                'id', 'project-setup-op',
                'name', 'Project Setup',
                'description', 'Setup work area and stage materials',
                'steps', jsonb_build_array(
                    jsonb_build_object(
                        'id', 'furniture-move-step',
                        'step', 'Furniture and belongings move',
                        'description', 'Remove furniture, fixtures, and personal items; protect adjacent surfaces',
                        'contentType', 'text',
                        'content', 'Remove furniture, fixtures, and personal items; protect adjacent surfaces',
                        'materials', jsonb_build_array(),
                        'tools', jsonb_build_array(),
                        'outputs', jsonb_build_array(
                            jsonb_build_object(
                                'id', 'no-dust-areas-output',
                                'name', 'No personal areas affected by dust',
                                'description', 'Personal areas protected from dust',
                                'type', 'none'
                            )
                        ),
                        'inputs', jsonb_build_array(
                            jsonb_build_object('id', 'furniture-qty', 'name', 'Furniture qty', 'type', 'number'),
                            jsonb_build_object('id', 'distance-to-project', 'name', 'Distance to project', 'type', 'measurement')
                        ),
                        'flowType', 'if-necessary'
                    ),
                    jsonb_build_object(
                        'id', 'workstation-setup-step',
                        'step', 'Work station setup',
                        'description', 'Position mixing tools, water supply, cutting tools, and waste bins within easy reach while keeping the main floor clear.',
                        'contentType', 'text',
                        'content', 'Position mixing tools, water supply, cutting tools, and waste bins within easy reach while keeping the main floor clear.',
                        'materials', jsonb_build_array(),
                        'tools', jsonb_build_array(),
                        'outputs', jsonb_build_array(
                            jsonb_build_object(
                                'id', 'workstation-output',
                                'name', 'Setup: Workbench, mixing area with water supply, cutting table, re-useable scraps, and final waste tile.',
                                'description', 'Complete workstation setup',
                                'type', 'none'
                            )
                        ),
                        'inputs', jsonb_build_array(
                            jsonb_build_object('id', 'distance-to-project', 'name', 'Distance to project', 'type', 'measurement')
                        ),
                        'flowType', 'prime'
                    ),
                    jsonb_build_object(
                        'id', 'materials-staging-step',
                        'step', 'Materials staging',
                        'description', 'Lay out tile boxes in installation order; pre-open shrink wrap to acclimate tiles to room temperature and humidity.',
                        'contentType', 'text',
                        'content', 'Lay out tile boxes in installation order; pre-open shrink wrap to acclimate tiles to room temperature and humidity.',
                        'materials', jsonb_build_array(),
                        'tools', jsonb_build_array(),
                        'outputs', jsonb_build_array(
                            jsonb_build_object(
                                'id', 'acclimation-output',
                                'name', 'Acclimation time passed mfg minimum',
                                'description', 'Materials properly acclimated',
                                'type', 'none'
                            )
                        ),
                        'inputs', jsonb_build_array(
                            jsonb_build_object('id', 'duration-check-method', 'name', 'Duration check method', 'type', 'text')
                        ),
                        'flowType', 'prime'
                    )
                )
            ),
            -- Demo Operation  
            jsonb_build_object(
                'id', 'demo-op',
                'name', 'Demo',
                'description', 'Remove existing flooring and prepare surface',
                'steps', jsonb_build_array(
                    jsonb_build_object(
                        'id', 'remove-materials-step',
                        'step', 'Remove non-hazardous materials',
                        'description', 'Strip carpet, vinyl, or existing tile down to the substrate; use scrapers and floor scrubbing tools to clear residue.',
                        'contentType', 'text',
                        'content', 'Strip carpet, vinyl, or existing tile down to the substrate; use scrapers and floor scrubbing tools to clear residue.',
                        'materials', jsonb_build_array(),
                        'tools', jsonb_build_array(),
                        'outputs', jsonb_build_array(
                            jsonb_build_object(
                                'id', 'old-materials-removed',
                                'name', 'Old materials removed from floor',
                                'description', 'Existing flooring completely removed',
                                'type', 'none'
                            )
                        ),
                        'inputs', jsonb_build_array(
                            jsonb_build_object('id', 'flooring-materials-volume', 'name', 'Flooring materials volume', 'type', 'measurement'),
                            jsonb_build_object('id', 'material-type', 'name', 'Material type', 'type', 'selection'),
                            jsonb_build_object('id', 'nail-volume', 'name', 'Nail volume', 'type', 'number')
                        ),
                        'flowType', 'prime'
                    )
                )
            ),
            -- Layout Operation
            jsonb_build_object(
                'id', 'layout-op',
                'name', 'Layout',
                'description', 'Plan and mark tile layout',
                'steps', jsonb_build_array(
                    jsonb_build_object(
                        'id', 'plan-layout-step',
                        'step', 'Plan layout',
                        'description', 'Plan layout using digital tools',
                        'contentType', 'text',
                        'content', 'Plan layout using digital tools to ensure proper tile spacing and alignment.',
                        'materials', jsonb_build_array(),
                        'tools', jsonb_build_array(),
                        'outputs', jsonb_build_array(
                            jsonb_build_object(
                                'id', 'layout-plan-output',
                                'name', 'Layout plan',
                                'description', 'Complete layout plan with reference walls and spacing',
                                'type', 'none'
                            )
                        ),
                        'inputs', jsonb_build_array(
                            jsonb_build_object('id', 'accurate-measurements', 'name', 'Accurate measurements w/ grout', 'type', 'measurement'),
                            jsonb_build_object('id', 'reference-walls', 'name', 'Reference walls', 'type', 'text')
                        ),
                        'flowType', 'prime'
                    )
                )
            )
        )
    );

    -- Build Install phase from Excel data
    install_phase := jsonb_build_object(
        'id', 'install-phase',
        'name', 'Install',
        'description', 'Tile installation and setting',
        'operations', jsonb_build_array(
            -- Cut Operation
            jsonb_build_object(
                'id', 'cut-op',
                'name', 'Cut',
                'description', 'Cut tiles to size and shape',
                'steps', jsonb_build_array(
                    jsonb_build_object(
                        'id', 'wet-saw-cut-step',
                        'step', 'Wet saw cut',
                        'description', 'Use a water-cooled tile saw for straight, precise cuts on ceramic, porcelain, or natural stone.',
                        'contentType', 'text',
                        'content', 'Use a water-cooled tile saw for straight, precise cuts on ceramic, porcelain, or natural stone.',
                        'materials', jsonb_build_array(),
                        'tools', jsonb_build_array(),
                        'outputs', jsonb_build_array(
                            jsonb_build_object(
                                'id', 'cut-accuracy-output',
                                'name', 'Cut according to size - +/-1/16"',
                                'description', 'Precise cuts within tolerance',
                                'type', 'none'
                            )
                        ),
                        'inputs', jsonb_build_array(
                            jsonb_build_object('id', 'saw-blade-condition', 'name', 'Saw blade condition', 'type', 'selection'),
                            jsonb_build_object('id', 'feed-rate', 'name', 'Feed rate', 'type', 'number'),
                            jsonb_build_object('id', 'water-flow', 'name', 'Water flow', 'type', 'number')
                        ),
                        'flowType', 'prime'
                    )
                )
            ),
            -- Set Operation
            jsonb_build_object(
                'id', 'set-op',
                'name', 'Set',
                'description', 'Set tiles in place with proper spacing',
                'steps', jsonb_build_array(
                    jsonb_build_object(
                        'id', 'set-tile-step',
                        'step', 'Set tile',
                        'description', 'Press and wiggle each tile into the mortar bed, maintaining consistent spacing with wedges or spacers and periodic level checks.',
                        'contentType', 'text',
                        'content', 'Press and wiggle each tile into the mortar bed, maintaining consistent spacing with wedges or spacers and periodic level checks.',
                        'materials', jsonb_build_array(),
                        'tools', jsonb_build_array(),
                        'outputs', jsonb_build_array(
                            jsonb_build_object(
                                'id', 'lippage-output',
                                'name', 'Lippage <1/32"',
                                'description', 'Tiles set with minimal lippage',
                                'type', 'none'
                            )
                        ),
                        'inputs', jsonb_build_array(
                            jsonb_build_object('id', 'thinset-volume', 'name', 'Thinset volume', 'type', 'measurement'),
                            jsonb_build_object('id', 'thinset-consistency', 'name', 'Thinset consistency', 'type', 'selection'),
                            jsonb_build_object('id', 'tile-setting-pressure', 'name', 'Tile setting pressure', 'type', 'selection')
                        ),
                        'flowType', 'repeat'
                    )
                )
            )
        )
    );

    -- Build Finish phase from Excel data
    finish_phase := jsonb_build_object(
        'id', 'finish-phase',
        'name', 'Finish',
        'description', 'Final finishing and cleanup',
        'operations', jsonb_build_array(
            jsonb_build_object(
                'id', 'cleaning-op',
                'name', 'Cleaning',
                'description', 'Clean tools and work area',
                'steps', jsonb_build_array(
                    jsonb_build_object(
                        'id', 'clean-tools-step',
                        'step', 'Clean tools',
                        'description', 'Remove thinset from tools',
                        'contentType', 'text',
                        'content', 'Remove thinset from tools to prevent hardening and damage.',
                        'materials', jsonb_build_array(),
                        'tools', jsonb_build_array(),
                        'outputs', jsonb_build_array(
                            jsonb_build_object(
                                'id', 'tools-clean-output',
                                'name', 'Thinset completely removed from tools',
                                'description', 'Tools cleaned and ready for storage',
                                'type', 'none'
                            )
                        ),
                        'inputs', jsonb_build_array(
                            jsonb_build_object('id', 'thinset-waste-location', 'name', 'Thinset waste location', 'type', 'text'),
                            jsonb_build_object('id', 'water-rinse-duration', 'name', 'Water rinse duration', 'type', 'number')
                        ),
                        'flowType', 'prime'
                    )
                )
            )
        )
    );

    -- Build standard closing phase
    closing_phase := jsonb_build_object(
        'id', 'closing-phase',
        'name', 'Close Project',
        'description', 'Project completion and cleanup',
        'operations', jsonb_build_array(
            jsonb_build_object(
                'id', 'project-completion-op',
                'name', 'Project Completion',
                'description', 'Complete project and clean up',
                'steps', jsonb_build_array()
            )
        )
    );

    -- Combine all phases
    new_phases := jsonb_build_array(
        kickoff_phase,
        planning_phase, 
        ordering_phase,
        prep_phase,
        install_phase,
        finish_phase,
        closing_phase
    );

    -- Update the tile installation project with new phases
    IF tile_project_id IS NOT NULL THEN
        UPDATE projects 
        SET 
            phases = new_phases,
            updated_at = now()
        WHERE id = tile_project_id;
        
        RAISE NOTICE 'Updated tile installation project % with Excel data', tile_project_id;
    ELSE
        RAISE NOTICE 'No tile installation project found to update';
    END IF;
END $$;