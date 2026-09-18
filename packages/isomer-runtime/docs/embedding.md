# Embedding a composition in a host page

Rendering a composition to HTML is [the `html` surface](surfaces.md). Getting that HTML onto a page a host already controls is a separate problem, and this page covers the one part of it Isomer has an opinion about: **CSS isolation**.

## The problem

A pack's stylesheet and the host page's stylesheet meet in the same document, and neither was written with the other in mind. Two things can go wrong:

- **The page styles the composition.** A host reset (`* { box-sizing }`, a global `button` rule, a `line-height` on `body`) reaches into markup the pack laid out precisely.
- **The composition styles the page.** The pack's rules escape the subtree they were written for.

Class-name collisions are the usual worry, and the style adapters minify class names per render, which reduces but does not remove the risk. Neither problem is solved by naming discipline alone: a host rule matching an element selector does not care what the class is called.

## The recipe

A shadow root solves both directions at once, and the `html` surface already returns the two pieces it needs. Ask for the CSS separately rather than inlined, and attach it to the shadow root instead of the document:

```ts
const { html, css } = runtime.surfaces.html.render(composition, {
  css: 'separate',
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
```

Both halves matter and they are not the same mechanism. The shadow boundary stops the composition's rules from escaping. `:host { all: initial }` stops the page's inherited and element-selector rules from reaching in. Use one without the other and you have solved one direction.

`display: block` is restated because `all: initial` resets `display` to `inline`, which is almost never what a rendered composition wants.

## When not to bother

Isolation costs something. Inside a shadow root the composition no longer inherits the host's font stack or color scheme, so one that is *meant* to look like part of the surrounding page needs those passed in deliberately — through the render `theme` option, or as custom properties set on the host element, which do cross the boundary.

If the host page is yours and its CSS is disciplined, render into an ordinary element with `css: 'inline'` and skip all of this.

## Why this is a recipe and not an API

It is about twenty lines, it is entirely host DOM code, and the shape of it depends on decisions Isomer does not make — where the element lives, when it is torn down, how the framework around it wants to own that node. Isomer stops at `{ html, css }` for the same reason the `svg` surface stops at `{ element, css }` rather than returning PNG bytes: the boundary is what keeps the package isomorphic.

If a host hits a case this recipe does not cover, that is worth reporting — it would be evidence for a real mount helper rather than a doc.
