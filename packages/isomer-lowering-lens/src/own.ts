/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** `record[key]` for a saved key, never an inherited property such as `constructor`. */
export const own = <T>(
  record: Readonly<Record<string, T>>,
  key: string
): T | undefined => (Object.hasOwn(record, key) ? record[key] : undefined);
