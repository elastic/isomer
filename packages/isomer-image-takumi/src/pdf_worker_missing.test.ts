/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromHtml } from '@takumi-rs/helpers/html';
import { describe, expect, it, vi } from 'vitest';

import { createPdfEngine } from './pdf_engine';

vi.mock('./pdf_worker_file.cjs', () => ({
  pdfWorker: () => {
    throw new Error("Cannot find module 'tsx'");
  },
}));

describe('a PDF worker that cannot be found', () => {
  it('fails the PDF call, not the engine it belongs to', async () => {
    const engine = createPdfEngine([]);
    const { node } = fromHtml('<div></div>');
    await expect(
      engine.measure(node, { viewport: { width: 10 } })
    ).rejects.toThrow("Cannot find module 'tsx'");
    await engine.close();
  });
});
