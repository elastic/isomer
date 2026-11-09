/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// One `snapshot` or `html` render reads a chart node several times: its height
// estimate, then a style-collecting pass and the drawn pass, each resolving
// the Scene and drawing it. Every read happens in one synchronous call, so a
// cache that lives until the current task ends serves them all, and holds
// nothing once the render returns.

import type { ReactNode } from 'react';

import type { Scene, SceneRenderEnv } from '../scene/types';

import type {
  ChartNode,
  ReactSceneRenderer,
  ResolveSceneOptions,
  SceneResolver,
} from './context';

/** Resolves and draws each chart node once per render. */
export interface SceneCache {
  /** `resolveScene(node, options)`, once per node and options. */
  readonly resolve: (
    node: ChartNode,
    options: ResolveSceneOptions,
    resolveScene: SceneResolver
  ) => Scene;
  /** `renderer.render(scene, env)`, once per Scene, renderer, environment and event handler. */
  readonly draw: (
    scene: Scene,
    renderer: ReactSceneRenderer,
    env: SceneRenderEnv,
    onEvent: unknown
  ) => ReactNode;
  /** `derive()`, once per `source`. */
  readonly share: <T extends object>(source: T, derive: () => T) => T;
}

interface Drawing {
  readonly renderer: ReactSceneRenderer;
  readonly environment: SceneRenderEnv['environment'];
  readonly nodeId: string | undefined;
  readonly onEvent: unknown;
  readonly drawn: ReactNode;
}

interface Turn {
  // Keyed weakly, so a node or Scene a render has let go of is freed even
  // before the task ends.
  readonly scenes: WeakMap<ChartNode, Map<string, Scene>>;
  readonly drawings: WeakMap<Scene, Drawing[]>;
  readonly shared: WeakMap<object, object>;
}

const afterTask = (callback: () => void): void => {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
  } else {
    void Promise.resolve().then(callback);
  }
};

const optionsKey = ({
  scheme,
  size,
  locale,
  timeZone,
}: ResolveSceneOptions): string =>
  JSON.stringify([scheme, size?.width, size?.height, locale, timeZone]);

/**
 * A cache whose entries last until the current task ends.
 *
 * `snapshot` and `html` draw the copy of a node they validated, so their
 * entries are that render's alone; a host's own node on `react` is cached for
 * the task it renders in. A drawing is shared across a render's style passes,
 * whose contexts come from one collector and so resolve class names alike; a
 * different event handler draws afresh.
 */
export const createSceneCache = (): SceneCache => {
  let turn: Turn | undefined;
  const current = (): Turn => {
    if (!turn) {
      turn = {
        scenes: new WeakMap(),
        drawings: new WeakMap(),
        shared: new WeakMap(),
      };
      afterTask(() => {
        turn = undefined;
      });
    }
    return turn;
  };
  return {
    resolve: (node, options, resolveScene) => {
      const { scenes } = current();
      let byOptions = scenes.get(node);
      if (!byOptions) {
        byOptions = new Map();
        scenes.set(node, byOptions);
      }
      const key = optionsKey(options);
      let scene = byOptions.get(key);
      if (!scene) {
        scene = resolveScene(node, options);
        byOptions.set(key, scene);
      }
      return scene;
    },
    draw: (scene, renderer, env, onEvent) => {
      const { drawings } = current();
      let drawn = drawings.get(scene);
      if (!drawn) {
        drawn = [];
        drawings.set(scene, drawn);
      }
      const hit = drawn.find(
        (drawing) =>
          drawing.renderer === renderer &&
          drawing.environment === env.environment &&
          drawing.nodeId === env.nodeId &&
          drawing.onEvent === onEvent
      );
      if (hit) {
        return hit.drawn;
      }
      const output = renderer.render(scene, env);
      drawn.push({
        renderer,
        environment: env.environment,
        nodeId: env.nodeId,
        onEvent,
        drawn: output,
      });
      return output;
    },
    share: (source, derive) => {
      const { shared } = current();
      let derived = shared.get(source) as typeof source | undefined;
      if (!derived) {
        derived = derive();
        shared.set(source, derived);
      }
      return derived;
    },
  };
};
