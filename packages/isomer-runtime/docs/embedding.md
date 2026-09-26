# Embedding a composition in a host page

Rendering a composition to HTML is [the `html` surface](surfaces.md). Getting that HTML onto a page a host already controls is a separate problem, and this page covers the one part of it Isomer has an opinion about: **CSS isolation**.

## The problem

A pack's stylesheet and the host page's stylesheet meet in the same document, and neither was written with the other in mind. Two things can go wrong:

- **The page styles the composition.** A host reset (`* { box-sizing }`, a global `button` rule, a `line-height` on `body`) reaches into markup the pack laid out precisely.
- **The composition styles the page.** The pack's rules escape the subtree they were written for.

Class-name collisions are the usual worry, and the style adapters minify class names per render, which reduces but does not remove the risk. Neither problem is solved by naming discipline alone: a host rule matching an element selector does not care what the class is called.

## The recipe

A shadow root solves both directions at once, and the `html` surface already returns the pieces it needs. Ask for the CSS separately rather than inlined, and attach it to the shadow root instead of the document. Ask for the enhancement script to be run by the host, too: an embedded `<script>` never runs inside a shadow root.

```ts
import { runEnhancementScript } from '@elastic/isomer-sdk';

const { html, css, js } = runtime.surfaces.html.render(composition, {
  css: 'separate',
  scripts: 'host',
});

const shadow = host.attachShadow({ mode: 'open' });
const style = document.createElement('style');
// `all: initial` is the half that stops host CSS reaching in; the shadow
// boundary alone only stops the composition's rules escaping outward.
style.textContent = `:host { all: initial; display: block; }\n${css}`;
shadow.append(style);

const view = document.createElement('div');
view.innerHTML = html;
shadow.append(view);

const section = view.querySelector('.isomer');
if (section) {
  runEnhancementScript(js, section);
}
```

`runEnhancementScript` binds the script to the section it is given, which is what an embedded script cannot find inside a shadow tree. It compiles with `new Function`, so a strict Content-Security-Policy must allow `'unsafe-eval'`; a host that cannot should render into light DOM with the default `scripts: 'embedded'`.

Both halves matter and they are not the same mechanism. The shadow boundary stops the composition's rules from escaping. `:host { all: initial }` stops the page's inherited and element-selector rules from reaching in. Use one without the other and you have solved one direction.

`display: block` is restated because `all: initial` resets `display` to `inline`, which is almost never what a rendered composition wants.

## Rendering React into the shadow root

A host that renders with React, to keep links and handlers live, can put the `react` surface's tree in the shadow root instead of the `html` string. It still needs the CSS the `html` surface would emit, and `createStyleCollection` collects it from that one React render rather than rendering the composition again for its styles:

```tsx
const styles = runtime.surfaces.html.createStyleCollection(composition, { theme });
const node = runtime.surfaces.react.render(composition, {
  context: styles.context,
  wrapper: { theme },
});

// In a layout effect, once the portal into the shadow root has rendered:
styleElement.textContent = `:host { all: initial; display: block; }\n${styles.css()}`;
```

`context` records every style the renderers use, so `css()` read after that render equals `html.render(composition, { css: 'separate' }).css`. Read it in a layout effect and the styles land before the first paint. A host with its own render context spreads both: `{ ...hostContext, ...styles.context }`. A subtree that suspends records its styles after `css()` was read, so this holds for trees that render without suspending.

Three edges are sharp:

- **The collection and the tree are one unit.** `css()` reports what rendered with that collection's `context`, and a pack such as slides collects everything at render time. Create the collection and the tree together and memoize them as a pair; a fresh collection without a re-render of the tree reads back empty CSS.
- **`wrapper: { theme }` is not decorative.** It is the `.isomer[.framed][.fluid]` `section` the `html` surface wraps its output in, carrying the `aria-label` and `data-theme`. A pack's wrapper rules attach to that element and nowhere else, so a bare tree drops them and drops the theme attribute; pass the wrapper so the tree is the DOM the `html` surface would have produced.
- **One collection covers one composition.** Each collection holds only the rules its own render reached, and an adapter built with compact names minifies them per collection, so one composition's `css()` does not cover another's. Two compositions on one page need a `<style>` each, or a shadow root each.

### Without a shadow root

A host that cannot attach a shadow root, because the page's React tree and CSS system are not its own, still renders with `createStyleCollection`, mounts the tree in an ordinary element with a class of its own, and puts `css()` in a `<style>` whose rules are confined to that element. `@scope` does that without rewriting selectors, and a cascade layer keeps the pack's rules below the page's own where the two overlap:

```tsx
const styles = runtime.surfaces.html.createStyleCollection(composition, { theme });
const node = runtime.surfaces.react.render(composition, {
  context: styles.context,
  wrapper: { theme },
});

// <div className="my-isomer-host">{node}</div>, then in a layout effect:
styleElement.textContent = `@layer isomer { @scope (.my-isomer-host) { ${styles.css()} } }`;
```

Where `@scope` is not available, prefix every selector with the host class through a CSS processor instead. Either way this confines the composition's rules; it does not keep the page's out. A host `* { box-sizing }` or a global `h2` rule still reaches in, so the recipe is the pack's stylesheet plus discipline in the host's, and a shadow root remains the only way to have both directions.

## When not to bother

Isolation costs something. Inside a shadow root the composition no longer inherits the host's font stack or color scheme, so one that is *meant* to look like part of the surrounding page needs those passed in deliberately — through the render `theme` option, or as custom properties set on the host element, which do cross the boundary.

If the host page is yours and its CSS is disciplined, render into an ordinary element with `css: 'inline'` and skip all of this. The default `scripts: 'embedded'` works there only if the page parses the HTML; a host that inserts it with `innerHTML` still uses `scripts: 'host'`.

## Why this is a recipe and not an API

It is about twenty lines, it is entirely host DOM code, and the shape of it depends on decisions Isomer does not make — where the element lives, when it is torn down, how the framework around it wants to own that node. Isomer stops at `{ html, css, js }` for the same reason the `svg` surface stops at `{ element, css }` rather than returning PNG bytes: the boundary is what keeps the package isomorphic.

If a host hits a case this recipe does not cover, that is worth reporting — it would be evidence for a real mount helper rather than a doc.
