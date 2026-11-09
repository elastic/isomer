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
  definePrimitive,
  definePrimitivePack,
  type Frame,
  NODE_ANCHOR_ATTRIBUTE,
  primitiveExamples,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { assertPackIconsValid } from '@elastic/isomer-sdk/testing';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { chartsPack, chartsStylesheet, createChartsPack } from './pack';
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
import {
  dataTableExamples,
  dataTableTopHosts,
} from './schema/examples/data_table';
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

  it('gives every primitive an icon within the SDK allowlist', () => {
    expect(Object.keys(chartsPack.icons ?? {}).sort()).toEqual(
      [...chartsPack.types].sort()
    );
    expect(() => assertPackIconsValid(chartsPack)).not.toThrow();
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

  // `react` skips validation, so its node may carry any href.
  it.each(['metric', 'xyChart', 'dataTable'])(
    '%s loses an unsafe href before the resolver sees the node',
    (type) => {
      const seen: ChartNode[] = [];
      const spying = createIsomerRuntime({
        packs: [
          createChartsPack({
            resolveScene: (node, options) => {
              seen.push(node);
              return resolveChart(node, options);
            },
          }),
        ],
      });
      const { node } = cases.find((example) => example.type === type)!;
      const unsafe = view({
        ...node,
        interactions: {
          ...(node as ChartNode).interactions,
          link: { label: 'Open', href: 'javascript:alert(1)' },
        },
      } as ChartNode);
      const html = renderToStaticMarkup(
        createElement(
          'div',
          null,
          spying.surfaces.react.render(unsafe, { heading: false })
        )
      );
      expect(seen.length).toBeGreaterThan(0);
      expect(seen.map(({ interactions }) => interactions?.link)).toEqual(
        seen.map(() => undefined)
      );
      expect(html).not.toContain('javascript:');
    }
  );

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

describe('a Scene description', () => {
  const described: Scene = {
    ...metricSingleValueScene,
    description: 'Requests the edge served',
  };
  const runtime = createIsomerRuntime<unknown, ChartsRenderContext>({
    packs: [createChartsPack({ resolveScene: () => described })],
  });
  const metric = primitiveExamples(
    chartsPack.primitives.find(({ type }) => type === 'metric')!
  )[0]!.node;

  it('follows the summary on text, Markdown and the summary renderer', () => {
    expect(
      runtime.surfaces.text.render(view(metric), { heading: false })
    ).toContain(`${described.summary}\nRequests the edge served`);
    expect(
      runtime.surfaces.markdown.render(view(metric), { heading: false })
    ).toContain(`${described.summary}\n\nRequests the edge served`);
    const out = renderToStaticMarkup(
      createElement(
        'div',
        null,
        runtime.surfaces.react.render(view(metric), {
          heading: false,
          context: { environment: 'node' },
        })
      )
    );
    expect(out).toContain(
      `<p>${described.summary}</p><p>Requests the edge served</p>`
    );
  });
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

  it('styles through its own adapter, emitting only the rules it draws', () => {
    const { body, css } = runtime.surfaces.html.render(view(unsupportedVega));
    expect(body).toContain('class="chartsUnsupported-root"');
    expect(css).toContain('.chartsUnsupported-root{');
    expect(css).toContain('border:1px dashed currentColor');
    expect(css).not.toContain('chartsGrid');
  });

  // `react` skips validation, so its node may carry any href.
  it('drops a link that fails the navigation policy', () => {
    const node: UnsupportedNode = {
      ...unsupportedVega,
      link: { label: 'Open', href: 'javascript:alert(1)' },
    };
    const unsafe = view(node);
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        runtime.surfaces.react.render(unsafe, { heading: false })
      )
    );
    expect(html).toContain(unsupportedVega.reason);
    expect(html).not.toContain('<a');
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
  /** The declarations of the stylesheet's rule for `className`. */
  const rule = (className: string) =>
    new RegExp(`\\.${className}\\{([^}]*)\\}`).exec(chartsStylesheet())?.[1];
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
    expect(out).toContain('class="chartsGrid-panels"');
    expect(rule('chartsGrid-panels')).toContain(
      'grid-template-columns:repeat(48,minmax(0,1fr))'
    );
    expect(out).toContain('grid-column:25 / span 24;grid-row:1 / span 4');
    expect(out.indexOf('L reason')).toBeLessThan(out.indexOf('R reason'));
    expect(out).not.toContain('H reason');
  });

  it('stacks panels in one column below 768 px', () => {
    const out = html(sectioned, { size: { width: 767, height: 800 } });
    expect(out).toContain('class="chartsGrid-column"');
    expect(out).not.toContain('chartsGrid-panels');
    expect(rule('chartsGrid-column')).toContain('flex-direction:column');
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

  describe('nested in a narrow panel', () => {
    const chart = gridExamples[0]!.node.panels[0]!.node;
    const narrow = (node: PrimitiveNode): GridNode => ({
      type: 'grid',
      panels: [{ x: 0, y: 0, w: 12, h: 8, node }],
    });
    const inner = narrow(chart);
    const columns = (out: string) =>
      out.split('class="chartsGrid-panels"').length - 1;

    it('validates', () => {
      expect(runtime.validate(view(narrow(narrow(inner)))).errors).toEqual([]);
    });

    it('keeps 48 columns, at any depth, without a host size', () => {
      resolved.length = 0;
      expect(columns(html(narrow(inner)))).toBe(2);
      expect(resolved.at(-1)?.size).toBeDefined();
      expect(columns(html(narrow(narrow(inner))))).toBe(3);
    });

    it('gives a panel narrower than its grid’s gaps the box CSS draws, never a negative width', () => {
      const nested: GridNode = {
        type: 'grid',
        panels: [
          { x: 0, y: 0, w: 1, h: 8, node: chart },
          { x: 1, y: 0, w: 12, h: 8, node: chart },
        ],
      };
      resolved.length = 0;
      html(narrow(nested));
      // The nested grid gets (928 − 47 × 8) × 12/48 + 11 × 8 = 226 px, under its 376 px of gaps.
      expect(resolved.map(({ size }) => size?.width)).toEqual([0, 11 * 8]);
    });

    it('stacks in one column when a host size leaves its panel under 768 px', () => {
      // (1200 − 47 × 8) × 12/48 + 11 × 8 = 294 px for the nested grid.
      const out = html(narrow(inner), { size: { width: 1200, height: 800 } });
      expect(columns(out)).toBe(1);
    });
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

  it('never gives a chart a negative height', () => {
    resolved.length = 0;
    html(
      {
        type: 'grid',
        panels: [
          {
            title: 'T',
            x: 0,
            y: 0,
            w: 48,
            h: 1,
            node: gridExamples[0]!.node.panels[0]!.node,
          },
        ],
      },
      { size: { width: 968, height: 400 } }
    );
    expect(resolved[0]?.size?.height).toBe(0);
  });

  it("keeps the host context's getters, private state included, for nested charts", () => {
    class HostContext {
      readonly environment = 'node';
      readonly #scheme = 'dark' as const;
      constructor(readonly size?: { width: number; height: number }) {}
      get scheme(): 'dark' {
        return this.#scheme;
      }
    }
    const draw = (context: HostContext) =>
      renderToStaticMarkup(
        createElement(
          'div',
          null,
          runtime.surfaces.react.render(view(gridExamples[0]!.node), {
            heading: false,
            context: context as ChartsRenderContext,
          })
        )
      );
    resolved.length = 0;
    draw(new HostContext());
    draw(new HostContext({ width: 968, height: 400 }));
    expect(resolved.length).toBeGreaterThan(1);
    expect(new Set(resolved.map(({ scheme }) => scheme))).toEqual(
      new Set(['dark'])
    );
    expect(resolved.at(-1)?.size).toBeDefined();
  });

  it('hands a nested node the host context as its own class, with stable methods', () => {
    class HostContext {
      readonly environment = 'node';
      readonly size = { width: 968, height: 400 };
      onEvent() {}
    }
    const seen: ChartsRenderContext[] = [];
    const probe = definePrimitive<{ type: 'probe' }>({
      type: 'probe',
      catalog: {
        type: 'probe',
        purpose: 'Records its context.',
        useWhen: [],
        avoidWhen: [],
        example: { type: 'probe' },
      },
      examples: [{ type: 'probe' }],
      schema: z.object({ type: z.literal('probe') }),
      renderers: {
        react: (_, { context }) => {
          seen.push(context);
          return null;
        },
        text: () => '',
        markdown: () => [],
      },
    });
    const probing = createIsomerRuntime<unknown, ChartsRenderContext>({
      packs: [
        chartsPack,
        definePrimitivePack({ id: 'probe', primitives: [probe] }),
      ],
    });
    const grid: GridNode = {
      type: 'grid',
      panels: [{ x: 0, y: 0, w: 24, h: 4, node: { type: 'probe' } }],
    };
    renderToStaticMarkup(
      createElement(
        'div',
        null,
        probing.surfaces.react.render(view(grid), {
          heading: false,
          context: new HostContext(),
        })
      )
    );
    const [nested] = seen;
    expect(nested).toBeInstanceOf(HostContext);
    expect(nested?.size?.width).toBeLessThan(968);
    expect(nested?.onEvent).toBe(nested?.onEvent);
  });

  it('sizes nested charts inside a frozen context that already has a size', () => {
    resolved.length = 0;
    const context: ChartsRenderContext = Object.freeze({
      environment: 'node',
      size: { width: 968, height: 400 },
    });
    renderToStaticMarkup(
      createElement(
        'div',
        null,
        runtime.surfaces.react.render(view(gridExamples[0]!.node), {
          heading: false,
          context,
        })
      )
    );
    expect(resolved[0]?.size?.width).toBeLessThan(968);
  });

  it('draws grid and panel descriptions as text on react, with or without a title', () => {
    const out = html({
      type: 'grid',
      description: 'About the board',
      panels: [
        {
          description: 'About the panel',
          x: 0,
          y: 0,
          w: 48,
          h: 4,
          node: note('P'),
        },
      ],
    });
    expect(out).toMatch(/<p [^>]*>About the board<\/p>/);
    expect(out).toMatch(/<p [^>]*>About the panel<\/p>/);
  });

  it('leaves a chart the box under its panel title and description', () => {
    resolved.length = 0;
    html(
      {
        type: 'grid',
        panels: [
          {
            title: 'T',
            description: 'D',
            x: 0,
            y: 0,
            w: 48,
            h: 4,
            node: gridExamples[0]!.node.panels[0]!.node,
          },
        ],
      },
      { size: { width: 968, height: 400 } }
    );
    // 4 rows × 20 + 3 gaps × 8 − header 24 − description 18.
    expect(resolved[0]?.size?.height).toBe(62);
  });

  it('clips a panel header to a panel too short for its title and description', () => {
    const out = html({
      type: 'grid',
      panels: [
        {
          title: 'T',
          description: 'D',
          x: 0,
          y: 0,
          w: 48,
          h: 1,
          node: note('P'),
        },
      ],
    });
    // One row unit is 20 px; the title and description lines take 24 + 18.
    expect(out).toContain(
      '<header class="chartsGrid-header" style="max-height:20px">'
    );
    expect(rule('chartsGrid-header')).toContain('overflow:hidden');
  });

  it('writes its description on text without a title', () => {
    const { title: _, ...untitled } = sectioned;
    const described: GridNode = { ...untitled, description: 'About the board' };
    const text = runtime.surfaces.text.render(view(described), {
      heading: false,
    });
    expect(text.startsWith('About the board\n\nLeft')).toBe(true);
  });

  it('counts its own headings as content when every panel is hidden from a surface', () => {
    const hidden = { ...note('X'), surfaces: ['react' as const] };
    const grid: GridNode = {
      type: 'grid',
      title: 'Board',
      panels: [{ x: 0, y: 0, w: 48, h: 2, node: hidden }],
    };
    const { warnings } = runtime.validate(view(grid));
    expect(warnings.filter(({ surface }) => surface === 'text')).toEqual([]);
    expect(runtime.surfaces.text.render(view(grid), { heading: false })).toBe(
      'Board'
    );
  });

  it('keeps an anchor for each collapsed panel, in children order, without drawing it', () => {
    const grid = chartsPack.primitives.find(({ type }) => type === 'grid')!;
    const paths = (
      grid.children as (node: GridNode) => readonly { path: string }[]
    )(sectioned).map(({ path }) => path);
    expect(paths).toEqual([
      'panels[2].node',
      'panels[0].node',
      'panels[1].node',
      'sections[1].panels[0].node',
      'sections[0].panels[0].node',
    ]);
    const out = html(sectioned, { anchors: true });
    expect(out.split(`${NODE_ANCHOR_ATTRIBUTE}="unsupported"`).length - 1).toBe(
      paths.length
    );
    expect(out).not.toContain('H reason');
  });

  it('anchors collapsed panels as the walk does: nested nodes in, nodes hidden from react out', () => {
    const inner: GridNode = {
      type: 'grid',
      panels: [{ x: 0, y: 0, w: 48, h: 2, node: note('N') }],
    };
    const grid: GridNode = {
      type: 'grid',
      panels: [{ x: 0, y: 0, w: 48, h: 2, node: note('V') }],
      sections: [
        {
          title: 'Closed',
          y: 2,
          collapsed: true,
          panels: [
            { x: 0, y: 0, w: 48, h: 2, node: inner },
            {
              x: 0,
              y: 2,
              w: 48,
              h: 2,
              node: { ...inner, surfaces: ['text'] },
            },
          ],
        },
      ],
    };
    const out = html(grid, { anchors: true });
    const count = (type: string) =>
      out.split(`${NODE_ANCHOR_ATTRIBUTE}="${type}"`).length - 1;
    // V, then the collapsed inner grid and its N; the grid hidden from react adds none.
    expect(count('unsupported')).toBe(2);
    expect(count('grid')).toBe(2);
    expect(out).not.toContain('N reason');
  });

  it('validates a collapsed panel as its own node', () => {
    const { node: metric } = primitiveExamples(
      chartsPack.primitives.find(({ type }) => type === 'metric')!
    )[0]!;
    const grid = (collapsedNode: PrimitiveNode): GridNode => ({
      type: 'grid',
      panels: [{ x: 0, y: 0, w: 48, h: 4, node: { ...metric, id: 'm' } }],
      sections: [
        {
          title: 'Closed',
          y: 4,
          collapsed: true,
          panels: [{ x: 0, y: 0, w: 48, h: 4, node: collapsedNode }],
        },
      ],
    });
    const validator = createIsomerRuntime({ packs: [chartsPack] });
    const [invalid] = validator.validate(
      view(grid({ ...metric, title: 42 } as unknown as PrimitiveNode))
    ).errors;
    expect(invalid?.nodeType).toBe('metric');
    const [duplicate] = validator.validate(
      view(grid({ ...metric, id: 'm' }))
    ).errors;
    expect(duplicate?.path).toBe('body[0].sections[0].panels[0].node.id');
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
    expect(json).toContain('Hourly request count.');
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

  it('keeps a chart hidden from snapshot as its Markdown on Slack', () => {
    const chart = gridExamples[0]!.node.panels[0]!.node;
    const { blocks, assets } = runtime.surfaces.slack.render(
      view({ ...chart, surfaces: ['text', 'markdown', 'slack'] }),
      { heading: false, collectAssets: true }
    );
    expect(assets).toEqual([]);
    expect(JSON.stringify(blocks)).toContain(metricSingleValueScene.summary);
  });

  it('writes the grid and panel descriptions on Slack', () => {
    const described: GridNode = {
      ...gridExamples[0]!.node,
      description: 'About the board',
    };
    const json = JSON.stringify(
      runtime.surfaces.slack.render(view(described), {
        heading: false,
        collectAssets: true,
      }).blocks
    );
    expect(json).toContain('About the board');
    expect(json).toContain('Hourly request count.');
  });

  it('estimates its snapshot height from its rows and sections', () => {
    // Title 24; top panels 6 rows: 6×20 + 5×8 = 160; open section: header 24
    // + 8 + 3 rows (3×20 + 2×8 = 76); closed section: header 24; 3 gaps × 16.
    expect(gridSnapshotHeight(sectioned)).toBe(
      24 + 160 + (24 + 8 + 76) + 24 + 3 * 16
    );
  });

  it('counts its description line in its snapshot height', () => {
    expect(
      gridSnapshotHeight({ ...sectioned, description: 'About the board' })
    ).toBe(gridSnapshotHeight(sectioned) + 18);
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

  const chosen = dataTableExamples.find(
    ({ name }) => name === 'Chosen columns, widths and pre-rendered values'
  )!.node;
  /** Every string a block list draws, in order. */
  const slackTexts = (blocks: readonly unknown[]): string[] => {
    const texts: string[] = [];
    JSON.stringify(blocks, (key, value: unknown) => {
      if (key === 'text' && typeof value === 'string') {
        texts.push(value);
      }
      return value;
    });
    return texts;
  };

  it('sends the description and notes to Slack after the summary', () => {
    const { blocks } = runtime.surfaces.slack.render(view(chosen), {
      heading: false,
    });
    const texts = slackTexts(blocks);
    const description = texts.indexOf(
      'The most requested URLs in the last 24 hours.'
    );
    expect(description).toBeGreaterThan(0);
    expect(texts.indexOf('Most requested')).toBeGreaterThan(description);
  });

  it('keeps a description longer than a Slack section, and every note after it', () => {
    const description = 'word '.repeat(1_000).trim();
    const long = { ...chosen, description };
    const { blocks } = runtime.surfaces.slack.render(view(long), {
      heading: false,
    });
    const texts = slackTexts(blocks);
    expect(texts.join('').replace(/\s/g, '')).toContain(
      description.replace(/\s/g, '')
    );
    expect(texts).toContain('Most requested');
  });
});
