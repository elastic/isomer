/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const LINE_TERMINATOR_RE = /[\r\n\u2028\u2029]/;

/** `text` on one line: each run of whitespace holding a line terminator becomes one space. */
export const oneLine = (text: string): string =>
  text.replace(/\s+/g, (run) => (LINE_TERMINATOR_RE.test(run) ? ' ' : run));
