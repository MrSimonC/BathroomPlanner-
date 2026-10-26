# BathroomPlanner architecture

BathroomPlanner is a bathroom-focused fork of the existing OpenPlan3D Svelte/TypeScript editor. The immediate foundation is the existing editor, its import/export validators, and a separate measurement contract. This document defines the intended data boundary and staged AI layout design; it does not claim that a survey importer, immutable storage, constraint checker or optimisation engine is implemented.

## Current runtime and extension points

The SvelteKit editor route in `src/routes/editor/` composes the UI. The project
store (`src/lib/stores/project.ts`) owns editable floors/elements and history;
`FloorPlanCanvas.svelte` draws the 2D editor and `ThreeViewer.svelte` builds the
Three.js scene from that same project model. `furnitureCatalog.ts` supplies fixture
identities and default sizes; explicit measured overrides must take precedence.
`src/lib/services/localDatabase.ts` handles IndexedDB project storage, while
project opening, packages and persistence services manage recovery/import workflows.
SvelteKit's Node adapter supplies the production server. Optional handoff, assistant
sharing and AI-render integrations already exist, but local editing does not require
those remote services. Existing image rendering is not a dimensional layout solver.

Keep the proposed millimetre adapter and deterministic validation as separately
testable modules beside these utilities. Deliver ordinary validated project JSON to
the existing store and both views; do not fork the CAD renderer or introduce a new
backend merely to convert measurements. A later private-evidence service can use the
same explicit contracts without making public builds depend on private inputs.

## Existing editor and authoritative formats

Read [the plan-authoring skill](skills/openplan3d-plan-authoring/SKILL.md) before generating editor files. Code is authoritative when documentation differs:

- [`readProject`](../src/lib/utils/projectValidation.ts) clones and validates web projects. Projects have `floors[]`; wall coordinates, thickness, heights, opening widths and furniture dimensions are **centimetres**. Walls use centrelines; furniture positions use footprint centres. IDs must be unique across element kinds within a floor, and opening references must name a wall on that floor.
- [`validateRoomPlan`](../src/lib/utils/roomplanValidation.ts) and [`createProjectFromRoomPlan`](../src/lib/utils/roomplanImport.ts) handle prepared RoomPlan interchange in **metres**, with 16-value column-major transforms. Translation indices are 12, 13 and 14; RoomPlan X/Z map to plan x/y, and RoomPlan Y is vertical.
- [`interchange.ts`](../src/lib/utils/interchange.ts) exports metre dimensions and transforms, rounding centimetres divided by 100 to eight decimal places. Interchange carries shared geometry and supported sibling metadata, but is not a lossless replacement for every web-project feature.
- [`roomDetection.ts`](../src/lib/utils/roomDetection.ts) detects closed wall-centreline faces, including split junctions. Saved room records are metadata matched by wall-ID sets, not authoritative room polygons. The current matching tolerance is 5 cm; this is an editor tolerance, **not survey accuracy**. Small recesses must be checked explicitly against the measured perimeter.

Native import validation does not prove geometric feasibility: for example, a valid opening reference and position do not prove that the full opening fits its wall or that fixtures avoid its swing. The bathroom constraint layer must check these separately.

## Canonical measurement snapshot

[`bathroom-measurements.schema.json`](../schemas/bathroom-measurements.schema.json) defines a JSON Schema Draft 2020-12 contract. It is separate from both accepted editor formats and is not currently imported by the editor UI. It contains no actual private measurements.

Lengths use millimetres, including fractional millimetres when warranted. Every numeric physical measurement is an object containing `value` and `unit`, with optional `metadata`. Each metadata field is also optional: source IDs, confidence from 0 to 1, verification state and measurement method can be recorded as evidence becomes available. Missing source, confidence or verification means unknown; never invent a confidence score or interpret omission as verified. Verified measurements also record who verified them and when. Confidence is an explicit judgement about evidence, not a calibrated probability. Derived points should retain calculation provenance and references to their source evidence when available. Estimated values remain marked as estimates; absence is never represented by zero.

A snapshot includes an ordered **interior-face** perimeter with implicit last-to-first closure. Concave vertices describe alcoves, recesses and irregular corners directly. Interior obstructions are separate polygon holes. Directed wall **centrelines**, thickness and heights are stored separately so measured clear dimensions are not confused with editor geometry. Door/window centres are located by millimetres along the directed wall from its start, rather than by an ambiguous distance from a nearby corner. Doors record the hinge jamb and swing side; windows record their sill and height. Fixtures have measured dimensions, centre positions, rotation and optional local footprint polygons; services record connection positions and height above the finished floor. Fixtures, openings and services distinguish fixed from movable. Clearances are absolute polygons with evidence and either hard or preference severity.

The schema describes a complete snapshot and validates structure, enums, numeric bounds and any supplied verification metadata. Incomplete drafts may be kept as private capture notes or partial JSON outside this complete-snapshot contract; they are not schema-valid snapshots and cannot be confirmed or used for layout generation until essential dimensions are supplied. Never fill missing dimensions with zero to pass validation. A future semantic validator must additionally check:

1. Unique IDs, existing source references and valid wall/service/element references.
2. Closed, simple nonzero-area perimeters; holes inside the boundary; no crossing walls or inconsistent centreline/interior-face geometry. Closure is implicit in the representation; the validator must check the closing edge.
3. Positive wall segment lengths, openings fully within their parent wall, no opening overlap, and sill plus height within wall height.
4. Consistent fixture footprints and dimensions, applicable vertical ranges, fixed-object containment and collision rules, door sweep geometry and required clearances.
5. The explicitly recorded tolerance, measurement conflicts and readiness for layout generation. Unverified or missing essential geometry must surface as unresolved input, not an invented dimension.

A confirmed snapshot is an immutable baseline identified by `(id, revision)`. Confirmation records an accountable user and time; it does not automatically verify every measurement. Changes create a new revision with `supersedesRevision`, retain the previous revision and require explicit confirmation. JSON Schema cannot enforce immutability across files or temporal revision ordering; those checks belong in the future repository/application layer. Derived editor projects and proposed layouts are separate artifacts bound to a baseline revision and content digest. User edits to an editor copy do not silently replace confirmed measurements.

## Explicit unit and geometry adapter

Convert only at boundaries:

| From | To | Exact rule |
| --- | --- | --- |
| Canonical mm | Editor cm | `cm = mm / 10` |
| Editor cm | Canonical mm | `mm = cm * 10` |
| Canonical mm | RoomPlan m | `m = mm / 1000` |
| RoomPlan m | Canonical mm | `mm = m * 1000` |

Thus 875 mm is 87.5 cm or 0.875 m. Rotation remains degrees in the web project; construct interchange unit directions with radians (`degrees * Math.PI / 180`). Do not apply length conversion to direction vectors, homogeneous matrix constants, confidence, scale or normalised opening positions. Plan x grows right, plan y down; positive plan rotation is clockwise on screen. The canonical vertical convention is z up; interchange vertical translation is Y.

For a straight directed wall of length `L`, opening `position = offsetFromStart / L`; export height and width in the target units. Web `swingDirection: "right"` selects the start-side hinge jamb, `"left"` the end-side jamb. `flipSide: false` swings toward `(-dy, dx)`, and `true` toward `(dy, -dx)`. Prepared RoomPlan `hingeLeft: true` maps to web `"right"`; `opensInward: true` maps to `flipSide: false`. These names depend on wall direction and must be derived from explicit geometry. Non-swing doors need no fabricated swing arc.

Converting an interior polygon to wall centrelines requires offsetting each interior face outward by half its wall thickness and intersecting adjoining offset lines. Unequal thicknesses and concave corners need explicit intersection/join treatment; adding one thickness to an overall width is only valid for a simple room between equal-thickness parallel walls. Do not copy measured interior corners directly into wall endpoints. Preserve source points and record the derived construction separately; reconcile contradictions before export.

For prepared interchange write `openplanPrepared: true`, `openplanHandoffVersion: 1` and explicit `openplanImportOptions: { "straighten": false, "orthogonal": false }`. Both options are required when that options object is present. This prevents the normal scan-straightening and corner-merging path from changing confirmed geometry. The importer rounds converted dimension values to eight decimals of centimetres, but computes wall endpoint positions from transforms directly; allow only a documented conversion tolerance in round-trip comparisons. Never round the canonical baseline itself to match renderer precision. Give thickness explicitly: a zero-depth RoomPlan wall otherwise becomes 15 cm thick; collapsed walls below `1e-6` m are dropped with their openings.

The adapter should validate its generated native file with `readProject`, or interchange with `validateRoomPlan`, then import and compare walls, openings and fixtures against the canonical baseline. Compare clear interior geometry as well as displayed centreline area. Preserve unrelated project metadata and stable IDs. Native file export is the preferred editable delivery when full editor fidelity matters.

## AI layout boundary and staged implementation

The language model gathers requirements, extracts candidate measurements with evidence, explains conflicts and proposes fixture choices or layout intentions. Deterministic code owns coordinate conversion, polygon operations, collision checks and acceptance. A model's claim that a layout fits is never a feasibility result.

Proposed flow:

`private evidence → draft measurements → user confirmation → immutable baseline → candidate placements → deterministic validation → scored alternatives → editor project`

1. **Foundation (this contract):** document the existing formats, keep survey evidence private, and establish source-linked measurements. No backend is required merely to edit a local plan.
2. **Geometry adapter and checker:** add a TypeScript/JavaScript module beside the existing geometry utilities. Use tested polygon containment/intersection, offset/buffer and distance operations. Check rotated footprints, wall penetration, height-aware collisions, service reach, door sweep sectors and hard clearance zones. Treat fixture-use and access space explicitly, including routes from the entrance. Return machine-readable violations with element IDs, distances and source references. Report uncertainty instead of an unconditional feasible result when required evidence is unresolved.
   Investigate **JSTS** first for topology predicates, polygon validity, distances and buffer/offset operations: it follows the JTS family that also informs NTS and can remain inside the current JavaScript application. Compare it with **polygon-clipping** for robust polygon union/intersection/difference if the checker mostly needs Boolean footprint operations; polygon-clipping alone does not supply the complete distance, buffer or validity API. Benchmark concave recesses, narrow passages, near-touching edges, holes and rotated fixtures using synthetic millimetre cases, and inspect bundle cost and numerical tolerances before selecting a dependency. Start in JS to reuse the browser editor and avoid operating a second service. Choose an NTS service only when its richer tooling or existing .NET infrastructure justifies that boundary; keep the same canonical units and cross-runtime geometry cases. This is a candidate investigation, not an installed dependency or a completed evaluation.
3. **Bounded candidate search:** generate rotations and sensible wall-aligned placements for movable fixtures only. Copy fixed elements and the confirmed perimeter unchanged. Reject hard violations before ranking soft preferences such as circulation, storage, service relocation cost and daylight. Save each alternative with the baseline digest, constraint/rule version, product dimensions, scores and validation evidence. The model can explain and refine alternatives through this API without rewriting the baseline.
4. **Optimisation only when needed:** for richer polygon operations in a .NET service, evaluate NetTopologySuite (NTS). It is a geometry library, not a layout solver. Avoid a second coordinate/tolerance convention: use the same millimetre contract and shared fixture cases across JS and NTS. Google OR-Tools is a later option for bounded placement choices, orientations and costs after geometry has produced feasible candidates or a discrete model. Continuous irregular boundaries and rotating shapes are not automatically solved by a rectangle packing model. Neither NTS nor OR-Tools is installed or implemented by this foundation.

Do not send private photographs, measurements or model prompts to an external AI service implicitly. A future integration should make the selected inputs and destination clear and obtain authorisation for that transfer. Public CI and demo builds use synthetic fixtures only. Clearance guidance must retain its jurisdiction, manufacturer/user source and version; passing layout rules is not a certification of building, electrical or accessibility compliance.

See [private data integration](PRIVATE_DATA.md) for the separate repository boundary and reproducible local workflow.
