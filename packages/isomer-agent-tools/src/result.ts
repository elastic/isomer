/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsomerToolResult, IsomerToolsFormat } from './types';

export const textResult = (text: string, isError = false): IsomerToolResult =>
  isError
    ? { content: [{ type: 'text', text }], isError }
    : { content: [{ type: 'text', text }] };

/** `value` as indented JSON, `null` for what JSON cannot hold; a value `JSON.stringify` throws on, such as a cycle or a `BigInt`, becomes a failed result. */
export const jsonResult = (
  value: unknown,
  isError = false
): IsomerToolResult => {
  let text: string | undefined;
  try {
    text = JSON.stringify(value, null, 2);
  } catch (error) {
    return textResult(errorMessage(error), true);
  }
  return textResult(text ?? 'null', isError);
};

export const imageResult = (
  bytes: Uint8Array,
  mimeType: `image/${string}` = 'image/png'
): IsomerToolResult => ({
  content: [{ type: 'image', data: toBase64(bytes), mimeType }],
});

const isImageType = (mimeType: string): mimeType is `image/${string}` =>
  mimeType.startsWith('image/');

/** A host format's output, as {@link IsomerToolsFormat} describes. */
export const formatResult = (
  name: string,
  { mimeType }: IsomerToolsFormat,
  output: Uint8Array | string
): IsomerToolResult => {
  if (isImageType(mimeType)) {
    return imageResult(
      typeof output === 'string' ? new TextEncoder().encode(output) : output,
      mimeType
    );
  }
  if (typeof output === 'string') {
    return textResult(output);
  }
  return {
    content: [
      {
        type: 'resource',
        resource: {
          uri: `isomer://render/${encodeURIComponent(name)}`,
          mimeType,
          blob: toBase64(output),
        },
      },
    ],
  };
};

/** The message of any thrown value; never throws itself. */
export const errorMessage = (error: unknown): string => {
  try {
    const { message } = (error ?? {}) as { message?: unknown };
    return typeof message === 'string' ? message : String(error);
  } catch {
    return 'The tool failed with a value that has no message.';
  }
};

const CHUNK = 0x8000;

/** `btoa` rather than `Buffer`, so the tools run outside Node; chunked to stay under the argument limit. */
const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let start = 0; start < bytes.length; start += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(start, start + CHUNK));
  }
  return btoa(binary);
};
