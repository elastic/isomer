/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodType } from 'zod';

import { IsomerError } from '../composition/error';
import type { AnyPrimitiveDefinition } from '../define/primitive_module';

import {
  buildCompositionJsonSchema,
  type CompositionJsonSchemaOptions,
} from './json_schema';
import {
  displayValueSchema,
  namedColorSchema,
  renderThemeSchema,
  structuredValueSchema,
} from './value_schemas';

type JsonSchema = Record<string, unknown>;

const DEF_PREFIX = '#/$defs/';
const BODY_NODE_ID = 'bodyNode';
const SAFE_INTEGER_MAX = Number.MAX_SAFE_INTEGER;
const SCALAR_TYPES = new Set(['string', 'number', 'integer', 'boolean']);

const DEFAULT_EXTRA_DEFS: readonly { schema: ZodType; id: string }[] = [
  { schema: namedColorSchema, id: 'tone' },
  { schema: displayValueSchema, id: 'displayValue' },
  { schema: structuredValueSchema, id: 'structuredValue' },
  { schema: renderThemeSchema, id: 'renderTheme' },
];

/** Options for {@link buildAuthoringJsonSchema}. */
export interface AuthoringJsonSchemaOptions extends CompositionJsonSchemaOptions {
  /** `$def` id to `description`. Survives `z.toJSONSchema` dropping `.refine` text. */
  describe?: Readonly<Record<string, string>>;
  /** `$defId.property` paths to drop, e.g. `'xyChart.stacked'`. */
  omitProperties?: readonly string[];
}

const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** `String.prototype.toWellFormed`: `encodeURIComponent` throws on a lone surrogate. */
const toWellFormed = (text: string): string =>
  text.replace(LONE_SURROGATE, '\uFFFD');

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// A `$ref` is a JSON Pointer in a URI fragment: `~` and `/` are escaped as `~0` and `~1`, then
// anything a fragment cannot hold, `%` included, is percent-encoded.
const defRef = (id: string): string =>
  `${DEF_PREFIX}${toWellFormed(id)
    .replace(/~/g, '~0')
    .replace(/\//g, '~1')
    .replace(/[^\w\-.~!$&'()*+,;=:@]/gu, (char) => encodeURIComponent(char))}`;

const parseDefRef = (ref: unknown): string | undefined => {
  if (typeof ref !== 'string' || !ref.startsWith(DEF_PREFIX)) {
    return undefined;
  }
  return decodeURIComponent(ref.slice(DEF_PREFIX.length))
    .replace(/~1/g, '/')
    .replace(/~0/g, '~');
};

const walkJson = (
  node: unknown,
  visit: (value: Record<string, unknown>) => void
): void => {
  if (Array.isArray(node)) {
    for (const item of node) {
      walkJson(item, visit);
    }
    return;
  }
  if (!isJsonObject(node)) {
    return;
  }
  visit(node);
  for (const value of Object.values(node)) {
    walkJson(value, visit);
  }
};

const mapJson = (
  node: unknown,
  visit: (value: Record<string, unknown>) => Record<string, unknown>
): unknown => {
  if (Array.isArray(node)) {
    return node.map((item) => mapJson(item, visit));
  }
  if (!isJsonObject(node)) {
    return node;
  }
  return Object.fromEntries(
    Object.entries(visit(node)).map(([key, value]) => [
      key,
      mapJson(value, visit),
    ])
  );
};

const rewriteDefRefs = (
  schema: JsonSchema,
  rewrite: (id: string) => string | JsonSchema | undefined
): JsonSchema => {
  const visit = (node: Record<string, unknown>): Record<string, unknown> => {
    const id = parseDefRef(node.$ref);
    if (id === undefined) {
      return node;
    }
    const replacement = rewrite(id);
    if (replacement === undefined) {
      return node;
    }
    if (typeof replacement === 'string') {
      return { ...node, $ref: defRef(replacement) };
    }
    const rest = { ...node };
    delete rest.$ref;
    // An inlined def can itself be a `$ref` with a description, which needs resolving in turn.
    return visit({ ...cloneJson(replacement), ...rest });
  };
  return mapJson(schema, visit) as JsonSchema;
};

const isRefOnlyDef = (def: unknown): def is { $ref: string } =>
  isJsonObject(def) &&
  Object.keys(def).length === 1 &&
  typeof def.$ref === 'string';

const isBareScalarDef = (def: unknown): def is Record<string, unknown> => {
  if (!isJsonObject(def)) {
    return false;
  }
  const { type } = def;
  if (typeof type !== 'string' || !SCALAR_TYPES.has(type)) {
    return false;
  }
  return !(
    'enum' in def ||
    'const' in def ||
    '$ref' in def ||
    'properties' in def
  );
};

const defsOf = (schema: JsonSchema): Record<string, unknown> =>
  isJsonObject(schema.$defs) ? schema.$defs : {};

const withDefs = (
  schema: JsonSchema,
  defs: Record<string, unknown>
): JsonSchema => ({ ...schema, $defs: defs });

const dropSafeIntegerMaxima = (schema: JsonSchema): void => {
  walkJson(schema, (node) => {
    if (node.maximum === SAFE_INTEGER_MAX) {
      delete node.maximum;
    }
    if (node.minimum === -SAFE_INTEGER_MAX) {
      delete node.minimum;
    }
  });
};

const dropNodeIdAndSurfaces = (schema: JsonSchema): void => {
  for (const def of Object.values(defsOf(schema))) {
    if (!isJsonObject(def) || !isJsonObject(def.properties)) {
      continue;
    }
    const typeProp = def.properties.type;
    if (!isJsonObject(typeProp) || typeof typeProp.const !== 'string') {
      continue;
    }
    delete def.properties.id;
    delete def.properties.surfaces;
    if (Array.isArray(def.required)) {
      def.required = def.required.filter(
        (key) => key !== 'id' && key !== 'surfaces'
      );
    }
  }
};

const omitListedProperties = (
  schema: JsonSchema,
  paths: readonly string[]
): void => {
  const defs = defsOf(schema);
  for (const path of paths) {
    const dot = path.indexOf('.');
    if (dot <= 0) {
      continue;
    }
    const defId = path.slice(0, dot);
    const property = path.slice(dot + 1);
    const def = Object.hasOwn(defs, defId) ? defs[defId] : undefined;
    if (
      !isJsonObject(def) ||
      !isJsonObject(def.properties) ||
      !Object.hasOwn(def.properties, property)
    ) {
      continue;
    }
    delete def.properties[property];
    if (Array.isArray(def.required)) {
      def.required = def.required.filter((key) => key !== property);
    }
  }
};

const applyDescriptions = (
  schema: JsonSchema,
  describe: Readonly<Record<string, string>>
): void => {
  const defs = defsOf(schema);
  for (const [id, description] of Object.entries(describe)) {
    const def = Object.hasOwn(defs, id) ? defs[id] : undefined;
    if (isJsonObject(def)) {
      def.description = description;
    }
  }
};

const flattenRefOnlyDefs = (schema: JsonSchema): JsonSchema => {
  const defs = defsOf(schema);
  const aliases = new Map<string, string>();
  for (const [id, def] of Object.entries(defs)) {
    if (id === BODY_NODE_ID || !isRefOnlyDef(def)) {
      continue;
    }
    const target = parseDefRef(def.$ref);
    if (target === undefined || target === id) {
      continue;
    }
    aliases.set(id, target);
  }
  if (aliases.size === 0) {
    return schema;
  }
  const resolve = (id: string): string => {
    const seen = new Set<string>();
    let current = id;
    while (aliases.has(current) && !seen.has(current)) {
      seen.add(current);
      current = aliases.get(current) ?? current;
    }
    return current;
  };
  const rewritten = rewriteDefRefs(schema, (id) =>
    aliases.has(id) ? resolve(id) : undefined
  );
  const nextDefs = { ...defsOf(rewritten) };
  for (const id of aliases.keys()) {
    delete nextDefs[id];
  }
  return withDefs(rewritten, nextDefs);
};

const inlineScalarDefs = (schema: JsonSchema): JsonSchema => {
  const defs = defsOf(schema);
  const scalars = new Map<string, Record<string, unknown>>();
  for (const [id, def] of Object.entries(defs)) {
    if (id === BODY_NODE_ID || !isBareScalarDef(def)) {
      continue;
    }
    scalars.set(id, def);
  }
  if (scalars.size === 0) {
    return schema;
  }
  const rewritten = rewriteDefRefs(schema, (id) => scalars.get(id));
  const nextDefs = { ...defsOf(rewritten) };
  for (const id of scalars.keys()) {
    delete nextDefs[id];
  }
  return withDefs(rewritten, nextDefs);
};

const pruneUnreferencedDefs = (schema: JsonSchema): JsonSchema => {
  const defs = defsOf(schema);
  if (Object.keys(defs).length === 0) {
    return schema;
  }
  const referenced = new Set<string>();
  const visit = (node: unknown): void => {
    walkJson(node, (value) => {
      const id = parseDefRef(value.$ref);
      if (id === undefined || referenced.has(id)) {
        return;
      }
      referenced.add(id);
      visit(Object.hasOwn(defs, id) ? defs[id] : undefined);
    });
  };
  const root: JsonSchema = { ...schema };
  delete root.$defs;
  visit(root);
  referenced.add(BODY_NODE_ID);
  visit(defs[BODY_NODE_ID]);
  return withDefs(
    schema,
    Object.fromEntries(
      Object.entries(defs).filter(([id]) => referenced.has(id))
    )
  );
};

const mergeExtraDefs = (
  extras: CompositionJsonSchemaOptions['extraDefs']
): { schema: ZodType; id: string }[] => {
  const bySchema = new Map<ZodType, { schema: ZodType; id: string }>();
  for (const item of DEFAULT_EXTRA_DEFS) {
    bySchema.set(item.schema, item);
  }
  for (const item of extras ?? []) {
    bySchema.set(item.schema, item);
  }
  const byId = new Map<string, { schema: ZodType; id: string }>();
  for (const item of bySchema.values()) {
    byId.set(item.id, item);
  }
  return [...byId.values()];
};

/** The ids Zod gives the defs it generates; a primitive or extra def may not take one. */
const ANONYMOUS_DEF = /^__schema\d+$/;

/** Each def's `$ref` sites, as the path to the node holding the ref: `slideDelta.before`, `slideSplit.left.items.item`. */
const collectDefRefs = (schema: JsonSchema): Map<string, string[][]> => {
  const refs = new Map<string, string[][]>();
  // Property names extend the path; keywords do not, except `items`, which reads as `item`.
  const visitProperties = (node: unknown, path: string[]): void => {
    if (isJsonObject(node)) {
      for (const [name, value] of Object.entries(node)) {
        visit(value, [...path, name]);
      }
    }
  };
  const visit = (node: unknown, path: string[]): void => {
    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item, path);
      }
      return;
    }
    if (!isJsonObject(node)) {
      return;
    }
    const id = parseDefRef(node.$ref);
    if (id !== undefined) {
      refs.set(id, [...(refs.get(id) ?? []), path]);
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'properties') {
        visitProperties(value, path);
      } else if (key !== '$defs') {
        visit(value, key === 'items' ? [...path, 'item'] : path);
      }
    }
  };
  const root: JsonSchema = { ...schema };
  delete root.$defs;
  visit(root, ['composition']);
  for (const [id, def] of Object.entries(defsOf(schema))) {
    visit(def, [id]);
  }
  return refs;
};

/** Whether `id` can reach itself through `$ref`s, which inlining would unroll forever. */
// Only through anonymous defs: a named def stays a `$ref`, so a loop through one ends there.
const isCyclic = (defs: Record<string, unknown>, id: string): boolean => {
  const seen = new Set<string>();
  const reaches = (from: string): boolean => {
    let found = false;
    walkJson(defs[from], (value) => {
      const ref = parseDefRef(value.$ref);
      if (found || ref === undefined || !ANONYMOUS_DEF.test(ref)) {
        return;
      }
      if (ref === id) {
        found = true;
      } else if (!seen.has(ref)) {
        seen.add(ref);
        found = reaches(ref);
      }
    });
    return found;
  };
  return reaches(id);
};

/** A shape short enough to repeat at each use rather than name, such as an enum. */
const SMALL_DEF_CHARS = 120;

/** Inlines each anonymous def used once or small, so a reader meets the shape where it is used. */
const inlineSingleUseDefs = (schema: JsonSchema): JsonSchema => {
  const defs = defsOf(schema);
  const refs = collectDefRefs(schema);
  const inline = new Set(
    Object.keys(defs).filter(
      (id) =>
        ANONYMOUS_DEF.test(id) &&
        (refs.get(id)?.length === 1 ||
          JSON.stringify(defs[id]).length <= SMALL_DEF_CHARS) &&
        !isCyclic(defs, id)
    )
  );
  if (inline.size === 0) {
    return schema;
  }
  const rewritten = rewriteDefRefs(schema, (id) =>
    inline.has(id) ? (defs[id] as JsonSchema) : undefined
  );
  const kept = { ...defsOf(rewritten) };
  for (const id of inline) {
    delete kept[id];
  }
  return withDefs(rewritten, kept);
};

/** Most properties a def's name lists before it names only the first. */
const MAX_SITE_NAMES = 3;

/**
 * One primitive's name for a def it uses at `sites`: the path, with the step
 * where the sites part listed as `a+b` (`slideDelta.before+after`).
 */
const siteName = ([first = [], ...rest]: string[][]): string => {
  const differ = first.flatMap((step, index) =>
    rest.some((path) => path[index] !== step) ? [index] : []
  );
  const [at] = differ;
  const steps = [...new Set([first, ...rest].map((path) => path[at ?? 0]))];
  return at === undefined ||
    differ.length > 1 ||
    rest.some(({ length }) => length !== first.length) ||
    steps.length > MAX_SITE_NAMES
    ? first.join('.')
    : [...first.slice(0, at), steps.join('+'), ...first.slice(at + 1)].join(
        '.'
      );
};

/**
 * Renames the anonymous defs left after inlining: for their owner and path when
 * one primitive uses them (`slideDelta.before+after`), for their property when several do.
 */
const nameSharedDefs = (schema: JsonSchema): JsonSchema => {
  const defs = defsOf(schema);
  const refs = collectDefRefs(schema);
  const taken = new Set(Object.keys(defs));
  const names = new Map<string, string>();
  // Outer defs first, so a def first used inside another is named after that one's name.
  for (let named = true; named;) {
    named = false;
    for (const id of Object.keys(defs)) {
      const [first] = refs.get(id) ?? [];
      if (!ANONYMOUS_DEF.test(id) || names.has(id) || first === undefined) {
        continue;
      }
      const ownerOf = ([head = '']: string[]) =>
        ANONYMOUS_DEF.test(head) ? names.get(head) : head;
      const owner = ownerOf(first);
      if (owner === undefined) {
        continue;
      }
      const sites = (refs.get(id) ?? []).map((path) => [
        ownerOf(path),
        ...path.slice(1),
      ]);
      const owners = new Set(sites.map(([head]) => head));
      const base = toWellFormed(
        owners.size > 1
          ? (first.at(-1) ?? owner)
          : siteName(sites as string[][])
      );
      let name = base;
      for (let suffix = 2; taken.has(name); suffix += 1) {
        name = `${base}${suffix}`;
      }
      taken.add(name);
      names.set(id, name);
      named = true;
    }
  }
  if (names.size === 0) {
    return schema;
  }
  const rewritten = rewriteDefRefs(schema, (id) => names.get(id));
  return withDefs(
    rewritten,
    Object.fromEntries(
      Object.entries(defsOf(rewritten)).map(([id, def]) => [
        names.get(id) ?? id,
        def,
      ])
    )
  );
};

/** Rewrites Zod's `$ref`s, which escape a JSON Pointer but not the URI fragment around it, with {@link defRef}. */
const encodeZodRefs = (schema: JsonSchema): void => {
  walkJson(schema, (node) => {
    const { $ref } = node;
    if (typeof $ref === 'string' && $ref.startsWith(DEF_PREFIX)) {
      node.$ref = defRef(
        $ref.slice(DEF_PREFIX.length).replace(/~1/g, '/').replace(/~0/g, '~')
      );
    }
  });
};

const slimAuthoringSchema = (
  schema: JsonSchema,
  options: AuthoringJsonSchemaOptions
): JsonSchema => {
  const next = cloneJson(schema);
  encodeZodRefs(next);
  dropSafeIntegerMaxima(next);
  dropNodeIdAndSurfaces(next);
  omitListedProperties(next, options.omitProperties ?? []);
  const flattened = flattenRefOnlyDefs(next);
  const inlined = inlineScalarDefs(flattened);
  const pruned = pruneUnreferencedDefs(inlined);
  const named = nameSharedDefs(inlineSingleUseDefs(pruned));
  applyDescriptions(named, options.describe ?? {});
  return named;
};

/**
 * Projects a composition to the JSON Schema an agent reads.
 *
 * {@link buildCompositionJsonSchema} stays the validator projection. This walk
 * names shared SDK defs, inlines scalar leaves, and drops host-only fields.
 */
export const buildAuthoringJsonSchema = (
  definitions: readonly AnyPrimitiveDefinition[],
  options: AuthoringJsonSchemaOptions = {}
): JsonSchema => {
  const { describe, omitProperties, extraDefs, ...rest } = options;
  for (const id of [
    ...definitions.map(({ type }) => type),
    ...(extraDefs ?? []).map((extra) => extra.id),
  ]) {
    if (toWellFormed(id) !== id) {
      throw new IsomerError(
        'INVALID_BODY_NODE',
        `buildAuthoringJsonSchema: def id ${JSON.stringify(id)} holds an unpaired surrogate`
      );
    }
    if (ANONYMOUS_DEF.test(id)) {
      throw new IsomerError(
        'INVALID_BODY_NODE',
        `buildAuthoringJsonSchema: def id ${JSON.stringify(id)} is reserved for the defs Zod generates`
      );
    }
  }
  // The body-node union and every shared def take a `$defs` id a primitive type would otherwise share.
  const taken = new Set([
    BODY_NODE_ID,
    ...mergeExtraDefs(extraDefs).map((extra) => extra.id),
  ]);
  for (const id of [
    ...definitions.map(({ type }) => type),
    ...(extraDefs ?? [])
      .map((extra) => extra.id)
      .filter((id) => id === BODY_NODE_ID),
  ]) {
    if (taken.has(id) || id === BODY_NODE_ID) {
      throw new IsomerError(
        'INVALID_BODY_NODE',
        `buildAuthoringJsonSchema: def id ${JSON.stringify(id)} is taken by ${id === BODY_NODE_ID ? 'the body-node union' : 'a shared def'}`
      );
    }
  }
  const projected = buildCompositionJsonSchema(definitions, {
    ...rest,
    extraDefs: mergeExtraDefs(extraDefs),
  });
  return slimAuthoringSchema(projected, {
    ...(describe === undefined ? {} : { describe }),
    ...(omitProperties === undefined ? {} : { omitProperties }),
  });
};

/** Stands in for the body-node union in {@link authoringSchemaSubset}. */
const BODY_NODE_STUB = {
  description:
    'Any primitive in the catalog, as its own object with its `type`. A container’s description names any it cannot hold.',
};

/**
 * The `$defs` of `types` and every def they reach, cut from a schema
 * {@link buildAuthoringJsonSchema} built. Def ids stay those of `schema`, and
 * the body-node union is a stub rather than every primitive.
 */
export const authoringSchemaSubset = (
  schema: JsonSchema,
  types: readonly string[]
): { $defs: Record<string, unknown> } => {
  const defs = defsOf(schema);
  // A `Map`, so an id such as `constructor` or `__proto__` is never an inherited key.
  const kept = new Map<string, unknown>();
  const visit = (id: string): void => {
    if (kept.has(id)) {
      return;
    }
    if (id === BODY_NODE_ID) {
      kept.set(id, BODY_NODE_STUB);
      return;
    }
    const def = Object.hasOwn(defs, id) ? defs[id] : undefined;
    kept.set(id, def);
    walkJson(def, (value) => {
      const ref = parseDefRef(value.$ref);
      if (ref !== undefined) {
        visit(ref);
      }
    });
  };
  for (const type of types) {
    visit(type);
  }
  return { $defs: Object.fromEntries(kept) };
};
