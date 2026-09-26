# Worked example

Eleven compositions built from each primitive's canonical `example`, in `src/examples/deck/index.ts`. A host sequences them; Isomer renders one composition at a time. The [Isomer deck](https://elastic.github.io/isomer/deck/) is the full-size version: every slide in `examples/deck` is a composition, viewable on every surface.

## A deck is a `Composition[]`

```ts
const slide = (name, body, chapter, tone = 'page') => ({
  type: 'view',
  title: name,
  body: [{ type: 'slideFrame', brand: 'Crate', url: 'https://example.com/crate', ...chapter, tone, body }],
});

export const deck: Composition[] = [
  slide('Title', [title], undefined, 'inverse'),
  slide('Section', [section], settlement, 'inverse'),
  slide('Pipeline', [heading('Every refund runs the same four steps'), pipeline, stat], settlement),
  // …
];
```

Isomer deliberately does not model the sequence, because sequencing is routing and routing belongs to the host. The runtime sees one composition at a time.

## Surface artifacts

Each composition renders on HTML, Markdown, text, Slack Block Kit, and SVG; `src/examples/deck/output/` holds every artifact. The test renders them the way a slide host should: with `heading: false`, because each slide opens with its own heading and the composition's `title` only names it. Every slide's Markdown then opens with exactly one `#` heading, which the test asserts. The markdown and text surfaces are the headline claim: every word on the slide reaches them, so a composition authored once still reads as a few lines of terminal output.

### Pipeline

```markdown
# Every refund runs the same four steps

Refund request → Verify → Score → Approve → Settle → Ledger entry

1. **Verify** — Match the order, the amount, and the card on file. A mismatch goes to a person.
2. **Score** — The fraud model scores the request against the customer’s last ninety days.
3. **Approve** — Scores under the threshold approve on their own; the rest wait for review.
4. **Settle** — The processor returns the funds and posts one line to the ledger.

**2.1 days** — Median time from refund request to money back in the customer account, down from five.

_Crate · 02 Settlement · [example.com/crate](https://example.com/crate)_
```

```text
EVERY REFUND RUNS THE SAME FOUR STEPS

Refund request → Verify → Score → Approve → Settle → Ledger entry
1. Verify — Match the order, the amount, and the card on file. A mismatch goes to a person.
2. Score — The fraud model scores the request against the customer’s last ninety days.
3. Approve — Scores under the threshold approve on their own; the rest wait for review.
4. Settle — The processor returns the funds and posts one line to the ledger.

2.1 days — Median time from refund request to money back in the customer account, down from five.

Crate · 02 Settlement · example.com/crate
```

### Table and code

````markdown
# Refund states, and where they are set

## Checkout, last 24 hours

| Region | Orders | p99 latency | Errors |
| --- | --- | --- | --- |
| Europe | 48,210 | 410 ms | 0.2% |
| North America | 61,905 | 380 ms | 0.1% |
| Asia Pacific | 22,764 | 1.9 s | 2.4% |

**refund.ts**

```ts
export const refund = async (order: Order) => {
  await ledger.write(order.id, -order.total);
  await fraud.check(order);
  return notify(order.customer);
};
```

_Crate · 03 Platform · [example.com/crate](https://example.com/crate)_
````

On Slack the table arrives as a native `table` block with bold row headers, because every container above it dispatches its children through `scope.renderSlack`.

## Getting a PNG

The `svg` surface returns `{ element, css, width, height }` — the React tree, the pack's stylesheet with `light-dark(…)` already resolved to the render's scheme, and the viewport it was measured for. It does not return an image: rasterizing is a separate capability a host opts into.

`@elastic/isomer-image-takumi` is that capability for this repo:

```ts
import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';

const takumi = createTakumiImageBackend({ fonts });
const png = await takumi.png(runtime.surfaces.svg.render(composition));
```

`fonts` is the host's, and it is not optional in practice — an unregistered family falls back to the backend's built-in face, so an unfonted render is visibly not this pack. [Fonts on the image surface](styling.md#fonts-on-the-image-surface) covers which families and weights to register; `src/examples/deck/fonts.ts` is the worked version, deriving the weight set from the theme.

The `.png` files are written by the same test that writes the other four surfaces' artifacts, with one difference: `toMatchFileSnapshot` is text-only, so the PNG case hand-rolls its own comparison, and that comparison is CI-only. A local run always rewrites the artifact — a takumi or font bump would otherwise fail every PNG case on the bump alone, not on a real regression — so `git diff` on them is the review step. Under `CI`, a missing artifact fails instead of being written, and byte equality is asserted against the committed artifact. CI runs Ubuntu only, so this verifies same-input determinism on linux-x64; cross-platform stability (darwin-arm64 producing the same bytes) is an operating assumption at a pinned `@takumi-rs/core` and a fixed font set, not independently verified here — see `@elastic/isomer-image-takumi`'s [Determinism](../../isomer-image-takumi/docs/index.md#determinism) section.

## What this demonstrates

- `slideTitle` with a `slideFanout` aside, and `slideClosing`, on inverse frames
- `slideSection`, a section divider
- `slideHeading` opening every content slide
- `slideTimeline`, `slidePipeline` with a `slideStat` band, `slideLanes`, and `slideGraph`
- `slideSplit` with string items and a rule, and with node items holding `slideTable` and `slideCode`
- `slideStats` and `slideColumns`

The Isomer deck covers the rest: `slideDefinitions`, `slideList`, `slideTree`, `slideWindow`, `slideTranscript`, `slideRender`, and `slideRenderGrid`.
