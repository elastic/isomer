/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom/vitest';

import { createRequire } from 'node:module';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

interface EmotionCache {
  sheet: { flush: () => void };
  inserted: Record<string, unknown>;
  registered: Record<string, unknown>;
}

const EUI_EMOTION =
  /[\\/]@elastic[\\/]eui[\\/]test-env[\\/]services[\\/]emotion[\\/]css\.js$/;

const { cache: loadedModules } = createRequire(import.meta.url);

// `EuiProvider` styles through EUI's own emotion instance. Its rules otherwise pile up in
// `document.head` across tests, and every `getComputedStyle` EUI calls slows with them.
const resetEuiEmotion = (): void => {
  for (const [id, module] of Object.entries(loadedModules)) {
    const cache = EUI_EMOTION.test(id)
      ? (module?.exports as { cache?: EmotionCache }).cache
      : undefined;
    if (!cache) {
      continue;
    }
    cache.sheet.flush();
    for (const store of [cache.inserted, cache.registered]) {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    }
  }
};

afterEach(() => {
  cleanup();
  resetEuiEmotion();
});
