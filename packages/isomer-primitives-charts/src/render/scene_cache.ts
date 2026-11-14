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
// nothing once the render returns. A node hit is served only while its
// content is unchanged.

import type { ReactNode } from 'react';

import { afterTask } from '../after_task';
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
  /** `renderer.render(scene, env)`, once per Scene, renderer, environment, style scope and event receiver. */
  readonly draw: (
    scene: Scene,
    renderer: ReactSceneRenderer,
    env: SceneRenderEnv,
    receivers: DrawingReceivers
  ) => ReactNode;
  /** `derive()`, once per `source` content. */
  readonly share: <T extends object>(source: T, derive: () => T) => T;
}

/** What a drawing's classes and events reach, beyond its env. */
export interface DrawingReceivers {
  /** The collector `env.resolveClassName` records into, or the resolver itself when that is unknown. */
  readonly styles: unknown;
  /** The context `env.onEvent` calls, when it is set. */
  readonly events: object | undefined;
}

interface Drawing extends DrawingReceivers {
  readonly renderer: ReactSceneRenderer;
  readonly environment: SceneRenderEnv['environment'];
  readonly nodeId: string | undefined;
  readonly drawn: ReactNode;
}

interface Turn {
  // Keyed weakly, so a node or Scene a render has let go of is freed even
  // before the task ends.
  readonly scenes: WeakMap<ChartNode, Map<string, Fingerprinted<Scene>>>;
  readonly drawings: WeakMap<Scene, Drawing[]>;
  readonly shared: WeakMap<object, Fingerprinted<object>>;
}

interface Fingerprinted<T> {
  readonly fingerprint: string | undefined;
  readonly value: T;
}

// `undefined` for content that does not serialize, which is never reused.
const fingerprintOf = (source: object): string | undefined => {
  try {
    return JSON.stringify(source);
  } catch {
    return undefined;
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
 * which share a collector; another collector or event receiver draws afresh.
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
      const fingerprint = fingerprintOf(node);
      const hit = byOptions.get(key);
      if (hit && fingerprint !== undefined && hit.fingerprint === fingerprint) {
        return hit.value;
      }
      const scene = resolveScene(node, options);
      byOptions.set(key, { fingerprint, value: scene });
      return scene;
    },
    draw: (scene, renderer, env, { styles, events }) => {
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
          drawing.styles === styles &&
          drawing.events === events
      );
      if (hit) {
        return hit.drawn;
      }
      const output = renderer.render(scene, env);
      drawn.push({
        renderer,
        environment: env.environment,
        nodeId: env.nodeId,
        styles,
        events,
        drawn: output,
      });
      return output;
    },
    share: (source, derive) => {
      const { shared } = current();
      const fingerprint = fingerprintOf(source);
      const hit = shared.get(source);
      if (hit && fingerprint !== undefined && hit.fingerprint === fingerprint) {
        return hit.value as typeof source;
      }
      const derived = derive();
      shared.set(source, { fingerprint, value: derived });
      return derived;
    },
  };
};
