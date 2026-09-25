# Directory Update Log

## 2026-09-25

- **Enhancement scripts in shadow roots**: Enhancement, adapter, and caller scripts are now function bodies with `root` in scope, each in its own function. The HTML surface gains `scripts: 'embedded' | 'host'` and returns `js`; the SDK root exports `runEnhancementScript` and `scopeScript`, the runtime scopes each pack adapter's script before joining them, and the SDK adds the `ENHANCEMENT_ROOT_MISSING` code. The embedding recipe renders with `scripts: 'host'`.

## 2026-09-23

- **Creation**: Initial Isomer OKF v0.2 bundle covering the workspace, `@elastic/isomer-sdk`, `@elastic/isomer-runtime`, `@elastic/isomer-primitives-slides`, `@elastic/isomer-image-takumi`, and `@elastic/isomer-evals`.
- **License artifacts**: The generated runtime inventory now includes declared Takumi platform dependencies and fails when their notice or license text is unavailable.
