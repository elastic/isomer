/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The one module that reads Zod internals (`_zod`, its `def`, `innerType`).
// A Zod upgrade that moves them changes this file alone.

import { z, type ZodType } from 'zod';

/** A schema's internal definition. */
export type ZodDef = ZodType['_zod']['def'];

/** The wrapper kinds whose `undefined`/`null` handling keeps the inner shape. */
export type ZodWrapperType = 'optional' | 'nullable' | 'default' | 'readonly';

/** Wrappers whose inner schema still describes the authored value. */
export const ZOD_WRAPPER_TYPES: ReadonlySet<string> = new Set<ZodWrapperType>([
  'optional',
  'nullable',
  'default',
  'readonly',
]);

/** A schema's input type, read without constraining `TSchema` to `ZodType`. */
export type ZodInputOf<TSchema> = TSchema extends {
  _zod: { input: infer Input };
}
  ? Input
  : never;

/** A schema's output type, read without constraining `TSchema` to `ZodType`. */
export type ZodOutputOf<TSchema> = TSchema extends {
  _zod: { output: infer Output };
}
  ? Output
  : never;

/** A {@link ZodWrapperType} layer around `TInner`, as the type system sees it. */
export type ZodWrapperOf<TInner> = {
  _zod: {
    def: {
      type: ZodWrapperType;
      innerType: TInner;
    };
  };
};

interface LooseDef {
  type?: unknown;
  innerType?: unknown;
  element?: unknown;
  shape?: unknown;
  catchall?: unknown;
  getter?: unknown;
  checks?: unknown;
  check?: unknown;
}

const looseDef = (value: unknown): LooseDef | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const internals = (value as { _zod?: unknown })._zod;
  if (typeof internals !== 'object' || internals === null) {
    return undefined;
  }
  const { def } = internals as { def?: unknown };
  return typeof def === 'object' && def !== null ? def : undefined;
};

/** Whether `value` is a Zod schema: it carries a def with a type tag. */
export const isZodSchema = (value: unknown): value is ZodType =>
  typeof looseDef(value)?.type === 'string';

/** The def's type tag (`object`, `optional`, `array`, …), or `undefined` for a non-schema. */
export const zodDefType = (value: unknown): string | undefined => {
  const type = looseDef(value)?.type;
  return typeof type === 'string' ? type : undefined;
};

/** A schema's def, for cloning with {@link cloneZodSchema}. */
export const zodDef = (schema: ZodType): ZodDef => schema._zod.def;

/**
 * The schema one wrapper layer holds, when `schema`'s type tag is in `types`;
 * otherwise `undefined`.
 */
export const unwrapZodOnce = (
  schema: unknown,
  types: ReadonlySet<string> = ZOD_WRAPPER_TYPES
): ZodType | undefined => {
  const def = looseDef(schema);
  return typeof def?.type === 'string' &&
    types.has(def.type) &&
    isZodSchema(def.innerType)
    ? def.innerType
    : undefined;
};

/** `schema` with every layer in `types` peeled off. */
export const unwrapZod = (
  schema: ZodType,
  types: ReadonlySet<string> = ZOD_WRAPPER_TYPES
): ZodType => {
  let current = schema;
  for (
    let inner = unwrapZodOnce(current, types);
    inner;
    inner = unwrapZodOnce(current, types)
  ) {
    current = inner;
  }
  return current;
};

/** The element schema of an array schema, or `undefined`. */
export const zodArrayElement = (schema: ZodType): ZodType | undefined => {
  const def = looseDef(schema);
  return def?.type === 'array' && isZodSchema(def.element)
    ? def.element
    : undefined;
};

/** The shape of an object schema, or `undefined`. */
export const zodObjectShape = (
  schema: ZodType
): Readonly<Record<string, ZodType>> | undefined => {
  const def = looseDef(schema);
  return def?.type === 'object' &&
    typeof def.shape === 'object' &&
    def.shape !== null
    ? (def.shape as Record<string, ZodType>)
    : undefined;
};

/** Whether an object schema declares a `catchall` (including `.loose()`/`.strict()`). */
export const zodObjectHasCatchall = (schema: ZodType): boolean =>
  looseDef(schema)?.catchall !== undefined;

/** The getter a `z.lazy` schema resolves through, or `undefined`. */
export const zodLazyGetter = (schema: ZodType): (() => ZodType) | undefined => {
  const def = looseDef(schema);
  return def?.type === 'lazy' && typeof def.getter === 'function'
    ? (def.getter as () => ZodType)
    : undefined;
};

/** The checks a schema carries: `.refine`, `.check`, `.max`, …. */
export const zodChecks = (schema: ZodType): readonly unknown[] => {
  const checks = looseDef(schema)?.checks;
  return Array.isArray(checks) ? checks : [];
};

/** Whether `check` is a custom check: `.refine`, `.superRefine`, or a `z.refine` given to `.check`. */
export const isZodCustomCheck = (check: unknown): check is object =>
  looseDef(check)?.check === 'custom';

/** The schemas `schema` holds directly: its inner, element, shape, options, a lazy schema's target, …. */
export const zodNestedSchemas = (schema: ZodType): ZodType[] => {
  const def = looseDef(schema);
  if (!def) {
    return [];
  }
  const values: unknown[] = Object.values(def as Record<string, unknown>);
  const nested = values.flatMap((value): unknown[] => {
    if (isZodSchema(value)) {
      return [value];
    }
    if (Array.isArray(value)) {
      return value as unknown[];
    }
    return typeof value === 'object' && value !== null
      ? Object.values(value as Record<string, unknown>)
      : [];
  });
  const lazy = zodLazyGetter(schema);
  return [...nested, ...(lazy ? [lazy()] : [])].filter(isZodSchema);
};

/** A new schema of `schema`'s class built from `def`. */
export const cloneZodSchema = (schema: ZodType, def: ZodDef): ZodType =>
  z.clone(schema, def);
