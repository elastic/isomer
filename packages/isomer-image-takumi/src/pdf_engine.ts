/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';

import type { FontDetails, FontLoader } from '@takumi-rs/core';
import type {
  ImagesInput,
  MeasureOptions,
  NodeInput,
  RenderOptions,
} from 'takumi-pdf';

import { pdfWorker } from './pdf_worker_file.cjs';

/**
 * The two `PdfRenderer` calls the backend makes, on a worker thread the
 * first call starts. Single use: once `close` is called, every call pending
 * or made after rejects with {@link PDF_ENGINE_CLOSED}.
 */
export interface PdfEngine {
  measure(
    node: NodeInput,
    options: MeasureOptions
  ): Promise<{ width: number; height: number }>;
  render(node: NodeInput, options: RenderOptions): Promise<Uint8Array>;
  /** Rejects every pending call, without waiting on a font or image loader, and stops the worker. */
  close(): Promise<void>;
}

/** The `code` of the `IsomerError` a closed engine rejects with. */
export const PDF_ENGINE_CLOSED = 'PDF_ENGINE_CLOSED';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/** Identified by `name` and `code`, as the SDK's `IsomerError` is. */
const closedError = () =>
  Object.assign(new Error('pdf: the backend was closed'), {
    name: 'IsomerError',
    code: PDF_ENGINE_CLOSED,
  });

/** A font whose bytes are read on demand. */
type LazyFont = Extract<FontLoader, { data: () => unknown }>;

const isLazy = (font: FontLoader): font is LazyFont =>
  typeof font === 'object' && 'data' in font && typeof font.data === 'function';

/** A font as it crosses to the worker: a lazy `data()` is read here, and rebuilt there. */
export type PostedFont =
  { font: FontLoader; lazy: false } | { font: WithBytes<LazyFont>; lazy: true };

/** A lazy font with its bytes read, keeping each loader shape's own fields. */
type WithBytes<TFont> = TFont extends unknown
  ? Omit<TFont, 'data'> & { data: FontDetails['data'] }
  : never;

const toPostedFont = async (font: FontLoader): Promise<PostedFont> =>
  isLazy(font)
    ? { font: { ...font, data: await font.data() }, lazy: true }
    : { font, lazy: false };

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

/** What the worker starts with. */
export interface PdfWorkerData {
  fonts: readonly PostedFont[];
}

/** One `measure` or `render` call. */
type PdfCall =
  | { op: 'measure'; node: NodeInput; options: MeasureOptions }
  | { op: 'render'; node: NodeInput; options: RenderOptions };

/** A call as posted to the worker. */
export type PdfWorkerRequest = PdfCall & { id: number };

/** The worker's answer: once when its fonts are registered, then once per call. */
export type PdfWorkerReply =
  | { ready: true }
  | { ready: false; error: unknown }
  | { id: number; result: Uint8Array | { width: number; height: number } }
  | { id: number; error: unknown };

/** Where the worker's module is, and the `execArgv` it starts with. */
export interface PdfWorkerFile {
  file: string;
  execArgv?: string[];
}

/** A call, from before its worker and images are ready until its reply. */
interface Call {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  posted: boolean;
}

/**
 * A {@link PdfEngine} over a `worker_threads` Worker, so takumi's wasm layout
 * and PDF writing never hold the calling thread. The first call starts the
 * worker, which registers `fonts` once; a worker that fails to start or
 * exits rejects the calls on it, and the next call starts another. The
 * worker holds the process open only while a call is posted to it.
 *
 * `worker` is for tests.
 */
export const createPdfEngine = (
  fonts: readonly FontLoader[],
  worker?: PdfWorkerFile
): PdfEngine => {
  /** Every call not yet settled, so one failure or `close` rejects them all. */
  const calls = new Map<number, Call>();
  let nextId = 0;
  let posted = 0;
  let closed = false;
  let current: Worker | undefined;
  let starting: Promise<Worker> | undefined;

  const rejectAll = (error: Error) => {
    for (const { reject } of calls.values()) {
      reject(error);
    }
    calls.clear();
    posted = 0;
  };

  /** Forgets call `id`, letting the process exit once none is posted. */
  const settle = (id: number) => {
    const call = calls.get(id);
    calls.delete(id);
    if (call?.posted && --posted === 0) {
      current?.unref();
    }
    return call;
  };

  const spawn = async (): Promise<Worker> => {
    const workerData: PdfWorkerData = {
      fonts: await Promise.all(fonts.map(toPostedFont)),
    };
    if (closed) {
      throw closedError();
    }
    const resolved: PdfWorkerFile = worker ?? pdfWorker();
    const { file, ...options } = resolved;
    // A worker inherits the host's flags, and with a preload Node rejects an inherited
    // `--input-type` for a file; string input takes it, and `import()` loads either format.
    const thread = new Worker(
      `import(${JSON.stringify(pathToFileURL(file).href)})`,
      {
        ...options,
        eval: true,
        workerData,
      }
    );
    current = thread;
    let failure: Error | undefined;
    await new Promise<void>((resolve, reject) => {
      thread.on('message', (reply: PdfWorkerReply) => {
        if ('ready' in reply) {
          if (reply.ready) {
            resolve();
          } else {
            reject(toError(reply.error));
          }
          return;
        }
        const call = settle(reply.id);
        if (call === undefined) {
          return;
        }
        if ('result' in reply) {
          call.resolve(reply.result);
        } else {
          call.reject(toError(reply.error));
        }
      });
      thread.on('error', (error) => {
        failure = error;
        reject(error);
      });
      thread.on('exit', (code) => {
        const error =
          failure ?? new Error(`pdf: the PDF worker exited with code ${code}`);
        reject(error);
        if (current === thread) {
          current = undefined;
          starting = undefined;
          rejectAll(error);
        }
      });
    }).catch(async (error: unknown) => {
      if (current === thread) {
        current = undefined;
      }
      await thread.terminate();
      throw error;
    });
    thread.unref();
    return thread;
  };

  /** The worker, started once and again after it fails. */
  const ready = () => {
    if (starting === undefined) {
      const started = spawn();
      starting = started;
      started.catch((error: unknown) => {
        if (starting === started) {
          starting = undefined;
          rejectAll(toError(error));
        }
      });
    }
    return starting;
  };

  const call = <T>(request: PdfCall) =>
    new Promise<T>((resolve, reject) => {
      if (closed) {
        reject(closedError());
        return;
      }
      const id = nextId++;
      const entry: Call = {
        resolve: resolve as (value: unknown) => void,
        reject,
        posted: false,
      };
      // Tracked before anything loads, so a failure or `close` rejects it without waiting.
      calls.set(id, entry);
      const { images } = request.options;
      void Promise.all([ready(), toPostedImages(images)]).then(
        ([thread, postedImages]) => {
          if (calls.get(id) !== entry) {
            return;
          }
          const options =
            postedImages === undefined
              ? request.options
              : { ...request.options, images: postedImages };
          try {
            thread.postMessage({ ...request, id, options });
          } catch (error) {
            settle(id);
            reject(toError(error));
            return;
          }
          entry.posted = true;
          if (posted++ === 0) {
            thread.ref();
          }
        },
        (error: unknown) => {
          if (calls.get(id) === entry) {
            settle(id);
            reject(toError(error));
          }
        }
      );
    });

  return {
    measure: (node, options) => call({ op: 'measure', node, options }),
    render: (node, options) => call({ op: 'render', node, options }),
    close: async () => {
      closed = true;
      rejectAll(closedError());
      const thread = current;
      current = undefined;
      starting = undefined;
      await thread?.terminate();
    },
  };
};
