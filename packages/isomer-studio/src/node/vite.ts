/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type react from '@vitejs/plugin-react';
import type * as vite from 'vite';

import { importNative } from './node_module.cjs';

/** Vite and its React plugin, which ship ESM only. */
export interface ViteModules {
  vite: typeof vite;
  react: typeof react;
}

/** Loads Vite with Node's own `import()`, which the CommonJS build keeps. */
export const loadVite = async (): Promise<ViteModules> => {
  const [viteModule, reactModule] = await Promise.all([
    importNative('vite'),
    importNative('@vitejs/plugin-react'),
  ]);
  return {
    vite: viteModule as typeof vite,
    react: (reactModule as { default: typeof react }).default,
  };
};
