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
 * Member name of the child component a schema field is filled from.
 *
 * `Symbol.for`: ESM and CJS builds must agree, same as `authorType`.
 */
export const authoredChild = Symbol.for('elastic.isomer.authored_child');

/** Phantom props type for the child component. Not set at runtime. */
export const authoredProps = Symbol.for('elastic.isomer.authored_props');

/** Set when a field is filled from text children. */
export const authoredText = Symbol.for('elastic.isomer.authored_text');

/** Set when a field is filled from primitive elements no other field claims. */
export const authoredNodes = Symbol.for('elastic.isomer.authored_nodes');

/** Holds a {@link fromChildren} brand's `toItem`. */
export const authoredToItem = Symbol.for('elastic.isomer.authored_to_item');
const authoredTextField = Symbol.for('elastic.isomer.authored_text_field');
const authoredCollapse = Symbol.for('elastic.isomer.authored_collapse');
const authoredDedent = Symbol.for('elastic.isomer.authored_dedent');
const authoredPropsSchema = Symbol.for('elastic.isomer.authored_props_schema');

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

/** A field filled from primitive elements, like a child slot the tree walk does not visit. */
export interface AuthoredNodesBrand {
  readonly [authoredNodes]: true;
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

type zInput<TSchema> = TSchema extends { _zod: { input: infer Input } }
  ? Input
  : never;

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
  authoredNodes,
  authoredCollapse,
  authoredDedent,
  authoredPropsSchema,
] as const;

// Applies a complete branding. Branding an instance again is allowed only with
// the same configuration, absent options included, since both fields share it.
const brand = (
  caller: 'fromChildren' | 'fromNodeChildren' | 'fromTextChildren',
  schema: object,
  config: Partial<Record<(typeof BRANDS)[number], unknown>>
): void => {
  const record = schema as Record<symbol, unknown>;
  if (BRANDS.some((key) => Object.hasOwn(schema, key))) {
    if (BRANDS.every((key) => record[key] === config[key])) {
      return;
    }
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
 * Brands `schema` as JSX children of the member `name`, capitalized on the
 * primitive's component: `fromChildren('item', …)` on `slideList` is
 * `<SlideList.Item>`. Names are unique across a primitive's child tree.
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
  name: TName,
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
  name: TName,
  schema: TSchema,
  options: { text: TText; toItem?: never }
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
  TPropsSchema extends ZodType,
>(
  name: TName,
  schema: TSchema,
  options: {
    text?: string;
    propsSchema: TPropsSchema;
    toItem(
      props: zInput<TPropsSchema> & { children?: ReactNode },
      context: AuthorChildContext
    ): unknown;
  }
): TSchema &
  AuthoredChildBrand<TName, zInput<TPropsSchema> & { children?: ReactNode }> &
  AuthoredToItemBrand;
export function fromChildren<
  const TName extends string,
  TSchema extends ZodType,
  TProps,
>(
  name: TName,
  schema: TSchema,
  options: {
    text?: string;
    toItem(props: TProps, context: AuthorChildContext): unknown;
    propsSchema?: never;
  }
): TSchema & AuthoredChildBrand<TName, TProps> & AuthoredToItemBrand;
export function fromChildren(
  name: string,
  schema: ZodType,
  options?: {
    text?: string;
    toItem?: (this: void, props: never, context: AuthorChildContext) => unknown;
    propsSchema?: ZodType;
  }
): ZodType {
  brand('fromChildren', schema, {
    [authoredChild]: name,
    [authoredTextField]: options?.text,
    [authoredToItem]: options?.toItem,
    [authoredPropsSchema]: options?.propsSchema,
  });
  return schema;
}

/**
 * Brands `schema` as text children.
 *
 * Whitespace collapses unless `collapseWhitespace` is `false`. `dedent` keeps
 * it and reads the text as source, as {@link textFromChildren} does.
 */
export const fromTextChildren = <TSchema extends ZodType>(
  schema: TSchema,
  options?: { collapseWhitespace?: boolean; dedent?: boolean }
): TSchema & AuthoredTextBrand => {
  brand('fromTextChildren', schema, {
    [authoredText]: true,
    [authoredCollapse]:
      options?.collapseWhitespace === false || options?.dedent
        ? false
        : undefined,
    [authoredDedent]: options?.dedent ? true : undefined,
  });
  return schema as TSchema & AuthoredTextBrand;
};

/**
 * Brands `schema`, a node or an array of nodes, as the primitive elements among
 * the children that no other field claims. Use it for nodes the tree walk does
 * not visit; a walked child slot fills from children already.
 */
export const fromNodeChildren = <TSchema extends ZodType>(
  schema: TSchema
): TSchema & AuthoredNodesBrand => {
  brand('fromNodeChildren', schema, { [authoredNodes]: true });
  return schema as TSchema & AuthoredNodesBrand;
};

/** One {@link fromChildren} field as the shim reads it. */
export interface AuthoredChildField {
  field: string;
  /** The member name `fromChildren` was given, before capitalizing. */
  name: string;
  /** Field leftover text children fill. */
  textField?: string;
  /** Replaces the default prop copy. */
  toItem?: (props: object, context: AuthorChildContext) => unknown;
  /** The array element schema, or the field schema itself when it is not an array. */
  itemSchema: ZodType;
  /** Input props for a custom `toItem`, excluding JSX children. */
  propsSchema?: ZodType;
  /** Whether the field holds an array of items rather than one item. */
  array: boolean;
  /** Whether the field accepts `undefined`, so children may be omitted. */
  optional: boolean;
}

/** One {@link fromTextChildren} field as the shim reads it. */
export interface AuthoredTextField {
  field: string;
  /** `true` unless the brand was given `collapseWhitespace: false` or `dedent`. */
  collapseWhitespace: boolean;
  /** Set when the brand was given `dedent`. */
  dedent?: true;
  /** Whether the field accepts `undefined`, so text children may be omitted. */
  optional: boolean;
}

/** One {@link fromNodeChildren} field as the shim reads it. */
export interface AuthoredNodesField {
  field: string;
  /** Whether the field holds an array of nodes rather than one. */
  array: boolean;
}

/** The branded fields found on one object schema. */
export interface AuthoredSpec {
  children: AuthoredChildField[];
  text: AuthoredTextField[];
  /** Absent on a spec built by hand; read as none. */
  nodes?: AuthoredNodesField[];
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
    if (isOptionalSchema(current)) {
      return true;
    }
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
  const name = (holder as { [authoredChild]?: unknown } | undefined)?.[
    authoredChild
  ];
  if (!holder || typeof name !== 'string') {
    return undefined;
  }
  const textField = (holder as { [authoredTextField]?: unknown })[
    authoredTextField
  ];
  const toItem = (holder as { [authoredToItem]?: unknown })[authoredToItem];
  const propsSchema = (holder as { [authoredPropsSchema]?: ZodType })[
    authoredPropsSchema
  ];
  const element = arrayElement(holder);
  const itemSchema = element ?? unwrapAll(holder);
  const child: AuthoredChildField = {
    field,
    name,
    itemSchema,
    array: element !== undefined,
    optional: optionalThrough(schema),
  };
  if (propsSchema) {
    child.propsSchema = propsSchema;
  }
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
  const text: AuthoredTextField = {
    field,
    collapseWhitespace:
      (holder as { [authoredCollapse]?: unknown })[authoredCollapse] !== false,
    optional: optionalThrough(schema),
  };
  if ((holder as { [authoredDedent]?: unknown })[authoredDedent] === true) {
    text.dedent = true;
  }
  return text;
};

/**
 * The branded fields on an object schema, top level only: read a child's own
 * brands from its {@link AuthoredChildField.itemSchema}.
 */
export const readAuthoredSpec = (schema: ZodType): AuthoredSpec => {
  if (zodDefType(schema) !== 'object' || !('shape' in schema)) {
    return { children: [], text: [], nodes: [] };
  }
  const children: AuthoredChildField[] = [];
  const text: AuthoredTextField[] = [];
  const nodes: AuthoredNodesField[] = [];
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
      continue;
    }
    const holder = brandHolder(fieldSchema, authoredNodes);
    if (holder) {
      nodes.push({ field, array: arrayElement(holder) !== undefined });
    }
  }
  return { children, text, nodes };
};
