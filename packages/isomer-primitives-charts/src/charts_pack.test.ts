/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  type Composition,
  type Frame,
  primitiveExamples,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { chartsPack, createChartsPack } from './pack';
import type {
  ChartNode,
  ChartsRenderContext,
  ResolveSceneOptions,
} from './render/context';
import { gridSnapshotHeight } from './render/grid';
import { CHARTS_THEME } from './render/theme';
import { metricSingleValueScene } from './scene/examples';
import { resolveChart } from './scene/resolve';
import type { Scene } from './scene/types';
import { dataTableTopHosts } from './schema/examples/data_table';
import { gridExamples } from './schema/examples/grid';
import { unsupportedVega } from './schema/examples/unsupported';
import type { GridNode } from './schema/grid';
import type { UnsupportedNode } from './schema/unsupported';

const view = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [node],
});

const note = (title: string): UnsupportedNode => ({
  type: 'unsupported',
  title,
  reason: `${title} reason`,
});

// Array order differs from reading order everywhere it can.
const sectioned: GridNode = {
  type: 'grid',
  title: 'Board',
  panels: [
    { title: 'Right', x: 24, y: 0, w: 24, h: 4, node: note('R') },
    { title: 'Below', x: 0, y: 4, w: 48, h: 2, node: note('B') },
    { title: 'Left', x: 0, y: 0, w: 24, h: 4, node: note('L') },
  ],
  sections: [
    {
      title: 'Closed',
      collapsed: true,
      y: 20,
      panels: [{ title: 'Hidden', x: 0, y: 0, w: 48, h: 4, node: note('H') }],
    },
    {
      title: 'Open',
      y: 6,
      panels: [{ title: 'Inside', x: 0, y: 0, w: 48, h: 3, node: note('I') }],
    },
  ],
};

describe('chartsPack', () => {
  const runtime = createIsomerRuntime({ packs: [chartsPack] });
  const cases = chartsPack.primitives.flatMap((definition) =>
    primitiveExamples(definition).map(({ name, node }) => ({
      type: definition.type,
      name,
      node,
    }))
  );

  it('registers metric, xyChart, dataTable, grid and unsupported', () => {
    expect([...chartsPack.types].sort()).toEqual([
      'dataTable',
      'grid',
      'metric',
      'unsupported',
      'xyChart',
    ]);
  });

  it.each(cases)('$type: $name validates through the runtime', ({ node }) => {
    expect(runtime.validate(view(node)).errors).toEqual([]);
  });

  it('reports an invalid chart nested in a grid at its path', () => {
    const result = runtime.validate(
      view({
        type: 'grid',
        panels: [
          {
            x: 0,
            y: 0,
            w: 48,
            h: 4,
            node: { type: 'metric', title: 'Broken' },
          },
        ],
      } as PrimitiveNode)
    );
    expect(result.errors.map(({ path }) => path)).toContain(
      'body[0].panels[0].node.data'
    );
  });

  it('draws unsupported nodes, and charts through resolveChart', () => {
    expect(
      runtime.surfaces.text.render(view(unsupportedVega), { heading: false })
    ).toBe(
      `${unsupportedVega.title}: ${unsupportedVega.reason}\n${unsupportedVega.link?.label}: ${unsupportedVega.link?.href}`
    );
    const [metric] = primitiveExamples(
      chartsPack.primitives.find(({ type }) => type === 'metric')!
    );
    expect(
      runtime.surfaces.text.render(view(metric!.node), { heading: false })
    ).toContain(
      resolveChart(metric!.node as ChartNode, { scheme: 'light' }).summary
    );
  });

  it.each(cases.filter(({ type }) => type === 'metric' || type === 'xyChart'))(
    '$type: $name draws its summary with no engine registered',
    ({ node }) => {
      const composition = view(node);
      const { summary } = resolveChart(node as ChartNode, { scheme: 'light' });
      expect(
        renderToStaticMarkup(
          createElement(
            'div',
            null,
            runtime.surfaces.react.render(composition, { heading: false })
          )
        )
      ).toContain(renderToStaticMarkup(createElement('p', null, summary)));
      expect(
        runtime.surfaces.slack.render(composition, { collectAssets: true })
          .assets
      ).toHaveLength(1);
    }
  );
});

describe('unsupported', () => {
  const runtime = createIsomerRuntime({ packs: [chartsPack] });

  it('writes Markdown with the reason and the link', () => {
    expect(
      runtime.surfaces.markdown.render(view(unsupportedVega), {
        heading: false,
      })
    ).toBe(
      // `md` escapes the title's leading bracket.
      `**\\[Logs] Visitors by OS**: ${unsupportedVega.reason}\n\n[${unsupportedVega.link?.label}](${unsupportedVega.link?.href})`
    );
  });

  it('draws a note with the title, reason and link', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        runtime.surfaces.react.render(view(unsupportedVega), { heading: false })
      )
    );
    expect(html).toContain('role="note"');
    expect(html).toContain(unsupportedVega.reason);
    expect(html).toContain(`href="${unsupportedVega.link?.href}"`);
  });
});

describe('grid', () => {
  const resolved: ResolveSceneOptions[] = [];
  const resolveScene = (_: ChartNode, options: ResolveSceneOptions): Scene => {
    resolved.push(options);
    return { ...metricSingleValueScene, scheme: options.scheme };
  };
  const pack = createChartsPack({
    resolveScene,
    sceneRenderers: [
      {
        id: 'scheme',
        environments: ['node', 'browser'],
        supports: () => true,
        render: (scene) => createElement('output', null, scene.scheme),
      },
    ],
  });
  const runtime = createIsomerRuntime<unknown, ChartsRenderContext>({
    packs: [pack],
  });
  const html = (node: GridNode, context: ChartsRenderContext = {}) =>
    renderToStaticMarkup(
      createElement(
        'div',
        null,
        runtime.surfaces.react.render(view(node), {
          heading: false,
          context: { environment: 'node', ...context },
        })
      )
    );

  it('lists panels in reading order on text, with sections by y and collapsed ones as a title', () => {
    expect(runtime.surfaces.text.render(view(sectioned), { heading: false }))
      .toBe(`Board

Left
L: L reason

Right
R: R reason

Below
B: B reason

OPEN

Inside
I: I reason

CLOSED`);
  });

  it('writes Markdown headings in reading order', () => {
    const markdown = runtime.surfaces.markdown.render(view(sectioned), {
      heading: false,
    });
    const headings = markdown
      .split('\n')
      .filter((line) => line.startsWith('#'));
    expect(headings).toEqual([
      '## Board',
      '#### Left',
      '#### Right',
      '#### Below',
      '### Open',
      '#### Inside',
      '### Closed',
    ]);
  });

  it('places panels on 48 columns at full width', () => {
    const out = html(sectioned, { size: { width: 1200, height: 800 } });
    expect(out).toContain('grid-template-columns:repeat(48, minmax(0, 1fr))');
    expect(out).toContain('grid-column:25 / span 24;grid-row:1 / span 4');
    expect(out.indexOf('L reason')).toBeLessThan(out.indexOf('R reason'));
    expect(out).not.toContain('H reason');
  });

  it('stacks panels in one column below 768 px', () => {
    const out = html(sectioned, { size: { width: 767, height: 800 } });
    expect(out).not.toContain('grid-template-columns');
    expect(
      ['L reason', 'R reason', 'B reason', 'I reason'].map((text) =>
        out.indexOf(text)
      )
    ).toEqual(
      [
        ...['L reason', 'R reason', 'B reason', 'I reason'].map((text) =>
          out.indexOf(text)
        ),
      ].sort((a, b) => a - b)
    );
  });

  it('gives each chart the box its panel leaves', () => {
    resolved.length = 0;
    const grid: GridNode = {
      type: 'grid',
      panels: [
        {
          title: 'T',
          x: 0,
          y: 0,
          w: 24,
          h: 4,
          node: gridExamples[0]!.node.panels[0]!.node,
        },
      ],
    };
    html(grid, { size: { width: 968, height: 400 } });
    // (968 − 47 gaps × 8) × 24/48 + 23 gaps × 8; 4 rows × 20 + 3 gaps × 8 − header 24.
    expect(resolved[0]?.size).toEqual({ width: 480, height: 80 });
    resolved.length = 0;
    html(grid);
    // Without a host width: the frame's content, 960 − 2 × 16 = 928 px, and
    // (928 − 47 × 8) × 24/48 + 23 × 8 for a half-width panel.
    expect(CHARTS_THEME.grid.nominalWidth).toBe(928);
    expect(resolved[0]?.size).toEqual({ width: 460, height: 80 });
  });

  it('draws nested charts in the frame theme on snapshot', () => {
    const frame: Frame<{ scheme: 'light' | 'dark' }> = {
      defaultWidth: 800,
      theme: { light: { scheme: 'light' }, dark: { scheme: 'dark' } },
      estimateHeight: () => 400,
      wrap: (_header, body) => createElement('main', null, ...body),
    };
    const snapshotRuntime = createIsomerRuntime({
      packs: [pack],
      frames: { page: frame },
    });
    const { html: page } = snapshotRuntime.surfaces.snapshot.render(
      view(gridExamples[0]!.node),
      { theme: 'dark' }
    );
    expect(page).toContain('<output>dark</output>');
    expect(page).not.toContain('<output>light</output>');
  });

  it('sends nested charts to Slack as pictures under panel and section titles', () => {
    const { blocks, assets } = runtime.surfaces.slack.render(
      view(gridExamples[0]!.node),
      { heading: false, collectAssets: true }
    );
    expect(assets.map(({ node }) => node.type)).toEqual(['metric', 'xyChart']);
    const json = JSON.stringify(blocks);
    for (const title of [
      '[Logs] Web Traffic',
      'Requests',
      'Requests over time',
      'Visitors by OS',
    ]) {
      expect(json).toContain(`"text":"${title}"`);
    }
    expect(
      blocks.filter((block) => (block as { type: string }).type === 'image')
    ).toHaveLength(2);
    const sections = JSON.stringify(
      runtime.surfaces.slack.render(view(sectioned), { heading: false }).blocks
    );
    expect(sections).toContain('Open');
    expect(sections).toContain('Closed');
    expect(sections).toContain('I reason');
    expect(sections).not.toContain('H reason');
  });

  it('estimates its snapshot height from its rows and sections', () => {
    // Title 24; top panels 6 rows: 6×20 + 5×8 = 160; open section: header 24
    // + 8 + 3 rows (3×20 + 2×8 = 76); closed section: header 24; 3 gaps × 16.
    expect(gridSnapshotHeight(sectioned)).toBe(
      24 + 160 + (24 + 8 + 76) + 24 + 3 * 16
    );
  });
});

describe('dataTable', () => {
  const runtime = createIsomerRuntime({ packs: [chartsPack] });

  it('sends a native Slack table in its starting order, not a picture', () => {
    const { blocks, assets } = runtime.surfaces.slack.render(
      view(dataTableTopHosts),
      { heading: false, collectAssets: true }
    );
    expect(assets).toHaveLength(0);
    const tableBlock = blocks.find(
      (block) => (block as { type: string }).type === 'table'
    ) as { rows: { text: string }[][] } | undefined;
    expect(tableBlock?.rows.map((row) => row[0]?.text)).toEqual([
      'host.name',
      'web-02',
      'web-01',
      'db-01',
      'Other',
    ]);
    expect(tableBlock?.rows[1]?.[1]?.text).toBe('6,310');
  });
});
