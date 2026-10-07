/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { ZodType } from 'zod';

import { ISOMER_ERROR_CODES, IsomerError } from '../composition/error';
import type { PrimitiveNode } from '../define/primitive_module';

/**
 * Child-element type a schema field is filled from.
 *
 * `Symbol.for`: ESM and CJS builds must agree, same as `authorType`.
 */
export const authoredChild = Symbol.for('elastic.isomer.authored_child');

/** Phantom props type for the child component. Not set at runtime. */
export const authoredProps = Symbol.for('elastic.isomer.authored_props');

/** Set when a field is filled from text children. */
export const authoredText = Symbol.for('elastic.isomer.authored_text');

/** Holds a {@link fromChildren} brand's `toItem`. */
export const authoredToItem = Symbol.for('elastic.isomer.authored_to_item');
const authoredTextField = Symbol.for('elastic.isomer.authored_text_field');
const authoredCollapse = Symbol.for('elastic.isomer.authored_collapse');

/**
 * A field filled from child elements of `TName`.
 *
 * Phantom: `z.infer` still reads the underlying schema. The shim reads `TName`
 * and `TProps` off the field type, and the symbols off the schema value.
 */
export interface AuthoredChildBrand<TName extends string, TProps> {
  readonly [authoredChild]: TName;
  readonly [authoredProps]: TProps;
}

/** A child field whose `toItem` builds each item, so the shim fills none of the item's own brands. */
export interface AuthoredToItemBrand {
  readonly [authoredToItem]: (
    props: never,
    context: AuthorChildContext
  ) => unknown;
}

/** A field filled from text children. */
export interface AuthoredTextBrand {
  readonly [authoredText]: true;
}

/** What {@link fromChildren}'s `toItem` receives. */
export interface AuthorChildContext {
  /** Nested elements, parsed as body nodes. */
  parseChildren: (children: ReactNode) => PrimitiveNode[];
}

type ArrayItem<TSchema extends ZodType> =
  NonNullable<zOutput<TSchema>> extends readonly (infer Item)[]
    ? Item
    : NonNullable<zOutput<TSchema>>;

type zOutput<TSchema> = TSchema extends { _zod: { output: infer Output } }
  ? Output
  : never;

type WrapperOf<TInner> = {
  _zod: {
    def: {
      type: 'optional' | 'nullable' | 'default' | 'readonly';
      innerType: TInner;
    };
  };
};

type Unwrapped<TSchema> =
  TSchema extends WrapperOf<infer Inner> ? Unwrapped<Inner> : TSchema;

/** Whether `F`, or a wrapper layer of it, carries a {@link fromChildren} brand. */
type IsChildBranded<F> =
  F extends AuthoredChildBrand<string, unknown>
    ? true
    : F extends WrapperOf<infer Inner>
      ? IsChildBranded<Inner>
      : false;

/** A branded field's item schema: the array element through any wrapper, or the unwrapped schema. */
export type ItemSchema<TSchema> =
  Unwrapped<TSchema> extends { element: infer Element }
    ? Element
    : Unwrapped<TSchema>;

/** Item fields a nested {@link fromChildren} brand fills from child elements. */
type ChildBrandedKeys<TItemSchema> = TItemSchema extends {
  shape: infer Shape;
}
  ? string extends keyof Shape
    ? never
    : {
        [K in keyof Shape]: IsChildBranded<Shape[K]> extends true ? K : never;
      }[keyof Shape]
  : never;

/** `TOptional` is optional on the child props because text or child elements fill it. */
type ChildProps<TItem, TOptional extends PropertyKey> = [TOptional] extends [
  never,
]
  ? TItem & { children?: ReactNode }
  : Omit<TItem, TOptional> &
      Partial<Pick<TItem, Extract<TOptional, keyof TItem>>> & {
        children?: ReactNode;
      };

const BRANDS = [
  authoredChild,
  authoredTextField,
  authoredToItem,
  authoredText,
  authoredCollapse,
] as const;

// Applies a complete branding. Branding an instance again is allowed only with
// the same configuration, absent options included, since both fields share it.
const brand = (
  caller: 'fromChildren' | 'fromTextChildren',
  schema: object,
  config: Partial<Record<(typeof BRANDS)[number], unknown>>
): void => {
  const record = schema as Record<symbol, unknown>;
  if (BRANDS.some((key) => Object.hasOwn(schema, key))) {
    if (BRANDS.every((key) => record[key] === config[key])) return;
    throw new IsomerError(
      ISOMER_ERROR_CODES.AUTHORED_SCHEMA_REUSED,
      `${caller}: this schema instance is already branded another way; pass each field its own schema.`
    );
  }
  for (const key of BRANDS) {
    if (config[key] !== undefined) {
      Object.defineProperty(schema, key, {
        value: config[key],
        enumerable: false,
      });
    }
  }
};

/**
 * Brands `schema` as JSX children of `childType`.
 *
 * `options.text` copies leftover text onto that field. `options.toItem` replaces
 * the default prop copy; its props annotation is the child component's props.
 * The brand is read through `.optional()`, `.nullable()`, `.default()`, and
 * `.readonly()`; any other method clones without it, so call it on `schema`
 * before passing it in.
 */
export function fromChildren<
  const TName extends string,
  TSchema extends ZodType,
>(
  childType: TName,
  schema: TSchema
): TSchema &
  AuthoredChildBrand<
    TName,
    ChildProps<ArrayItem<TSchema>, ChildBrandedKeys<ItemSchema<TSchema>>>
  >;
export function fromChildren<
  const TName extends string,
  TSchema extends ZodType,
  const TText extends string,
>(
  childType: TName,
  schema: TSchema,
  options: { text: TText }
): TSchema &
  AuthoredChildBrand<
    TName,
    ChildProps<
      ArrayItem<TSchema>,
      TText | ChildBrandedKeys<ItemSchema<TSchema>>
    >
  >;
export function fromChildren<
  const TName extends string,
  TSchema extends ZodType,
  TProps,
>(
  childType: TName,
  schema: TSchema,
  options: {
    text?: string;
    toItem(props: TProps, context: AuthorChildContext): unknown;
  }
): TSchema & AuthoredChildBrand<TName, TProps> & AuthoredToItemBrand;
export function fromChildren(
  childType: string,
  schema: ZodType,
  options?: {
    text?: string;
    toItem?: (this: void, props: never, context: AuthorChildContext) => unknown;
  }
): ZodType {
  brand('fromChildren', schema, {
    [authoredChild]: childType,
    [authoredTextField]: options?.text,
    [authoredToItem]: options?.toItem,
  });
  return schema;
}

/**
 * Brands `schema` as text children.
 *
 * Whitespace collapses unless `collapseWhitespace` is `false`.
 */
export const fromTextChildren = <TSchema extends ZodType>(
  schema: TSchema,
  options?: { collapseWhitespace?: boolean }
): TSchema & AuthoredTextBrand => {
  brand('fromTextChildren', schema, {
    [authoredText]: true,
    [authoredCollapse]:
      options?.collapseWhitespace === false ? false : undefined,
  });
  return schema as TSchema & AuthoredTextBrand;
};

/** One {@link fromChildren} field as the shim reads it. */
export interface AuthoredChildField {
  field: string;
  childType: string;
  /** Field leftover text children fill. */
  textField?: string;
  /** Replaces the default prop copy. */
  toItem?: (props: object, context: AuthorChildContext) => unknown;
  /** The array element schema, or the field schema itself when it is not an array. */
  itemSchema: ZodType;
  /** Whether the field holds an array of items rather than one item. */
  array: boolean;
  /** Whether the field accepts `undefined`, so children may be omitted. */
  optional: boolean;
  /** Structural fingerprint of `itemSchema`; every field branding one child type must share it. */
  signature: string;
}

/** One {@link fromTextChildren} field as the shim reads it. */
export interface AuthoredTextField {
  field: string;
  /** `true` unless the brand was given `collapseWhitespace: false`. */
  collapseWhitespace: boolean;
  /** Whether the field accepts `undefined`, so text children may be omitted. */
  optional: boolean;
}

/** The branded fields found on one object schema. */
export interface AuthoredSpec {
  children: AuthoredChildField[];
  text: AuthoredTextField[];
}

const zodDefType = (schema: object): string | undefined =>
  (schema as { _zod?: { def?: { type?: string } } })._zod?.def?.type;

const WRAPPER_TYPES = new Set(['optional', 'nullable', 'default', 'readonly']);

interface WrapperDef {
  type?: string;
  innerType?: ZodType;
}

const innerSchema = (schema: ZodType): ZodType | undefined => {
  const def: WrapperDef | undefined = (
    schema as { _zod?: { def?: WrapperDef } }
  )._zod?.def;
  return def?.type && WRAPPER_TYPES.has(def.type) ? def.innerType : undefined;
};

// The schema holding `brand`: `schema` or one it wraps.
const brandHolder = (schema: ZodType, key: symbol): ZodType | undefined => {
  let current: ZodType | undefined = schema;
  while (current && !Object.hasOwn(current, key)) {
    current = innerSchema(current);
  }
  return current;
};

// Whether any wrapper layer of `schema` accepts `undefined`.
const optionalThrough = (schema: ZodType): boolean => {
  for (
    let current: ZodType | undefined = schema;
    current;
    current = innerSchema(current)
  ) {
    if (isOptionalSchema(current)) return true;
  }
  return false;
};

const unwrapAll = (schema: ZodType): ZodType => {
  let current = schema;
  for (let inner = innerSchema(current); inner; inner = innerSchema(current)) {
    current = inner;
  }
  return current;
};

/** `undefined` is a valid value, so children may be omitted. */
const isOptionalSchema = (schema: ZodType): boolean => {
  const type = zodDefType(schema);
  return type === 'optional' || type === 'default';
};

const schemaSignature = (
  schema: ZodType,
  seen: Set<object> = new Set()
): string => {
  if (seen.has(schema)) {
    return 'cycle';
  }
  seen.add(schema);
  const type = zodDefType(schema) ?? '?';
  if (type === 'object' && 'shape' in schema) {
    const shape = schema.shape as Record<string, ZodType>;
    const fields = Object.keys(shape)
      .sort()
      .map((key) => `${key}:${schemaSignature(shape[key] as ZodType, seen)}`);
    return `{${fields.join(',')}}`;
  }
  if (type === 'array' && 'element' in schema) {
    return `[${schemaSignature((schema as { element: ZodType }).element, seen)}]`;
  }
  const inner = innerSchema(schema);
  if (inner) {
    return `${type}(${schemaSignature(inner, seen)})`;
  }
  return type;
};

const arrayElement = (schema: ZodType): ZodType | undefined => {
  const inner = unwrapAll(schema);
  return zodDefType(inner) === 'array' && 'element' in inner
    ? (inner as { element: ZodType }).element
    : undefined;
};

const readChild = (
  field: string,
  schema: ZodType
): AuthoredChildField | undefined => {
  const holder = brandHolder(schema, authoredChild);
  const childType = (holder as { [authoredChild]?: unknown } | undefined)?.[
    authoredChild
  ];
  if (!holder || typeof childType !== 'string') {
    return undefined;
  }
  const textField = (holder as { [authoredTextField]?: unknown })[
    authoredTextField
  ];
  const toItem = (holder as { [authoredToItem]?: unknown })[authoredToItem];
  const element = arrayElement(holder);
  const itemSchema = element ?? unwrapAll(holder);
  const child: AuthoredChildField = {
    field,
    childType,
    itemSchema,
    array: element !== undefined,
    optional: optionalThrough(schema),
    signature: schemaSignature(itemSchema),
  };
  if (typeof textField === 'string') {
    child.textField = textField;
  }
  if (typeof toItem === 'function') {
    child.toItem = toItem as (
      props: object,
      context: AuthorChildContext
    ) => unknown;
  }
  return child;
};

const readText = (
  field: string,
  schema: ZodType
): AuthoredTextField | undefined => {
  const holder = brandHolder(schema, authoredText);
  if (!holder) {
    return undefined;
  }
  return {
    field,
    collapseWhitespace:
      (holder as { [authoredCollapse]?: unknown })[authoredCollapse] !== false,
    optional: optionalThrough(schema),
  };
};

/**
 * The branded fields on an object schema, top level only: read a child's own
 * brands from its {@link AuthoredChildField.itemSchema}.
 */
export const readAuthoredSpec = (schema: ZodType): AuthoredSpec => {
  if (zodDefType(schema) !== 'object' || !('shape' in schema)) {
    return { children: [], text: [] };
  }
  const children: AuthoredChildField[] = [];
  const text: AuthoredTextField[] = [];
  for (const [field, fieldSchema] of Object.entries(
    schema.shape as Record<string, ZodType>
  )) {
    const child = readChild(field, fieldSchema);
    if (child) {
      children.push(child);
      continue;
    }
    const textField = readText(field, fieldSchema);
    if (textField) {
      text.push(textField);
    }
  }
  return { children, text };
};
