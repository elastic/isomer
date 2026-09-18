/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodType } from 'zod';

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

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const parseDefRef = (ref: unknown): string | undefined => {
  if (typeof ref !== 'string' || !ref.startsWith(DEF_PREFIX)) {
    return undefined;
  }
  return ref.slice(DEF_PREFIX.length);
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
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(visit(node))) {
    next[key] = mapJson(value, visit);
  }
  return next;
};

const rewriteDefRefs = (
  schema: JsonSchema,
  rewrite: (id: string) => string | JsonSchema | undefined
): JsonSchema =>
  mapJson(schema, (node) => {
    const id = parseDefRef(node.$ref);
    if (id === undefined) {
      return node;
    }
    const replacement = rewrite(id);
    if (replacement === undefined) {
      return node;
    }
    if (typeof replacement === 'string') {
      return { ...node, $ref: `${DEF_PREFIX}${replacement}` };
    }
    const rest = { ...node };
    delete rest.$ref;
    return Object.keys(rest).length === 0
      ? cloneJson(replacement)
      : { ...cloneJson(replacement), ...rest };
  }) as JsonSchema;

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
    const def = defs[defId];
    if (!isJsonObject(def) || !isJsonObject(def.properties)) {
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
    const def = defs[id];
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
      visit(defs[id]);
    });
  };
  const root: JsonSchema = { ...schema };
  delete root.$defs;
  visit(root);
  referenced.add(BODY_NODE_ID);
  visit(defs[BODY_NODE_ID]);
  const kept: Record<string, unknown> = {};
  for (const [id, def] of Object.entries(defs)) {
    if (referenced.has(id)) {
      kept[id] = def;
    }
  }
  return withDefs(schema, kept);
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

const slimAuthoringSchema = (
  schema: JsonSchema,
  options: AuthoringJsonSchemaOptions
): JsonSchema => {
  const next = cloneJson(schema);
  dropSafeIntegerMaxima(next);
  dropNodeIdAndSurfaces(next);
  omitListedProperties(next, options.omitProperties ?? []);
  const flattened = flattenRefOnlyDefs(next);
  const inlined = inlineScalarDefs(flattened);
  const pruned = pruneUnreferencedDefs(inlined);
  applyDescriptions(pruned, options.describe ?? {});
  return pruned;
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
  const projected = buildCompositionJsonSchema(definitions, {
    ...rest,
    extraDefs: mergeExtraDefs(extraDefs),
  });
  return slimAuthoringSchema(projected, {
    ...(describe === undefined ? {} : { describe }),
    ...(omitProperties === undefined ? {} : { omitProperties }),
  });
};
