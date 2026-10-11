# Fix #156: preserve authored Markdown around host elements

Status: proposed implementation plan for a new Isomer PR. This document changes no runtime code or dependencies and does not close the issue.

## Problem and intended result

[#156](https://github.com/elastic/isomer/issues/156) originates in [Kibana #296157](https://github.com/elastic/kibana/pull/296157). Agent Builder cuts an authored reply at `<render_attachment>` markers and renders each resulting Markdown string independently. A marker inside a list, table, or emphasis can corrupt the surrounding structure; a marker shown in code can be consumed as an attachment.

The fix belongs in Isomer: parse the complete authored reply once within the SDK's existing budget, preserve its Markdown structure and document-wide reference context, and let the host replace recognized markers with its existing attachment compositions. A standalone attachment stays in place. An attachment nested in a paragraph, list, table, quote, or emphasis follows its containing top-level block, matching the issue's Block Kit policy.

Deliver this as a new implementation PR from the default branch. The proposed title is `feat(sdk): preserve authored Markdown around host elements`, with `Closes #156` only when implementation and consumer validation meet the acceptance criteria. The current plan PR references #156 and #164; it makes no claim that either is completed.

## Scope and integration boundaries

- Preserve existing `<render_attachment id="a1" />` syntax, configured-name matching, attribute behavior, and attachment ordering.
- Keep Markdown parsing, sanitization, URL policy, and document representation inside Isomer. Do not add a Markdown parser to Agent Builder.
- Keep `toSurfaceComposition`, attachment node types, version selection, mapping validation, and local attachment failure handling intact.
- Continue rendering through Agent Builder's `@kbn/isomer` runtime and composed packs. Preserve its Slack `{ text, blocks }` callback contract, including attachment content in fallback text.
- Make the Isomer API additive. Ordinary `md.authored`, legacy string renderers, and hosts without embedded elements retain their behavior.
- Limit the Kibana follow-up to dependency wiring and the server message/composition adapter, plus focused regressions. Browser adoption, new authoring syntax, attachment-type migrations, and parser replacement are separate work.

The Agent Builder author [welcomed replacing `toMessageNodes` with an SDK helper](https://github.com/elastic/kibana/pull/296157#discussion_r4228337401) and [asked to avoid adding complexity to the original PR](https://github.com/elastic/kibana/pull/296157#discussion_r4220550506). A broader attachment-contract migration has not been agreed. The consumer spike must demonstrate that this narrower scope is achievable.

## Implementation direction

Retain one internal authored document containing safe Markdown nodes, allowlisted host-element nodes, and document-wide definitions. Do not require each portion between attachments to become an independently parseable Markdown string. That removes the need for cross-segment definition copying, duplicate-footnote renaming, fragment delimiter repair, and fragment printing followed by reparsing.

Use the current mdast/GFM parser and its existing limits. Recognize host markers through a small syntax adapter. Evaluate [`htmlparser2`](https://github.com/fb55/htmlparser2) for tag and attribute grammar through public callbacks; the adapter owns eligibility in Markdown, configured-name filtering, and host-node emission. It must not grow a second attribute parser or rely on library internals.

Existing probes establish only partial compatibility. `htmlparser2@12.0.0` recognized several current forms through an inline micromark adapter; standalone blocks, image alt text, malformed tags, and total failed-scan cost remain unverified. Test `10.0.0` before selecting a dependency version because that version appears transitively in the inspected local Kibana checkout. Transitive presence is not a direct dependency or a deduplication guarantee.

The SDK may expose an additive helper for authored input and named elements, but third-party AST types and document mutation stay private. Agent Builder supplies source and resolved content from its existing attachment mappings. Prove the helper's exact input/output types and the runtime integration in the consumer spike before fixing a public signature. Do not require a new shared `SurfaceNode` union or a changed `toSurfaceComposition` signature to deliver this fix.

The SDK must not import the runtime. Keep parsing and authored-content representation in the SDK; let runtime/surface integration own validated composition dispatch. Carry the safe document across that boundary through Isomer-owned types or render context, without converting it back to source and parsing it again. Include composition validation and serializability in the spike rather than assuming an opaque value can become a composition prop.

```text
Complete authored source
  → bounded SDK parse and sanitization
  → internal document with host-element nodes
  → host resolves existing attachment compositions
  → runtime validates and dispatches
  → surface emits document content and attachment content
```

The Slack renderer preserves document reference scope while emitting surrounding Markdown and attachment blocks in order. Define the corresponding plain-text/Markdown output so Slack fallback text includes the same resolved attachment content. Existing composition and surface output limits also apply to expanded attachments.

## Budget exhaustion and compatibility

Preserve #156's requirement for bounded host-element extraction with inert Markdown when the GFM parse is unavailable. Use the same library-backed marker reader in a linear fallback that emits inert text and element events, without another GFM parse, reference expansion, or fragment serialization. The fallback is a degraded rendering path; it does not promise normal Markdown formatting or the full parser's context protection. Cover its limitations explicitly with adversarial and code-example fixtures.

Do not default to leaving raw markers visible or silently skipping all attachments on budget exhaustion. That would change the issue's requested behavior and the consumer's expectations. If the compatibility spike cannot achieve bounded fallback without recreating substantial custom grammar, stop and revise the proposal with an explicit fallback decision before implementation is accepted or a stable release is published.

## Work and review sequence

1. **Create an isolated spike from the default branch.** Leave #164 and unrelated local work untouched. Implement only enough document handling and marker recognition to exercise the real consumer path.
2. **Build unpublished package artifacts.** Use the normal Isomer build and packed outputs for the SDK/runtime packages required by the spike. Verify first how Kibana's dependency tooling can consume those artifacts in an isolated checkout. Record exact artifact identities and wiring; do not change shared pins or production dependency ownership to run the experiment.
3. **Prepare the matching Kibana patch before release.** Replace server-side raw cutting through the additive Isomer integration. Exercise actual `toSurfaceComposition` mappings, validation, version selection, missing attachments, and mapping failures. Produce both Slack blocks and fallback text through the existing runtime and callback path.
4. **Review the consumer scope.** Make the exact Kibana patch reviewable and establish Agent Builder agreement on the integration and output behavior. If it requires changing shared attachment contracts, a browser rewrite, or a second host-side GFM parse, revisit the design instead of expanding this fix.
5. **Complete the new Isomer implementation PR.** Incorporate the proven API and renderer integration, remove spike-only wiring, add focused regressions and public documentation, and attach the consumer evidence. Do not carry forward #164's split-string contract merely for API similarity.
6. **Validate the exact candidate artifacts.** Run the complete Isomer gate, packed ESM/CommonJS checks, and focused Kibana checks against artifacts from the final implementation commit. Rerun affected checks whenever that commit or the consumer integration changes. Report local validation and remote CI separately.
7. **Publish and adopt.** Publish Isomer 0.3.0 only after the consumer patch and final artifacts are demonstrated and reviewed. Then update the Kibana patch to the published versions, verify parity with the tested artifacts, and rerun relevant Kibana checks before merging it. Complete consumer validation before merging the Isomer implementation, and trigger the repository's manual release workflow only after the release gate passes.

Publication follows consumer proof; it is not a prerequisite for developing and reviewing the Kibana integration. If unpublished artifact wiring is unavailable, resolve a tested staging mechanism before proceeding. Do not substitute a production stable release for that validation step.

## Acceptance criteria

| Requirement                                                     | Evidence required before release                                                                                                                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing tag syntax and attributes remain compatible.           | Fixtures from #156, #164, and the Kibana consumer, including quoted/unquoted attributes, entities, duplicates, adjacent tags, case matching, incomplete tags, and missing IDs. Document malformed-input differences explicitly. |
| Surrounding Markdown keeps its meaning.                         | Lists, tables, quotes, headings, emphasis, links, hard breaks, and empty containers render correctly around markers; no generated independent source fragments are reparsed.                                                    |
| Protected contexts remain literal on the successful parse path. | Fenced/inline code, escapes, image metadata and alt text, link destinations/titles, raw HTML blocks, and other agreed protected contexts.                                                                                       |
| Attachments follow the agreed placement policy.                 | Standalone, nested, initial, final, and adjacent markers resolve once in stable order; nested markers follow their entire top-level block.                                                                                      |
| Definitions retain document scope.                              | References defined before and after attachments, footnotes, duplicate definitions, repeated references, and cycles terminate with the document's expected semantics.                                                            |
| SDK parsing remains bounded.                                    | One GFM parse on success, existing input/nesting protections, bounded failed marker scans and traversal, and timing probes at the actual input ceiling and far beyond it.                                                       |
| Degraded output retains the agreed attachment behavior.         | Bounded fallback with inert text, explicit protection limits, preserved extraction/order where promised, and no partial reference-copying machinery.                                                                            |
| Host behavior and runtime policy remain intact.                 | Real attachment mappings, version selection, missing/invalid/throwing mappings, composition validation, expansion limits, and both callback payload fields.                                                                     |
| The public change is additive and portable.                     | Legacy consumers, documents without markers, multiple documents in one composition, emitted declarations without third-party AST types, and packed ESM/CommonJS consumers on the minimum supported Node version.                |
| Agent Builder migration stays contained.                        | A reviewable server-adapter patch with unchanged attachment contracts and a recorded unpublished-artifact test path.                                                                                                            |

Update SDK/runtime package documentation and assembled docs where affected, maintain the hand-curated barrels, and update OKF for public API or behavior changes. If a dependency is added, run `pnpm licenses:report` and include generated reports. Complete `pnpm docs:check`, relevant OKF checks, and `pnpm verify` for the implementation.

This plan-only PR changes no public behavior. Its verification is Markdown lint and formatting, with prose wrapping disabled; implementation gates above remain pending.

## Decision gates

Proceed with the implementation only when the spike proves the additive public boundary, composition validation/serializability, marker compatibility, bounded fallback, and real Kibana outputs. Proceed with 0.3.0 only when the consumer scope is agreed and the final unpublished artifacts pass the relevant gates. Neither gate is satisfied by the parser probes performed so far.
