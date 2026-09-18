---
navigation_title: OKF map
description: Generated map of the Isomer OKF concept graph.
---

# OKF map

Generated from `.okf/isomer` by `pnpm okf:map`. Do not edit by hand.

- Concepts: 24
- Links: 51
- Isolated concepts: 0

## Graph

```mermaid
flowchart LR
    sdk_concepts_authoring["Authoring"]:::concept
    sdk_concepts_composition["Composition"]:::concept
    sdk_concepts_dispatch["Dispatch"]:::concept
    sdk_concepts_packs["Packs"]:::concept
    sdk_concepts_pipeline["Pipeline"]:::concept
    sdk_concepts_primitives["Primitives"]:::concept
    sdk_concepts_rendering["Rendering"]:::concept
    sdk_concepts_url_trust["URL trust"]:::concept
    sdk_entry_points_author["Author"]:::entrypoint
    sdk_entry_points_html["HTML"]:::entrypoint
    sdk_entry_points_markdown["Markdown"]:::entrypoint
    sdk_entry_points_react["React"]:::entrypoint
    sdk_entry_points_root["Root"]:::entrypoint
    sdk_entry_points_slack["Slack"]:::entrypoint
    sdk_entry_points_testing["Testing"]:::entrypoint
    sdk_entry_points_text["Text"]:::entrypoint
    sdk_playbooks_define_a_pack["Define a pack"]:::playbook
    sdk_playbooks_define_a_primitive["Define a primitive"]:::playbook
    sdk_reference_public_contract["Public contract"]:::reference
    workspace_concepts_workspace["Workspace"]:::concept
    workspace_playbooks_docs_builder["Docs-builder"]:::playbook
    workspace_playbooks_maintain_okf["Maintain OKF"]:::playbook
    workspace_playbooks_verify["Verify"]:::playbook
    workspace_reference_conventions["Conventions"]:::reference
    sdk_concepts_authoring --> sdk_concepts_primitives
    sdk_concepts_authoring --> sdk_entry_points_author
    sdk_concepts_composition --> sdk_concepts_dispatch
    sdk_concepts_composition --> sdk_concepts_pipeline
    sdk_concepts_composition --> sdk_concepts_primitives
    sdk_concepts_dispatch --> sdk_concepts_composition
    sdk_concepts_dispatch --> sdk_concepts_primitives
    sdk_concepts_dispatch --> sdk_concepts_rendering
    sdk_concepts_packs --> sdk_concepts_primitives
    sdk_concepts_packs --> sdk_playbooks_define_a_pack
    sdk_concepts_pipeline --> sdk_entry_points_root
    sdk_concepts_pipeline --> sdk_reference_public_contract
    sdk_concepts_primitives --> sdk_concepts_packs
    sdk_concepts_primitives --> sdk_concepts_rendering
    sdk_concepts_primitives --> sdk_playbooks_define_a_primitive
    sdk_concepts_rendering --> sdk_concepts_dispatch
    sdk_concepts_rendering --> sdk_concepts_packs
    sdk_concepts_rendering --> sdk_concepts_url_trust
    sdk_concepts_url_trust --> sdk_concepts_composition
    sdk_concepts_url_trust --> sdk_concepts_rendering
    sdk_entry_points_author --> sdk_concepts_authoring
    sdk_entry_points_html --> sdk_concepts_rendering
    sdk_entry_points_html --> sdk_entry_points_root
    sdk_entry_points_markdown --> sdk_concepts_rendering
    sdk_entry_points_markdown --> sdk_entry_points_slack
    sdk_entry_points_react --> sdk_concepts_rendering
    sdk_entry_points_root --> sdk_concepts_pipeline
    sdk_entry_points_root --> sdk_entry_points_author
    sdk_entry_points_root --> sdk_entry_points_html
    sdk_entry_points_root --> sdk_entry_points_testing
    sdk_entry_points_slack --> sdk_concepts_packs
    sdk_entry_points_slack --> sdk_concepts_rendering
    sdk_entry_points_testing --> sdk_concepts_pipeline
    sdk_entry_points_testing --> sdk_entry_points_root
    sdk_entry_points_text --> sdk_concepts_rendering
    sdk_playbooks_define_a_pack --> sdk_concepts_packs
    sdk_playbooks_define_a_primitive --> sdk_concepts_primitives
    sdk_playbooks_define_a_primitive --> sdk_playbooks_define_a_pack
    sdk_reference_public_contract --> sdk_concepts_pipeline
    sdk_reference_public_contract --> sdk_entry_points_root
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

- Authoring (Concept): `sdk/concepts/authoring`
- Composition (Concept): `sdk/concepts/composition`
- Dispatch (Concept): `sdk/concepts/dispatch`
- Packs (Concept): `sdk/concepts/packs`
- Pipeline (Concept): `sdk/concepts/pipeline`
- Primitives (Concept): `sdk/concepts/primitives`
- Rendering (Concept): `sdk/concepts/rendering`
- URL trust (Concept): `sdk/concepts/url-trust`
- Author (Entry Point): `sdk/entry-points/author`
- HTML (Entry Point): `sdk/entry-points/html`
- Markdown (Entry Point): `sdk/entry-points/markdown`
- React (Entry Point): `sdk/entry-points/react`
- Root (Entry Point): `sdk/entry-points/root`
- Slack (Entry Point): `sdk/entry-points/slack`
- Testing (Entry Point): `sdk/entry-points/testing`
- Text (Entry Point): `sdk/entry-points/text`
- Define a pack (Playbook): `sdk/playbooks/define-a-pack`
- Define a primitive (Playbook): `sdk/playbooks/define-a-primitive`
- Public contract (Reference): `sdk/reference/public-contract`
- Workspace (Concept): `workspace/concepts/workspace`
- Docs-builder (Playbook): `workspace/playbooks/docs-builder`
- Maintain OKF (Playbook): `workspace/playbooks/maintain-okf`
- Verify (Playbook): `workspace/playbooks/verify`
- Conventions (Reference): `workspace/reference/conventions`
