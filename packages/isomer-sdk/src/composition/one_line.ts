/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** `text` on one line, so it cannot start a line of its own in a prompt or a message. */
export const oneLine = (text: string): string =>
  text.replace(/\r\n|[\n\r\u2028\u2029]/g, ' ');

/** `value` as JSON on one line: `JSON.stringify` escapes `\n` and `\r` but leaves U+2028 and U+2029 raw. */
export const jsonLine = (value: unknown): string =>
  (JSON.stringify(value) ?? String(value))
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

/** Most characters of an echoed input string a message quotes. */
const MAX_QUOTED_CHARS = 100;

/** An input string quoted for a one-line message, cut to a bounded length of code points. */
export const quoteInput = (text: string): string => {
  const chars = [...text];
  return jsonLine(
    chars.length > MAX_QUOTED_CHARS
      ? `${chars.slice(0, MAX_QUOTED_CHARS).join('')}…`
      : text
  );
};

const PLAIN_NAME = /^[\w$-]+$/;

/** A schema name for a message: as it is when plain, else quoted as {@link quoteInput} quotes input. */
export const nameText = (name: string): string =>
  PLAIN_NAME.test(name) ? name : quoteInput(name);

/** Most items a message lists before it counts the rest. */
const MAX_LISTED = 10;

/** `items` joined with commas, the ones past the first few counted rather than listed. */
export const listBounded = (items: readonly string[]): string =>
  items.length > MAX_LISTED
    ? `${items.slice(0, MAX_LISTED).join(', ')} and ${items.length - MAX_LISTED} more`
    : items.join(', ');
