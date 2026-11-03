/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A parsed JSON object, or a JSON Schema node. */
export type JsonObject = Record<string, unknown>;

/** The `$ref` prefix of a local `$defs` entry. */
export const DEF_PREFIX = '#/$defs/';

/** A non-null, non-array object. */
export const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The `$defs` id a local `$ref` points at, or `undefined`. */
export const parseDefRef = (ref: unknown): string | undefined =>
  typeof ref === 'string' && ref.startsWith(DEF_PREFIX)
    ? ref.slice(DEF_PREFIX.length)
    : undefined;

/** `defs[id]`, ignoring inherited properties. */
export const ownDef = (defs: JsonObject, id: string): unknown =>
  Object.hasOwn(defs, id) ? defs[id] : undefined;
