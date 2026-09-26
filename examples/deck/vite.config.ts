/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { sourceAliases } from '../../scripts/source_aliases.js';
import { repoRoot } from '../../scripts/workspace_packages.js';

import { deckPngs } from './vite/png_plugin';

const resolve = { alias: sourceAliases(), dedupe: ['react', 'react-dom'] };

// `DECK_BASE=./` keeps every asset relative, so the build works under the docs site's `/isomer/deck/`.
export default defineConfig({
  base: process.env.DECK_BASE ?? '/',
  plugins: [react(), deckPngs(resolve)],
  resolve,
  server: { fs: { allow: [repoRoot] } },
  // The deck ships the whole runtime, `react-dom/server` included, on purpose.
  build: { chunkSizeWarningLimit: 1024 },
});
