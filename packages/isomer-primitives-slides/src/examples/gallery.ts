/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnyPrimitiveDefinition,
  PrimitiveNode,
} from '@elastic/isomer-sdk';

/** The string surfaces a gallery page shows, each rendering one node. */
export interface GallerySurfaces {
  markdown: (node: PrimitiveNode) => string;
  text: (node: PrimitiveNode) => string;
  slack: (node: PrimitiveNode) => { blocks: readonly unknown[] };
}

export type GalleryScheme = 'light' | 'dark';

export const gallerySchemes: readonly GalleryScheme[] = ['light', 'dark'];

/** One example drawn in one scheme, at a path relative to the gallery folder. */
export interface GalleryImage {
  path: string;
  node: PrimitiveNode;
  scheme: GalleryScheme;
}

export interface GalleryPage {
  /** Relative to the gallery folder. */
  path: string;
  contents: string;
}

export interface Gallery {
  pages: GalleryPage[];
  images: GalleryImage[];
}

/** `slideHeading` → `slide-heading`. */
const slug = (type: string): string =>
  type.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const imagePath = (type: string, index: number, scheme: GalleryScheme) =>
  `images/${slug(type)}-${index + 1}-${scheme}.png`;

/** A fence longer than any backtick run in `body`, so the body cannot close it. */
const fence = (language: string, body: string): string => {
  const longest = Math.max(
    2,
    ...[...body.matchAll(/`+/g)].map(([run]) => run.length)
  );
  const ticks = '`'.repeat(longest + 1);
  return `${ticks}${language}\n${body.replace(/\n+$/, '')}\n${ticks}`;
};

const orEmpty = (body: string, block: (body: string) => string): string =>
  body.trim() === '' ? '_Nothing on this surface._' : block(body);

const blockKitBuilderUrl = (blocks: readonly unknown[]): string =>
  `https://app.slack.com/block-kit-builder#${encodeURIComponent(
    JSON.stringify({ blocks })
  )}`;

const tab = (label: string, sync: string, body: string): string =>
  `:::{tab-item} ${label}\n:sync: ${sync}\n\n${body}\n\n:::`;

const exampleSection = (
  definition: AnyPrimitiveDefinition,
  node: PrimitiveNode,
  index: number,
  surfaces: GallerySurfaces
): string => {
  const { type, catalog } = definition;
  const heading =
    node === catalog.example
      ? `Example ${index + 1} (catalog)`
      : `Example ${index + 1}`;
  const { blocks } = surfaces.slack(node);
  const tabs = [
    ...gallerySchemes.map((scheme) =>
      tab(
        scheme === 'light' ? 'Light' : 'Dark',
        scheme,
        `![${type} example ${index + 1}, ${scheme}](${imagePath(type, index, scheme)})`
      )
    ),
    tab(
      'Markdown',
      'markdown',
      orEmpty(surfaces.markdown(node), (body) => fence('markdown', body))
    ),
    tab(
      'Text',
      'text',
      orEmpty(surfaces.text(node), (body) => fence('text', body))
    ),
    tab(
      'Slack',
      'slack',
      `${fence('json', JSON.stringify(blocks, null, 2))}\n\n[Open in Block Kit Builder](${blockKitBuilderUrl(blocks)})`
    ),
    tab('Node', 'node', fence('json', JSON.stringify(node, null, 2))),
  ];
  return [
    `### ${heading}`,
    '::::{tab-set}\n:group: surface',
    ...tabs,
    '::::',
  ].join('\n\n');
};

const bullets = (items: readonly string[]): string =>
  items.map((item) => `- ${item}`).join('\n');

const primitivePage = (
  definition: AnyPrimitiveDefinition,
  surfaces: GallerySurfaces
): string => {
  const { type, catalog, examples } = definition;
  return [
    `---\nnavigation_title: ${type}\n---`,
    `# \`${type}\``,
    catalog.purpose,
    `## Use when\n\n${bullets(catalog.useWhen)}`,
    ...(catalog.avoidWhen.length > 0
      ? [`## Avoid when\n\n${bullets(catalog.avoidWhen)}`]
      : []),
    '## Examples',
    'Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.',
    ...examples.map((node, index) =>
      exampleSection(definition, node, index, surfaces)
    ),
  ].join('\n\n');
};

const cell = (text: string): string => text.replace(/\|/g, '\\|');

const indexPage = (definitions: readonly AnyPrimitiveDefinition[]): string =>
  [
    '---\nnavigation_title: Gallery\ndescription: "Every slides-pack example on every surface: light and dark images, Markdown, text, Slack Block Kit, and the node itself."\n---',
    '# Gallery',
    "Every example in each primitive's `examples.ts`, rendered on every surface. Tabs stay in step across a page, so choosing **Markdown** on one example shows Markdown on all of them.",
    [
      '| Primitive | Purpose | Examples |',
      '| --- | --- | --- |',
      ...definitions.map(
        ({ type, catalog, examples }) =>
          `| [\`${type}\`](${slug(type)}.md) | ${cell(catalog.purpose)} | ${examples.length} |`
      ),
    ].join('\n'),
    '## Regenerating',
    '`src/examples/gallery.test.ts` writes these pages and their images. The pages are committed: after changing an example, a renderer, or the theme, run `pnpm docs:gallery -u` and review the diff, since under `CI` a stale page fails the build. The images are not committed; the docs build renders them with `pnpm docs:gallery` before assembling the site.',
  ].join('\n\n');

/** Every gallery page, and the images they reference, for `definitions`. */
export const buildGallery = (
  definitions: readonly AnyPrimitiveDefinition[],
  surfaces: GallerySurfaces
): Gallery => ({
  pages: [
    { path: 'index.md', contents: `${indexPage(definitions)}\n` },
    ...definitions.map((definition) => ({
      path: `${slug(definition.type)}.md`,
      contents: `${primitivePage(definition, surfaces)}\n`,
    })),
  ],
  images: definitions.flatMap(({ type, examples }) =>
    examples.flatMap((node, index) =>
      gallerySchemes.map((scheme) => ({
        path: imagePath(type, index, scheme),
        node,
        scheme,
      }))
    )
  ),
});
