/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** `text` as a JSON string on one line: `JSON.stringify` leaves U+2028 and U+2029 raw. */
export const quoteText = (text: string): string =>
  JSON.stringify(text)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const PLAIN_NAME = /^[\w$-]+$/;

/** A name for a one-line message: as it is when plain, else as {@link quoteText} quotes it. */
export const nameText = (name: string): string =>
  PLAIN_NAME.test(name) ? name : quoteText(name);
