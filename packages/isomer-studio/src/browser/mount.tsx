/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type {} from 'monaco-editor/esm/vs/editor/editor.api';

import type { StudioConfig } from '../config';
import { IsomerStudio } from '../studio';
import type { JsxTransform, RasterizePng } from '../types';

/** What the CLI's mode supplies: `dev` asks its server, a static build works in the browser alone. */
export interface StudioHost {
  transformJsx?: JsxTransform | undefined;
  rasterizePng?: RasterizePng | undefined;
}

const WORKERS: Readonly<Record<string, string>> = {
  typescript: 'ts.worker',
  javascript: 'ts.worker',
  json: 'json.worker',
};

/** `path` against the page's `<base href>`, which the CLI sets from `--base`. */
export const assetUrl = (path: string): string =>
  new URL(path, document.baseURI).href;

export const mountStudio = (
  config: StudioConfig,
  { transformJsx, rasterizePng }: StudioHost
): void => {
  window.MonacoEnvironment = {
    getWorker: (_id, label) =>
      new Worker(assetUrl(`assets/${WORKERS[label] ?? 'editor.worker'}.js`), {
        type: 'module',
      }),
  };
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('The Studio page has no #root element.');
  }
  createRoot(container).render(
    <IsomerStudio {...config} {...{ transformJsx, rasterizePng }} />
  );
};
