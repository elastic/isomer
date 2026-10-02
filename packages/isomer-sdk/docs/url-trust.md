# URL trust

URLs are the composition's only interactivity and media-loading channel, so every URL-bearing field goes through one policy — and through it twice.

## The policy

| Field kind               | Accepts                                               |
| ------------------------ | ----------------------------------------------------- |
| Navigation (`href`-like) | `https:`, `http:`, `mailto:`, and relative paths      |
| Asset (`src`-like)       | `https:`, `http:`, relative paths, and `data:image/*` |

Relative paths are allowed because registered views link into the host's own apps with them, and because deployment-internal assets — a service behind the host's network boundary — are legitimate sources a host resolves or uploads itself. `data:image/*` is allowed because embedded chart snapshots are inert in the `src` and `image_url` sinks renderers emit.

Everything else is rejected: non-image `data:` URIs, `blob:`, protocol-relative `//host`, and scheme-obfuscated forms.

## Two layers, for two different failures

**A Zod refinement**, so an agent-composed composition fails validation with a message it can act on. `assetUrl()` and `navigationHref()` build the schemas; `ASSET_URL_MESSAGE` and `NAVIGATION_HREF_MESSAGE` are the copy.

**Render-time sanitization**, so a renderer invoked with a node that never passed the validator still cannot emit an unsafe URL. `sanitizeAssetUrl` and `sanitizeNavigationHref` return the URL or `null`, and a primitive's [`sanitize` hook](primitives.md) runs before every render on every surface. A navigation href that fails is replaced with `BLOCKED_HREF` (`'#'`), an inert same-document link, so the label stays visible without a destination.

Neither layer alone is enough: validation can be skipped by a host that renders a node directly, and sanitization gives an agent nothing to learn from.

## Normalization, and why it exists

The check runs against a normalized string, because two decoders sit between the composition and a rendered sink:

- **Browsers strip ASCII control characters** when parsing URLs — tab, newline, and carriage return anywhere, other controls at the edges — so `jav\tascript:` reaches the DOM as `javascript:`.
- **HTML attributes and Markdown link destinations decode character references**, so `javascript&colon;`, `java&#9;script:`, and `&#47;&#47;host` become `javascript:`, `javascript:`, and `//host`.

Both are undone before the scheme is examined, references first so a decoded tab is stripped too. Every numeric reference is decoded, with or without its trailing `;`, as are the named `&colon;`, `&Tab;`, `&NewLine;`, `&sol;`, `&bsol;`, `&lt;`, and `&gt;`. The check decodes once. A passing URL comes back as authored, trimmed and with control characters stripped, so a consumer that decodes it once sees exactly what was checked; returning a decoded copy would let a second decode turn `javascript&#38;#58;` into `javascript:`. Unencoded `<` or `>` is rejected outright rather than stripped: those must be percent-encoded in a URL, so their presence means the value is malformed or a parser-confusion attempt — an unterminated `<dest` would otherwise read as a relative path.

Protocol-relative forms are rejected including the backslash variants browsers fold into `/`, since `//host` and `\\host` resolve onto a foreign host rather than naming a relative path.

Authored Markdown is parsed as GFM. Its already-decoded destinations are checked without another reference decode; nested labels and HTML blocks receive the same policy. Source beyond 16,384 UTF-16 code units, 2,048 syntax delimiters, or 256 characters of container prefix degrades to inert text rather than entering the parser.

## Using it in a primitive

```ts
import { assetUrl, navigationHref, sanitizeAssetUrl } from '@elastic/isomer-sdk';

schema: z.object({
  type: z.literal('thumbnail'),
  src: assetUrl(),
  href: navigationHref().optional(),
}),
sanitize: (node) => {
  const src = sanitizeAssetUrl(node.src);
  return src ? { ...node, src } : null;
},
```

Returning `null` from `sanitize` drops the node entirely, which is the right answer when the unsafe field was the whole point of it.

## Next

[Primitives](primitives.md) for where `sanitize` runs · [Composition and validation](composition.md) for how refinements reach an agent
