/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const opens = /[{([]/g;
const closes = /[})\]]/g;

const count = (line: string, pattern: RegExp) =>
  (line.match(pattern) ?? []).length;

/**
 * The block that starts at the first line beginning with `marker`, through the
 * line that balances its brackets, dedented and capped at `maxLines`.
 */
export const excerpt = (
  source: string,
  marker: string,
  maxLines: number
): string => {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line.trimStart().startsWith(marker));
  if (start === -1) {
    throw new Error(`excerpt: no line starts with "${marker}"`);
  }
  const block: string[] = [];
  let depth = 0;
  for (const line of lines.slice(start)) {
    block.push(line);
    depth += count(line, opens) - count(line, closes);
    if (depth <= 0) {
      break;
    }
  }
  const indent = Math.min(
    ...block
      .filter((line) => line.trim())
      .map((line) => line.length - line.trimStart().length)
  );
  const dedented = block.map((line) => line.slice(indent));
  return (
    dedented.length > maxLines
      ? [...dedented.slice(0, maxLines - 1), '…']
      : dedented
  ).join('\n');
};

/** 1-based numbers of the lines in `code` that contain `needle`. */
export const linesContaining = (code: string, needle: string): number[] =>
  code
    .split('\n')
    .flatMap((line, index) => (line.includes(needle) ? [index + 1] : []));
