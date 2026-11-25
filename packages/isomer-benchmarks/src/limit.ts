/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The limiter the image-takumi docs give hosts: at most `inFlight` renders at
 * once, at most `queued` waiting, and past that a `busy` error. A finishing
 * render hands its slot straight to the next waiting one, so a call that lands
 * in between cannot take it too.
 */
export const limit = (inFlight: number, queued: number) => {
  let running = 0;
  const waiting: Array<() => void> = [];
  return async <T>(render: () => Promise<T>): Promise<T> => {
    if (running < inFlight) {
      running += 1;
    } else {
      if (waiting.length >= queued) {
        throw new Error('busy');
      }
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    try {
      return await render();
    } finally {
      const next = waiting.shift();
      if (next) {
        next();
      } else {
        running -= 1;
      }
    }
  };
};
