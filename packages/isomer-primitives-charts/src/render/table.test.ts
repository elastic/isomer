/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { chartsPack, chartsStylesheet, createChartsPack } from '../pack';
import { resolveChart } from '../scene/resolve';
import type { ColorScheme, TableScene } from '../scene/types';
import type { DataTableNode } from '../schema/data_table';
import { dataTableExamples } from '../schema/examples/data_table';

import type { ReactSceneRenderer } from './context';
import { tableHeight, TableView } from './table';
import { tableModule } from './table_styles';
import { CHARTS_THEME } from './theme';

const tableOf = (
  node: DataTableNode,
  scheme: ColorScheme = 'light'
): TableScene => resolveChart(node, { scheme });

const markup = (scene: TableScene) =>
  renderToStaticMarkup(createElement(TableView, { scene }));

/** `text` as React writes it into markup. */
const escaped = (text: string) =>
  renderToStaticMarkup(createElement(Fragment, null, text));

const example = (name: string) =>
  dataTableExamples.find((entry) => entry.name === name)!.node;

const { titleHeight, lineHeight } = CHARTS_THEME.table;

const { vars } = tableModule;

/** `ref` set to `value` in an element's `style`. */
const sets = (ref: { readonly propName: string }, value: string) =>
  `${ref.propName}:${value}`;

/** The declarations of the stylesheet's rule for `className`. */
const rule = (className: string) =>
  new RegExp(`\\.${className}\\{([^}]*)\\}`).exec(chartsStylesheet())?.[1];

const CHOSEN = 'Chosen columns, widths and pre-rendered values';

const firstPage = (scene: TableScene) =>
  scene.paging ? scene.order.slice(0, scene.paging.pageSize) : scene.order;

const cases = dataTableExamples.flatMap(({ name, node }) =>
  (['light', 'dark'] as const).map((scheme) => ({
    name,
    scheme,
    scene: tableOf(node, scheme),
  }))
);

describe('TableView', () => {
  it.each(cases)(
    '$name ($scheme) draws every string its first page shows',
    ({ scene }) => {
      const html = markup(scene);
      const strings = [
        ...scene.columns.map(({ label }) => label),
        ...firstPage(scene).flatMap((position) =>
          scene.rows[position]!.cells.map(({ text }) => text)
        ),
        ...scene.columns.flatMap(({ footer }) => (footer ? [footer] : [])),
        ...(scene.paging
          ? [scene.paging.rowsPerPage, ...scene.paging.pageLabels]
          : []),
        ...(scene.rows.length === 0 ? [scene.emptyText] : []),
      ];
      for (const text of strings) {
        expect(html).toContain(escaped(text));
      }
    }
  );

  it.each(cases)(
    '$name ($scheme) draws rows in the starting order',
    ({ scene }) => {
      const drawn = [...markup(scene).matchAll(/<tr data-row="(\d+)"/g)].map(
        ([, row]) => Number(row)
      );
      expect(drawn).toEqual(
        firstPage(scene).map((position) => scene.rows[position]!.row)
      );
    }
  );

  it.each(cases)('$name ($scheme) uses the Scene colors', ({ scene }) => {
    const html = markup(scene);
    expect(html).toContain(sets(vars.shade.fill, scene.headerBackground));
    expect(html).toContain(sets(vars.box.fill, scene.chrome.background));
    expect(html).toContain(sets(vars.box.ink, scene.chrome.text));
    expect(html).toContain(sets(vars.rule.color, scene.chrome.gridLine));
    for (const position of firstPage(scene)) {
      for (const cell of scene.rows[position]!.cells) {
        expect(html).toContain(sets(vars.ink.color, cell.color));
        for (const [ref, color] of [
          [vars.cell.fill, cell.background],
          [vars.badge.fill, cell.badge],
          [vars.bar.fill, cell.bar?.color],
          [vars.bar.track, cell.bar?.track],
        ] as const) {
          if (color) {
            expect(html).toContain(sets(ref, color));
          }
        }
      }
    }
  });

  it('reads each value a Scene sets in the property it draws', () => {
    const reads = (
      className: string,
      property: string,
      ref: { propName: string }
    ) => expect(rule(className)).toContain(`${property}:var(${ref.propName})`);
    reads('chartsTable-root', 'width', vars.box.width);
    reads('chartsTable-root', 'height', vars.box.height);
    reads('chartsTable-root', 'color', vars.box.ink);
    reads('chartsTable-root', 'background', vars.box.fill);
    reads('chartsTable-column', 'width', vars.column.width);
    reads('chartsTable-shaded', 'background', vars.shade.fill);
    reads('chartsTable-ink', 'color', vars.ink.color);
    reads('chartsTable-filled', 'background', vars.cell.fill);
    reads('chartsTable-bar', 'background', vars.bar.track);
    reads('chartsTable-barFill', 'left', vars.bar.from);
    reads('chartsTable-barFill', 'width', vars.bar.span);
    reads('chartsTable-barFill', 'background', vars.bar.fill);
    reads('chartsTable-badge', 'background', vars.badge.fill);
    expect(rule('chartsTable-barValue')).toContain(
      `flex:0 0 var(${vars.gutter.basis.propName})`
    );
    expect(rule('chartsTable-ruled')).toContain(
      `border-bottom:${CHARTS_THEME.table.lineWidth}px solid var(${vars.rule.color.propName})`
    );
  });

  it('marks missing and blank cells', () => {
    const html = markup(tableOf(example('Missing, blank and empty')));
    expect(html).toContain('data-empty="missing"');
    expect(html).toContain('data-empty="blank"');
  });

  it('draws the empty message across every column when there are no rows', () => {
    const scene = tableOf(example('No rows'));
    const span = markup(scene).match(/<td colspan="(\d+)"[^>]*>([^<]*)</i);
    expect(span?.[1]).toBe(String(scene.columns.length));
    expect(span?.[2]).toBe(escaped(scene.emptyText));
  });

  it('is its title, header, first page, footer and pager tall without a size', () => {
    const scene = tableOf(example('Paged with a summary row'));
    const { rowHeight } = CHARTS_THEME.table.density[scene.density];
    expect(scene.paging).toBeDefined();
    expect(scene.columns.some(({ footer }) => footer)).toBe(true);
    expect(tableHeight(scene)).toBe(
      titleHeight + (1 + scene.paging!.pageSize + 1 + 1) * rowHeight
    );
  });

  it('counts the description and notes in its height', () => {
    const scene = tableOf(example(CHOSEN));
    const { rowHeight } = CHARTS_THEME.table.density[scene.density];
    expect(tableHeight(scene)).toBe(
      titleHeight + 2 * lineHeight + (1 + scene.rows.length) * rowHeight
    );
  });

  it('draws only the rows that fit a given size', () => {
    const scene = tableOf(example('Top hosts'));
    const { rowHeight } = CHARTS_THEME.table.density[scene.density];
    const height = titleHeight + 3 * rowHeight;
    const sized = { ...scene, size: { width: 300, height } };
    expect(tableHeight(sized)).toBe(height);
    expect(markup(sized).match(/<tr data-row=/g)).toHaveLength(2);
  });

  it('draws the title, description and notes', () => {
    const scene = tableOf(example(CHOSEN));
    const html = markup(scene);
    for (const part of ['title', 'description', 'note']) {
      expect(html).toContain(`data-part="${part}"`);
    }
    for (const text of [scene.title, scene.description, 'Most requested']) {
      expect(html).toMatch(
        new RegExp(`>${escaped(text!).replace(/[[\]]/g, '\\$&')}<`)
      );
    }
  });

  it.each(Object.entries(CHARTS_THEME.table.density))(
    'lays out %s rows with its density class',
    (density, { rowHeight, padding, font }) => {
      const scene = {
        ...tableOf(example(CHOSEN)),
        density: density as TableScene['density'],
      };
      const html = markup(scene);
      expect(html).toContain(`chartsTable-font-${density}`);
      expect(html).toContain(`chartsTable-row-${density}`);
      expect(chartsStylesheet()).toContain(
        `.chartsTable-row-${density}{height:${rowHeight}px;padding:0 ${padding}px}`
      );
      expect(chartsStylesheet()).toContain(
        `.chartsTable-font-${density}{font-size:${font}px}`
      );
    }
  );

  it('leaves the link to the chart shim, which draws it below every renderer', () => {
    const scene = tableOf(example(CHOSEN));
    expect(scene.interactions.link).toBeDefined();
    expect(markup(scene)).not.toContain('<a ');
  });

  it('fills emphasized rows with the Scene’s emphasis color', () => {
    const scene = tableOf(example(CHOSEN), 'dark');
    expect(markup(scene)).toMatch(
      new RegExp(
        `<tr data-row="0" data-emphasis="Most requested" class="chartsTable-ruled chartsTable-shaded" style="[^"]*${vars.shade.fill.propName}:${scene.emphasisBackground}`
      )
    );
  });

  it('heads each row with its row header cell', () => {
    const scene = tableOf(example('Top hosts'));
    const html = markup(scene);
    const headers = [
      ...html.matchAll(
        /<th scope="row" data-row="(\d+)" data-column="([^"]+)"/g
      ),
    ];
    expect(headers.map(([, , id]) => id)).toEqual(
      scene.rows.map(() => scene.rowHeader)
    );
    expect(html).not.toMatch(
      new RegExp(`<td[^>]*data-column="${scene.rowHeader}"`)
    );
  });

  it('sizes bar labels for a page longer than a call takes arguments', () => {
    const one = tableOf({
      type: 'dataTable',
      data: {
        columns: [{ id: 'n', label: 'n', type: 'number', role: 'metric' }],
        rows: [[1]],
      },
      columns: [{ column: 'n', decoration: { kind: 'bar' } }],
    });
    // Copies of one resolved row, so the test times the view, not the resolver.
    const rows = Array.from({ length: 250_000 }, (_, row) => ({
      ...one.rows[0]!,
      row,
    }));
    const scene = { ...one, rows, order: rows.map((_, position) => position) };
    expect(() => TableView({ scene })).not.toThrow();
  }, 30_000);
});

describe('dataTable in the charts pack', () => {
  const view = (node: PrimitiveNode): Composition => ({
    type: 'view',
    body: [node],
  });
  const react = (pack = chartsPack, node = example('Top hosts')) =>
    renderToStaticMarkup(
      createElement(
        'div',
        null,
        createIsomerRuntime({ packs: [pack] }).surfaces.react.render(
          view(node),
          { heading: false }
        )
      )
    );

  it('draws a table with no engine registered', () => {
    expect(react()).toContain('<table');
  });

  it("styles the table through the pack's adapter, emitting the rules it draws", () => {
    const { body, css } = createIsomerRuntime({
      packs: [chartsPack],
    }).surfaces.html.render(view(example('Top hosts')));
    expect(body).toContain('class="chartsTable-table"');
    expect(css).toContain('.chartsTable-table{');
    expect(css).toContain('table-layout:fixed');
    expect(css).not.toContain('chartsTable-pager');
  });

  it('gives snapshot the height the table draws at', () => {
    const node = example('Paged with a summary row');
    const table = chartsPack.primitives.find(
      ({ type }) => type === 'dataTable'
    )!;
    const snapshotHeight = table.metrics?.snapshotHeight as
      ((node: DataTableNode) => number) | undefined;
    expect(snapshotHeight?.(node)).toBe(tableHeight(tableOf(node)));
    const linked: DataTableNode = {
      ...node,
      interactions: {
        ...node.interactions,
        link: { label: 'Open in Discover', href: 'https://example.com' },
      },
    };
    expect(snapshotHeight?.(linked)).toBe(
      tableHeight(tableOf(linked)) + CHARTS_THEME.chart.linkHeight
    );
  });

  it('lets a pack engine that draws tables replace it', () => {
    const engine: ReactSceneRenderer = {
      id: 'host-table',
      environments: ['browser', 'node'],
      supports: (kind) => kind === 'table',
      render: () => createElement('output', null, 'host table'),
    };
    const html = react(createChartsPack({ sceneRenderers: [engine] }));
    expect(html).toContain('<output>host table</output>');
    expect(html).not.toContain('<table');
  });
});
