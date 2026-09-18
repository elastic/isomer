/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { ZodType } from 'zod';

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

const authoredToItem = Symbol.for('elastic.isomer.authored_to_item');
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

/** `TText` is optional on the child props because leftover text fills it. */
type ChildProps<TItem, TText extends string | undefined> = [TText] extends [
  string,
]
  ? Omit<TItem, TText> &
      Partial<Pick<TItem, Extract<TText, keyof TItem>>> & {
        children?: ReactNode;
      }
  : TItem & { children?: ReactNode };

const tag = (schema: object, key: symbol, value: unknown): void => {
  Object.defineProperty(schema, key, { value, enumerable: false });
};

/**
 * Brands `schema` as JSX children of `childType`.
 *
 * `options.text` copies leftover text onto that field. `options.toItem` replaces
 * the default prop copy; its props annotation is the child component's props.
 * `.describe()` clones, so describe `schema` before passing it in.
 */
export function fromChildren<
  const TName extends string,
  TSchema extends ZodType,
>(
  childType: TName,
  schema: TSchema
): TSchema &
  AuthoredChildBrand<TName, ChildProps<ArrayItem<TSchema>, undefined>>;
export function fromChildren<
  const TName extends string,
  TSchema extends ZodType,
  const TText extends string,
>(
  childType: TName,
  schema: TSchema,
  options: { text: TText }
): TSchema & AuthoredChildBrand<TName, ChildProps<ArrayItem<TSchema>, TText>>;
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
): TSchema & AuthoredChildBrand<TName, TProps>;
export function fromChildren(
  childType: string,
  schema: ZodType,
  options?: {
    text?: string;
    toItem?: (this: void, props: never, context: AuthorChildContext) => unknown;
  }
): ZodType {
  tag(schema, authoredChild, childType);
  if (options?.text !== undefined) {
    tag(schema, authoredTextField, options.text);
  }
  if (options?.toItem) {
    tag(schema, authoredToItem, options.toItem);
  }
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
  tag(schema, authoredText, true);
  if (options?.collapseWhitespace === false) {
    tag(schema, authoredCollapse, false);
  }
  return schema as TSchema & AuthoredTextBrand;
};

export interface AuthoredChildField {
  field: string;
  childType: string;
  textField?: string;
  toItem?: (props: object, context: AuthorChildContext) => unknown;
  itemSchema: ZodType;
  optional: boolean;
  signature: string;
}

export interface AuthoredTextField {
  field: string;
  collapseWhitespace: boolean;
  optional: boolean;
}

export interface AuthoredSpec {
  children: AuthoredChildField[];
  text: AuthoredTextField[];
}

const zodDefType = (schema: object): string | undefined =>
  (schema as { _zod?: { def?: { type?: string } } })._zod?.def?.type;

const unwrap = (schema: ZodType): ZodType => {
  const candidate = schema as ZodType & { unwrap?: () => ZodType };
  return typeof candidate.unwrap === 'function' ? candidate.unwrap() : schema;
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
  if (
    (type === 'optional' || type === 'nullable' || type === 'default') &&
    'unwrap' in schema
  ) {
    return `${type}(${schemaSignature(unwrap(schema), seen)})`;
  }
  return type;
};

const arrayElement = (schema: ZodType): ZodType => {
  const inner = isOptionalSchema(schema) ? unwrap(schema) : schema;
  if (zodDefType(inner) === 'array' && 'element' in inner) {
    return (inner as { element: ZodType }).element;
  }
  return inner;
};

const readChild = (
  field: string,
  schema: ZodType
): AuthoredChildField | undefined => {
  const childType = (schema as { [authoredChild]?: unknown })[authoredChild];
  if (typeof childType !== 'string') {
    return undefined;
  }
  const textField = (schema as { [authoredTextField]?: unknown })[
    authoredTextField
  ];
  const toItem = (schema as { [authoredToItem]?: unknown })[authoredToItem];
  const child: AuthoredChildField = {
    field,
    childType,
    itemSchema: arrayElement(schema),
    optional: isOptionalSchema(schema),
    signature: schemaSignature(arrayElement(schema)),
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
  if ((schema as { [authoredText]?: unknown })[authoredText] !== true) {
    return undefined;
  }
  return {
    field,
    collapseWhitespace:
      (schema as { [authoredCollapse]?: unknown })[authoredCollapse] !== false,
    optional: isOptionalSchema(schema),
  };
};

/** Top-level branded fields on an object schema. Nested brands stay on the item schema. */
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
