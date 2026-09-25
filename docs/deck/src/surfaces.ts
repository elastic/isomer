/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Every way the viewer can show a slide, in toolbar order. */
export const surfaces = [
  {
    id: 'slide',
    label: 'Slide',
    call: 'runtime.surfaces.react.render(slide, { heading: false, wrapper: { theme } })',
  },
  {
    id: 'html',
    label: 'HTML',
    call: "runtime.surfaces.html.render(slide, { css: 'separate', heading: false, theme })",
  },
  {
    id: 'png',
    label: 'PNG',
    call: 'takumi.png(runtime.surfaces.svg.render(slide, { theme }))',
  },
  {
    id: 'markdown',
    label: 'Markdown',
    call: 'runtime.surfaces.markdown.render(slide, { heading: false })',
  },
  {
    id: 'text',
    label: 'Text',
    call: 'runtime.surfaces.text.render(slide, { heading: false })',
  },
  {
    id: 'slack',
    label: 'Slack',
    call: 'runtime.surfaces.slack.render(slide, { heading: false }).blocks',
  },
] as const;

/** One of {@link surfaces}. */
export type SurfaceId = (typeof surfaces)[number]['id'];

/** Color schemes a slide renders in. */
export const themes = ['light', 'dark'] as const;

/** One of {@link themes}. */
export type Theme = (typeof themes)[number];

/** Where a slide's pre-rendered PNG lives, relative to the deck's base. */
export const pngPath = (slug: string, theme: Theme): string =>
  `png/${slug}.${theme}.png`;
