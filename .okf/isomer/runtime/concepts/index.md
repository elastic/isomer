# Index

Directory: `runtime/concepts/`

## Concepts

| Title | Type | Description |
|-------|------|-------------|
| [Authoring context](authoring-context.md) | Concept | getAuthoringContext returns the authoring schema, catalog, and live views. |
| [Frame](frame.md) | Concept | The document an image is drawn as. Exclusive, one per render, supplied by the... |
| [Pack composition](packs.md) | Concept | Packs are additive. collectStyles routes only to the pack that declared the a... |
| [Runtime](runtime.md) | Concept | createIsomerRuntime turns packs and frames into a validator, parser, surfaces... |
| [Style adapters](style-adapters.md) | Concept | The HTML surface runs the host adapter if supplied, otherwise the packs' own,... |
| [Surfaces](surfaces.md) | Concept | Six render targets. svg reuses react and needs a frame. |
| [View registry](view-registry.md) | Concept | Product-owned views, registered by id and requested by answers. |

