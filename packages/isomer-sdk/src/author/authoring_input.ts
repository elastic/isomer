/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, type ZodType } from 'zod';

import {
  cloneZodSchema,
  isZodSchema,
  unwrapZodOnce,
  zodDef,
  zodLazyGetter,
} from '../define/zod_introspect';

// Wrappers whose executable value is dropped from the authoring copy.
const VALUE_WRAPPERS: ReadonlySet<string> = new Set([
  'default',
  'prefault',
  'catch',
]);

/** Input-schema copy without executable defaults or catch values. */
export const prepareAuthoringInput = (schema: ZodType) => {
  const copies = new Map<ZodType, ZodType>();
  const metadata = z.registry<z.GlobalMeta>();
  const copyValue = (value: unknown): unknown => {
    if (isZodSchema(value)) {
      return copySchema(value);
    }
    if (Array.isArray(value)) {
      return value.map(copyValue);
    }
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return value;
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, member]) => [key, copyValue(member)])
    );
  };
  const copySchema = (source: ZodType): ZodType => {
    const cached = copies.get(source);
    if (cached) {
      return cached;
    }
    let result: ZodType;
    copies.set(
      source,
      z.lazy(() => result)
    );
    const def = zodDef(source);
    const wrapped = unwrapZodOnce(source, VALUE_WRAPPERS);
    const getter = zodLazyGetter(source);
    if (wrapped) {
      const inner = copySchema(wrapped);
      result =
        def.type === 'catch'
          ? cloneZodSchema(inner, zodDef(inner))
          : z.optional(inner);
    } else if (getter) {
      result = z.lazy(() => copySchema(getter()));
    } else {
      result = cloneZodSchema(source, copyValue(def) as typeof def);
    }
    copies.set(source, result);
    const meta = z.globalRegistry.get(source);
    if (meta) {
      metadata.add(result, meta);
    }
    return result;
  };
  return { schema: copySchema(schema), metadata };
};
