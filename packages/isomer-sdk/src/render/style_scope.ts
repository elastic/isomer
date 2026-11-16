/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A value, not a method, so a {@link contextWith} view reads it unchanged. */
export const STYLE_SCOPE = Symbol.for('@elastic/isomer-sdk/style-scope');

/**
 * The token every render context a style adapter makes for one render shares,
 * across both HTML passes, for a renderer that caches output per render.
 * `undefined` for a context no such adapter made.
 */
export const styleScopeOf = (context: unknown): object | undefined =>
  typeof context === 'object' && context !== null
    ? (Reflect.get(context, STYLE_SCOPE) as object | undefined)
    : undefined;
