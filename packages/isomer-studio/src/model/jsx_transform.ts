/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** esbuild `transform` options for the editor's JSX, which `compileCompositionJsx` evaluates with `h` and `Fragment`. */
export const JSX_TRANSFORM_OPTIONS = {
  loader: 'jsx',
  jsx: 'transform',
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
} as const;

interface EsbuildMessage {
  text: string;
  location?: { line: number; column: number } | null;
}

const isMessage = (value: unknown): value is EsbuildMessage =>
  typeof value === 'object' &&
  value !== null &&
  'text' in value &&
  typeof value.text === 'string';

/** esbuild's errors as `line:column text` lines, or the error's message. */
export const describeTransformError = (error: unknown): string => {
  const errors =
    typeof error === 'object' && error !== null && 'errors' in error
      ? error.errors
      : undefined;
  const messages = Array.isArray(errors) ? errors.filter(isMessage) : [];
  if (messages.length) {
    return messages
      .map(({ text, location }) =>
        location ? `${location.line}:${location.column} ${text}` : text
      )
      .join('\n');
  }
  return error instanceof Error ? error.message : String(error);
};
