/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Drawing off the host's thread: a worker owns the jsdom window and Skia, so
// this thread keeps no DOM globals.

import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';

import type {
  Scene,
  SceneKind,
  SceneRenderer,
} from '@elastic/isomer-primitives-charts/scene';

import type { ChartDrawing, DrawOptions, DrawRequest } from './draw';
import { chartsWorker } from './worker_file.cjs';

/** A draw as posted to the worker. */
export interface DrawMessage {
  readonly id: number;
  readonly scene: Scene;
  readonly request?: DrawRequest;
}

/** Sent once, when the worker can draw, or why it cannot. */
export type ReadyMessage = { ready: true } | { ready: false; error: string };

export type DrawReply =
  { id: number; drawing: ChartDrawing } | { id: number; error: string };

/** A `SceneRenderer` for Node whose drawing resolves on a worker thread. */
export interface ElasticChartsNodeRenderer extends SceneRenderer<
  Promise<ChartDrawing>
> {
  /** Draws at a size other than the Scene's, or with Elastic Charts' `DebugState`. */
  draw(scene: Scene, request?: DrawRequest): Promise<ChartDrawing>;
  /** Stops the drawing thread; a draw after this rejects. */
  close(): Promise<void>;
}

const KINDS: readonly SceneKind[] = ['metric', 'xy'];

/**
 * Starts a worker thread that draws Scenes with Elastic Charts in jsdom and
 * Skia, and resolves once it can draw, so loading jsdom, React and Elastic
 * Charts is paid here. Drawings are one at a time; the worker keeps the
 * process alive only while one is owed.
 */
export const createElasticChartsNodeRenderer = async (
  options: DrawOptions = {}
): Promise<ElasticChartsNodeRenderer> => {
  const { file } = chartsWorker();
  // `import()` loads either module format, and string input avoids an inherited `--input-type`.
  const worker = new Worker(
    `import(${JSON.stringify(pathToFileURL(file).href)})`,
    {
      eval: true,
      workerData: { ...options, fonts: [...(options.fonts ?? [])] },
    }
  );
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    const onExit = (code: number) =>
      reject(
        new Error(
          `elastic-charts-node: the drawing worker exited with code ${code}`
        )
      );
    worker.once('error', onError);
    worker.once('exit', onExit);
    worker.once('message', (message: ReadyMessage) => {
      worker.off('error', onError);
      worker.off('exit', onExit);
      if (message.ready) {
        resolve();
      } else {
        void worker.terminate();
        reject(new Error(`elastic-charts-node: ${message.error}`));
      }
    });
  });
  worker.unref();
  const pending = new Map<
    number,
    { resolve: (drawing: ChartDrawing) => void; reject: (error: Error) => void }
  >();
  const settle = (id: number) => {
    const entry = pending.get(id);
    pending.delete(id);
    if (pending.size === 0) {
      worker.unref();
    }
    return entry;
  };
  worker.on('message', (reply: DrawReply) => {
    const entry = settle(reply.id);
    if ('drawing' in reply) {
      entry?.resolve(reply.drawing);
    } else {
      entry?.reject(new Error(`elastic-charts-node: ${reply.error}`));
    }
  });
  const failAll = (error: Error) => {
    for (const id of [...pending.keys()]) {
      settle(id)?.reject(error);
    }
  };
  let closed = false;
  worker.on('error', failAll);
  worker.on('exit', () => {
    closed = true;
    failAll(new Error('elastic-charts-node: the drawing worker exited'));
  });
  let nextId = 0;
  const draw = (scene: Scene, request?: DrawRequest) => {
    if (closed) {
      return Promise.reject(
        new Error('elastic-charts-node: the drawing worker is closed')
      );
    }
    nextId += 1;
    const id = nextId;
    return new Promise<ChartDrawing>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.ref();
      worker.postMessage({
        id,
        scene,
        ...(request ? { request } : {}),
      } satisfies DrawMessage);
    });
  };
  return {
    id: 'elastic-charts-node',
    environments: ['node'],
    supports: (kind) => KINDS.includes(kind),
    render: (scene) => draw(scene),
    draw,
    close: async () => {
      closed = true;
      await worker.terminate();
    },
  };
};
