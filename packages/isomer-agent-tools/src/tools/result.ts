/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsomerToolResult } from './types';

export const textResult = (text: string, isError = false): IsomerToolResult =>
  isError
    ? { content: [{ type: 'text', text }], isError }
    : { content: [{ type: 'text', text }] };

export const jsonResult = (value: unknown, isError = false): IsomerToolResult =>
  textResult(JSON.stringify(value, null, 2), isError);

export const imageResult = (bytes: Uint8Array): IsomerToolResult => ({
  content: [{ type: 'image', data: toBase64(bytes), mimeType: 'image/png' }],
});

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const CHUNK = 0x8000;

/** `btoa` rather than `Buffer`, so the tools run outside Node. */
const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let start = 0; start < bytes.length; start += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(start, start + CHUNK));
  }
  return btoa(binary);
};
