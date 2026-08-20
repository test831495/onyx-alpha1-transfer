# CAF.0 Character Asset Factory Foundation

## Source-of-truth boundary

**Canva = Draft Workspace.** Canva may be used for exploration, composition, annotations, and review drafts. Canva output is unapproved until it passes the factory contract.

**GitHub = Approved Source of Truth.** Accepted specifications, source assets, generated assets, manifests, validation evidence, and release decisions are versioned and reviewed in GitHub. A Canva link alone is never an approved production asset.

## Character Asset Factory

The Character Asset Factory (CAF) converts an approved character identity and visual specification into traceable 2D and 3D assets. Every output has an asset ID, source revision, owner, license/provenance record, generator/tool version, validation status, and rollback target.

## 3D asset pipeline

- **Blender** is the authoring and validation environment for modeled, rigged, textured, and exported assets.
- **GLB** is the required portable interchange and delivery format where a runtime needs a glTF binary asset.
- **VRM** is the avatar delivery format when humanoid avatar behavior, expressions, and runtime metadata require it.

3D assets must preserve identity constraints, use documented coordinate and scale conventions, validate materials, textures, rigging, blend shapes, animation, file size, and runtime loading before approval.

## 2D Derived Assets

2D Derived Assets include portraits, icons, expressions, UI states, contact-sheet panels, and other crops or renders derived from the approved character source. They inherit provenance and cannot introduce an unapproved identity change. Dimensions, transparency, color profile, naming, and accessibility variants are specified per asset manifest.

## 3D Assets

3D Assets include source Blender files, textures, rigs, GLB exports, VRM exports, animations, and thumbnails. Source files remain recoverable; exports are reproducible from the recorded source revision and settings. Runtime-specific variants are separate versioned assets, not silent replacements.

## Validation

Validation combines schema checks, file integrity checks, Blender import/export checks, GLB/VRM structure checks, texture and material checks, rig and animation checks, performance checks, and human identity review. Failed validation blocks approval and records actionable failures.

## Evidence

Each candidate includes reproducible commands or tool versions, input hashes, output hashes, validation results, reviewer, timestamp, and disposition. Evidence is stored with the approved GitHub source record and is never replaced by an unverified Canva revision.

## Contact Sheets

Contact Sheets provide a reviewable visual index of poses, expressions, angles, LODs, and variants. They are derived evidence, labeled with asset IDs and revisions, and do not replace the underlying source or validation artifacts.

## LOD generation

LOD generation produces explicitly named level-of-detail variants from the approved 3D source. Each LOD records triangle or geometry budget, texture policy, expected use, and visual acceptance result. LOD switching must preserve recognizable identity and must be validated at its target runtime distance and performance budget.

## Rollback

Approval can be rolled back to the last validated GitHub version. Rollback preserves source, evidence, and rejected candidates; it does not delete history or rewrite protected branches.

<!-- architecture-hardening-v1 -->

## Asset lifecycle

Character design items use these lifecycle states:

- DRAFT_CANVA
- REVIEW_CANVA
- APPROVED_FOR_EXPORT
- IMPORTED_TO_GITHUB
- FACTORY_CANDIDATE
- VALIDATED
- APPROVED_CANONICAL
- ACTIVE
- SUPERSEDED
- RETIRED

Only Rahul can approve a design for export from Canva or promote a validated candidate to approved canonical status.

## Asset promotion contract

Promotion requires:

- Asset ID
- Character ID
- Design version
- Source reference
- Rahul approval reference
- Export timestamp
- Import commit
- License manifest
- Character manifest
- Model checksums
- Validation report
- Contact sheet
- Performance profile
- Known limitations
- Rollback target

Draft Canva material cannot be consumed by the runtime or promoted as a canonical asset.

## Reproducibility

Every factory build records:

- Factory version
- Blender version
- Add-on versions
- Source asset hashes
- Character specification version
- Rig mapping version
- Expression mapping version
- Optimization profile
- Target device profile
- Build timestamp
- Output hashes

The same approved inputs and pinned toolchain must produce functionally equivalent outputs.

## Mandatory quality gates

A canonical character build must pass:

- Structural format validation
- Skeleton validation
- Skin-weight validation
- Facial-expression validation
- Viseme validation
- Blink and gaze validation
- Pose and deformation validation
- Texture and material validation
- Desktop performance budget
- Mobile performance budget
- Spatial-display profile validation
- License validation
- Provenance validation
- Visual contact-sheet review
- Rahul acceptance

## Rollback and retention

The last accepted canonical version remains available until its replacement is fully validated and accepted.

A failed candidate cannot overwrite or delete the stable character version.

Rollback selects the last accepted immutable asset package and records the reason, actor, timestamp, and replacement status.
