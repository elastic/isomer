/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment node

import { openBrowser } from './run';

describe('openBrowser', () => {
  it('reports an opener that does not exist instead of throwing', async () => {
    const error = await new Promise<Error>((resolve) =>
      openBrowser(
        'http://127.0.0.1:5179/',
        resolve,
        'isomer-studio-missing-opener'
      )
    );

    expect(error).toMatchObject({ code: 'ENOENT' });
  });
});
