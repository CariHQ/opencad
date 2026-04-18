/**
 * CSI MasterFormat Specification Database
 * Provides construction specification sections for BIM element types.
 */

import type { DocumentSchema } from '@opencad/document';

export interface CSISection {
  division: number; // 03 = Concrete, 04 = Masonry, 05 = Metals, 06 = Wood, etc.
  section: string; // '03 30 00' = Cast-in-Place Concrete
  title: string;
  description: string;
  parts: {
    part1_general: string; // scope, related sections, references
    part2_products: string; // materials, manufacturers, performance requirements
    part3_execution: string; // installation, field quality control
  };
  applicableElementTypes: string[]; // which OpenCAD element types use this spec
}

export const CSI_SECTIONS: CSISection[] = [
  // Division 03 — Concrete
  {
    division: 3,
    section: '03 30 00',
    title: 'Cast-in-Place Concrete',
    description: 'Structural concrete for foundations, slabs, walls, and columns',
    parts: {
      part1_general:
        'Scope: Furnish and install cast-in-place concrete as indicated on drawings. ' +
        'Related sections: 03 10 00 Concrete Forming and Accessories, 03 20 00 Concrete Reinforcing. ' +
        'References: ACI 301 Specifications for Structural Concrete, ACI 318 Building Code, ' +
        'ASTM C94 Ready-Mixed Concrete, ASTM C150 Portland Cement.',
      part2_products:
        'Portland cement: ASTM C150, Type I or II, grey unless white is required. ' +
        'Aggregates: ASTM C33, clean, hard, and uncoated. ' +
        'Water: Potable and free of deleterious materials. ' +
        'Admixtures: Water-reducing (ASTM C494 Type A), air-entraining (ASTM C260) as required. ' +
        'Mix design: Minimum 28-day compressive strength 25 MPa unless otherwise noted. ' +
        'Maximum water-cement ratio: 0.45 for exposed concrete, 0.50 for interior.',
      part3_execution:
        'Formwork: Construct to produce surfaces of required shape, line and grade. ' +
        'Reinforcement: Place per ACI 315 and drawings; secure prior to concrete placement. ' +
        'Placement: Do not place at temperatures below 5°C or above 35°C without protection. ' +
        'Consolidation: Use internal vibrators; avoid over-vibration. ' +
        'Curing: Cure for minimum 7 days using wet burlap, curing compound (ASTM C309) or other approved method. ' +
        'Testing: One set of 4 cylinders per 50 m³; test at 7 and 28 days per ASTM C39.',
    },
    applicableElementTypes: ['wall', 'slab', 'column', 'beam', 'stair', 'structural_member'],
  },
  {
    division: 3,
    section: '03 20 00',
    title: 'Concrete Reinforcing',
    description: 'Deformed reinforcing bars and welded wire reinforcement for concrete structures',
    parts: {
      part1_general:
        'Scope: Furnish and install concrete reinforcing including bars, welded wire reinforcement, ' +
        'and associated accessories. ' +
        'References: ASTM A615 Deformed Bars, ASTM A185 Welded Wire Reinforcement, ' +
        'ACI 318 Building Code Requirements for Structural Concrete.',
      part2_products:
        'Deformed reinforcing bars: ASTM A615, Grade 500 (Grade 60 imperial). ' +
        'Welded wire reinforcement: ASTM A185, plain or deformed as shown. ' +
        'Bar supports: Plastic or precast concrete; use stainless steel or epoxy-coated in exposed conditions. ' +
        'Mechanical splices: Where shown on drawings, meet ACI 318 requirements.',
      part3_execution:
        'Fabrication: Bend bars cold; cutting by shear or saw only. ' +
        'Placement: Position per structural drawings; secure to prevent displacement during pour. ' +
        'Lap splices: As detailed; minimum per ACI 318 Table 25.5.2.1. ' +
        'Cover: Maintain specified concrete cover using approved bar supports. ' +
        'Inspection: Notify structural engineer before placing concrete for inspection.',
    },
    applicableElementTypes: ['wall', 'slab', 'column', 'beam', 'stair', 'structural_member'],
  },

  // Division 04 — Masonry
  {
    division: 4,
    section: '04 20 00',
    title: 'Unit Masonry',
    description: 'Concrete masonry units, clay brick, and mortar for walls and partitions',
    parts: {
      part1_general:
        'Scope: Furnish and install unit masonry including concrete masonry units (CMU), ' +
        'clay face brick, mortar, grout, and accessories as indicated. ' +
        'Related sections: 03 30 00 Cast-in-Place Concrete, 07 21 00 Thermal Insulation. ' +
        'References: ASTM C90 CMU, ASTM C216 Facing Brick, ' +
        'ASTM C270 Mortar for Unit Masonry, ACI 530 Building Code for Masonry Structures.',
      part2_products:
        'Concrete masonry units: ASTM C90, normal weight or medium weight as specified, ' +
        'minimum net area compressive strength 13.1 MPa. ' +
        'Face brick: ASTM C216, Grade SW (Severe Weathering) for exterior; select for colour uniformity. ' +
        'Mortar: Type S for structural and exterior; Type N for interior non-loadbearing. ' +
        'Grout: Fine grout per ASTM C476 for cells ≤75 mm wide; coarse grout otherwise. ' +
        'Wall ties: Hot-dip galvanised steel per ASTM A153, Class B2, 3 mm diameter.',
      part3_execution:
        'Layout: Establish lines and levels; cut masonry only with masonry saw. ' +
        'Mortar joints: 10 mm nominal; tooled concave or as specified. ' +
        'Coursing: Maintain accurate course heights and vertical alignment. ' +
        'Control joints: Locate per engineered drawings; install per manufacturer requirements. ' +
        'Grout: Consolidate by puddling for lifts ≤300 mm; mechanical vibration for greater lifts. ' +
        'Protection: Cover masonry during construction; do not lay when temperature below 5°C without cold-weather protection.',
    },
    applicableElementTypes: ['wall', 'column', 'structural_member'],
  },

  // Division 05 — Metals
  {
    division: 5,
    section: '05 12 00',
    title: 'Structural Steel Framing',
    description: 'Structural steel for beams, columns, frames, and connections',
    parts: {
      part1_general:
        'Scope: Furnish and install structural steel framing including beams, columns, ' +
        'bracing, and connections as shown on structural drawings. ' +
        'Related sections: 03 30 00 Cast-in-Place Concrete, 05 50 00 Metal Fabrications. ' +
        'References: AISC 360 Specification for Structural Steel Buildings, ' +
        'AWS D1.1 Structural Welding Code — Steel, ASTM A36 and A992 Steel.',
      part2_products:
        'Wide-flange sections: ASTM A992, Fy = 345 MPa (50 ksi). ' +
        'Plates and angles: ASTM A36, Fy = 250 MPa (36 ksi) unless otherwise noted. ' +
        'Hollow structural sections (HSS): ASTM A500, Grade C, Fy = 345 MPa. ' +
        'Anchor rods: ASTM F1554, Grade 36 or 55 as specified. ' +
        'High-strength bolts: ASTM A325 or A490 as indicated; installed snug-tight minimum. ' +
        'Primer: Zinc-rich or approved shop primer, dry film thickness 75 μm min.',
      part3_execution:
        'Fabrication: Per AISC Code of Standard Practice; CJP welds by qualified welders. ' +
        'Erection: Plumb and align before making permanent connections; temporary bracing required. ' +
        'Welding: Preheat as required by AWS D1.1; inspect per AISC 360 Chapter N. ' +
        'Bolting: Install high-strength bolts per AISC Research Council on Structural Connections. ' +
        'Fireproofing: Apply intumescent coating or spray-applied fireproofing per drawings. ' +
        'Inspection: Third-party special inspections per project IBC requirements.',
    },
    applicableElementTypes: ['beam', 'column', 'structural_member', 'railing'],
  },

  // Division 06 — Wood, Plastics, and Composites
  {
    division: 6,
    section: '06 10 00',
    title: 'Rough Carpentry',
    description: 'Dimension lumber, engineered wood products, and rough framing',
    parts: {
      part1_general:
        'Scope: Furnish and install rough carpentry including wall framing, floor framing, ' +
        'roof framing, blocking, nailers, and backing as indicated. ' +
        'Related sections: 06 17 00 Shop-Fabricated Structural Wood, 07 21 00 Thermal Insulation. ' +
        'References: NDS National Design Specification for Wood Construction, ' +
        'AWC Wood Frame Construction Manual, ASTM D1990.',
      part2_products:
        'Dimension lumber: Douglas Fir-Larch or Hem-Fir, No. 2 and Better for framing. ' +
        'Engineered wood products: Laminated veneer lumber (LVL), parallel strand lumber (PSL), ' +
        'I-joists per manufacturer specifications. ' +
        'Plywood sheathing: APA-rated, exposure 1 or exterior as required. ' +
        'OSB sheathing: APA-rated, OSB/4 (24F-0E or 32/16). ' +
        'Fasteners: Hot-dip galvanised nails for treated lumber and exterior; electro-galvanised interior. ' +
        'Treated lumber: ACQ pressure-treated per AWPA C2 for ground contact or exposed conditions.',
      part3_execution:
        'Layout: Establish reference lines; frame per structural drawings and applicable codes. ' +
        'Stud walls: 400 mm or 600 mm on centre; double top plates; headers over openings per schedule. ' +
        'Floor systems: Joists at spacing shown; bridging or blocking per NDS. ' +
        'Sheathing: Install with 3 mm expansion gaps; stagger vertical joints. ' +
        'Connections: Use metal connectors where specified; nail schedules per drawings. ' +
        'Moisture: Framing lumber moisture content ≤19% at time of installation.',
    },
    applicableElementTypes: ['wall', 'beam', 'column', 'slab', 'roof', 'structural_member'],
  },

  // Division 07 — Thermal and Moisture Protection
  {
    division: 7,
    section: '07 21 00',
    title: 'Thermal Insulation',
    description: 'Batt, board, spray, and blown thermal insulation for building envelopes',
    parts: {
      part1_general:
        'Scope: Furnish and install thermal insulation for walls, roofs, floors, and ' +
        'foundation perimeters as indicated on drawings and energy compliance documents. ' +
        'Related sections: 06 10 00 Rough Carpentry, 07 25 00 Weather Barriers. ' +
        'References: ASTM C553 Mineral Fiber Batt, ASTM C578 Rigid Cellular Polystyrene, ' +
        'ASTM C665 Mineral Fiber Batt, ASHRAE 90.1 Energy Standard.',
      part2_products:
        'Batt insulation: Mineral wool or fibreglass batt, R-value as required by energy calculations; ' +
        'unfaced or foil-faced as specified. ' +
        'Rigid board: Extruded polystyrene (XPS) ASTM C578, Type IV min for below-grade; ' +
        'polyisocyanurate (PIR) ASTM C1289 for roof. ' +
        'Spray polyurethane foam (SPF): Closed-cell, minimum 2-lb density, R-6.5/25 mm. ' +
        'Vapour retarder: Poly sheeting 0.15 mm, perm rating ≤0.1 where required by code.',
      part3_execution:
        'Installation: Fill cavities completely; no voids, gaps, or compression. ' +
        'Batt in walls: Install friction-fit or secure with wire; vapour barrier facing warm side. ' +
        'Rigid board: Stagger joints; tape or seal all edges; mechanically fasten per manufacturer. ' +
        'SPF: Apply by certified installer; allow full cure before covering; limit 150 mm lift. ' +
        'Air barrier: Coordinate with vapour retarder installation; seal penetrations.',
    },
    applicableElementTypes: ['wall', 'slab', 'roof'],
  },
  {
    division: 7,
    section: '07 60 00',
    title: 'Flashing and Sheet Metal',
    description: 'Roof flashing, counterflashing, gutters, and sheet metal weatherproofing',
    parts: {
      part1_general:
        'Scope: Furnish and install sheet metal flashing and trim including base flashings, ' +
        'counterflashings, step flashings, gutters, downspouts, and copings. ' +
        'Related sections: 07 31 00 Shingles and Shakes, 07 40 00 Roofing and Siding Panels. ' +
        'References: SMACNA Architectural Sheet Metal Manual, ASTM A755 Metallic-Coated Steel.',
      part2_products:
        'Stainless steel flashing: ASTM A240, Type 304, 26 gauge minimum. ' +
        'Zinc-coated (galvanised) steel: ASTM A653, G90 coating, 26 gauge. ' +
        'Copper: ASTM B370, 16 oz (0.56 mm) min for flashing; 20 oz for gutters. ' +
        'Aluminium: ASTM B209, alloy 3003-H14, 0.81 mm min. ' +
        'Self-adhered membrane flashing: SBS-modified bitumen, 40 mil, cold-applied.',
      part3_execution:
        'Lap joints: Minimum 50 mm; seal with compatible sealant or solder. ' +
        'Expansion provisions: Joints every 3 m maximum on exposed metal work. ' +
        'Counterflashing: Set in reglet or caulked joint; lap base flashing min 100 mm. ' +
        'Gutters: Slope 1:500 minimum toward downspouts; secure per SMACNA. ' +
        'Soldering: Use 50/50 tin-lead solder; clean and flux before soldering.',
    },
    applicableElementTypes: ['roof', 'wall'],
  },

  // Division 08 — Openings
  {
    division: 8,
    section: '08 11 00',
    title: 'Metal Doors and Frames',
    description: 'Steel doors, hollow metal frames, and associated hardware',
    parts: {
      part1_general:
        'Scope: Furnish and install metal doors and frames including hollow metal doors, ' +
        'knock-down frames, pressed steel frames, and related hardware preparations. ' +
        'Related sections: 08 71 00 Door Hardware, 09 91 00 Painting. ' +
        'References: ANSI/SDI A250.8 Recommended Specifications for Standard Steel Doors and Frames, ' +
        'ANSI/SDI A250.6 Recommended Practice for Hardware Reinforcing, NFPA 80 Fire Doors.',
      part2_products:
        'Steel doors: SDI Level 2, Heavy Duty, 1.75-inch (44 mm) thick; 18-gauge face sheets; ' +
        'fully welded or seamless construction; fire ratings as scheduled. ' +
        'Hollow metal frames: 16 gauge for door ≤1220 mm wide; welded or KD anchors. ' +
        'Hardware preparations: Mortise or template-drilled for specified hardware. ' +
        'Finish: Factory prime coat, ANSI A250.10; touch-up field damage before painting.',
      part3_execution:
        'Frames: Set plumb, level, and square; grout masonry frames full with non-shrink grout. ' +
        'Doors: Hang and adjust; clearances per SDI and hardware manufacturer. ' +
        'Hardware: Install per templates; adjust for smooth operation and positive latching. ' +
        'Fire doors: Label and install per NFPA 80; do not field weld. ' +
        'Inspection: Verify fire label intact; test operations and closer function.',
    },
    applicableElementTypes: ['door'],
  },
  {
    division: 8,
    section: '08 51 00',
    title: 'Metal Windows',
    description: 'Aluminium windows, curtain wall framing, and glazing systems',
    parts: {
      part1_general:
        'Scope: Furnish and install aluminium windows including frames, sashes, glazing, ' +
        'weatherstripping, and hardware as indicated on drawings. ' +
        'Related sections: 08 80 00 Glazing, 07 92 00 Joint Sealants. ' +
        'References: AAMA/WDMA/CSA 101/I.S.2/A440 Performance Requirements for Windows, ' +
        'ASTM E283 Air Leakage, ASTM E330 Structural Performance, ASTM E547 Water Penetration.',
      part2_products:
        'Aluminium alloy: 6063-T5 or 6063-T6; thermally broken extrusion for heated buildings. ' +
        'Performance class: R-PG35 (residential) or C-PG50 (commercial) minimum. ' +
        'Glazing: Insulating glass unit (IGU), minimum 3 mm glass; low-e coating; argon fill. ' +
        'Glazing gaskets: EPDM, continuous; compatible with glass and frame. ' +
        'Finish: Anodised Class I (18 μm min) or AAMA 2605 fluoropolymer coating.',
      part3_execution:
        'Rough opening: Verify size, plumb, and level before installation. ' +
        'Flashing: Install sill flashing before window; head and jamb per manufacturer. ' +
        'Setting: Shim plumb, level, and square; fasten per structural calculations. ' +
        'Glazing: Install per GANA Glazing Manual; minimum edge bite 10 mm. ' +
        'Sealant: Apply backer rod and sealant at perimeter; tool smooth; cure before loading.',
    },
    applicableElementTypes: ['window'],
  },

  // Division 09 — Finishes
  {
    division: 9,
    section: '09 21 16',
    title: 'Gypsum Board Assemblies',
    description: 'Gypsum wallboard, plasterboard, and related framing and accessories',
    parts: {
      part1_general:
        'Scope: Furnish and install gypsum board wall and ceiling assemblies including ' +
        'metal framing, gypsum board, joint treatment, and related accessories. ' +
        'Related sections: 06 10 00 Rough Carpentry, 09 90 00 Paints and Coatings. ' +
        'References: ASTM C840 Application and Finishing of Gypsum Board, ' +
        'ASTM C954 Steel Drill Screws, GA-216 Application and Finishing of Gypsum Board.',
      part2_products:
        'Gypsum board: ASTM C1396, 12.7 mm standard; 15.9 mm for increased sound or fire; ' +
        'moisture-resistant (MR) board at wet areas; fire-rated type X where required. ' +
        'Metal framing: ASTM C645, 0.84 mm steel studs and runners; 90 mm for walls ≤4.5 m high. ' +
        'Joint compound: ASTM C474; setting-type for first coats; finishing-type for final coats. ' +
        'Corner bead: Vinyl or galvanised steel at all external corners.',
      part3_execution:
        'Framing: Space studs at 400 mm or 600 mm on centre; blocking for fixtures above 18 kg. ' +
        'Board application: Single or double layer per fire rating; stagger joints in multiple layers. ' +
        'Fastening: Screws at 200 mm on framing, 150 mm at board edges. ' +
        'Joint finishing: Three coats; feather 200 mm wide; sand smooth between coats. ' +
        'Tolerances: Maximum variation from true plane 3 mm in 3 m; joints flush within 0.5 mm.',
    },
    applicableElementTypes: ['wall', 'slab'],
  },
  {
    division: 9,
    section: '09 30 00',
    title: 'Tiling',
    description: 'Ceramic, porcelain, and stone tile for floors, walls, and counters',
    parts: {
      part1_general:
        'Scope: Furnish and install tile work including ceramic, porcelain, stone tile, ' +
        'setting bed, mortar, adhesive, and grout as indicated. ' +
        'Related sections: 07 15 00 Waterproofing, 09 21 16 Gypsum Board Assemblies. ' +
        'References: ANSI A108 series Tile Installation Standards, ' +
        'TCNA Tile Council of North America Handbook, ASTM C627 Robinson Floor Test.',
      part2_products:
        'Ceramic tile: ANSI A137.1, floor tile slip resistance ≥0.42 DCOF. ' +
        'Porcelain tile: Water absorption <0.5%; rectified edges for grout joints <3 mm. ' +
        'Tile adhesive: ANSI A118.4 latex-modified mortar for thin-set; ANSI A118.1 dry-set. ' +
        'Grout: ANSI A118.6 unsanded ≤3 mm joints; sanded for wider joints; epoxy where required. ' +
        'Waterproofing membrane: ANSI A118.10 at wet areas before tile.',
      part3_execution:
        'Substrate: Clean, flat (3 mm/3 m), and structurally sound; apply primer if required. ' +
        'Layout: Establish centre lines; minimize cut tiles at visible edges. ' +
        'Setting: Back-butter tiles fully; press firmly with slight twisting motion. ' +
        'Grout: Apply 24 h after setting; remove excess before hardening; cure per manufacturer. ' +
        'Movement joints: At columns, changes in plane, perimeter, and every 4-6 m in field.',
    },
    applicableElementTypes: ['wall', 'slab'],
  },
  {
    division: 9,
    section: '09 91 00',
    title: 'Painting',
    description: 'Interior and exterior painting and coating systems for walls, ceilings, and trim',
    parts: {
      part1_general:
        'Scope: Furnish and install painting and coating work on interior and exterior surfaces ' +
        'as indicated on the finish schedule and drawings. ' +
        'Related sections: 05 12 00 Structural Steel Framing, 09 21 16 Gypsum Board Assemblies. ' +
        'References: MPI Master Painters Institute Architectural Painting Specification Manual, ' +
        'PDCA Painting and Decorating Contractors of America standards.',
      part2_products:
        'Interior latex primer: 100% acrylic, MPI #50 or approved equal. ' +
        'Interior latex paint: 100% acrylic, MPI #52 (flat), #44 (eggshell), #54 (semi-gloss). ' +
        'Exterior latex: 100% acrylic, MPI #15 for masonry; MPI #10 for wood. ' +
        'Alkyd enamel: MPI #47 for trim; apply where moisture or abuse warrants. ' +
        'Minimum dry film thickness: 40 μm per coat; total system ≥100 μm.',
      part3_execution:
        'Surface prep: Clean, dry, and free of contamination; sand smooth; repair defects. ' +
        'Prime coat: Apply to all surfaces; back-prime millwork; spot-prime bare metal. ' +
        'Application: Two finish coats minimum; allow full dry time between coats. ' +
        'Conditions: Temperature 10–32°C; humidity <85%; no application in rain or frost. ' +
        'Tolerances: Uniform sheen; no brush marks, runs, sags, or holidays visible at 1 m distance.',
    },
    applicableElementTypes: ['wall', 'slab', 'beam', 'column'],
  },

  // Division 08 — Openings (stair/railing)
  {
    division: 5,
    section: '05 52 00',
    title: 'Metal Railings',
    description: 'Steel and aluminium guardrails, handrails, and balustrade systems',
    parts: {
      part1_general:
        'Scope: Furnish and install metal railing systems including handrails, guardrails, ' +
        'balusters, posts, and top rails as shown on drawings. ' +
        'Related sections: 05 12 00 Structural Steel, 06 43 00 Wood Stairs. ' +
        'References: IBC Section 1015 Guards, IBC Section 1014 Handrails, ' +
        'ASTM A53 Steel Pipe, ASTM A500 HSS, AWS D1.1 Structural Welding.',
      part2_products:
        'Steel tube: ASTM A500 Grade B, HSS 50×50×3 posts; 42 mm dia handrail. ' +
        'Stainless steel: ASTM A554, Type 316L for exterior or corrosive environments. ' +
        'Aluminium: ASTM B221, 6063-T5; anodised or powder coated. ' +
        'Glass infill: Where shown, tempered glass per ASTM C1048; 12 mm minimum. ' +
        'Anchorage: Core-drilled base plates with epoxy anchors; structural engineer to design.',
      part3_execution:
        'Layout: Set out post locations per drawings; verify against actual stair or balcony framing. ' +
        'Fabrication: Weld posts and pickets; grind smooth; no sharp edges or projections. ' +
        'Installation: Posts plumb, rails level; anchor loads per IBC 1607.9. ' +
        'Finishing: Prime and paint steel; anodise or powder coat aluminium. ' +
        'Testing: Load test 1.5 kN/m horizontal at top rail; document results.',
    },
    applicableElementTypes: ['railing', 'stair'],
  },

  // Division 03 — Slabs on grade
  {
    division: 3,
    section: '03 31 00',
    title: 'Structural Concrete',
    description: 'Elevated slabs, transfer plates, and structural concrete members',
    parts: {
      part1_general:
        'Scope: Furnish and install structural concrete for elevated slabs, transfer plates, ' +
        'shear walls, and other structural members as indicated. ' +
        'Related sections: 03 20 00 Concrete Reinforcing, 03 30 00 Cast-in-Place Concrete. ' +
        'References: ACI 318 Building Code, ACI 347 Guide to Formwork for Concrete, ' +
        'ASTM C94 Ready-Mix Concrete.',
      part2_products:
        'Concrete mix: Engineer-designed per ACI 301; minimum 32 MPa at 28 days for structural. ' +
        'High-early strength cement: Type III per ASTM C150 where early removal required. ' +
        'Superplasticizer: ASTM C494 Type F or G; maintain slump 100–175 mm at point of discharge. ' +
        'Supplementary cementitious materials: Fly ash ASTM C618; GGBS ASTM C989 as specified.',
      part3_execution:
        'Formwork: Design for 150% of calculated loads; camber as required. ' +
        'Pre-pour inspection: Structural engineer to sign off reinforcement placement. ' +
        'Placement sequence: Follow pour sequence drawings; construction joints per drawings. ' +
        'Finishing: Wood float for covered slabs; steel trowel for exposed floors. ' +
        'Curing: Minimum 14 days for structural members; do not remove shores until design strength reached.',
    },
    applicableElementTypes: ['slab', 'wall', 'column', 'beam'],
  },
];

/**
 * Get applicable spec sections for a given element type, optionally filtered by material keyword.
 */
export function getApplicableSpecs(elementType: string, material?: string): CSISection[] {
  const byType = CSI_SECTIONS.filter((s) => s.applicableElementTypes.includes(elementType));

  if (!material) {
    return byType;
  }

  const materialLower = material.toLowerCase();

  // Return sections whose title, description, or products text matches the material keyword.
  const filtered = byType.filter((s) => {
    const combined = [
      s.title,
      s.description,
      s.parts.part1_general,
      s.parts.part2_products,
      s.parts.part3_execution,
    ]
      .join(' ')
      .toLowerCase();
    return combined.includes(materialLower);
  });

  // Fall back to all type-matched sections if material keyword not found
  return filtered.length > 0 ? filtered : byType;
}

/**
 * Generate a formatted project specification document from a DocumentSchema.
 * Analyses element types present in the model and includes all applicable CSI sections.
 */
export function generateProjectSpecs(doc: DocumentSchema): string {
  const elementTypes = new Set<string>();
  for (const el of Object.values(doc.content.elements) as Array<{ type: string }>) {
    elementTypes.add(el.type);
  }

  if (elementTypes.size === 0) {
    return '# Project Specifications\n\nNo elements found in model. Add elements to generate specifications.';
  }

  // Gather applicable sections, de-duplicate by section number
  const sectionMap = new Map<string, CSISection>();
  for (const type of elementTypes) {
    for (const spec of getApplicableSpecs(type)) {
      if (!sectionMap.has(spec.section)) {
        sectionMap.set(spec.section, spec);
      }
    }
  }

  // Sort by division then section
  const sections = Array.from(sectionMap.values()).sort((a, b) => {
    if (a.division !== b.division) return a.division - b.division;
    return a.section.localeCompare(b.section);
  });

  const lines: string[] = [];
  lines.push(`# ${doc.name} — Project Specifications`);
  lines.push('');
  lines.push('Generated from BIM model element types.');
  lines.push('');

  for (const s of sections) {
    lines.push(`---`);
    lines.push(`## SECTION ${s.section} — ${s.title.toUpperCase()}`);
    lines.push('');
    lines.push(s.description);
    lines.push('');
    lines.push('### PART 1 — GENERAL');
    lines.push('');
    lines.push(s.parts.part1_general);
    lines.push('');
    lines.push('### PART 2 — PRODUCTS');
    lines.push('');
    lines.push(s.parts.part2_products);
    lines.push('');
    lines.push('### PART 3 — EXECUTION');
    lines.push('');
    lines.push(s.parts.part3_execution);
    lines.push('');
  }

  return lines.join('\n');
}
