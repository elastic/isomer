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

import { studioServer } from './vite/studio_plugin';

// The MCP URL agents are given must not drift, so the port is fixed.
export default defineConfig({
  plugins: [react(), studioServer()],
  // @babel/types, which prints the JSX tab, reads this flag from a `process` the browser lacks.
  define: { 'process.env.BABEL_TYPES_8_BREAKING': 'false' },
  resolve: { alias: sourceAliases(), dedupe: ['react', 'react-dom'] },
  server: {
    port: 5178,
    strictPort: true,
    cors: false,
    fs: { allow: [repoRoot] },
  },
});
