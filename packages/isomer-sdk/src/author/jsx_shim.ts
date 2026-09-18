/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { z, ZodObject, ZodType } from 'zod';

import type { Composition } from '../composition/composition';
import { IsomerError } from '../composition/error';
import type { PrimitiveNode } from '../define/primitive_module';

import {
  type AuthoredChildBrand,
  type AuthoredChildField,
  type AuthoredSpec,
  type AuthoredTextBrand,
  readAuthoredSpec,
} from './authored_fields';
import { type AuthorComponent, authorType, defineAuthorComponent } from './jsx';

/** A {@link Composition} whose `body` is the pack's own authoring node type. */
export type AuthorComposition<TNode extends PrimitiveNode = PrimitiveNode> =
  Omit<Composition<TNode>, 'body'> & {
    body: TNode[];
  };

/**
 * Props of the shim's root element: the composition fields minus `type`, with
 * `body` given either as an array or as JSX children.
 */
export interface CompositionAuthorProps<
  TNode extends PrimitiveNode = PrimitiveNode,
> extends Omit<AuthorComposition<TNode>, 'type' | 'body'> {
  /** Wins outright when present: `children` are then ignored, not merged. */
  body?: TNode[];
  /** Parsed into `body` only when `body` is absent. Each child must be an authoring element of a registered primitive type. */
  children?: ReactNode;
}

/** Literal `type` strings; wide `string` is dropped so a string index cannot collide with `component`. */
type LiteralType<T extends string> = string extends T ? never : T;

/** No keys. Intersects away, unlike `Record<string, never>`. */
type NoKeys = Record<never, never>;

type ShapeOf<T> = T extends { shape: infer Shape } ? Shape : NoKeys;

/** A primitive's schema type, or `never` when it declares none. */
export type SchemaOf<P> = P extends { schema: infer S }
  ? S extends ZodObject
    ? S
    : never
  : never;

/** A bare `ZodObject` has a string index; a real shape does not. */
export type LooseSchema<TSchema> = string extends keyof ShapeOf<TSchema>
  ? true
  : false;

type AuthoredNames<TSchema> = {
  [K in keyof ShapeOf<TSchema>]: ShapeOf<TSchema>[K] extends
    AuthoredChildBrand<string, unknown> | AuthoredTextBrand
    ? K
    : never;
}[keyof ShapeOf<TSchema>];

type AuthorPropsForSchema<TSchema extends ZodObject> =
  LooseSchema<TSchema> extends true
    ? Record<string, unknown> & { children?: ReactNode }
    : Omit<z.infer<TSchema>, 'type' | AuthoredNames<TSchema>> &
        Partial<
          Pick<
            z.infer<TSchema>,
            Extract<AuthoredNames<TSchema>, keyof z.infer<TSchema>>
          >
        > & { children?: ReactNode };

type AuthorPropsFor<P> = [SchemaOf<P>] extends [never]
  ? Record<string, unknown> & { children?: ReactNode }
  : AuthorPropsForSchema<SchemaOf<P>>;

type ChildEntry<F> = 0 extends 1 & F
  ? NoKeys
  : F extends AuthoredChildBrand<infer Name, infer Props>
    ? [Name] extends [string]
      ? {
          [K in Capitalize<Name>]: AuthorComponent<
            Props & { children?: ReactNode },
            Name
          >;
        }
      : NoKeys
    : NoKeys;

type UnionToIntersection<T> = (
  T extends unknown ? (value: T) => void : never
) extends (value: infer R) => void
  ? R
  : never;

type ChildComponentsOf<TSchema> =
  LooseSchema<TSchema> extends true
    ? NoKeys
    : UnionToIntersection<
        {
          [K in keyof ShapeOf<TSchema>]: ChildEntry<ShapeOf<TSchema>[K]>;
        }[keyof ShapeOf<TSchema>]
      >;

type ChildMapOfTuple<TPrimitives> = TPrimitives extends readonly [
  infer Head,
  ...infer Tail,
]
  ? ChildComponentsOf<SchemaOf<Head>> &
      ChildMapOfTuple<Tail extends readonly { type: string }[] ? Tail : []>
  : NoKeys;

type ChildComponentMap<TPrimitives extends readonly { type: string }[]> =
  ChildMapOfTuple<TPrimitives>;

/**
 * PascalCase authoring components keyed from a pack's primitive `type` list.
 * `slideFrame` becomes `SlideFrame`. Props come from the primitive's schema.
 */
export type PrimitiveComponentMap<
  TPrimitives extends readonly { type: string }[],
> = {
  [
    P in TPrimitives[number] as Capitalize<LiteralType<P['type'] & string>>
  ]: AuthorComponent<AuthorPropsFor<P>, P['type'] & string>;
};

/**
 * A pack's JSX authoring front: the root `Composition` element, a factory for
 * extension components, one PascalCase component per primitive, and the
 * conversion back to plain data.
 */
export type JsxShim<
  TNode extends PrimitiveNode = PrimitiveNode,
  TPrimitives extends readonly { type: string }[] = readonly { type: string }[],
> = {
  Composition: AuthorComponent<CompositionAuthorProps<TNode>, 'view'>;
  /** Components for types outside the primitive list. They are rejected as body nodes. */
  component: <TProps extends object = Record<string, unknown>>(
    type: string
  ) => AuthorComponent<TProps, string>;
  /** Throws when the root is not the `Composition` element, or when a child is not a registered primitive. */
  toComposition: (
    element: ReactElement<CompositionAuthorProps<TNode>>
  ) => AuthorComposition<TNode>;
} & PrimitiveComponentMap<TPrimitives> &
  ChildComponentMap<TPrimitives>;

/**
 * Builds a pack's {@link JsxShim} from its primitive list.
 *
 * Branded schema fields ({@link fromChildren}, {@link fromTextChildren}) fill
 * from JSX children, and each child type becomes a component. A primitive with
 * no brand still fills its unique child-array field from
 * {@link PrimitiveDefinition.children}.
 */
export const buildJsxShim = <
  const TPrimitives extends readonly { type: string }[] = readonly {
    type: string;
  }[],
  TNode extends PrimitiveNode = PrimitiveNode,
>(
  primitives: TPrimitives = [] as unknown as TPrimitives
): JsxShim<TNode, TPrimitives> => {
  const extensionTypes = new Set(primitives.map((primitive) => primitive.type));
  const childSlotsByType = new Map(
    primitives.map((primitive) => [
      primitive.type,
      inferChildSlots('children' in primitive ? primitive.children : undefined),
    ])
  );
  const { authoredByType, childComponents } = collectAuthored(primitives);
  const view = defineAuthorComponent<CompositionAuthorProps<TNode>, 'view'>(
    'view'
  );
  const env: ParseEnv = {
    authoredByType,
    childSlotsByType,
    extensionTypes,
  };

  return {
    Composition: view,
    component: <TProps extends object = Record<string, unknown>>(
      type: string
    ) => defineAuthorComponent<TProps, string>(type),
    toComposition: (element) => toAuthorComposition<TNode>(element, env),
    ...Object.fromEntries(
      primitives.map((primitive) => [
        capitalize(primitive.type),
        defineAuthorComponent(primitive.type),
      ])
    ),
    ...Object.fromEntries(
      [...childComponents].map(([type, component]) => [
        capitalize(type),
        component,
      ])
    ),
  } as JsxShim<TNode, TPrimitives>;
};

interface ChildSlot {
  array: boolean;
  field: string;
}

interface ParseEnv {
  authoredByType: ReadonlyMap<string, AuthoredSpec>;
  childSlotsByType: ReadonlyMap<string, readonly ChildSlot[]>;
  extensionTypes: ReadonlySet<string>;
}

const collectAuthored = (
  primitives: readonly { type: string; schema?: unknown }[]
): {
  authoredByType: Map<string, AuthoredSpec>;
  childComponents: Map<string, AuthorComponent<unknown, string>>;
} => {
  const authoredByType = new Map<string, AuthoredSpec>();
  const signatures = new Map<string, string>();
  const childComponents = new Map<string, AuthorComponent<unknown, string>>();
  for (const primitive of primitives) {
    const schema = primitive.schema;
    if (!isZodType(schema)) {
      continue;
    }
    const spec = readAuthoredSpec(schema);
    if (spec.children.length === 0 && spec.text.length === 0) {
      continue;
    }
    authoredByType.set(primitive.type, spec);
    for (const field of spec.children) {
      const prior = signatures.get(field.childType);
      if (prior !== undefined && prior !== field.signature) {
        throw new IsomerError(
          'DUPLICATE_AUTHORED_CHILD',
          `Child type "${field.childType}" is branded with two different item shapes.`
        );
      }
      signatures.set(field.childType, field.signature);
      if (!childComponents.has(field.childType)) {
        childComponents.set(
          field.childType,
          defineAuthorComponent(field.childType)
        );
      }
    }
  }
  return { authoredByType, childComponents };
};

const isZodType = (schema: unknown): schema is ZodType =>
  typeof schema === 'object' && schema !== null && '_zod' in schema;

const toAuthorComposition = <TNode extends PrimitiveNode>(
  element: ReactElement<CompositionAuthorProps<TNode>>,
  env: ParseEnv
): AuthorComposition<TNode> => {
  requireAuthorElement<CompositionAuthorProps<TNode>>(element, 'view');
  const props = element.props;
  const resolvedBody =
    props.body ??
    flattenChildren(props.children).map((child) =>
      bodyNodeFromElement<TNode>(child, env)
    );
  const spec: AuthorComposition<TNode> = {
    type: 'view',
    body: resolvedBody,
  };

  if (props.title !== undefined) {
    spec.title = props.title;
  }
  if (props.subtitle !== undefined) {
    spec.subtitle = props.subtitle;
  }
  if (props.theme !== undefined) {
    spec.theme = props.theme;
  }
  if (props.meta !== undefined) {
    spec.meta = props.meta;
  }

  return spec;
};

const bodyNodeFromElement = <TNode extends PrimitiveNode>(
  node: ReactNode,
  env: ParseEnv
): TNode => {
  const element = requireAuthorElement<{ children?: ReactNode }>(node);
  const type = getAuthorType(element);
  if (!env.extensionTypes.has(type)) {
    throw new IsomerError(
      'INVALID_BODY_NODE',
      `"${type}" cannot be used as a composition body node.`
    );
  }

  const parseChild = (child: ReactNode): TNode =>
    bodyNodeFromElement<TNode>(child, env);
  const slots = env.childSlotsByType.get(type) ?? [];
  const authored = env.authoredByType.get(type);
  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(
    withoutChildren<Record<string, unknown>>(element)
  )) {
    const childField = authored?.children.find((field) => field.field === key);
    converted[key] = childField
      ? valueFromChildField(value, childField, env)
      : convertPropValue(value, key, slots, parseChild);
  }

  const rawChildren = element.props.children;
  if (authored && (authored.children.length > 0 || authored.text.length > 0)) {
    fillAuthoredFields(converted, authored, rawChildren, env);
  } else {
    const unique = slots.length === 1 ? slots[0] : undefined;
    if (
      unique &&
      converted[unique.field] === undefined &&
      rawChildren !== undefined
    ) {
      const nested = flattenChildren(rawChildren).map(parseChild);
      converted[unique.field] = unique.array ? nested : nested[0];
    }
  }

  return omitUndefined({ ...converted, type }) as TNode;
};

const fillAuthoredFields = (
  converted: Record<string, unknown>,
  authored: AuthoredSpec,
  rawChildren: ReactNode,
  env: ParseEnv
): void => {
  for (const field of authored.children) {
    if (converted[field.field] !== undefined || rawChildren === undefined) {
      continue;
    }
    converted[field.field] = itemsFromBrand(rawChildren, field, env);
  }
  for (const field of authored.text) {
    if (converted[field.field] !== undefined) {
      continue;
    }
    if (rawChildren === undefined) {
      if (!field.optional) {
        throw new IsomerError(
          'MISSING_AUTHORED_TEXT',
          `Expected text children for "${field.field}".`
        );
      }
      continue;
    }
    converted[field.field] = textFromChildren(rawChildren, {
      collapseWhitespace: field.collapseWhitespace,
    });
  }
};

const valueFromChildField = (
  value: unknown,
  field: AuthoredChildField,
  env: ParseEnv
): unknown => {
  if (isJsxNodes(value)) {
    return itemsFromBrand(value, field, env);
  }
  return value;
};

const isJsxNodes = (value: unknown): value is ReactNode => {
  if (isAuthorElement(value)) {
    return true;
  }
  if (isValidElement(value) && value.type === Fragment) {
    return true;
  }
  return (
    Array.isArray(value) &&
    value.some((item: unknown) => isAuthorElement(item) || isValidElement(item))
  );
};

const itemsFromBrand = (
  children: ReactNode,
  field: AuthoredChildField,
  env: ParseEnv
): unknown[] =>
  flattenChildren(children).map((child) => itemFromElement(child, field, env));

const itemFromElement = (
  child: ReactNode,
  field: AuthoredChildField,
  env: ParseEnv
): unknown => {
  const element = requireAuthorElement<Record<string, unknown>>(
    child,
    field.childType
  );
  if (field.toItem) {
    return field.toItem(element.props, {
      parseChildren: (nested) =>
        flattenChildren(nested).map((node) => bodyNodeFromElement(node, env)),
    });
  }
  const props = withoutChildren<Record<string, unknown>>(element);
  const nestedChildren = element.props.children;
  if (
    field.textField !== undefined &&
    props[field.textField] === undefined &&
    nestedChildren !== undefined &&
    !hasAuthorElement(nestedChildren)
  ) {
    props[field.textField] = textFromChildren(nestedChildren);
  }
  fillNestedBrands(field.itemSchema, props, nestedChildren, env);
  return props;
};

const fillNestedBrands = (
  itemSchema: ZodType,
  props: Record<string, unknown>,
  children: ReactNode,
  env: ParseEnv
): void => {
  if (children === undefined) {
    return;
  }
  const spec = readAuthoredSpec(itemSchema);
  for (const field of spec.children) {
    if (props[field.field] !== undefined) {
      continue;
    }
    const matching = flattenChildren(children).filter(
      (child) =>
        isAuthorElement(child) && getAuthorType(child) === field.childType
    );
    if (matching.length === 0) {
      continue;
    }
    props[field.field] = matching.map((child) =>
      itemFromElement(child, field, env)
    );
  }
};

const hasAuthorElement = (children: ReactNode): boolean =>
  flattenChildren(children).some((child) => isAuthorElement(child));

const convertPropValue = <TNode extends PrimitiveNode>(
  value: unknown,
  field: string,
  slots: readonly ChildSlot[],
  parseChild: (child: ReactNode) => TNode
): unknown => {
  const asArray = slots.some((slot) => slot.field === field && slot.array);
  const fromJsx = nodesFromJsx(value, parseChild);
  if (fromJsx) {
    return asArray ? fromJsx : fromJsx[0];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item: unknown) => {
      const nodes = nodesFromJsx(item, parseChild);
      return nodes ?? [item];
    });
  }
  return value;
};

const nodesFromJsx = <TNode extends PrimitiveNode>(
  value: unknown,
  parseChild: (child: ReactNode) => TNode
): TNode[] | undefined => {
  if (isAuthorElement(value)) {
    return [parseChild(value)];
  }
  if (isValidElement(value) && value.type === Fragment) {
    return flattenChildren(value).map(parseChild);
  }
  return undefined;
};

const isAuthorElement = (value: unknown): value is ReactElement => {
  if (!isValidElement(value)) {
    return false;
  }
  const component = value.type as Partial<AuthorComponent<unknown, string>>;
  return typeof component[authorType] === 'string';
};

/**
 * Reads {@link PrimitiveDefinition.children} against a probe node so JSX can
 * fill the same fields a tree walk would visit. Paths like `body[0]` are array
 * slots; a bare `header` is a single nested node.
 */
const inferChildSlots = (children: unknown): readonly ChildSlot[] => {
  if (typeof children !== 'function') {
    return [];
  }
  const probeNode: PrimitiveNode = { type: '__probe__' };
  const node = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'type') {
          return probeNode.type;
        }
        return [probeNode];
      },
    }
  );
  try {
    const refs = (children as (value: unknown) => unknown)(node);
    if (!Array.isArray(refs)) {
      return [];
    }
    const byField = new Map<string, boolean>();
    for (const ref of refs) {
      if (!isChildRef(ref)) {
        continue;
      }
      const field = /^[A-Za-z_]\w*/.exec(ref.path)?.[0];
      if (!field) {
        continue;
      }
      byField.set(
        field,
        byField.get(field) === true || /\[\d+\]/.test(ref.path)
      );
    }
    return [...byField.entries()].map(([field, array]) => ({ array, field }));
  } catch {
    return [];
  }
};

const isChildRef = (value: unknown): value is { path: string } =>
  typeof value === 'object' &&
  value !== null &&
  'path' in value &&
  typeof value.path === 'string';

const capitalize = (value: string): string =>
  `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;

/** React children as a flat array, with fragments inlined. */
export const flattenChildren = (children: ReactNode): ReactNode[] =>
  Children.toArray(children).flatMap((child) => {
    if (isValidElement(child) && child.type === Fragment) {
      const props = child.props as { children?: ReactNode };
      return flattenChildren(props.children);
    }
    return child;
  });

/**
 * Children joined into one string. Throws on an element child, so a prop typed as text stays text. Collapses whitespace unless `{ collapseWhitespace: false }`.
 */
export const textFromChildren = (
  children: ReactNode,
  options?: { collapseWhitespace?: boolean }
): string => {
  const text = flattenChildren(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child);
      }
      throw new IsomerError(
        'EXPECTED_TEXT_CHILDREN',
        'Expected text children.'
      );
    })
    .join('');
  if (options?.collapseWhitespace === false) {
    return text.trim();
  }
  return text.replace(/\s+/g, ' ').trim();
};

/** An element's props without `children` and without `undefined` entries. */
export const withoutChildren = <TProps>(
  element: ReactElement<unknown>
): TProps => {
  const props = { ...(element.props as TProps & { children?: ReactNode }) };
  delete props.children;
  return omitUndefined(props);
};

/** Narrows `element` to an authoring element, asserting `type` when given. */
export const requireAuthorElement = <TProps>(
  element: ReactNode,
  type?: string
): ReactElement<TProps & { children?: ReactNode }> => {
  assertValidElement(element);
  const actual = getAuthorType(element);
  if (type !== undefined && actual !== type) {
    throw new IsomerError(
      'AUTHOR_TYPE_MISMATCH',
      `Expected <${type}> but received <${actual}>.`
    );
  }
  return element as ReactElement<TProps & { children?: ReactNode }>;
};

/**
 * The props of each child, requiring every one of them to be `childType`.
 * `options.text` copies leftover text children onto that field when it is absent.
 */
export const itemsFromChildren = <TItem>(
  children: ReactNode,
  childType: string,
  options?: { text?: string }
): TItem[] =>
  flattenChildren(children).map((child) => {
    const nested = requireAuthorElement<TItem & { children?: ReactNode }>(
      child,
      childType
    );
    const props = withoutChildren<TItem>(nested);
    const { text } = options ?? {};
    if (
      text === undefined ||
      nested.props.children === undefined ||
      (props as Record<string, unknown>)[text] !== undefined
    ) {
      return props;
    }
    return { ...props, [text]: textFromChildren(nested.props.children) };
  });

/** The primitive type {@link authorType} brands onto `element`'s component. */
export const getAuthorType = (element: ReactElement<unknown>): string => {
  const component = element.type as Partial<AuthorComponent<unknown, string>>;
  const type = component[authorType];
  if (!type) {
    throw new IsomerError(
      'EXPECTED_AUTHOR_COMPONENT',
      'Expected an Isomer authoring component.'
    );
  }
  return type;
};

const assertValidElement: (
  element: ReactNode
) => asserts element is ReactElement<unknown> = (element) => {
  if (!isValidElement(element)) {
    throw new IsomerError(
      'EXPECTED_JSX_ELEMENT',
      'Expected an Isomer JSX element.'
    );
  }
};

const omitUndefined = <T extends object>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== undefined)
  ) as T;
