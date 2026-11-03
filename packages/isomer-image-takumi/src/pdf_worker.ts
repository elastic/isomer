/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * The PDF worker: registers the fonts it is started with, then answers one
 * reply per posted `measure` or `render`.
 */

import { parentPort, type Transferable, workerData } from 'node:worker_threads';

import { PdfRenderer } from 'takumi-pdf';

import { registerFonts } from './fonts';
import type {
  PdfWorkerData,
  PdfWorkerReply,
  PdfWorkerRequest,
  PostedFont,
} from './pdf_engine';

if (parentPort === null) {
  throw new Error('pdf: the PDF worker must run on a worker thread');
}
const port = parentPort;
const { fonts } = workerData as PdfWorkerData;
const renderer = new PdfRenderer();

const send = (reply: PdfWorkerReply, transfer: Transferable[] = []) => {
  try {
    port.postMessage(reply, transfer);
  } catch (cloneError) {
    if (!('error' in reply)) {
      throw cloneError;
    }
    // An error that cannot be cloned crosses as its message.
    port.postMessage({ ...reply, error: new Error(String(reply.error)) });
  }
};

const answer = async (request: PdfWorkerRequest) => {
  const { id } = request;
  try {
    if (request.op === 'render') {
      // Copied out of wasm memory, so the buffer can be transferred.
      const bytes = new Uint8Array(
        await renderer.render(request.node, request.options)
      );
      send({ id, result: bytes }, [bytes.buffer]);
    } else {
      const { width, height } = await renderer.measure(
        request.node,
        request.options
      );
      send({ id, result: { width, height } });
    }
  } catch (error) {
    send({ id, error });
  }
};

const fromPostedFont = ({ font, lazy }: PostedFont) =>
  lazy ? { ...font, data: () => font.data } : font;

registerFonts(renderer, fonts.map(fromPostedFont)).then(
  () => {
    port.on('message', (request: PdfWorkerRequest) => void answer(request));
    send({ ready: true });
  },
  (error: unknown) => send({ ready: false, error })
);
