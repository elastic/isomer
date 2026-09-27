---
applyTo: '**'
excludeAgent: 'cloud-agent'
---

# Reviewing Isomer pull requests

Apply these instructions only when reviewing a pull request.

## Coverage

- Read every changed file, including small ones. Skip only generated files: `pnpm-lock.yaml`, `THIRD_PARTY_LICENSES.md`, `NOTICE.txt`, and `.okf/**/index.md`.
- Check each changed file against the path-specific review checklist for its area.
- When one flaw appears in several places, raise it once and list every location.
- Before suggesting a fix, check the fix against the same checklist.
- Prioritize wrong output, data loss, security, and broken public contracts, then edge-case bugs, missing tests for new behavior, and out-of-sync docs. Skip nits.

## Re-reviews

- Verify the threads the author replied to, then review the commits pushed since your last review.
- Still raise a finding in code that hasn't changed since your last review, and say the code was unchanged.
- Validate the author's reasoning before treating a thread as settled. An accepted risk, an external setting, or a precedent elsewhere settles it only when the evidence supports the response.

## Stacked pull requests

Many PRs are one layer of a stack, and the description says so. Each layer must build, pass tests, and document its own API: a new or changed public API carries its `docs/` and `.okf/isomer` updates in the same PR. Something the description says a later layer adds is not a finding unless this layer is broken without it.

## Out of scope

- Violations `pnpm verify` detects directly: formatting, license headers, lint, types, export parity, the module graph, and pack contents. Still raise missing behavioral tests and failures the existing checks do not cover.
- Repository or organization settings code can't express, such as the Pages source, branch protection, or IAM policy. If the PR depends on one, ask once as a question.
- Style preferences `AGENTS.md` doesn't state.
- Publication, registry access, or dependency licensing (see "Release posture" in `AGENTS.md`).
