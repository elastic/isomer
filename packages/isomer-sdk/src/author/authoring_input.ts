/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, type ZodType } from 'zod';

const isSchema = (value: unknown): value is ZodType =>
  typeof value === 'object' &&
  value !== null &&
  '_zod' in value &&
  typeof (value as ZodType)._zod?.def?.type === 'string';

/** Input-schema copy without executable defaults or catch values. */
export const prepareAuthoringInput = (schema: ZodType) => {
  const copies = new Map<ZodType, ZodType>();
  const metadata = z.registry<z.GlobalMeta>();
  const copyValue = (value: unknown): unknown => {
    if (isSchema(value)) {
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
    const { def } = source._zod;
    if (
      def.type === 'default' ||
      def.type === 'prefault' ||
      def.type === 'catch'
    ) {
      const { innerType } = def as { type: string; innerType: ZodType };
      const inner = copySchema(innerType);
      result =
        def.type === 'catch'
          ? z.clone(inner, inner._zod.def)
          : z.optional(inner);
    } else if (def.type === 'lazy') {
      const { getter } = def as { type: string; getter: () => ZodType };
      result = z.lazy(() => copySchema(getter()));
    } else {
      result = z.clone(source, copyValue(def) as typeof def);
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
