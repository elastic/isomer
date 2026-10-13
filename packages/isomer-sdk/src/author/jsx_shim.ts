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
  type AuthoredNodesBrand,
  type AuthoredSpec,
  type AuthoredTextBrand,
  type AuthoredToItemBrand,
  type ItemSchema,
  readAuthoredSpec,
} from './authored_fields';
import {
  capitalize,
  type ChildSlot,
  createAuthoringModel,
  memberType,
} from './authoring_model';
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
type SchemaOf<P> = P extends { schema: infer S }
  ? S extends ZodObject
    ? S
    : never
  : never;

/** A bare `ZodObject` has a string index; a real shape does not. */
type LooseSchema<TSchema> = string extends keyof ShapeOf<TSchema>
  ? true
  : false;

// The schema a brand is read from: `F`, or one an optional, nullable, default,
// or readonly wrapper holds.
type Branded<F> = F extends
  AuthoredChildBrand<string, unknown> | AuthoredTextBrand | AuthoredNodesBrand
  ? F
  : F extends {
        _zod: {
          def: {
            type: 'optional' | 'nullable' | 'default' | 'readonly';
            innerType: infer Inner;
          };
        };
      }
    ? Branded<Inner>
    : F;

type AuthoredNames<TSchema> = {
  [K in keyof ShapeOf<TSchema>]: Branded<ShapeOf<TSchema>[K]> extends
    AuthoredChildBrand<string, unknown> | AuthoredTextBrand | AuthoredNodesBrand
    ? K
    : never;
}[keyof ShapeOf<TSchema>];

type SlotValue<V> =
  NonNullable<V> extends readonly (infer Item)[] ? Item : NonNullable<V>;

/**
 * A field holding body nodes, or an array of them: its `type` is wide or one of
 * the pack's `TTypes`, so a discriminated config object does not count.
 */
type NodeSlotKey<T, TTypes extends string> = {
  [K in keyof T]-?: K extends 'type'
    ? never
    : SlotValue<T[K]> extends { type: infer Type extends string }
      ? string extends Type
        ? K
        : [Type] extends [TTypes]
          ? K
          : never
      : never;
}[keyof T];

type IsUnion<T, U = T> = [T] extends [never]
  ? false
  : T extends unknown
    ? [U] extends [T]
      ? false
      : true
    : false;

/** `T` when it is exactly one key. */
type Only<T> = [T] extends [never]
  ? never
  : IsUnion<T> extends true
    ? never
    : T;

/**
 * The one unbranded node field JSX children fill. With several, each stays a
 * prop, as at runtime.
 */
type PassthroughSlot<TSchema extends ZodObject, TTypes extends string> = Only<
  Exclude<NodeSlotKey<z.infer<TSchema>, TTypes>, AuthoredNames<TSchema>>
>;

type FilledNames<TSchema extends ZodObject, TTypes extends string> =
  AuthoredNames<TSchema> | PassthroughSlot<TSchema, TTypes>;

type AuthorPropsForSchema<TSchema extends ZodObject, TTypes extends string> =
  LooseSchema<TSchema> extends true
    ? Record<string, unknown> & { children?: ReactNode }
    : Omit<z.infer<TSchema>, 'type' | FilledNames<TSchema, TTypes>> &
        Partial<
          Pick<
            z.infer<TSchema>,
            Extract<FilledNames<TSchema, TTypes>, keyof z.infer<TSchema>>
          >
        > & { children?: ReactNode };

type AuthorPropsFor<P, TTypes extends string> = [SchemaOf<P>] extends [never]
  ? Record<string, unknown> & { children?: ReactNode }
  : AuthorPropsForSchema<SchemaOf<P>, TTypes>;

type ChildEntry<
  F,
  TOwner extends string,
  TDepth extends unknown[],
> = 0 extends 1 & F
  ? NoKeys
  : F extends AuthoredChildBrand<infer Name, infer Props>
    ? [Name] extends [string]
      ? {
          [K in Capitalize<Name>]: AuthorComponent<
            Props & { children?: ReactNode },
            `${TOwner}.${K}`
          >;
        } & (F extends AuthoredToItemBrand
          ? NoKeys
          : ChildComponentsOf<ItemSchema<F>, TOwner, [...TDepth, unknown]>)
      : NoKeys
    : NoKeys;

type UnionToIntersection<T> = (
  T extends unknown ? (value: T) => void : never
) extends (value: infer R) => void
  ? R
  : never;

/** Child components branded on `TSchema`, then on each child's item schema, five levels deep. */
type ChildComponentsOf<
  TSchema,
  TOwner extends string,
  TDepth extends unknown[] = [],
> = TDepth['length'] extends 5
  ? NoKeys
  : LooseSchema<TSchema> extends true
    ? NoKeys
    : UnionToIntersection<
        {
          [K in keyof ShapeOf<TSchema>]: ChildEntry<
            Branded<ShapeOf<TSchema>[K]>,
            TOwner,
            TDepth
          >;
        }[keyof ShapeOf<TSchema>]
      >;

/** A primitive's child components, as members of its own component. */
type MembersOf<P, TType extends string> = [SchemaOf<P>] extends [never]
  ? NoKeys
  : ChildComponentsOf<SchemaOf<P>, TType>;

/**
 * PascalCase authoring components keyed from a pack's primitive `type` list.
 * `slideFrame` becomes `SlideFrame`. Props come from the primitive's schema,
 * and each branded child is a member: `SlideFrame.Footer`.
 */
export type PrimitiveComponentMap<
  TPrimitives extends readonly { type: string }[],
> = {
  [
    P in TPrimitives[number] as Capitalize<LiteralType<P['type'] & string>>
  ]: AuthorComponent<
    AuthorPropsFor<P, LiteralType<TPrimitives[number]['type'] & string>>,
    P['type'] & string
  > &
    MembersOf<P, P['type'] & string>;
};

/**
 * A pack's JSX authoring front: the root `Composition` element, one
 * PascalCase component per primitive with its branded children as members,
 * and the conversion back to plain data.
 */
export type JsxShim<
  TNode extends PrimitiveNode = PrimitiveNode,
  TPrimitives extends readonly { type: string }[] = readonly { type: string }[],
> = {
  Composition: AuthorComponent<CompositionAuthorProps<TNode>, 'view'>;
  /** Throws when the root is not the `Composition` element, or when a child is not a registered primitive. */
  toComposition: (
    element: ReactElement<CompositionAuthorProps<TNode>>
  ) => AuthorComposition<TNode>;
} & PrimitiveComponentMap<TPrimitives>;

/**
 * Builds a pack's {@link JsxShim} from its primitive list.
 *
 * Branded schema fields ({@link fromChildren}, {@link fromTextChildren}) fill
 * from JSX children, and each child becomes a member of its primitive's
 * component. Several branded fields share one children list, and each takes
 * the elements of its member.
 * Elements of a registered primitive that match none of them fill the one
 * unbranded child slot from {@link PrimitiveDefinition.children}, or the one
 * {@link fromNodeChildren} field. A primitive with no brand still fills that slot, array or
 * single node, from its children. That field is optional on the component's
 * props.
 */
export const buildJsxShim = <
  const TPrimitives extends readonly { type: string }[] = readonly {
    type: string;
  }[],
  TNode extends PrimitiveNode = PrimitiveNode,
>(
  primitives: TPrimitives = [] as unknown as TPrimitives
): JsxShim<TNode, TPrimitives> => {
  const primitiveTypes = new Set(primitives.map((primitive) => primitive.type));
  const { authoredByType, membersByType, childSlotsByType } =
    createAuthoringModel(primitives);
  const view = defineAuthorComponent<CompositionAuthorProps<TNode>, 'view'>(
    'view'
  );
  const env: ParseEnv = {
    authoredByType,
    childSlotsByType,
    primitiveTypes,
  };

  return {
    Composition: view,
    toComposition: (element) => toAuthorComposition<TNode>(element, env),
    ...Object.fromEntries(
      primitives.map(({ type }) => [
        capitalize(type),
        Object.assign(
          defineAuthorComponent(type),
          Object.fromEntries(
            (membersByType.get(type) ?? []).map(({ member, authorType }) => [
              member,
              defineAuthorComponent(authorType),
            ])
          )
        ),
      ])
    ),
  } as JsxShim<TNode, TPrimitives>;
};

interface ParseEnv {
  authoredByType: ReadonlyMap<string, AuthoredSpec>;
  childSlotsByType: ReadonlyMap<string, readonly ChildSlot[]>;
  primitiveTypes: ReadonlySet<string>;
}

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

  if (props.version !== undefined) {
    spec.version = props.version;
  }
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
  if (!env.primitiveTypes.has(type)) {
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
      ? valueFromChildField(value, childField, env, type)
      : convertPropValue(value, key, slots, parseChild);
  }

  const rawChildren = element.props.children;
  if (authored && (authored.children.length > 0 || authored.text.length > 0)) {
    fillAuthoredFields(
      converted,
      authored,
      rawChildren,
      env,
      slots,
      parseChild,
      type
    );
  } else {
    const unique = slots.length === 1 ? slots[0] : undefined;
    if (
      unique &&
      converted[unique.field] === undefined &&
      rawChildren !== undefined
    ) {
      const nested = flattenChildren(rawChildren).map(parseChild);
      converted[unique.field] = slotValue(nested, unique);
    } else if (slots.length === 0 && flattenChildren(rawChildren).length > 0) {
      throw new IsomerError(
        'UNEXPECTED_CHILDREN',
        `<${capitalize(type)}> takes no JSX children; set its fields through props.`
      );
    }
  }

  return omitUndefined({ ...converted, type }) as TNode;
};

const fillAuthoredFields = (
  converted: Record<string, unknown>,
  authored: AuthoredSpec,
  rawChildren: ReactNode,
  env: ParseEnv,
  slots: readonly ChildSlot[],
  parseChild: (child: ReactNode) => PrimitiveNode,
  parentType: string
): void => {
  const unsetChildren = authored.children.filter(
    (field) => converted[field.field] === undefined
  );
  const unsetText = authored.text.filter(
    (field) => converted[field.field] === undefined
  );
  const brandedFields = new Set(authored.children.map((field) => field.field));
  const unbranded = slots.filter(({ field }) => !brandedFields.has(field));
  const slot = unbranded.length === 1 ? unbranded[0] : undefined;
  const slotOpen = slot !== undefined && converted[slot.field] === undefined;
  if (
    rawChildren === undefined ||
    (unsetChildren.length === 0 && unsetText.length === 0 && !slotOpen)
  ) {
    for (const field of unsetText) {
      if (!field.optional) {
        throw new IsomerError(
          'MISSING_AUTHORED_TEXT',
          `Expected text children for "${field.field}".`
        );
      }
    }
    return;
  }

  const flat = flattenChildren(rawChildren);
  const elements = flat.filter(isAuthorElement);
  const textNodes = flat.filter((child) => !isAuthorElement(child));
  const claimed = new Set<ReactElement>();
  for (const field of unsetChildren) {
    const matching = elements.filter(
      (child) => getAuthorType(child) === memberType(parentType, field)
    );
    if (matching.length === 0) {
      if (flat.length === 0 && field.array && !field.optional) {
        converted[field.field] = [];
      }
      continue;
    }
    for (const child of matching) {
      claimed.add(child);
    }
    converted[field.field] = valueFromBrand(matching, field, env, parentType);
  }

  const brandedTypes = new Set(
    authored.children.map((field) => memberType(parentType, field))
  );
  const stray = elements.filter(
    (child) => brandedTypes.has(getAuthorType(child)) && !claimed.has(child)
  );
  if (stray.length > 0) {
    const childType = getAuthorType(stray[0]!);
    throw new IsomerError(
      'UNEXPECTED_CHILDREN',
      `<${capitalize(parentType)}> already has its <${capitalize(childType)}>.`
    );
  }

  const leftover = elements.filter((child) => !claimed.has(child));
  if (slotOpen && slot && leftover.length > 0) {
    const nested = leftover.map(parseChild);
    converted[slot.field] = slotValue(nested, slot);
  } else if (leftover.length > 0) {
    const childType = getAuthorType(leftover[0]!);
    const [empty, ...moreEmpty] = unsetChildren.filter(
      ({ field }) => converted[field] === undefined
    );
    if (empty && moreEmpty.length === 0 && !slotOpen) {
      throw new IsomerError(
        'AUTHOR_TYPE_MISMATCH',
        `Expected <${capitalize(memberType(parentType, empty))}> but received <${capitalize(childType)}>.`
      );
    }
    throw new IsomerError(
      'UNEXPECTED_CHILDREN',
      `<${capitalize(childType)}> is not a child of <${capitalize(parentType)}>.`
    );
  }

  if (textNodes.length === 0) {
    for (const field of unsetText) {
      if (!field.optional) {
        throw new IsomerError(
          'MISSING_AUTHORED_TEXT',
          `Expected text children for "${field.field}".`
        );
      }
    }
    return;
  }
  if (unsetText.length === 0) {
    throw new IsomerError(
      'EXPECTED_JSX_ELEMENT',
      'Expected an Isomer JSX element.'
    );
  }
  for (const field of unsetText) {
    converted[field.field] = textFromChildren(textNodes, {
      collapseWhitespace: field.collapseWhitespace,
      ...(field.dedent ? { dedent: true } : {}),
    });
  }
};

const valueFromChildField = (
  value: unknown,
  field: AuthoredChildField,
  env: ParseEnv,
  owner: string
): unknown => {
  if (isJsxNodes(value)) {
    return valueFromBrand(flattenChildren(value), field, env, owner);
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

/** The field's array of items, or its one item; throws on a second element for a single-item field. */
const valueFromBrand = (
  elements: readonly ReactNode[],
  field: AuthoredChildField,
  env: ParseEnv,
  owner: string
): unknown => {
  const items = elements.map((child) =>
    itemFromElement(child, field, env, owner)
  );
  if (field.array) {
    return items;
  }
  if (items.length > 1) {
    throw new IsomerError(
      'UNEXPECTED_CHILDREN',
      `"${field.field}" takes one <${capitalize(memberType(owner, field))}>, not ${items.length}.`
    );
  }
  return items[0];
};

const itemFromElement = (
  child: ReactNode,
  field: AuthoredChildField,
  env: ParseEnv,
  owner: string
): unknown => {
  const element = requireAuthorElement<Record<string, unknown>>(
    child,
    memberType(owner, field)
  );
  if (field.toItem) {
    return field.toItem(element.props, {
      parseChildren: (nested) =>
        flattenChildren(nested).map((node) => bodyNodeFromElement(node, env)),
    });
  }
  const props = withoutChildren<Record<string, unknown>>(element);
  const nested = flattenChildren(element.props.children);
  const elements = nested.filter(isAuthorElement);
  const text = nested.filter((child) => !isAuthorElement(child));
  if (
    field.textField !== undefined &&
    props[field.textField] === undefined &&
    text.length > 0
  ) {
    props[field.textField] = textFromChildren(text);
  }
  fillNestedBrands(field.itemSchema, props, elements, env, owner);
  return props;
};

const fillNestedBrands = (
  itemSchema: ZodType,
  props: Record<string, unknown>,
  elements: readonly ReactElement[],
  env: ParseEnv,
  owner: string
): void => {
  if (elements.length === 0) {
    return;
  }
  for (const field of readAuthoredSpec(itemSchema).children) {
    if (props[field.field] !== undefined) {
      continue;
    }
    const matching = elements.filter(
      (child) => getAuthorType(child) === memberType(owner, field)
    );
    if (matching.length > 0) {
      props[field.field] = valueFromBrand(matching, field, env, owner);
    }
  }
};

/** The slot's nodes, or its one node; throws on a second node for a single-node slot. */
const slotValue = <TNode extends PrimitiveNode>(
  nodes: readonly TNode[],
  { array, field }: ChildSlot
): readonly TNode[] | TNode | undefined => {
  if (array) {
    return nodes;
  }
  if (nodes.length > 1) {
    throw new IsomerError(
      'UNEXPECTED_CHILDREN',
      `"${field}" takes one node, not ${nodes.length}.`
    );
  }
  return nodes[0];
};

const convertPropValue = <TNode extends PrimitiveNode>(
  value: unknown,
  field: string,
  slots: readonly ChildSlot[],
  parseChild: (child: ReactNode) => TNode
): unknown => {
  const array = slots.some((slot) => slot.field === field && slot.array);
  const fromJsx = nodesFromJsx(value, parseChild);
  if (fromJsx) {
    return slotValue(fromJsx, { array, field });
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

/** React children as a flat array, with fragments inlined. */
export const flattenChildren = (children: ReactNode): ReactNode[] =>
  Children.toArray(children).flatMap((child) => {
    if (isValidElement(child) && child.type === Fragment) {
      const props = child.props as { children?: ReactNode };
      return flattenChildren(props.children);
    }
    return child;
  });

const lineBreak = /\r\n|[\n\r\u2028\u2029]/;

// A template literal's source: the break after the opening backtick, the
// indentation before the closing one, and the indentation every line shares go.
const dedentSource = (text: string): string => {
  const all = text.split(lineBreak);
  const start = all.length > 1 && all[0] === '' ? 1 : 0;
  const end =
    all.length - start > 1 && /^ *$/.test(all[all.length - 1]!)
      ? all.length - 1
      : all.length;
  const lines = all.slice(start, end);
  const indents = lines
    .filter((line) => line.trim() !== '')
    .map((line) => line.length - line.trimStart().length);
  const shared = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(shared)).join('\n');
};

/**
 * Children joined into one string. Throws on an element child, so a prop typed as text stays text. Collapses whitespace unless `{ collapseWhitespace: false }`; `{ dedent: true }` reads it as source, lines joined by `\n`.
 */
export const textFromChildren = (
  children: ReactNode,
  options?: { collapseWhitespace?: boolean; dedent?: boolean }
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
  if (options?.dedent) {
    return dedentSource(text);
  }
  if (options?.collapseWhitespace === false) {
    return text.trim();
  }
  return text.replace(/\s+/g, ' ').trim();
};

/** An element's props without `children` and without `undefined` entries. */
const withoutChildren = <TProps>(element: ReactElement<unknown>): TProps => {
  const props = { ...(element.props as TProps & { children?: ReactNode }) };
  delete props.children;
  return omitUndefined(props);
};

/** Narrows `element` to an authoring element, asserting `type` when given. */
const requireAuthorElement = <TProps>(
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

/** The primitive type {@link authorType} brands onto `element`'s component. */
const getAuthorType = (element: ReactElement<unknown>): string => {
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
