/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The drawing thread: owns the jsdom window and Skia, and answers one draw at a time.

import { parentPort, workerData } from 'node:worker_threads';

import { createSceneDraw, type DrawOptions } from './draw';
import type { DrawMessage, DrawReply, ReadyMessage } from './renderer';

if (parentPort === null) {
  throw new Error(
    'elastic-charts-node: the drawing worker must run on a worker thread'
  );
}
const port = parentPort;

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const drawing = createSceneDraw(workerData as DrawOptions);

drawing.then(
  () => port.postMessage({ ready: true } satisfies ReadyMessage),
  (error: unknown) =>
    port.postMessage({
      ready: false,
      error: message(error),
    } satisfies ReadyMessage)
);

port.on('message', ({ id, scene, request }: DrawMessage) => {
  void drawing
    .then((draw): DrawReply => ({ id, drawing: draw(scene, request) }))
    .catch((error: unknown): DrawReply => ({ id, error: message(error) }))
    .then((reply) => port.postMessage(reply));
});
