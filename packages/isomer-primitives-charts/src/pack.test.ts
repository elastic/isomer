/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { ActionEventRef, Composition } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { chartsPack, chartsStylesheet, createChartsPack } from './pack';
import type {
  ChartNode,
  ChartsRenderContext,
  ReactSceneRenderer,
  ResolveSceneOptions,
} from './render/context';
import { sceneModule } from './render/scene_styles';
import { chartSize, chartSizeSpec } from './render/size';
import { CHARTS_THEME } from './render/theme';
import {
  metricSingleValueScene,
  xyInteractiveScene,
  xyTimeSeriesScene,
} from './scene/examples';
import { selectSceneRenderer } from './scene/select';
import type { Scene, SceneRenderEnv } from './scene/types';
import { dataTableTopHosts } from './schema/examples/data_table';
import { chartEventExamples } from './schema/examples/events';
import { metricSingleValue } from './schema/examples/metric';
import { xyInteractive, xyTimeSeries } from './schema/examples/xy_chart';
import type { XyChartNode } from './schema/xy_chart';

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
  const fluidPack = createChartsPack({
    resolveScene,
    sceneRenderers: [{ ...tagging('fluid', ['metric', 'xy']), fluid: true }],
  });

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

    it('gives each chart its spec as CSS in a browser when the renderer fills it, and resolves without a size', () => {
      resolved.length = 0;
      const html = draw(fluidPack, { environment: 'browser' });
      expect(sizes()).toEqual([]);
      const { size } = sceneModule.vars;
      expect(html).toContain(
        `class="chartsScene-sized" style="${size.aspectRatio.propName}:300 / 160;${size.maxWidth.propName}:300px"`
      );
      expect(html).toContain(
        `class="chartsScene-sized" style="${size.aspectRatio.propName}:16 / 9;${size.minHeight.propName}:300px"`
      );
      const [, rule] =
        /\.chartsScene-sized\{([^}]*)\}/.exec(chartsStylesheet()) ?? [];
      expect(rule).toContain(
        `width:100%;aspect-ratio:var(${size.aspectRatio.propName});min-height:var(${size.minHeight.propName});max-width:var(${size.maxWidth.propName})`
      );
    });

    it('leaves the box to a renderer that sizes itself, such as the summary fallback', () => {
      const html = renderToStaticMarkup(
        createElement(
          'div',
          null,
          createIsomerRuntime<unknown, ChartsRenderContext>({
            packs: [chartsPack],
          }).surfaces.react.render(composition, {
            context: { environment: 'browser' },
            heading: false,
          })
        )
      );
      expect(html).toContain('<p>');
      expect(html).not.toContain('aspect-ratio');
      expect(html).not.toContain('min-height');
    });

    it('resolves for the spec box in a browser too when the renderer draws a fixed size', () => {
      const sized: ReactSceneRenderer = {
        ...tagging('picture', ['metric', 'xy']),
        sized: true,
      };
      resolved.length = 0;
      const html = draw(
        createChartsPack({ resolveScene, sceneRenderers: [sized] }),
        {
          environment: 'browser',
        }
      );
      expect(sizes()).toEqual([
        chartSize(chartSizeSpec(metricSingleValueScene)!),
        chartSize(chartSizeSpec(xyTimeSeriesScene)!),
      ]);
      expect(html).not.toContain('aspect-ratio');
    });

    it('resolves a table for the theme width and its rows when the renderer draws a fixed size', () => {
      const seen: Scene[] = [];
      const sized: ReactSceneRenderer = {
        id: 'picture',
        environments: ['browser', 'node'],
        sized: true,
        supports: (kind) => kind === 'table',
        render: (scene) => {
          seen.push(scene);
          return null;
        },
      };
      const tables = createChartsPack({ sceneRenderers: [sized] });
      renderToStaticMarkup(
        createElement(
          'div',
          null,
          createIsomerRuntime<unknown, ChartsRenderContext>({
            packs: [tables],
          }).surfaces.react.render(
            { type: 'view', body: [dataTableTopHosts] },
            { context: { environment: 'browser' }, heading: false }
          )
        )
      );
      const height = (
        tables.primitives.find(({ type }) => type === 'dataTable')!.metrics
          ?.snapshotHeight as (node: ChartNode) => number
      )(dataTableTopHosts);
      expect(height).toBeGreaterThan(0);
      expect(seen.map(({ size }) => size)).toEqual([
        { width: CHARTS_THEME.chart.width, height },
      ]);
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
    const html = draw(fluidPack, { environment: 'browser', size });
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

describe("a Scene's link and emphasis notes", () => {
  const { link } = xyInteractiveScene.interactions;
  const [note] = xyInteractiveScene.interactions.emphasis;
  const seen: ChartNode[] = [];
  const sizes: (ResolveSceneOptions['size'] | undefined)[] = [];
  const resolveInteractive = (
    node: ChartNode,
    { scheme, size }: ResolveSceneOptions
  ): Scene => {
    seen.push(node);
    sizes.push(size);
    return { ...xyInteractiveScene, scheme };
  };
  const pack = createChartsPack({ resolveScene: resolveInteractive });
  const runtime = runtimeFor(pack);
  const interactive: Composition = { type: 'view', body: [xyInteractive] };
  const react = (
    drawing: ReturnType<typeof createChartsPack>,
    context: ChartsRenderContext
  ) =>
    renderToStaticMarkup(
      createElement(
        'div',
        null,
        runtimeFor(drawing).surfaces.react.render(interactive, {
          context,
          heading: false,
        })
      )
    );
  const links = (html: string) =>
    [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(
      ([, href, label]) => ({ href, label })
    );

  it('are written on text and Markdown around the table', () => {
    const text = runtime.surfaces.text.render(interactive, { heading: false });
    expect(
      text.startsWith(`${xyInteractiveScene.summary}\n${note?.note}\n\n`)
    ).toBe(true);
    expect(text.endsWith(`\n\n${link?.label}: ${link?.href}`)).toBe(true);
    const markdown = runtime.surfaces.markdown.render(interactive, {
      heading: false,
    });
    expect(markdown).toContain(`_${note?.note}_`);
    expect(markdown).toContain(`[${link?.label}](${link?.href})`);
  });

  it('are drawn by the fallback, with the link once below it', () => {
    const html = react(pack, { environment: 'node' });
    expect(html).toContain(`<em>${note?.note}</em>`);
    expect(links(html)).toEqual([link]);
  });

  it('draw the link once below any renderer', () => {
    const engine = createChartsPack({
      resolveScene: resolveInteractive,
      sceneRenderers: [tagging('engine', ['xy'])],
    });
    const html = react(engine, { environment: 'node' });
    expect(html).toContain('engine:xy:light');
    expect(links(html)).toEqual([link]);
    expect(html.indexOf('engine:xy')).toBeLessThan(html.indexOf('<a'));
  });

  it("draw the link outside a fluid chart's box in a browser", () => {
    const engine = createChartsPack({
      resolveScene: resolveInteractive,
      sceneRenderers: [
        { ...tagging('engine', ['xy'], ['browser']), fluid: true },
      ],
    });
    const html = react(engine, { environment: 'browser' });
    const [, anchor, box, after] =
      /^<div><div([^>]*)><div([^>]*)><output>[^<]*<\/output><\/div>(.*)<\/div><\/div>$/.exec(
        html
      ) ?? [];
    expect(anchor).not.toContain('chartsScene-sized');
    expect(box).toContain('class="chartsScene-sized"');
    expect(links(after ?? '')).toEqual([link]);
  });

  it('draw the link on one clipped line in the Scene’s text and background colors', () => {
    const chrome = {
      ...xyInteractiveScene.chrome,
      text: '#DFE5EF',
      background: '#0B1628',
    };
    const dark = createChartsPack({
      resolveScene: (node, options) => ({
        ...resolveInteractive(node, options),
        chrome,
      }),
    });
    const [, className, style] =
      /<a\b[^>]*class="([^"]*)"[^>]*style="([^"]*)"/.exec(
        react(dark, { environment: 'browser' })
      ) ?? [];
    const { chrome: ink } = sceneModule.vars;
    expect(style).toBe(
      `${ink.ink.propName}:${chrome.text};${ink.fill.propName}:${chrome.background}`
    );
    expect(className).toBe('chartsScene-link');
    const [, rule] =
      /\.chartsScene-link\{([^}]*)\}/.exec(chartsStylesheet()) ?? [];
    expect(rule).toContain(
      `color:var(${ink.ink.propName});background:var(${ink.fill.propName})`
    );
    expect(rule).toContain(`height:${CHARTS_THEME.chart.linkHeight}px`);
    expect(rule).toContain('overflow:hidden');
    expect(rule).toContain('white-space:nowrap');
    expect(rule).toContain('text-overflow:ellipsis');
  });

  it('leave the link its line inside a host size', () => {
    sizes.length = 0;
    const size = { width: 320, height: 200 };
    react(pack, { environment: 'browser', size });
    expect(sizes.at(-1)).toEqual({
      width: size.width,
      height: size.height - CHARTS_THEME.chart.linkHeight,
    });
  });

  it('add the link line to the snapshot height', () => {
    const snapshotHeight = pack.primitives.find(
      ({ type }) => type === 'xyChart'
    )!.metrics?.snapshotHeight as (node: ChartNode) => number;
    expect(snapshotHeight(xyInteractive)).toBe(
      chartSize(chartSizeSpec(xyInteractiveScene)!).height +
        CHARTS_THEME.chart.linkHeight
    );
  });

  // `react` skips validation, so its node may carry any href.
  it('lose an unsafe href before the resolver sees the node', () => {
    const node: XyChartNode = {
      ...xyInteractive,
      interactions: {
        ...xyInteractive.interactions!,
        link: { label: 'Open', href: 'javascript:alert(1)' },
      },
    };
    const unsafe: Composition = { type: 'view', body: [node] };
    seen.length = 0;
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        runtime.surfaces.react.render(unsafe, {
          context: { environment: 'node' },
          heading: false,
        })
      )
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.map(({ interactions }) => interactions?.link)).toEqual(
      seen.map(() => undefined)
    );
    expect(html).toContain(xyInteractiveScene.summary);
  });

  it('lose an unsafe href a resolver puts in the Scene, in the fallback', () => {
    const resolving = createChartsPack({
      resolveScene: () => ({
        ...xyInteractiveScene,
        interactions: {
          ...xyInteractiveScene.interactions,
          link: { label: 'Open', href: 'javascript:alert(1)' },
        },
      }),
    });
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        runtimeFor(resolving).surfaces.react.render(interactive, {
          context: { environment: 'node' },
          heading: false,
        })
      )
    );
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<a');
  });
});

describe('events', () => {
  const [example] = chartEventExamples;
  const raising: ReactSceneRenderer = {
    id: 'raising',
    environments: ['node'],
    supports: () => true,
    render: (_, env) => {
      env.onEvent?.(example!.event);
      return createElement('output', null, env.onEvent ? 'live' : 'static');
    },
  };
  const pack = createChartsPack({ resolveScene, sceneRenderers: [raising] });

  it("reach the host's onEvent as action events", () => {
    const received: ActionEventRef[] = [];
    const html = draw(pack, {
      environment: 'node',
      onEvent: (event) => received.push(event),
    });
    expect(html).toContain('<output>live</output>');
    expect(received[0]).toEqual({
      name: 'chart.select',
      context: example!.event,
    });
  });

  it("reach a host's onEvent method with its receiver", () => {
    class Host {
      readonly environment = 'node';
      readonly #received: ActionEventRef[] = [];
      onEvent(event: ActionEventRef) {
        this.#received.push(event);
      }
      get received() {
        return this.#received;
      }
    }
    const host = new Host();
    draw(pack, host);
    expect(host.received[0]?.name).toBe('chart.select');
  });

  it('are not offered without a host onEvent', () => {
    expect(draw(pack)).not.toContain('<output>live</output>');
  });
});

describe('with no renderer for the environment', () => {
  it('throws, naming the kind and the environment', () => {
    const pack = createChartsPack({ resolveScene });
    expect(() => draw(pack, { environment: 'native' })).toThrow(
      /no SceneRenderer draws "metric" Scenes on native/
    );
  });
});
