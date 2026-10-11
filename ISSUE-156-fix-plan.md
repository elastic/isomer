# Fix #156: preserve authored Markdown around host elements

This PR implements [#156](https://github.com/elastic/isomer/issues/156), originating in [Kibana #296157](https://github.com/elastic/kibana/pull/296157), through an additive SDK document API and runtime Slack integration. It preserves `<render_attachment>` syntax and the existing attachment composition contract.

## Result

Agent Builder's raw cuts turn `1. a <render_attachment id="a1" />\n2. b` into independently parsed fragments. The fix parses the complete reply once: both numbered items stay in one list, then the attachment follows the complete list. Standalone markers retain their position; markers in code stay literal on the normal parse path. References defined anywhere in the document resolve correctly around attachments.

`htmlparser2@10.0.0` owns tag and attribute grammar through public callbacks. A small micromark adapter supplies Markdown context eligibility. The implementation keeps safe document nodes instead of repairing fragment strings, copying reference/footnote closures, or printing and reparsing Markdown segments. The SDK imports no runtime code.

## Public API and host scope

- `@elastic/isomer-sdk/markdown` adds `parseAuthoredMarkdown`, `renderAuthoredMarkdown`, `AuthoredMarkdownDocument`, `AuthoredMarkdownOptions`, and `AuthoredElement`. Documents are frozen and reusable within the process; their representation is private and does not enter serializable composition props. Callbacks receive safe Markdown content with readable text or immutable marker attributes.
- `runtime.surfaces.slack.renderAuthoredMarkdown(source, options)` accepts configured names and `resolveElement`, validates returned compositions, and dispatches their checked copies through the existing runtime and packs. Invalid or throwing mappings are isolated. Notification text includes authored content and attachment content.
- Ordinary `md.authored`, legacy string renderers, public attachment node types, `toSurfaceComposition`, version selection, and the `{ text, blocks }` callback contract retain their behavior.

The reviewable [Kibana patch](scripts/fixtures/agent_builder_host_elements.patch) changes only the server message/surface adapter and its focused regressions. The shared attachment contracts, primitive pack, `@kbn/isomer` runtime factory, and callback delivery remain unchanged. A production follow-up also updates the central SDK/runtime dependency pins after publication. Browser adoption and additional surface migrations are outside this fix.

## Compatibility and degraded output

Configured names and attribute names match case-insensitively. Bare/self-closing markers, quoted/unquoted attributes, duplicate-first values, and literal entity spelling are supported. Closing tags, incomplete tags, and multiline markers stay literal. Quoted `>` characters are handled by the library rather than truncating at the first `>`. Marker eligibility is protected in fenced/indented code, inline code, escapes, image alt text, link metadata, raw HTML blocks, and footnote definitions.

Existing GFM length/syntax budgets, an aggregate failed-scan limit, and the SDK's representation character ceiling bound parsing and reference expansion. Budget exhaustion or parser `RangeError` degrades the complete document to inert text and linear marker extraction using the same tag reader. This path performs no second GFM parse and may consume markers shown in code or HTML; normal Markdown context protection and formatting are unavailable. Runtime input limits, cumulative attachment expansion, readable text, and Slack output limits still apply.

## Unpublished consumer proof

The spike uses an isolated Kibana checkout at the merged source PR's head, `2b65619b725ae64ad572dca509daffd4aee2f149`, plus packed SDK/runtime outputs from this branch. It loads the actual surface service, attachment adapter, primitive pack, `createKibanaIsomerRuntime`, version helpers, and marker constants. Only host enums, i18n translation, and test logging boundaries are stubbed. The 23 patched server tests run through Vitest with a small Jest API adapter; this supplements the service probes and does not replace native Kibana Jest. This proves the contained server integration without publishing Isomer 0.3.0; it is not a full Kibana bootstrap, typecheck, or CI run.

Reproduce after building Isomer:

```sh
git clone --filter=blob:none https://github.com/elastic/kibana.git /tmp/issue-156-kibana
git -C /tmp/issue-156-kibana checkout 2b65619b725ae64ad572dca509daffd4aee2f149
git -C /tmp/issue-156-kibana apply "$PWD/scripts/fixtures/agent_builder_host_elements.patch"
pnpm check:pack-consumer --agent-builder /tmp/issue-156-kibana
```

The check packs exact unpublished artifacts, links their declared dependencies and peers, records tarball SHA256 identities, and exercises real Block Kit and notification text, explicit/latest versions, missing attachments/versions, invalid/throwing mappings, empty and unsupported-origin output, lists, tables, references, footnotes, protected code, and inert fallback. The regular packed-consumer gate also checks authored documents and Slack under ESM/CommonJS, including documents created by one module system and rendered by the other.

## Validation and release sequence

The implementation includes SDK/runtime regressions, public docs and assembled copies, hand-curated exports, OKF updates, legal reports for the dependency addition, and packed consumer checks. Run `pnpm verify`, `pnpm docs:check`, `pnpm okf:check`, and the optional Agent Builder packed check against the final candidate. Report local and remote results separately in the PR.

Before merging and publishing, review the exact consumer patch with Agent Builder and run native Kibana typecheck, lint, focused tests, and CI against candidate artifacts. The [Agent Builder author welcomed the SDK helper](https://github.com/elastic/kibana/pull/296157#discussion_r4228337401); this does not establish approval of this specific patch. Stable release remains held until the consumer scope and final artifacts are reviewed. Then publish 0.3.0 through the manual release workflow, update central Kibana pins, verify artifact parity, and rerun consumer checks before adoption. No stable package is needed to develop or review this integration.
