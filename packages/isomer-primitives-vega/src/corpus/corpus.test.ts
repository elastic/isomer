/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createVegaView,
  renderVegaSvg,
  toVegaSpec,
  VegaRenderError,
} from '../render/render';
import { specIssues, type SpecObject } from '../schema/spec';
import { VEGA_THEMES } from '../theme/theme';

const vegaLightTheme = VEGA_THEMES.light;

import { kibanaSpecs } from './kibana.fixtures';
import type { CorpusSpec } from './types';
import { vegaSpecs } from './vega.fixtures';
import { vegaLiteSpecs } from './vega_lite.fixtures';

const SIZE = { width: 480, height: 300 };

const TAG = /<[^>]*>/g;

/**
 * `svg` with each def id renamed by the order it is defined in, in `id` attributes and in attribute values that
 * are a `url(#…)` reference, so two drawings compare one-to-one whatever their ids. A reference to no
 * definition fails the test.
 */
const canonicalIds = (svg: string) => {
  const names = new Map<string, string>();
  for (const [tag] of svg.matchAll(TAG)) {
    for (const [, id] of tag.matchAll(/\sid="([^"]*)"/g)) {
      names.set(id!, `def${names.size + 1}`);
    }
  }
  return svg.replace(TAG, (tag) =>
    tag
      .replace(
        /(\sid=")([^"]*)"/g,
        (_match, lead: string, id: string) => `${lead}${names.get(id)}"`
      )
      .replace(/="url\(#([^)"]*)\)"/g, (_match, id: string) => {
        const name = names.get(id);
        expect(name, `url(#${id}) names no definition`).toBeDefined();
        return `="url(#${name})"`;
      })
  );
};

/** The root tag's `width` and `height`, which the pack sets to the box it draws in. */
const rootSize = (svg: string) => {
  const root = /^<svg[^>]*>/.exec(svg)?.[0] ?? '';
  return {
    width: Number(/\swidth="([^"]*)"/.exec(root)?.[1]),
    height: Number(/\sheight="([^"]*)"/.exec(root)?.[1]),
  };
};

/** The drawing as compared: its root tag without `width` and `height`, its def ids canonical. */
const drawing = (svg: string) =>
  canonicalIds(
    svg.replace(/^<svg[^>]*>/, (root) =>
      root.replace(/\s(?:width|height)="[^"]*"/g, '')
    )
  );

/**
 * Vega's own output: `view.toSVG()` through the interpreter. The code generator is not compared:
 * it compiles with `new Function`, which Kibana disallows.
 */
const reference = async (vegaSpec: SpecObject) => {
  const view = createVegaView(vegaSpec);
  try {
    return await view.toSVG();
  } finally {
    view.finalize();
  }
};

const corpus: [string, CorpusSpec[]][] = [
  ['Vega-Lite', vegaLiteSpecs],
  ['Vega', vegaSpecs],
  ['Kibana', kibanaSpecs],
];

describe.each(corpus)('the %s corpus', (_source, specs) => {
  const fetch = vi.fn();
  beforeAll(() => {
    vi.stubGlobal('fetch', fetch);
  });
  afterAll(() => {
    vi.unstubAllGlobals();
    expect(fetch).not.toHaveBeenCalled();
  });

  const drawn = specs.filter(({ fails }) => fails === undefined);
  const failing = specs.filter(({ fails }) => fails !== undefined);

  it.each(drawn.map((entry) => [entry.name, entry] as const))(
    '%s draws, as Vega itself does',
    async (_name, { mode, spec, random }) => {
      expect(specIssues(spec)).toEqual([]);
      const vegaSpec = toVegaSpec({ mode, spec, ...SIZE }, vegaLightTheme);
      const { svg } = renderVegaSvg(vegaSpec, SIZE);
      // A data mark group with at least one item, not just axes.
      expect(svg).toMatch(/class="mark-[a-z]+ role-mark[^"]*"[^>]*><(?!\/g>)/);
      if (random) {
        return;
      }
      expect(renderVegaSvg(vegaSpec, SIZE).svg).toBe(svg);
      expect(rootSize(svg)).toEqual(SIZE);
      expect(drawing(await reference(vegaSpec))).toBe(drawing(svg));
    }
  );

  // `it.each` fails on an empty table.
  if (failing.length === 0) {
    return;
  }

  it.each(failing.map((entry) => [entry.name, entry] as const))(
    '%s fails headless as recorded',
    (_name, { mode, spec, fails }) => {
      const render = () =>
        renderVegaSvg(
          toVegaSpec({ mode, spec, ...SIZE }, vegaLightTheme),
          SIZE
        );
      expect(render).toThrow(VegaRenderError);
      expect(render).toThrow(fails);
    }
  );
});
