/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { createRuntimeConformanceHarness } from '@elastic/isomer-runtime/testing';
import { type Composition, type Frame } from '@elastic/isomer-sdk';
import {
  CONFORMANCE_FIXTURE_TITLE,
  primitiveConformanceRows,
  runPrimitiveInventoryConformance,
} from '@elastic/isomer-sdk/testing';
import { describe, expect, it } from 'vitest';

import {
  chartFrame,
  chartPrimitives,
  chartsPack,
  chartsStyleAdapter,
  chartsThemes,
  metricContrast,
  metricExamples,
  type MetricTrendNode,
  metricTrendPrimitive,
} from './index';

const runtime = createIsomerRuntime({
  packs: [chartsPack],
  frames: { chart: chartFrame },
});
const composition: Composition = {
  type: 'view',
  title: 'Metric conformance',
  body: [metricExamples[0]!],
};
const harness = createRuntimeConformanceHarness(runtime, {
  sizesFromNodeHeights: false,
  wrapComposition: (node) => ({
    type: 'view',
    title: CONFORMANCE_FIXTURE_TITLE,
    body: [node],
  }),
  estimateSnapshotHeight: () => 0,
});

describe('metric inventory and surface conformance', () => {
  it('passes inventory conformance', () =>
    runPrimitiveInventoryConformance(chartPrimitives));
  it.each(primitiveConformanceRows(chartPrimitives))(
    '$type #$exampleIndex: $name',
    async (row) => row.run(row, harness)
  );
  it('uses the same parsed composition and catalog on every surface', () => {
    expect(runtime.validate(composition).valid).toBe(true);
    expect(runtime.parse(composition).valid).toBe(true);
    expect(runtime.getCapabilities().primitives).toContain('metricTrend');
    expect(JSON.stringify(runtime.getAuthoringContext())).toContain(
      'Secondary comparisons require numeric readings'
    );
  });
  it('keeps content, explicit gaps, status and action meaning across text, Markdown and Slack fallback', () => {
    const text = runtime.surfaces.text.render(composition);
    const markdown = runtime.surfaces.markdown.render(composition);
    const slack = runtime.surfaces.slack.render(composition);
    expect(text).toContain('+10 (+10.00%)');
    expect(markdown).toContain('gap');
    expect(slack.text).toContain('Yesterday');
    expect(slack.assets).toHaveLength(0);
    expect(JSON.stringify(slack.blocks)).toContain('Inspect requests');
  });
  it('collects styles before markup, isolates collectors and preserves the snapshot React tree', () => {
    const light = runtime.surfaces.html.render(composition, {
      theme: 'light',
      anchors: true,
    });
    const dark = runtime.surfaces.html.render(composition, { theme: 'dark' });
    const snapshot = runtime.surfaces.snapshot.render(composition, {
      theme: 'dark',
    });
    expect(light.css).toContain('.isomer-metric');
    expect(light.body).toContain('data-isomer-node');
    expect(dark.body).toContain(chartsThemes.dark.background);
    expect(snapshot.html).toContain('View trend data');
    expect(snapshot.html).toContain(chartsThemes.dark.background);
    expect(snapshot.heightMode).toBe('content');
    const empty = chartsStyleAdapter.createCollector({});
    expect(chartsStyleAdapter.renderStyles(empty, {})).toBe('');
    expect(
      renderToStaticMarkup(runtime.surfaces.react.render(composition))
    ).toContain('Read metric summary');
  });
  it('refuses a mismatched collector rather than losing CSS', () => {
    expect(() =>
      createIsomerRuntime({
        packs: [chartsPack],
        styleAdapter: {
          styleCollector: 'foreign',
          createCollector: () => ({}),
          createRenderContext: () => ({}),
          renderStyles: () => '',
        },
      })
    ).toThrow(/collector/i);
  });
  it('keeps validation posture: React is nonvalidating; outbound Slack throws on semantic errors', () => {
    const invalidNode = {
      ...metricExamples[0]!,
      tiles: [{ ...metricExamples[0]!.tiles[0]!, progress: { max: 0 } }],
    };
    const invalid: Composition = { type: 'view', body: [invalidNode] };
    expect(runtime.validate(invalid).valid).toBe(false);
    expect(() => runtime.surfaces.slack.render(invalid)).toThrow();
    expect(
      runtime.surfaces.html.render(invalid).validationErrors.length
    ).toBeGreaterThan(0);
    expect(runtime.surfaces.react.validating).toBe(false);
  });
  it('rejects a foreign frame palette at the consumer type boundary', () => {
    const foreign: Frame<{ ink: string }> = {
      defaultWidth: 100,
      theme: { light: { ink: '#000' }, dark: { ink: '#fff' } },
      estimateHeight: () => 100,
      wrap: () => null,
    };
    // @ts-expect-error All frames in a charts runtime must supply ChartsTheme.
    createIsomerRuntime({ packs: [chartsPack], frames: { foreign } });
    expect(metricTrendPrimitive.type).toBe('metricTrend');
  });
  it('derives readable foregrounds without silently accepting malformed theme colors', () => {
    expect(metricContrast('#006bb4')).toBe('#ffffff');
    expect(metricContrast('#54b1ff')).toBe('#000000');
    expect(() => metricContrast('var(--accent)')).toThrow(/six-digit hex/);
  });
  it('draws isolated timestamp samples and inherits their locale in the accessible table', () => {
    const node: MetricTrendNode = {
      type: 'metricTrend',
      title: 'Isolated samples',
      locale: 'de-DE',
      tiles: [
        {
          key: 'samples',
          primary: { label: 'Value', value: 0 },
          trend: {
            timeZone: 'UTC',
            primary: [
              { time: 0, value: 1234.5 },
              { time: 1, value: null },
              { time: 2, value: 2000 },
            ],
          },
        },
      ],
    };
    const html = runtime.surfaces.html.render({
      type: 'view',
      body: [node],
    }).html;
    expect(html.match(/<circle /g)).toHaveLength(2);
    expect(html).toContain('1.234,5');
    expect(html).toContain('gap');
  });
});
