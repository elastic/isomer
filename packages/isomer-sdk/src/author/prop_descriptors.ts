/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isJsonObject,
  type JsonObject,
  ownDef,
  parseDefRef,
} from '../validate/json_helpers';

import { ANONYMOUS_DEF } from './schema_to_typescript';

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

interface Shape {
  type: string;
  kind: PropDescriptor['kind'];
  values?: readonly string[];
  description?: string;
  /** The schema also accepts `null`; kept apart from `type` so a merge cannot drop it. */
  nullable?: boolean;
}

const refId = ({ $ref }: JsonObject): string | undefined => parseDefRef($ref);

const ownDescription = ({ description }: JsonObject): string | undefined =>
  typeof description === 'string' ? description : undefined;

const withDescription = (shape: Shape, description?: string): Shape =>
  description === undefined ? shape : { ...shape, description };

const isLiteral = (value: unknown): value is string | number | boolean =>
  ['string', 'number', 'boolean'].includes(typeof value);

const followRefs = (
  defs: JsonObject,
  node: unknown
): JsonObject | undefined => {
  const seen = new Set<string>();
  let current = node;
  while (isJsonObject(current)) {
    const id = refId(current);
    if (id === undefined) {
      return current;
    }
    if (seen.has(id)) {
      return undefined;
    }
    seen.add(id);
    current = ownDef(defs, id);
  }
  return undefined;
};

const isNullSchema = (node: unknown): boolean =>
  isJsonObject(node) &&
  (node.type === 'null' ||
    (Object.hasOwn(node, 'const') && node.const === null));

const isNullVariant = (defs: JsonObject, variant: unknown): boolean =>
  isNullSchema(followRefs(defs, variant));

const orNull = (shape: Shape, nullable: boolean): Shape =>
  nullable ? { ...shape, nullable } : shape;

const displayType = ({ type, nullable }: Shape): string =>
  nullable ? `${type} | null` : type;

const enumOf = (values: readonly string[]): Shape => ({
  type: values.join(' | '),
  kind: 'enum',
  values,
});

// Only string literals are an `enum`: `values` is strings, so a number or boolean choice is shown as written.
const literalsOf = (values: readonly unknown[]): Shape => {
  const nullable = values.includes(null);
  const literals = values.filter(isLiteral);
  if (literals.length === 0) {
    return { type: nullable ? 'null' : 'unknown', kind: 'other' };
  }
  const strings = literals.filter((value) => typeof value === 'string');
  if (strings.length === literals.length) {
    return orNull(enumOf(strings), nullable);
  }
  const type = literals.map((value) => JSON.stringify(value)).join(' | ');
  const kinds = new Set(literals.map((value) => typeof value));
  const [only] = kinds;
  return orNull(
    {
      type,
      kind:
        kinds.size === 1 && (only === 'number' || only === 'boolean')
          ? only
          : 'other',
    },
    nullable
  );
};

const describeUnion = (
  defs: JsonObject,
  variants: readonly unknown[],
  seen: ReadonlySet<string>
): Shape => {
  const parts = variants
    .filter((variant) => !isNullVariant(defs, variant))
    .map((variant): Shape =>
      isJsonObject(variant)
        ? describeSchema(defs, variant, seen)
        : { type: 'unknown', kind: 'other' }
    );
  const nullable =
    variants.some((variant) => isNullVariant(defs, variant)) ||
    parts.some((part) => part.nullable);
  const [only] = parts;
  if (only === undefined) {
    return { type: 'null', kind: 'other' };
  }
  if (parts.length === 1) {
    return orNull(only, nullable);
  }
  if (parts.every(({ kind }) => kind === 'enum')) {
    const values = [...new Set(parts.flatMap(({ values = [] }) => values))];
    return orNull(enumOf(values), nullable);
  }
  return orNull(
    { type: parts.map(({ type }) => type).join(' | '), kind: 'other' },
    nullable
  );
};

const describeSchema = (
  defs: JsonObject,
  node: JsonObject,
  seen: ReadonlySet<string>
): Shape => {
  const id = refId(node);
  if (id !== undefined) {
    const target = ownDef(defs, id);
    const named = !ANONYMOUS_DEF.test(id);
    if (!isJsonObject(target) || seen.has(id)) {
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
      return literalsOf(node.enum);
    }
    if (Object.hasOwn(node, 'const')) {
      return literalsOf([node.const]);
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
        const item = isJsonObject(node.items)
          ? displayType(describeSchema(defs, node.items, seen))
          : 'unknown';
        return {
          type: `${item.includes(' | ') ? `(${item})` : item}[]`,
          kind: 'array',
        };
      }
      case 'object':
        return { type: 'object', kind: 'object' };
      default:
        return isJsonObject(node.properties)
          ? { type: 'object', kind: 'object' }
          : { type: 'unknown', kind: 'other' };
    }
  })();
  return withDescription(shape, description);
};

/** A {@link PropDescriptor} list per type, read from `schema`'s `$defs`; empty for a type with no object properties. */
export const describeProps = (
  schema: JsonObject,
  types: readonly string[]
): Record<string, PropDescriptor[]> => {
  const defs = isJsonObject(schema.$defs) ? schema.$defs : {};
  return Object.fromEntries(
    types.map((type) => {
      const def = followRefs(defs, ownDef(defs, type));
      const properties = isJsonObject(def?.properties) ? def.properties : {};
      const required = new Set(
        Array.isArray(def?.required) ? def.required : []
      );
      const props = Object.entries(properties).flatMap(
        ([name, value]): PropDescriptor[] => {
          if (!isJsonObject(value)) {
            return [];
          }
          const shape = describeSchema(defs, value, new Set());
          const { kind, values, description } = shape;
          return [
            {
              name,
              type: displayType(shape),
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
