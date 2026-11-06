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

  it('falls back to isomer-svg when nothing else supports the kind', () => {
    const bare = createChartsPack({ resolveScene });
    const html = draw(bare);
    expect(html).toContain(
      `<svg width="240" height="160" viewBox="0 0 240 160" role="img" aria-label="${metricSingleValueScene.summary}"`
    );
    expect(html).toContain(`aria-label="${xyTimeSeriesScene.summary}"`);
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

  it('tells the renderer where it draws and which node it is', () => {
    envs.length = 0;
    draw(pack, { environment: 'browser' });
    expect(envs).toEqual([
      { environment: 'browser', nodeId: 'requests' },
      { environment: 'browser' },
    ]);
  });

  it('gives text and Markdown the Scene summary', () => {
    const runtime = runtimeFor(pack);
    expect(runtime.surfaces.text.render(composition, { heading: false })).toBe(
      `${metricSingleValueScene.summary}\n\n${xyTimeSeriesScene.summary}`
    );
  });
});
