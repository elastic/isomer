---
navigation_title: OKF map
description: Generated map of the Isomer OKF concept graph.
---

# OKF map

Generated from `.okf/isomer` by `pnpm okf:map`. Do not edit by hand.

- Concepts: 5
- Links: 11
- Isolated concepts: 0

## Graph

```mermaid
flowchart LR
    workspace_concepts_workspace["Workspace"]:::concept
    workspace_playbooks_docs_builder["Docs-builder"]:::playbook
    workspace_playbooks_maintain_okf["Maintain OKF"]:::playbook
    workspace_playbooks_verify["Verify"]:::playbook
    workspace_reference_conventions["Conventions"]:::reference
    workspace_concepts_workspace --> workspace_playbooks_docs_builder
    workspace_concepts_workspace --> workspace_playbooks_verify
    workspace_concepts_workspace --> workspace_reference_conventions
    workspace_playbooks_docs_builder --> workspace_concepts_workspace
    workspace_playbooks_docs_builder --> workspace_playbooks_maintain_okf
    workspace_playbooks_maintain_okf --> workspace_concepts_workspace
    workspace_playbooks_maintain_okf --> workspace_reference_conventions
    workspace_playbooks_verify --> workspace_concepts_workspace
    workspace_playbooks_verify --> workspace_playbooks_docs_builder
    workspace_reference_conventions --> workspace_playbooks_maintain_okf
    workspace_reference_conventions --> workspace_playbooks_verify
    classDef concept fill:#e7f5ff,stroke:#1971c2,color:#102a43
    classDef entrypoint fill:#fff4e6,stroke:#e67700,color:#2d1600
    classDef playbook fill:#ebfbee,stroke:#2b8a3e,color:#102a12
    classDef reference fill:#f8f0fc,stroke:#9c36b5,color:#2b1033
```

## Concepts

- Workspace (Concept): `workspace/concepts/workspace`
- Docs-builder (Playbook): `workspace/playbooks/docs-builder`
- Maintain OKF (Playbook): `workspace/playbooks/maintain-okf`
- Verify (Playbook): `workspace/playbooks/verify`
- Conventions (Reference): `workspace/reference/conventions`
