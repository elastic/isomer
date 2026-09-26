/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A fence-info string only allows word-ish tokens; anything else would
// terminate the fence early or inject markdown.
const fenceInfo = (language: string | undefined): string =>
  language && /^[\w+#.-]+$/.test(language) ? language : 'text';

// The fence must be longer than any backtick run in the body, or the body
// closes it early.
const fenceFor = (code: string): string => {
  const longestRun = Math.max(
    2,
    ...(code.match(/`+/g) ?? []).map((run) => run.length)
  );
  return '`'.repeat(longestRun + 1);
};

/** `source` as a fenced Markdown block tagged `language`, or `text` when the tag is unsafe. */
export const fencedBlock = (
  source: string,
  language: string | undefined
): string => {
  const fence = fenceFor(source);
  return `${fence}${fenceInfo(language)}\n${source}\n${fence}`;
};
