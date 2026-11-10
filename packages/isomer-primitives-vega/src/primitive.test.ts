/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chartsFrame } from '@elastic/isomer-primitives-charts';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { runPrimitiveInventoryConformance } from '@elastic/isomer-sdk/testing';

import { vegaPack } from './pack';
import {
  VEGA_INTERACTIVE,
  vegaChartSize,
  vegaPrimitive,
  type VegaRenderContext,
} from './primitive';
import { VEGA_THEMES } from './render/theme';
import {
  brushExample,
  kibanaPanelExample,
  mapExample,
  vegaExample,
  vegaExamples,
  vegaGrammarExample,
} from './schema/examples';
import {
  MAX_CHART_SIDE,
  MAX_DATA_ROWS,
  MAX_DRAWN_ITEMS,
  MAX_SPEC_CHARS,
  VEGA_RULES,
  type VegaNode,
} from './schema/node';
import { TABLE_RULE } from './schema/table';

const runtime = createIsomerRuntime({
  packs: [vegaPack],
  frames: { charts: chartsFrame },
});

const markupOf = (node: ReactNode) =>
  renderToStaticMarkup(createElement(Fragment, null, node));

const view = (...body: object[]) => ({
  type: 'view' as const,
  body: body as PrimitiveNode[],
});

const errors = (node: object) =>
  runtime
    .validate(view(node))
    .errors.map(({ path, message }) => `${path}: ${message}`);

const withSpec = (node: VegaNode, spec: object): VegaNode =>
  ({ ...node, spec }) as VegaNode;

const html = (node: object, enhancements: string[] = []) =>
  runtime.surfaces.html.render(view(node), {
    enhancements,
    onValidationError: 'collect',
  }).html;

runPrimitiveInventoryConformance([vegaPrimitive]);

describe('vega schema', () => {
  it('accepts both grammars', () => {
    expect(errors(vegaExample)).toEqual([]);
    expect(errors(vegaGrammarExample)).toEqual([]);
  });

  it('names every place a spec reaches out, under the node', () => {
    expect(
      errors(
        withSpec(vegaGrammarExample, {
          ...vegaGrammarExample.spec,
          data: [{ name: 'table', url: 'https://example.com/cars.json' }],
          marks: [
            { type: 'rect', encode: { enter: { href: { value: 'x' } } } },
          ],
        })
      )
    ).toEqual([
      'body[0].spec.data[0].url: a chart cannot load anything by URL; inline its data under `values`',
      'body[0].spec.marks[0].encode.enter.href: a chart cannot link out; remove `href`',
    ]);
  });

  it('refuses Kibana map mode, and ignores other Kibana settings', () => {
    const spec = { ...vegaGrammarExample.spec };
    expect(
      errors(
        withSpec(vegaGrammarExample, {
          ...spec,
          config: { kibana: { type: 'map' } },
        })
      )
    ).toEqual([
      expect.stringMatching(
        /^body\[0\]\.spec\.config\.kibana\.type: Kibana map mode needs a materializer/
      ),
    ]);
    expect(errors(kibanaPanelExample)).toEqual([]);
  });

  it('reports a spec Vega cannot parse, such as a Kibana function', () => {
    expect(
      errors(
        withSpec(vegaGrammarExample, {
          ...vegaGrammarExample.spec,
          signals: [{ name: 'x', update: 'kibanaSetTimeFilter(1, 2)' }],
        })
      )
    ).toEqual([
      expect.stringMatching(/^body\[0\]\.spec: .*kibanaSetTimeFilter/),
    ]);
  });

  it.each([
    ['an unknown mode', { mode: 'vega-lite-5' }],
    ['an empty description', { description: '' }],
    ['a fractional width', { width: 10.5 }],
    ['an oversized height', { height: MAX_CHART_SIDE + 1 }],
    ['a spec that is not an object', { spec: [] }],
  ])('rejects %s', (_name, change) => {
    expect(errors({ ...vegaGrammarExample, ...change })).toHaveLength(1);
  });

  it.each([
    [
      'a Vega spec with no `table`',
      vegaGrammarExample,
      { data: [] },
      'body[0].spec.data',
    ],
    [
      'a Vega `table` holding values',
      vegaGrammarExample,
      { data: [{ name: 'table', values: [] }] },
      'body[0].spec.data[0].values',
    ],
    [
      'a Vega-Lite spec that never reads `table`',
      vegaExample,
      { data: { values: [] } },
      'body[0].spec',
    ],
    [
      'a Vega-Lite `datasets.table`',
      vegaExample,
      { datasets: { table: [] } },
      'body[0].spec.datasets.table',
    ],
  ])('holds `data` to the table rule: %s', (_name, base, change, path) => {
    const node = {
      ...base,
      data: vegaExample.data,
      spec: { ...base.spec, ...change },
    };
    expect(errors(node)).toContain(`${path}: ${TABLE_RULE}`);
  });

  it('needs `data` for a selection or a brush, and a date or number brush column', () => {
    const { data: _data, ...noData } = vegaExample;
    expect(
      errors({ ...noData, spec: { ...vegaExample.spec, data: { values: [] } } })
    ).toEqual([`body[0].interactions.select: ${VEGA_RULES.needsData}`]);
    expect(
      errors({
        ...brushExample,
        interactions: { brush: { column: 'requests', signal: 'range' } },
      })
    ).toEqual([]);
    expect(
      errors({
        ...vegaExample,
        interactions: { brush: { column: 'day', signal: 'range' } },
      })
    ).toEqual([`body[0].interactions.brush.column: ${VEGA_RULES.brushColumn}`]);
  });

  it('bounds the spec’s characters and the rows of `data`', () => {
    const padded = (length: number) =>
      withSpec(vegaGrammarExample, {
        ...vegaGrammarExample.spec,
        description: 'x'.repeat(
          length -
            JSON.stringify({ ...vegaGrammarExample.spec, description: '' })
              .length
        ),
      });
    expect(errors(padded(MAX_SPEC_CHARS))).toEqual([]);
    expect(errors(padded(MAX_SPEC_CHARS + 1))).toEqual([
      `body[0].spec: ${VEGA_RULES.size}`,
    ]);
    const rows = (count: number) => ({
      ...vegaExample,
      data: {
        ...vegaExample.data!,
        rows: Array.from({ length: count }, (_, index) => [`d${index}`, index]),
      },
      spec: { ...vegaExample.spec, mark: 'tick' },
    });
    expect(errors(rows(MAX_DATA_ROWS + 1))).toContain(
      `body[0].data.rows: ${VEGA_RULES.dataRows}`
    );
    expect(
      errors(rows(MAX_DATA_ROWS)).filter((e) => e.includes('data.rows'))
    ).toEqual([]);
  });

  it('accepts only an inline raster tile, so a basemap cannot fetch', () => {
    const tiles = (src: string) => ({
      ...mapExample,
      basemap: { tiles: [{ src, x: 0, y: 0, width: 256, height: 256 }] },
    });
    expect(errors(tiles('data:image/png;base64,iVBORw0KGgo='))).toEqual([]);
    expect(errors(tiles('https://tiles.example/0/0/0.png'))).not.toEqual([]);
    expect(errors(tiles('data:image/svg+xml;base64,PHN2Zz4='))).not.toEqual([]);
  });
});

describe('every example', () => {
  it.each(vegaExamples.map(({ name, node }) => [name, node] as const))(
    '%s validates and draws on every surface',
    (_name, node) => {
      const composition = view(node);
      expect(runtime.validate(composition).errors).toEqual([]);
      const out = runtime.surfaces.html.render(composition).html;
      expect(out).toContain('<svg');
      expect(out).not.toContain('data-isomer-vega-error');
      for (const theme of ['light', 'dark'] as const) {
        const snapshot = runtime.surfaces.snapshot.render(composition, {
          frame: 'charts',
          theme,
        });
        expect(snapshot.html).toContain('<svg');
      }
      expect(runtime.surfaces.text.render(composition)).toContain(
        node.description
      );
      expect(runtime.surfaces.markdown.render(composition)).toContain(
        node.description
      );
    }
  );
});

describe('vega rendering', () => {
  it('draws inline SVG at the node size, labelled by its sentence, styled by class', () => {
    const markup = html(vegaExample);
    expect(markup).toContain(
      `role="img" aria-label="Checkout errors by day: ${vegaExample.description}"><svg`
    );
    expect(markup).toMatch(/<svg[^>]* width="480" height="240"/);
    expect(markup).toMatch(/class="[^"]*vegaChart[^"]*"/);
    expect(markup).not.toContain('data-isomer-vega-spec');
  });

  it('takes the box a host gives it, less the link line', () => {
    expect(vegaChartSize(vegaExample, { width: 300, height: 200 })).toEqual({
      width: 300,
      height: 200,
    });
    expect(
      vegaChartSize(kibanaPanelExample, { width: 300, height: 200 })
    ).toEqual({
      width: 300,
      height: 182,
    });
    const { width: _w, height: _h, ...unsized } = vegaGrammarExample;
    expect(vegaChartSize(unsized as VegaNode, undefined)).toEqual({
      width: 480,
      height: 270,
    });
    const sized: VegaRenderContext = { size: { width: 300, height: 150 } };
    const markup = markupOf(
      runtime.surfaces.react.renderNode(vegaExample, {
        context: sized,
      })
    );
    expect(markup).toMatch(/<svg[^>]* width="300" height="150"/);
  });

  it('draws in the scheme the context or the frame names', () => {
    const darkContext: VegaRenderContext = { scheme: 'dark' };
    const dark = VEGA_THEMES.dark.label;
    expect(
      markupOf(
        runtime.surfaces.react.renderNode(vegaExample, { context: darkContext })
      )
    ).toContain(`fill="${dark}"`);
    expect(markupOf(runtime.surfaces.react.renderNode(vegaExample))).toContain(
      `fill="${VEGA_THEMES.light.label}"`
    );
    const snapshot = runtime.surfaces.snapshot.render(view(vegaExample), {
      frame: 'charts',
      theme: 'dark',
    });
    expect(snapshot.html).toContain(`fill="${dark}"`);
    expect(snapshot.html).not.toContain('data-isomer-vega-spec');
  });

  it('reports its snapshot height, its link line included', () => {
    const height = (node: VegaNode) =>
      runtime.surfaces.snapshot.render(view(node), { frame: 'charts' }).height;
    expect(height(kibanaPanelExample) - height(vegaExample)).toBe(
      (kibanaPanelExample.height ?? 0) + 18 - (vegaExample.height ?? 0)
    );
  });

  it('draws its link below the chart and drops an unsafe one', () => {
    expect(html(kibanaPanelExample)).toMatch(
      /<a href="https:\/\/kibana\.example\.com\/app\/dashboards#\/view\/web-logs" title="Open in Kibana" class="[^"]*vegaChart[^"]*"/
    );
    const unsafe = {
      ...kibanaPanelExample,
      interactions: { link: { href: 'javascript:alert(1)', label: 'Open' } },
    };
    const markup = markupOf(runtime.surfaces.react.renderNode(unsafe));
    expect(markup).not.toContain('javascript:');
  });

  it('embeds the compiled spec and event fields, safe inside a script, only for the enhancement', () => {
    const node = withSpec(vegaExample, {
      ...vegaExample.spec,
      title: '</script><script>alert(1)</script>',
    });
    const markup = html(node, [VEGA_INTERACTIVE]);
    const [, json] =
      /<script type="application\/json" data-isomer-vega-spec="">(.*?)<\/script>/.exec(
        markup
      ) ?? [];
    expect(json).toContain('\\u003c/script\\u003e');
    const embedded = JSON.parse(json ?? 'null') as {
      spec: { $schema: string; config: { events: { selector: boolean } } };
      node: { id: string; interactions: object };
    };
    expect(embedded.spec.$schema).toContain('vega/v6');
    expect(embedded.spec.config.events.selector).toBe(false);
    expect(embedded.node).toMatchObject({
      id: 'checkout-errors',
      interactions: { select: ['mark'] },
    });
  });

  it('draws a chart with results or a basemap statically', () => {
    const tile = 'data:image/png;base64,iVBORw0KGgo=';
    const mapped = {
      ...mapExample,
      basemap: {
        tiles: [{ src: tile, x: -10, y: 0, width: 256, height: 256 }],
      },
    };
    const markup = html(mapped, [VEGA_INTERACTIVE]);
    expect(markup).not.toContain('data-isomer-vega-spec');
    const svg = markup.slice(markup.indexOf('<svg'));
    expect(svg.indexOf(`<image href="${tile}" x="-10"`)).toBeGreaterThan(0);
    expect(svg.indexOf('<image')).toBeLessThan(svg.indexOf('<path'));
  });

  it('renders an unvalidated node without fetching or linking', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    try {
      const node = withSpec(vegaGrammarExample, {
        ...vegaGrammarExample.spec,
        data: [
          {
            name: 'table',
            url: 'https://example.com/a.json',
            values: [{ region: 'x', share: 1 }],
          },
        ],
      });
      const markup = markupOf(runtime.surfaces.react.renderNode(node));
      expect(markup).toContain('<svg');
      expect(markup).not.toMatch(/example\.com|<a[\s>]/);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('draws a note instead of more marks than an image can afford', () => {
    const points = (count: number) =>
      withSpec(vegaGrammarExample, {
        data: [
          {
            name: 'table',
            values: Array.from({ length: count }, (_, x) => ({ x })),
          },
        ],
        marks: [
          {
            type: 'symbol',
            from: { data: 'table' },
            encode: { enter: { x: { field: 'x' } } },
          },
        ],
      });
    const drawn = (node: VegaNode) =>
      markupOf(runtime.surfaces.react.renderNode(node));
    // The root mark, its group, the symbol mark, and one item per point.
    expect(drawn(points(MAX_DRAWN_ITEMS - 3))).not.toContain(
      'data-isomer-vega-error'
    );
    const over = drawn(points(MAX_DRAWN_ITEMS - 2));
    expect(over).toContain('data-isomer-vega-error');
    expect(over).toContain(`more than the ${MAX_DRAWN_ITEMS}`);
    // A line draws one path, however many points it has.
    const line = withSpec(points(MAX_DRAWN_ITEMS * 2), {
      ...points(MAX_DRAWN_ITEMS * 2).spec,
      marks: [
        {
          type: 'line',
          from: { data: 'table' },
          encode: { enter: { x: { field: 'x' } } },
        },
      ],
    });
    expect(drawn(line)).not.toContain('data-isomer-vega-error');
  });

  it('draws a note in the chart’s box when Vega cannot draw the spec', () => {
    const markup = markupOf(
      runtime.surfaces.react.renderNode({
        ...vegaGrammarExample,
        spec: { marks: [{ type: 'rect', from: { data: 'missing' } }] },
      } as PrimitiveNode)
    );
    expect(markup).toContain('data-isomer-vega-error=');
    expect(markup).toContain('role="note"');
    expect(markup).toContain(vegaGrammarExample.description);
    expect(markup).toMatch(/style="--[^"]*:200px"/);
  });
});

describe('vega text surfaces', () => {
  it('writes the sentence, then `data` formatted as a dataTable shows it', () => {
    expect(runtime.surfaces.text.renderNode(vegaExample)).toBe(
      [
        'Checkout errors by day: Checkout errors peaked on Wednesday and fell back by Friday.',
        'Day | Errors\nMon | 12\nTue | 18\nWed | 41\nThu | 23\nFri | 9',
      ].join('\n\n')
    );
    expect(runtime.surfaces.text.renderNode(brushExample)).toContain(
      'Mar 1 | 1,440'
    );
  });

  it('writes an inline dataset where `format.property` points, with the link', () => {
    expect(runtime.surfaces.markdown.renderNode(kibanaPanelExample))
      .toMatchInlineSnapshot(`
      "Unique visitors by country: Unique visitors by country over the last 7 days, China first.

      | key | doc_count | unique |
      | - | - | - |
      | CN | 1830 | {"value":812} |
      | IN | 1512 | {"value":671} |
      | US | 1105 | {"value":502} |
      | ID | 402 | {"value":188} |
      | BR | 371 | {"value":160} |

      [Open in Kibana](https://kibana.example.com/app/dashboards#/view/web-logs)"
    `);
  });

  it('cuts a long inline dataset and says how much is left', () => {
    const rows = Array.from({ length: 13 }, (_, index) => ({ v: index }));
    const node = withSpec(vegaGrammarExample, {
      ...vegaGrammarExample.spec,
      data: [{ name: 'table', values: rows }],
    });
    const text = runtime.surfaces.text.renderNode(node);
    expect(text).toContain('\n9\n\n…and 3 more rows.');
  });

  it('sends Slack a picture to upload, with the text form as alt text', () => {
    const { blocks, assets } = runtime.surfaces.slack.render(
      view(vegaExample),
      {
        collectAssets: true,
      }
    );
    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'image',
        alt_text: expect.stringContaining('Checkout errors by day') as unknown,
      }),
    ]);
    expect(assets).toHaveLength(1);
  });
});
