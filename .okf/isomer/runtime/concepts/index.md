# Index

Directory: `runtime/concepts/`

## Concepts

| Title | Type | Description |
|-------|------|-------------|
| [Authoring context](authoring-context.md) | Concept | getAuthoringContext returns the authoring schema, catalog, and live views. |
| [Frame](frame.md) | Concept | The document a snapshot is drawn inside. Exclusive, one per render, supplied ... |
| [Pack composition](packs.md) | Concept | Packs are additive. Each pack's style adapter styles its own nodes. |
| [Runtime](runtime.md) | Concept | createIsomerRuntime turns packs and frames into a validator, parser, surfaces... |
| [Style adapters](style-adapters.md) | Concept | The HTML surface runs the host adapter if supplied, otherwise each pack's own... |
| [Surfaces](surfaces.md) | Concept | Six render targets. snapshot reuses react, needs a frame, and is the one that... |
| [View registry](view-registry.md) | Concept | Product-owned views, registered by id and requested by answers. |

