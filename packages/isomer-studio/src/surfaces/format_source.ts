/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SurfaceOutput } from './render_output';

/** Pretty-prints HTML and its inline CSS, and returns other languages and unparsable markup as is. */
export const formatSource = async (
  source: string,
  language: SurfaceOutput['language']
): Promise<string> => {
  if (language !== 'html' || !source) {
    return source;
  }
  try {
    const [{ format }, html, postcss] = await Promise.all([
      import('prettier/standalone'),
      import('prettier/plugins/html'),
      import('prettier/plugins/postcss'),
    ]);
    const formatted = await format(source, {
      parser: 'html',
      plugins: [html, postcss],
      printWidth: 80,
      htmlWhitespaceSensitivity: 'ignore',
    });
    return formatted.trimEnd();
  } catch {
    return source;
  }
};
