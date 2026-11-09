/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Shared by the parity gates: every Scene the charts pack resolves for every
// example of every primitive, nested charts included, and what a renderer drew
// for it. Scenes are recorded where the pack resolves and draws them, so a new
// chart primitive or example is covered with no change here.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  type ChartsRenderContext,
  createChartsPack,
  type ReactSceneRenderer,
} from '@elastic/isomer-primitives-charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import type {
  ColorScheme,
  Scene,
  SceneEnvironment,
} from '@elastic/isomer-primitives-charts/scene';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  type Composition,
  primitiveExamples,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';

const view = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [node],
});

export const SCHEMES: readonly ColorScheme[] = ['light', 'dark'];

/** One Scene a renderer drew for an example, and its markup. */
export interface DrawnScene {
  readonly example: string;
  readonly scheme: ColorScheme;
  readonly renderer: string;
  readonly scene: Scene;
  readonly markup: string;
}

/**
 * Draws every example of the charts pack with `renderers` first, in each
 * scheme, through the `react` surface as a host does. Returns what each of
 * `renderers` drew, and the kinds of every Scene the pack resolved.
 */
export const drawExamples = (
  renderers: readonly ReactSceneRenderer[],
  environment: SceneEnvironment = 'node'
) => {
  const drawn: DrawnScene[] = [];
  const resolved: { example: string; kind: Scene['kind'] }[] = [];
  let current = { example: '', scheme: 'light' as ColorScheme };
  const recording = renderers.map((renderer): ReactSceneRenderer => ({
    ...renderer,
    render: (scene, env) => {
      const output = renderer.render(scene, env);
      drawn.push({
        ...current,
        renderer: renderer.id,
        scene,
        markup: renderToStaticMarkup(createElement('div', null, output)),
      });
      return output;
    },
  }));
  const pack = createChartsPack({
    sceneRenderers: recording,
    resolveScene: (node, options) => {
      const scene = resolveChart(node, options);
      resolved.push({ example: current.example, kind: scene.kind });
      return scene;
    },
  });
  const runtime = createIsomerRuntime<unknown, ChartsRenderContext>({
    packs: [pack],
  });
  const examples = pack.primitives.flatMap((definition) =>
    primitiveExamples(definition).map(({ name, node }) => ({
      example: `${definition.type}: ${name ?? '(unnamed)'}`,
      composition: view(node),
    }))
  );
  for (const scheme of SCHEMES) {
    for (const { example, composition } of examples) {
      current = { example, scheme };
      renderToStaticMarkup(
        createElement(
          'div',
          null,
          runtime.surfaces.react.render(composition, {
            context: { environment, scheme },
            heading: false,
          })
        )
      );
    }
  }
  return { drawn, resolved, examples: examples.map(({ example }) => example) };
};
