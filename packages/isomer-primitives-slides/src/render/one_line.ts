/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Pack-local until the SDK exports one (elastic/isomer#75).
export const oneLine = (text: string): string =>
  text.replace(/\r\n|[\n\r\u2028\u2029]/g, ' ');
