# Directory Update Log

## 2026-09-23

- **Creation**: Initial Isomer OKF v0.2 bundle covering the workspace, `@elastic/isomer-sdk`, `@elastic/isomer-runtime`, `@elastic/isomer-primitives-slides`, `@elastic/isomer-image-takumi`, and `@elastic/isomer-evals`.
- **Slides primitives**: Added `slideTable` (the pack's first native `slack` renderer), `slideTranscript`, `slideWindow`, `slideCycle` (inline SVG with literal paint), and `slideCode.highlight`. Containers now dispatch Slack per child through `scope.renderSlack`.
- **Isomer deck**: `docs/deck` is a private Vite app of slide compositions, one `.tsx` file each. The docs workflow builds it and deploys it at `/deck/` beside the docs-builder site.
- **License artifacts**: The generated runtime inventory now includes declared Takumi platform dependencies and fails when their notice or license text is unavailable.
