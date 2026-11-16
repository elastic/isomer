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
  primitiveExamples,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { chartsFrame } from '../frame';
import { createChartsPack } from '../pack';
import { resolveChart } from '../scene/resolve';
import { SCENE_KINDS } from '../scene/types';

import type { ChartNode, ReactSceneRenderer } from './context';
import { createSceneCache } from './scene_cache';

// Nodes by content: a sanitized copy of a node is the same chart.
const resolves: { node: string; options: string }[] = [];
const draws: unknown[] = [];

/** A picture renderer, as the headless engine is, that counts its draws. */
const counting: ReactSceneRenderer = {
  id: 'counting',
  environments: ['node', 'browser'],
  sized: true,
  supports: (kind) => SCENE_KINDS.includes(kind),
  render: (scene) => {
    draws.push(scene);
    return createElement('svg', {
      width: scene.size?.width,
      height: scene.size?.height,
      'data-kind': scene.kind,
    });
  },
};

const pack = createChartsPack({
  resolveScene: (node, options) => {
    resolves.push({
      node: JSON.stringify(node),
      options: JSON.stringify(options),
    });
    return resolveChart(node, options);
  },
  sceneRenderers: [counting],
});
const runtime = createIsomerRuntime({
  packs: [pack],
  frames: { charts: chartsFrame },
});

const view = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [node],
});

const examples = pack.primitives.flatMap((definition) =>
  primitiveExamples(definition).map(({ name, node }) => ({
    label: `${definition.type} ${name ?? '(unnamed)'}`,
    composition: view(node),
  }))
);

/** Draws `node` on the `react` surface, as a host's React render does. */
const drawReact = (
  node: PrimitiveNode,
  context: {
    environment: 'node';
    onEvent?: () => void;
    resolveClassName?: () => string;
  }
) =>
  renderToStaticMarkup(
    createElement(() => runtime.surfaces.react.renderNode(node, { context }))
  );

const reset = () => {
  resolves.length = 0;
  draws.length = 0;
};

/** The resolves that repeat a node and options an earlier one already resolved. */
const repeated = () => {
  const seen = new Map<string, Set<string>>();
  return resolves.filter(({ node, options }) => {
    const done = seen.get(node) ?? new Set<string>();
    seen.set(node, done);
    const again = done.has(options);
    done.add(options);
    return again;
  });
};

describe('scene cache', () => {
  it.each(examples)(
    'resolves each chart once per options and draws it once per snapshot render: $label',
    ({ composition }) => {
      for (const theme of ['light', 'dark'] as const) {
        reset();
        runtime.surfaces.snapshot.render(composition, { theme });
        expect(repeated()).toEqual([]);
        // Every Scene a render resolved at its drawn size is drawn once.
        expect(draws).toHaveLength(new Set(draws).size);
        // A light render reuses its height estimate's Scene: two resolves
        // (the unsized Scene and the drawn one) per chart.
        if (theme === 'light') {
          const nodes = new Set(resolves.map(({ node }) => node));
          expect(resolves.length).toBeLessThanOrEqual(nodes.size * 2);
        }
      }
    }
  );

  it('draws once per chart in an xyChart, metric and partitionChart snapshot', () => {
    for (const type of ['xyChart', 'metric', 'partitionChart', 'dataTable']) {
      const { composition } = examples.find(({ label }) =>
        label.startsWith(`${type} `)
      )!;
      reset();
      runtime.surfaces.snapshot.render(composition);
      expect(draws).toHaveLength(1);
      expect(resolves.length).toBeLessThanOrEqual(2);
    }
  });

  it('draws once per chart wherever the render context is wrapped in a view', () => {
    const { composition } = examples.find(({ label }) =>
      label.startsWith('xyChart ')
    )!;
    const composed = createIsomerRuntime({
      packs: [
        pack,
        definePrimitivePack({
          id: 'styled',
          primitives: [
            definePrimitive({
              type: 'styledNote',
              schema: z.object({ type: z.literal('styledNote') }),
              catalog: {
                type: 'styledNote',
                purpose: 'A note.',
                useWhen: [],
                avoidWhen: [],
                example: { type: 'styledNote' },
              },
              examples: [{ type: 'styledNote' }],
              renderers: {
                react: () => null,
                text: () => '',
                markdown: () => [],
              },
            }),
          ],
          styleAdapter: {
            createCollector: () => ({}),
            createRenderContext: () => ({ resolveClassName: () => '' }),
            renderStyles: () => '',
          },
        }),
      ],
      frames: { charts: chartsFrame },
    });
    for (const render of [
      () => runtime.surfaces.html.render(composition),
      () => runtime.surfaces.snapshot.render(composition, { anchors: true }),
      () => composed.surfaces.html.render(composition),
      () => composed.surfaces.snapshot.render(composition),
    ]) {
      reset();
      render();
      expect(draws).toHaveLength(1);
    }
  });

  it.each([
    ['a safe link', 'https://kibana.example.com/app/lens'],
    ['a link the sanitizer trims', ' https://kibana.example.com/app/lens '],
  ])('resolves a chart with %s once per pass it shares', (_, href) => {
    const { composition } = examples.find(({ label }) =>
      label.startsWith('xyChart ')
    )!;
    const node = {
      ...composition.body[0]!,
      interactions: { link: { href, label: 'Open' } },
    } as PrimitiveNode;
    reset();
    runtime.surfaces.snapshot.render(view(node));
    expect(repeated()).toEqual([]);
    expect(draws).toHaveLength(1);
    // The height estimate reads the node as given; a trimmed link's render
    // passes share its sanitized copy, which resolves apart.
    expect(resolves).toHaveLength(href === href.trim() ? 2 : 3);
  });

  it('holds nothing past the task a render runs in', async () => {
    const node = examples.find(({ label }) => label.startsWith('xyChart '))!
      .composition.body[0]!;
    const context = { environment: 'node' as const };
    reset();
    drawReact(node, context);
    drawReact(node, context);
    expect(draws).toHaveLength(1);
    await Promise.resolve();
    drawReact(node, context);
    expect(draws).toHaveLength(2);
  });

  it('draws afresh for another event handler', () => {
    const node = examples.find(({ label }) => label.startsWith('xyChart '))!
      .composition.body[0]!;
    reset();
    drawReact(node, { environment: 'node', onEvent: () => undefined });
    drawReact(node, { environment: 'node', onEvent: () => undefined });
    expect(draws).toHaveLength(2);
    expect(repeated()).toEqual([]);
  });

  it('resolves a changed node afresh within one task', () => {
    const node = structuredClone(
      examples.find(({ label }) => label.startsWith('metric '))!.composition
        .body[0]!
    ) as PrimitiveNode & { title?: string };
    const context = { environment: 'node' as const };
    reset();
    drawReact(node, context);
    node.title = 'Changed';
    drawReact(node, context);
    expect(draws).toHaveLength(2);
  });

  it('draws afresh for another style resolver or render context', () => {
    const node = examples.find(({ label }) => label.startsWith('xyChart '))!
      .composition.body[0]!;
    const environment = 'node' as const;
    reset();
    drawReact(node, { environment, resolveClassName: () => 'a' });
    drawReact(node, { environment, resolveClassName: () => 'b' });
    expect(draws).toHaveLength(2);
    reset();
    const onEvent = () => undefined;
    drawReact(node, { environment, onEvent });
    drawReact(node, { environment, onEvent });
    expect(draws).toHaveLength(2);
    reset();
    drawReact(node, { environment });
    drawReact(node, { environment });
    expect(draws).toHaveLength(1);
  });

  it('draws afresh for another `fillWidth`, and gives each its own drawing', () => {
    const node = examples.find(({ label }) => label.startsWith('metric '))!
      .composition.body[0]!;
    const scene = resolveChart(node as ChartNode, { scheme: 'light' });
    const drawn: boolean[] = [];
    const renderer: ReactSceneRenderer = {
      ...counting,
      render: (_, { fillWidth = false }) => {
        drawn.push(fillWidth);
        return fillWidth ? 'fills' : 'fixed';
      },
    };
    const cache = createSceneCache();
    const receivers = { styles: undefined, events: undefined };
    const draw = (fillWidth?: true) =>
      cache.draw(
        scene,
        renderer,
        { environment: 'node', ...(fillWidth && { fillWidth }) },
        receivers
      );
    expect([draw(true), draw(), draw(true), draw()]).toEqual([
      'fills',
      'fixed',
      'fills',
      'fixed',
    ]);
    expect(drawn).toEqual([true, false]);
  });
});
