/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { createChartsPack } from './pack';
import type {
  ChartNode,
  ChartsRenderContext,
  ReactSceneRenderer,
  ResolveSceneOptions,
} from './render/context';
import { chartSize, chartSizeSpec } from './render/size';
import { metricSingleValueScene, xyTimeSeriesScene } from './scene/examples';
import { selectSceneRenderer } from './scene/select';
import type { Scene, SceneRenderEnv } from './scene/types';
import { metricSingleValue } from './schema/examples/metric';
import { xyTimeSeries } from './schema/examples/xy_chart';

// The resolver does not exist yet: resolve the two examples that have
// hand-written Scenes, and record what each call was asked for.
const resolved: ResolveSceneOptions[] = [];
const resolveScene = (node: ChartNode, options: ResolveSceneOptions): Scene => {
  resolved.push(options);
  if (node.type === 'metric' && node.title === metricSingleValue.title) {
    return { ...metricSingleValueScene, scheme: options.scheme };
  }
  if (node.type === 'xyChart' && node.title === xyTimeSeries.title) {
    return { ...xyTimeSeriesScene, scheme: options.scheme };
  }
  throw new Error(`no Scene for ${node.type}`);
};

const envs: SceneRenderEnv[] = [];
const tagging = (
  id: string,
  supported: Scene['kind'][],
  environments: ReactSceneRenderer['environments'] = ['browser', 'node']
): ReactSceneRenderer => ({
  id,
  environments,
  supports: (kind) => supported.includes(kind),
  render: (scene, env) => {
    envs.push(env);
    return createElement('output', null, `${id}:${scene.kind}:${scene.scheme}`);
  },
});

const composition: Composition = Object.freeze({
  type: 'view',
  body: [{ ...metricSingleValue, id: 'requests' }, xyTimeSeries],
});

const runtimeFor = (pack: ReturnType<typeof createChartsPack>) =>
  createIsomerRuntime<unknown, ChartsRenderContext>({ packs: [pack] });

const draw = (
  pack: ReturnType<typeof createChartsPack>,
  context: ChartsRenderContext = { environment: 'node' }
) =>
  renderToStaticMarkup(
    createElement(
      'div',
      null,
      runtimeFor(pack).surfaces.react.render(composition, {
        context,
        heading: false,
      })
    )
  );

describe('selectSceneRenderer', () => {
  const metricOnly = tagging('metric-only', ['metric']);
  const everything = tagging('everything', ['metric', 'xy']);
  const nativeOnly = tagging('native', ['metric', 'xy'], ['native']);

  it('picks the first renderer that supports the kind', () => {
    expect(
      selectSceneRenderer([metricOnly, everything], 'metric', 'node')?.id
    ).toBe('metric-only');
    expect(
      selectSceneRenderer([metricOnly, everything], 'xy', 'node')?.id
    ).toBe('everything');
  });

  it('skips a renderer that does not run in the environment', () => {
    expect(
      selectSceneRenderer([nativeOnly, everything], 'xy', 'browser')?.id
    ).toBe('everything');
    expect(
      selectSceneRenderer([everything, nativeOnly], 'xy', 'native')?.id
    ).toBe('native');
  });

  it('finds nothing when no renderer fits', () => {
    expect(selectSceneRenderer([metricOnly], 'xy', 'node')).toBeUndefined();
  });
});

describe('the charts pack', () => {
  const baseline = tagging('baseline', ['metric', 'xy']);
  const pack = createChartsPack({ resolveScene, sceneRenderers: [baseline] });

  it('draws every kind with the pack renderers when the host names none', () => {
    const html = draw(pack);
    expect(html).toContain('<output>baseline:metric:light</output>');
    expect(html).toContain('<output>baseline:xy:light</output>');
  });

  it('lets a test renderer registered first replace the baseline for one kind', () => {
    const before = JSON.stringify(composition);
    const html = draw(pack, {
      environment: 'node',
      sceneRenderers: [tagging('test', ['metric'])],
    });
    expect(html).toContain('<output>test:metric:light</output>');
    expect(html).not.toContain('baseline:metric');
    expect(html).toContain('<output>baseline:xy:light</output>');
    expect(JSON.stringify(composition)).toBe(before);
  });

  it('ignores a preferred renderer that does not run in this environment', () => {
    const html = draw(pack, {
      environment: 'node',
      sceneRenderers: [tagging('native', ['metric', 'xy'], ['native'])],
    });
    expect(html).not.toContain('native:');
    expect(html).toContain('<output>baseline:metric:light</output>');
  });

  it('takes the preference from the pack, for surfaces without host context', () => {
    const preferring = createChartsPack({
      resolveScene,
      sceneRenderers: [tagging('engine', ['xy']), baseline],
    });
    const html = draw(preferring);
    expect(html).toContain('<output>baseline:metric:light</output>');
    expect(html).toContain('<output>engine:xy:light</output>');
  });

  it('falls back to the summary when nothing else supports the kind', () => {
    const bare = createChartsPack({ resolveScene });
    const html = draw(bare);
    expect(html).toContain(`<p>${metricSingleValueScene.summary}</p>`);
  });

  it('resolves for the scheme, locale, time zone and size the host gives', () => {
    resolved.length = 0;
    const html = draw(pack, {
      environment: 'node',
      scheme: 'dark',
      locale: 'de-DE',
      timeZone: 'Europe/Berlin',
      size: { width: 320, height: 200 },
    });
    expect(html).toContain('baseline:metric:dark');
    expect(resolved[0]).toEqual({
      scheme: 'dark',
      locale: 'de-DE',
      timeZone: 'Europe/Berlin',
      size: { width: 320, height: 200 },
    });
  });

  describe('without a host size', () => {
    const sizes = () =>
      resolved.flatMap(({ size }) => (size === undefined ? [] : [size]));

    it('resolves each chart on Node for its size spec at the theme width', () => {
      resolved.length = 0;
      draw(pack);
      expect(sizes()).toEqual([
        chartSize(chartSizeSpec(metricSingleValueScene)!),
        chartSize(chartSizeSpec(xyTimeSeriesScene)!),
      ]);
    });

    it('gives each chart its spec as CSS in a browser, and resolves without a size', () => {
      resolved.length = 0;
      const html = draw(pack, { environment: 'browser' });
      expect(sizes()).toEqual([]);
      expect(html).toContain('aspect-ratio:300 / 160;max-width:300px');
      expect(html).toContain('aspect-ratio:16 / 9;min-height:300px');
    });

    it('reports the spec box height to snapshot frames', () => {
      const heightOf = (type: string, node: ChartNode) =>
        (
          pack.primitives.find((definition) => definition.type === type)!
            .metrics?.snapshotHeight as (node: ChartNode) => number
        )(node);
      expect(heightOf('metric', metricSingleValue)).toBe(
        chartSize(chartSizeSpec(metricSingleValueScene)!).height
      );
      expect(heightOf('xyChart', xyTimeSeries)).toBe(
        chartSize(chartSizeSpec(xyTimeSeriesScene)!).height
      );
    });
  });

  it('uses the host size over any size spec', () => {
    resolved.length = 0;
    const size = { width: 320, height: 200 };
    const html = draw(pack, { environment: 'browser', size });
    expect(resolved.map((options) => options.size)).toEqual([size, size]);
    expect(html).not.toContain('aspect-ratio');
  });

  it('tells the renderer where it draws and which node it is', () => {
    envs.length = 0;
    draw(pack, { environment: 'browser' });
    expect(envs).toEqual([
      { environment: 'browser', nodeId: 'requests' },
      { environment: 'browser' },
    ]);
  });

  it('writes text from the Scene: summary, then table', () => {
    const runtime = runtimeFor(pack);
    expect(
      runtime.surfaces.text.render(
        { type: 'view', body: [metricSingleValue] },
        { heading: false }
      )
    ).toBe('Requests: Count of records is 14,074.\n\nCount of records\n14,074');
  });

  it('sends charts to Slack as pictures with their text as alt text', () => {
    const runtime = runtimeFor(pack);
    const { blocks, assets } = runtime.surfaces.slack.render(composition, {
      heading: false,
      collectAssets: true,
    });
    const text = runtime.surfaces.text.renderNode(xyTimeSeries);
    expect(assets.map(({ node }) => node.type)).toEqual(['metric', 'xyChart']);
    const images = blocks.filter(
      (block) => (block as { type: string }).type === 'image'
    );
    expect(images).toHaveLength(2);
    expect(images[1]).toMatchObject({ alt_text: text });
    expect(text).toContain(xyTimeSeriesScene.summary);
    expect(text).toContain('05:00 | 164');
  });

  it('degrades charts to their Markdown on Slack without asset collection', () => {
    const runtime = runtimeFor(pack);
    const { blocks, assets } = runtime.surfaces.slack.render(composition, {
      heading: false,
    });
    expect(assets).toEqual([]);
    expect(JSON.stringify(blocks)).toContain(xyTimeSeriesScene.summary);
    expect(JSON.stringify(blocks)).not.toContain('"image"');
  });
});
