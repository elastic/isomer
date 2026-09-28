/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const LINE_TERMINATORS = /\r\n|[\n\r\u2028\u2029]/g;

const NAME_MAX_LENGTH = 80;

/** `text` on one line, so it cannot start a line of its own in model-facing text. */
export const oneLine = (text: string): string =>
  text.replace(LINE_TERMINATORS, ' ');

/** `name` as a JSON string on one line, cut to {@link NAME_MAX_LENGTH} characters, for echoing model input. */
export const quoteName = (name: string): string =>
  JSON.stringify(
    name.length > NAME_MAX_LENGTH ? `${name.slice(0, NAME_MAX_LENGTH)}…` : name
  ).replace(
    /[\u2028\u2029]/g,
    (separator) => `\\u${separator.charCodeAt(0).toString(16)}`
  );
