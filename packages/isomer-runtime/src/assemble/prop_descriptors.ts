/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonSchema } from '../registry';

/** One property of a primitive, flattened from the authoring JSON Schema. */
export interface PropDescriptor {
  name: string;
  /** Display form, e.g. `string`, `tone`, `primary | warning`, `string[]`. */
  type: string;
  kind: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object' | 'other';
  /** Allowed values when `kind` is `enum`. */
  values?: readonly string[];
  required: boolean;
  description?: string;
}

type Node = Record<string, unknown>;

interface Shape {
  type: string;
  kind: PropDescriptor['kind'];
  values?: readonly string[];
  description?: string;
}

const DEF_PREFIX = '#/$defs/';
// Ids zod generates for a reused schema that nobody named.
const ANONYMOUS_DEF = /^__schema\d+$/;

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const refId = (node: Node): string | undefined =>
  typeof node.$ref === 'string' && node.$ref.startsWith(DEF_PREFIX)
    ? node.$ref.slice(DEF_PREFIX.length)
    : undefined;

const ownDescription = (node: Node): string | undefined =>
  typeof node.description === 'string' ? node.description : undefined;

const withDescription = (shape: Shape, description?: string): Shape =>
  description === undefined ? shape : { ...shape, description };

const isLiteral = (value: unknown): value is string | number | boolean =>
  ['string', 'number', 'boolean'].includes(typeof value);

const enumOf = (values: readonly string[]): Shape => ({
  type: values.join(' | '),
  kind: 'enum',
  values,
});

const describeUnion = (
  defs: Node,
  variants: readonly unknown[],
  seen: ReadonlySet<string>
): Shape => {
  const parts = variants.map((variant): Shape =>
    isNode(variant)
      ? describeSchema(defs, variant, seen)
      : { type: 'unknown', kind: 'other' }
  );
  const present = parts.filter(({ type }) => type !== 'null');
  const [only] = present;
  if (present.length === 1 && only !== undefined) {
    return parts.length === present.length
      ? only
      : { ...only, type: `${only.type} | null` };
  }
  if (present.length > 1 && present.every(({ kind }) => kind === 'enum')) {
    const values = [...new Set(present.flatMap(({ values = [] }) => values))];
    return enumOf(values);
  }
  return { type: parts.map(({ type }) => type).join(' | '), kind: 'other' };
};

const describeSchema = (
  defs: Node,
  node: Node,
  seen: ReadonlySet<string>
): Shape => {
  const id = refId(node);
  if (id !== undefined) {
    const target = Object.hasOwn(defs, id) ? defs[id] : undefined;
    const named = !ANONYMOUS_DEF.test(id);
    if (!isNode(target) || seen.has(id)) {
      return { type: named ? id : 'unknown', kind: 'other' };
    }
    const inner = describeSchema(defs, target, new Set(seen).add(id));
    return withDescription(
      named ? { ...inner, type: id } : inner,
      ownDescription(node) ?? inner.description
    );
  }

  const description = ownDescription(node);
  const shape = ((): Shape => {
    if (Array.isArray(node.enum)) {
      return enumOf(node.enum.filter(isLiteral).map(String));
    }
    if (isLiteral(node.const)) {
      return enumOf([String(node.const)]);
    }
    const variants = Array.isArray(node.anyOf) ? node.anyOf : node.oneOf;
    if (Array.isArray(variants)) {
      return describeUnion(defs, variants, seen);
    }
    switch (node.type) {
      case 'string':
      case 'boolean':
        return { type: node.type, kind: node.type };
      case 'number':
      case 'integer':
        return { type: node.type, kind: 'number' };
      case 'null':
        return { type: 'null', kind: 'other' };
      case 'array': {
        const item = isNode(node.items)
          ? describeSchema(defs, node.items, seen).type
          : 'unknown';
        return {
          type: `${item.includes(' | ') ? `(${item})` : item}[]`,
          kind: 'array',
        };
      }
      case 'object':
        return { type: 'object', kind: 'object' };
      default:
        return isNode(node.properties)
          ? { type: 'object', kind: 'object' }
          : { type: 'unknown', kind: 'other' };
    }
  })();
  return withDescription(shape, description);
};

const followRefs = (defs: Node, node: unknown): Node | undefined => {
  const seen = new Set<string>();
  let current = node;
  while (isNode(current)) {
    const id = refId(current);
    if (id === undefined) {
      return current;
    }
    if (seen.has(id) || !Object.hasOwn(defs, id)) {
      return undefined;
    }
    seen.add(id);
    current = defs[id];
  }
  return undefined;
};

/** A {@link PropDescriptor} list per type, read from `schema`'s `$defs`; empty for a type with no object properties. */
export const describeProps = (
  schema: JsonSchema,
  types: readonly string[]
): Record<string, PropDescriptor[]> => {
  const defs = isNode(schema.$defs) ? schema.$defs : {};
  return Object.fromEntries(
    types.map((type) => {
      const def = followRefs(
        defs,
        Object.hasOwn(defs, type) ? defs[type] : undefined
      );
      const properties = isNode(def?.properties) ? def.properties : {};
      const required = new Set(
        Array.isArray(def?.required) ? def.required : []
      );
      const props = Object.entries(properties).flatMap(
        ([name, value]): PropDescriptor[] => {
          if (!isNode(value)) {
            return [];
          }
          const {
            type: display,
            kind,
            values,
            description,
          } = describeSchema(defs, value, new Set());
          return [
            {
              name,
              type: display,
              kind,
              ...(values === undefined ? {} : { values }),
              required: required.has(name),
              ...(description === undefined ? {} : { description }),
            },
          ];
        }
      );
      return [type, props];
    })
  );
};
