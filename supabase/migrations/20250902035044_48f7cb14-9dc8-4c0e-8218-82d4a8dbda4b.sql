-- Insert comprehensive tools for tile installation (tools table is empty)
INSERT INTO public.tools (item, description, example_models, photo_url) VALUES 
('Wet Tile Saw', 'Professional wet tile saw for cutting ceramic, porcelain, and stone tiles with precision. Essential for straight cuts and complex cuts around fixtures.', 'DEWALT D24000S, RIDGID R4091, Bosch TC21', NULL),
('Notched Trowel', 'Stainless steel trowel with square or U-shaped notches for spreading tile adhesive evenly. Size depends on tile size (1/4" x 1/4" for most floor tiles).', 'Marshalltown 13215, QEP 49916Q, Goldblatt G03024', NULL),
('Rubber Grout Float', 'Rubber float for applying and smoothing grout into tile joints. Prevents scratching of tile surface during grouting.', 'Marshalltown 166D, QEP 10220Q, Bon Tool 12-185', NULL),
('Tile Level System', 'Leveling clips and wedges to ensure tiles are level and prevent lippage. Critical for large format tiles.', 'Rubi Tile Level Quick, QEP LevelMax, Vitrex Lash Tile Leveling System', NULL),
('Manual Tile Cutter', 'Score-and-snap tile cutter for straight cuts on ceramic and porcelain tiles up to certain thickness.', 'Sigma Pull Handle Cutter, QEP 10630Q, Montolit Masterpiuma', NULL),
('Tile Nippers', 'Hand tool for making small cuts, curves, and notches in tiles around fixtures and pipes.', 'Goldblatt G06970, Marshalltown 399, QEP 10018Q', NULL),
('Grout Sponge', 'Large pore sponge for cleaning excess grout from tile surface and smoothing grout lines.', 'Goldblatt G15533, QEP 70005Q Professional, Marshalltown 165', NULL),
('Chalk Line', 'For marking straight reference lines across the floor to ensure proper tile layout and alignment.', 'Stanley FatMax 47-465, Tajima PL-ITOS, Irwin Strait-Line 64495', NULL),
('4-foot Level', 'Long level to check floor flatness and ensure tiles are level across large areas.', 'Stanley FatMax 42-468, Empire EM71.96, Stabila 96-2', NULL),
('Mixing Paddle', 'Drill attachment for mixing tile adhesive and grout to proper consistency.', 'DEWALT DW5231, Marshalltown M612, QEP 62260Q', NULL),
('Knee Pads', 'Protective gear for knees during extended periods of kneeling while installing tiles.', 'Troxell SuperSoft Kneepads, McGuire-Nicholas 315, Allegro Economy', NULL),
('Margin Trowel', 'Small flat trowel for mixing small batches of adhesive and applying adhesive in tight areas.', 'Marshalltown MXS65D, Goldblatt G05023, QEP 49914Q', NULL),
('Tile Saw Blade', 'Diamond blade designed for cutting ceramic, porcelain, and stone tiles with clean edges.', 'DEWALT DW4712, Bosch DB1041S, MK Diamond 157222', NULL),
('Safety Glasses', 'Eye protection when cutting tiles with saws or working with adhesives and chemicals.', 'DeWalt DPG82-11, 3M Virtua CCS, Pyramex Venture Gear', NULL),
('Rubber Mallet', 'Soft-faced mallet for adjusting tile position without damage. Essential for leveling and setting tiles.', 'Vaughan 16 oz, Stanley 16-315, Tekton 30403', NULL),
('Drill Driver', 'Cordless drill for mixing adhesive and driving screws during backer board installation.', 'DEWALT DCD771C2, Makita XFD131, Milwaukee 2701-20', NULL);

-- Insert new materials that don't exist yet
INSERT INTO public.materials (item, description, unit_size, photo_url) VALUES 
('Cement Backer Board', 'Water-resistant underlayment for tile installation over wood subfloors. Provides stable, moisture-resistant base.', '3 ft x 5 ft sheet', NULL),
('Tile Edge Trim', 'Decorative and protective trim pieces for tile edges at walls, transitions, and corners. Available in metal, plastic, or stone.', 'Per Linear Foot', NULL),
('Tile Primer/Sealer', 'Primer for porous surfaces before tile installation. Improves adhesive bonding and reduces substrate absorption.', '1 Gallon container', NULL),
('Transition Strips', 'Metal or wood strips for transitioning between tile and other flooring materials at doorways and room borders.', 'Per Linear Foot', NULL),
('Tile Cleaner', 'Specialized cleaner for removing haze, residue, and construction debris from newly installed tiles.', '32 oz bottle', NULL),
('Grout Additive', 'Liquid additive mixed with grout to improve workability, reduce shrinkage, and enhance stain resistance.', '1 Quart bottle', NULL),
('Crack Isolation Membrane', 'Membrane installed over substrate cracks to prevent telegraph cracking through tiles.', 'Per Square Foot', NULL),
('Backer Board Screws', 'Corrosion-resistant screws specifically designed for attaching cement backer board to subfloor.', '1 lb box', NULL),
('Fiberglass Mesh Tape', 'Self-adhesive tape for sealing joints between backer board sheets before tiling.', '150 ft roll', NULL),
('Tile Setting Blocks', 'Temporary supports used to hold tiles in place while adhesive cures on walls or vertical surfaces.', 'Set of 4', NULL);