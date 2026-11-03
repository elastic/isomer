# Scripts and CI instructions

Read the [root instructions](../AGENTS.md) first.

## Read before changing

- Verification, peer targets, or consumers: [Development](../CONTRIBUTING.md#development) and [The build](../CONTRIBUTING.md#the-build).
- Workspace discovery: [Adding a package](../CONTRIBUTING.md#adding-a-package) and the existing helpers in this directory.
- Releases or snapshots: [Releasing](../RELEASING.md); validate through dry runs or isolated fixtures, not a production publish.
- Workflow or action behavior: [CI](../.github/workflows/ci.yml) and the [Studio action contract](../packages/isomer-studio/docs/ci.md) where applicable.

## When changing a gate or workflow

Keep consumer fixtures isolated from workspace aliases, extra peers, `NODE_PATH`, and unpublished source files. Reuse shared discovery helpers rather than maintaining another package list.

Make new check modes read-only and generation deterministic. Existing `docs:check` rewrites assembled docs before checking drift; preserve existing edits before running it. Isolate peer-target manifest/lockfile mutation, preserve user edits during restoration, and limit cleanup to owned resources.

For workflow/action changes, trace the trigger, code checkout, token permissions, artifacts, and outputs across trust boundaries. Do not execute untrusted data as code, infer trusted provenance from syntax, or convert an API/authentication failure into absence or success. Preserve failure reporting and independently retryable resource cleanup.

## Evidence required

Run focused script tests and affected built/packed checks for changed rules.

For YAML changes, validate syntax and action inputs against their actual contracts and inspect condition/failure paths. Local checks cannot prove GitHub permissions, hosted triggers, or external settings; report what still requires hosted evidence. Keep documented commands aligned with the actual scripts and workflows.
