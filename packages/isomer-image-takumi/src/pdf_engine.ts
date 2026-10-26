/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import type { FontLoader } from '@takumi-rs/core';
import type {
  ImagesInput,
  MeasureOptions,
  NodeInput,
  RenderOptions,
} from 'takumi-pdf';

/** The two `PdfRenderer` calls the backend makes, wherever the renderer runs. */
export interface PdfEngine {
  measure(
    node: NodeInput,
    options: MeasureOptions
  ): Promise<{ width: number; height: number }>;
  render(node: NodeInput, options: RenderOptions): Promise<Uint8Array>;
  /** Releases the renderer, and its thread if it has one. */
  close(): Promise<void>;
}

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const closedError = () => new Error('pdf: the backend was closed');

/** Settles as `promise` does, or rejects as soon as `signal` aborts. */
const unlessAborted = <T>(promise: Promise<T>, signal: AbortSignal) =>
  new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      promise.catch(() => undefined);
      reject(closedError());
      return;
    }
    const onAbort = () => reject(closedError());
    signal.addEventListener('abort', onAbort, { once: true });
    void promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', onAbort));
  });

/** Registers `fonts` in order: the registration order is the fallback order. */
const registerFonts = async (
  engine: { registerFont(font: FontLoader): Promise<unknown> },
  fonts: readonly FontLoader[]
) => {
  for (const font of fonts) {
    await engine.registerFont(font);
  }
};

/**
 * A `PdfRenderer` on the calling thread. Its wasm calls block that thread.
 * Aborting `signal` rejects creation without waiting on a font loader, and
 * `close` rejects calls in flight, freeing the renderer once they settle.
 */
export const createInlinePdfEngine = async (
  fonts: readonly FontLoader[],
  signal: AbortSignal
): Promise<PdfEngine> => {
  const { PdfRenderer } = await unlessAborted(import('takumi-pdf'), signal);
  const renderer = new PdfRenderer();
  const registered = registerFonts(renderer, fonts);
  try {
    await unlessAborted(registered, signal);
  } catch (error) {
    void registered.catch(() => undefined).then(() => renderer.free());
    throw error;
  }
  /** Calls still able to reach the renderer, so `close` frees it after them. */
  const inFlight = new Set<Promise<unknown>>();
  const closing = new AbortController();
  const track = <T>(run: () => Promise<T>): Promise<T> => {
    if (closing.signal.aborted) {
      return Promise.reject(closedError());
    }
    const op = run();
    inFlight.add(op);
    const settled = () => inFlight.delete(op);
    op.then(settled, settled);
    return unlessAborted(op, closing.signal);
  };
  return {
    measure: (node, options) => track(() => renderer.measure(node, options)),
    // Copied out of wasm memory, which a later render can move.
    render: (node, options) =>
      track(async () => new Uint8Array(await renderer.render(node, options))),
    close: () => {
      if (!closing.signal.aborted) {
        closing.abort();
        // Not awaited: a call still loading an image would hold `close` open.
        void Promise.allSettled(inFlight).then(() => renderer.free());
      }
      return Promise.resolve();
    },
  };
};

/** A font as it crosses to the worker: a lazy `data()` is read here, and rebuilt there. */
interface PostedFont {
  font: unknown;
  lazy: boolean;
}

const toPostedFont = async (font: FontLoader): Promise<PostedFont> => {
  if (
    typeof font === 'object' &&
    'data' in font &&
    typeof font.data === 'function'
  ) {
    return { font: { ...font, data: await font.data() }, lazy: true };
  }
  return { font, lazy: false };
};

/** `images` with every lazy `data()` read, so the list can be posted. */
const toPostedImages = async (
  images: ImagesInput | undefined
): Promise<ImagesInput | undefined> => {
  if (images === undefined) {
    return undefined;
  }
  // Typed here: the CommonJS pass cannot resolve takumi's `ImageLoader`.
  type Source = { src: string; data: unknown };
  const sources: readonly Source[] = Array.isArray(images)
    ? images
    : (images.sources ?? []);
  const resolved = await Promise.all(
    sources.map(async (source) => ({
      ...source,
      data:
        typeof source.data === 'function'
          ? await (source.data as () => unknown)()
          : source.data,
    }))
  );
  return (
    Array.isArray(images) ? resolved : { ...images, sources: resolved }
  ) as ImagesInput;
};

/**
 * The worker's whole program, evaluated as CommonJS so it needs no file of
 * its own beside either build. It loads takumi-pdf's Node entry by path,
 * registers the fonts, and answers one message per `measure` or `render`.
 */
const WORKER_SOURCE = `
const { parentPort, workerData } = require('node:worker_threads');
const { PdfRenderer } = require(workerData.entry);
const renderer = new PdfRenderer();
const post = (message, transfer) => {
  try {
    parentPort.postMessage(message, transfer);
  } catch (error) {
    parentPort.postMessage({ id: message.id, error: new Error(String(message.error ?? error)) });
  }
};
(async () => {
  for (const { font, lazy } of workerData.fonts) {
    await renderer.registerFont(lazy ? { ...font, data: () => font.data } : font);
  }
})().then(
  () => {
    parentPort.on('message', async ({ id, op, node, options }) => {
      try {
        const result = await renderer[op](node, options);
        if (op === 'render') {
          const bytes = new Uint8Array(result);
          post({ id, result: bytes }, [bytes.buffer]);
        } else {
          post({ id, result: { width: result.width, height: result.height } });
        }
      } catch (error) {
        post({ id, error });
      }
    });
    post({ ready: true });
  },
  (error) => post({ ready: false, error })
);
`;

type WorkerReply =
  | { ready: true }
  | { ready: false; error: unknown }
  | { id: number; result: unknown; error?: undefined }
  | { id: number; error: unknown };

/**
 * A `PdfRenderer` in a `worker_threads` Worker, so its wasm layout and PDF
 * writing never hold the calling thread. Fonts are registered there once.
 * The worker holds the process open only while a call is in flight;
 * `onExit` runs if it stops for any reason other than `close`. Aborting
 * `signal` stops the worker and rejects creation and every call, without
 * waiting on a font or image loader.
 */
export const createWorkerPdfEngine = async (
  fonts: readonly FontLoader[],
  onExit: () => void,
  signal: AbortSignal
): Promise<PdfEngine> => {
  // A runtime specifier, so neither build needs types for the subpath.
  const wasmUrlModule: string = 'takumi-pdf/wasm-url';
  const { default: wasmUrl } = (await unlessAborted(
    import(wasmUrlModule),
    signal
  )) as { default: URL };
  const postedFonts = await unlessAborted(
    Promise.all(fonts.map(toPostedFont)),
    signal
  );
  const worker = new Worker(WORKER_SOURCE, {
    eval: true,
    workerData: {
      entry: fileURLToPath(new URL('../bundlers/node.cjs', wasmUrl)),
      fonts: postedFonts,
    },
  });

  /** A call, from before its images load until its reply. */
  interface Call {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    posted: boolean;
  }
  const pending = new Map<number, Call>();
  let nextId = 0;
  let posted = 0;
  let closing = false;
  let failure: Error | undefined;
  let rejectReady: ((error: Error) => void) | undefined;

  const failAll = (error: Error) => {
    failure ??= error;
    rejectReady?.(error);
    for (const { reject } of pending.values()) {
      reject(error);
    }
    pending.clear();
    posted = 0;
  };

  /** Forgets call `id`, letting the process exit once none is posted. */
  const settle = (id: number) => {
    const call = pending.get(id);
    pending.delete(id);
    if (call?.posted && --posted === 0) {
      worker.unref();
    }
    return call;
  };

  const shutdown = async () => {
    closing = true;
    failAll(closedError());
    await worker.terminate();
  };
  signal.addEventListener('abort', () => void shutdown(), { once: true });

  await new Promise<void>((resolve, reject) => {
    rejectReady = reject;
    worker.on('message', (reply: WorkerReply) => {
      if ('ready' in reply) {
        if (reply.ready) {
          worker.unref();
          resolve();
        } else {
          reject(toError(reply.error));
        }
        return;
      }
      const call = settle(reply.id);
      if (!call) {
        return;
      }
      if ('result' in reply) {
        call.resolve(reply.result);
      } else {
        call.reject(toError(reply.error));
      }
    });
    worker.on('error', (error) => {
      reject(error);
      failAll(error);
    });
    worker.on('exit', (code) => {
      const error = new Error(`pdf: the PDF worker exited with code ${code}`);
      reject(error);
      failAll(error);
      if (!closing) {
        onExit();
      }
    });
  }).catch(async (error: unknown) => {
    closing = true;
    await worker.terminate();
    throw error;
  });

  const call = <T>(
    op: 'measure' | 'render',
    node: NodeInput,
    options: { images?: ImagesInput | undefined }
  ) =>
    new Promise<T>((resolve, reject) => {
      if (failure !== undefined) {
        reject(failure);
        return;
      }
      const id = nextId++;
      const entry: Call = {
        resolve: resolve as (value: unknown) => void,
        reject,
        posted: false,
      };
      // Tracked while its images load, so closing rejects it without waiting.
      pending.set(id, entry);
      void toPostedImages(options.images).then(
        (images) => {
          if (pending.get(id) !== entry) {
            return;
          }
          try {
            worker.postMessage({
              id,
              op,
              node,
              options: images === undefined ? options : { ...options, images },
            });
          } catch (error) {
            settle(id);
            reject(toError(error));
            return;
          }
          entry.posted = true;
          if (posted++ === 0) {
            worker.ref();
          }
        },
        (error: unknown) => {
          if (pending.get(id) === entry) {
            settle(id);
            reject(toError(error));
          }
        }
      );
    });

  return {
    measure: (node, options) => call('measure', node, options),
    render: (node, options) => call('render', node, options),
    close: shutdown,
  };
};
