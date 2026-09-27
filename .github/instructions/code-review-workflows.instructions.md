---
applyTo: '.github/workflows/**'
excludeAgent: 'cloud-agent'
---

# CI workflow review checklist

Assess the whole trust model in the first pass. Raise every trust issue at once, and check each suggested fix against this list before posting it.

- **Who controls the code.** A `pull_request` job runs the PR branch's copy of the workflow, while `workflow_run` and `pull_request_target` run the default branch's copy. A trusted workflow becomes PR-controlled if it checks out the PR head or runs PR-controlled scripts. The PR author can use any `write` scope or `id-token: write` in a PR-controlled job. Name every such scope and execution path in one comment.
- **Data crossing a trust boundary.** An artifact, output, or file from a PR-controlled job is attacker-controlled in the trusted job. Never `source` or `eval` it. Checking its syntax doesn't establish where it came from, because a valid hostname can still be the attacker's. Derive the value in the trusted job instead.
- **Suggesting a split.** If you recommend moving privileged steps into a trusted workflow, the same comment must list each value that crosses the boundary and how the trusted side derives or verifies it. Otherwise don't recommend it.
- **Webhook payloads.** Confirm a field exists before relying on it. `workflow_run.pull_requests[]` has no `state`.
- **Fail-open commands.** `|| true`, `2>/dev/null`, or `continue-on-error` around `git fetch`, `gh api`, or auth must not turn a transient failure into a destructive publish or a guessed value. Distinguish "absent" from "failed".
- **Cleanup.** Clean up each independent resource on its own and make it safe to retry. Don't gate one resource's deletion on records the same job already deleted.
- **Expressions.** `cond && '' || 'x'` never yields `''`.
- **Third-party actions.** Check inputs against the action's docs or source, because some silently ignore inputs that disagree. For example, `pr-preview-action` ignores a `pages-base-path` that doesn't prefix the deploy path.
- **Publishing.** A clean publish must carry forward what should survive, such as previews. `keep_files: true` keeps every stale file.
- **Settings outside the repo**, such as the Pages source, environments, or IAM policy, are a question, not a finding.
