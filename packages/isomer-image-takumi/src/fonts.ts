/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FontLoader } from '@takumi-rs/core';

/**
 * Registers `fonts` on `engine` in order, the order being takumi's fallback
 * order, and resolves to `engine`.
 */
export const registerFonts = async <
  TEngine extends { registerFont(font: FontLoader): Promise<unknown> },
>(
  engine: TEngine,
  fonts: readonly FontLoader[]
): Promise<TEngine> => {
  for (const font of fonts) {
    await engine.registerFont(font);
  }
  return engine;
};
