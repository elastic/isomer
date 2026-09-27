---
applyTo: '**'
excludeAgent: 'cloud-agent'
---

# Reviewing Isomer pull requests

The author fixes everything a review raises in one push. A finding held back for a later pass costs a full round, so aim to leave nothing for a second review.

## One pass, every finding

- Read every changed file, including small ones. Skip only generated files: `pnpm-lock.yaml`, `THIRD_PARTY_LICENSES.md`, `NOTICE.txt`, and `.okf/**/index.md`.
- Post every finding as an inline comment. Never name an issue only in the overview; if it belongs in the summary, it belongs on a line.
- Don't cap the number of comments. One review with ten comments beats three reviews with three.
- Check each changed file against the path-specific review checklist for its area before posting.
- When one flaw appears in several places, post it once and list every location.
- Before suggesting a fix, check the fix against the same checklist. A fix that opens a new finding costs another round.
- Start each comment with **High** (wrong output, data loss, security, broken public contract), **Medium** (edge-case bug, missing test for new behavior, docs out of sync), or **Low**. Skip nits.

## Re-reviews

- Verify the threads the author replied to, then review the commits pushed since your last review.
- A finding in code that hasn't changed since your last review is still raised at its real severity, labeled "Missed in first pass".
- Validate the author's reasoning before treating a thread as settled. An accepted risk, an external setting, or a precedent elsewhere settles it only when the evidence supports the response.

## Stacked pull requests

Many PRs are one layer of a stack, and the description says so. Each layer must build, pass tests, and document its own API: a new or changed public API carries its `docs/` and `.okf/isomer` updates in the same PR. Something the description says a later layer adds is not a finding unless this layer is broken without it.

## Out of scope

- Violations `pnpm verify` detects directly: formatting, license headers, lint, types, export parity, the module graph, and pack contents. Still raise missing behavioral tests and failures the existing checks do not cover.
- Repository or organization settings code can't express, such as the Pages source, branch protection, or IAM policy. If the PR depends on one, ask once as a question.
- Style preferences `AGENTS.md` doesn't state.
- Publication, registry access, or dependency licensing (see "Release posture" in `AGENTS.md`).
