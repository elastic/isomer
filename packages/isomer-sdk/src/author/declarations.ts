/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import type { AnyPrimitiveDefinition } from '../define/primitive_module';

import { readAuthoredSpec } from './authored_fields';
import { prepareAuthoringInput } from './authoring_input';
import { capitalize, createAuthoringModel } from './authoring_model';
import {
  ANONYMOUS_DEF,
  createTypePrinter,
  IDENTIFIER,
  isJsonObject,
  jsDoc,
  type JsonObject,
  ownDef,
  parseDefRef,
  pascalCase,
} from './schema_to_typescript';

type JsonSchema = Record<string, unknown>;

/** Options for {@link buildAuthoringDeclarations}. */
export interface AuthoringDeclarationsOptions {
  /** Also declare the components `buildJsxShim` builds for these primitives. Defaults to `false`. */
  jsx?: boolean;
  /** Ambient module identity. Defaults to `@elastic/isomer-authoring`. */
  moduleName?: string;
}

const RESERVED_NAMES = [
  'AuthorChildren',
  'CompositionProps',
  'authorJsx',
  'components',
];
const JSX_PRELUDE = `function authorJsx(type: unknown, props: unknown, ...children: unknown[]): authorJsx.JSX.Element;
namespace authorJsx {
  namespace JSX {
    interface Element {
      readonly __isomerAuthorElement: true;
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicAttributes {
      key?: string | number;
    }
  }
}
`;
const AUTHOR_CHILDREN = `type AuthorChildren = authorJsx.JSX.Element | { readonly type: unknown; readonly props: unknown; readonly key: string | null } | string | number | boolean | null | undefined | readonly AuthorChildren[];\n`;

const isPlainObjectSchema = (node: unknown): node is JsonObject =>
  isJsonObject(node) &&
  node.type === 'object' &&
  isJsonObject(node.properties) &&
  Object.keys(node.properties).length > 0 &&
  (node.additionalProperties === undefined ||
    node.additionalProperties === false) &&
  !['$ref', 'oneOf', 'anyOf', 'allOf'].some((key) => Object.hasOwn(node, key));

const isNullSchema = (node: unknown): boolean =>
  isJsonObject(node) && node.type === 'null';

/** The object (or array) schema `node` stands for, through `$ref` and nullable wrappers. */
const resolveNode = (
  defs: JsonObject,
  node: unknown,
  active: ReadonlySet<string> = new Set()
): JsonObject | undefined => {
  if (!isJsonObject(node)) {
    return undefined;
  }
  if (isJsonObject(node.properties)) {
    return node;
  }
  if (typeof node.$ref === 'string') {
    const id = parseDefRef(node.$ref);
    return id === undefined || active.has(id)
      ? node
      : (resolveNode(defs, ownDef(defs, id), new Set([...active, id])) ?? node);
  }
  for (const key of ['anyOf', 'oneOf'] as const) {
    const members = node[key];
    if (Array.isArray(members)) {
      const present = members.filter((member) => !isNullSchema(member));
      if (present.length === 1) {
        return resolveNode(defs, present[0], active);
      }
    }
  }
  return node;
};

const primitiveDoc = (
  { catalog }: AnyPrimitiveDefinition,
  node: unknown
): string[] => {
  const { purpose, useWhen, avoidWhen } = catalog;
  const description =
    isJsonObject(node) && typeof node.description === 'string'
      ? node.description
      : undefined;
  return [
    purpose,
    ...(description && description !== purpose ? ['', description] : []),
    ...(useWhen.length > 0
      ? ['', 'Use when:', ...useWhen.map((line) => `- ${line}`)]
      : []),
    ...(avoidWhen.length > 0
      ? ['', 'Avoid when:', ...avoidWhen.map((line) => `- ${line}`)]
      : []),
  ];
};

/** An ambient module for the schema from `buildAuthoringJsonSchema` and its primitive definitions. */
export const buildAuthoringDeclarations = (
  schema: JsonSchema,
  definitions: readonly AnyPrimitiveDefinition[],
  {
    jsx = false,
    moduleName = '@elastic/isomer-authoring',
  }: AuthoringDeclarationsOptions = {}
): string => {
  const defs = { ...(isJsonObject(schema.$defs) ? schema.$defs : {}) };
  const model = jsx ? createAuthoringModel(definitions) : undefined;
  const customProps = new Map<string, string>();
  for (const [type, { field }] of model?.children ?? []) {
    if (!field.propsSchema) continue;
    const { schema: input, metadata } = prepareAuthoringInput(
      field.propsSchema
    );
    const projected = z.toJSONSchema(input, {
      metadata,
      io: 'input',
      target: 'draft-2020-12',
      cycles: 'ref',
      reused: 'ref',
      unrepresentable: 'any',
    });
    const localDefs = isJsonObject(projected.$defs) ? projected.$defs : {};
    const prefix = `__authorProps${customProps.size}_`;
    const id = `${prefix}Root`;
    const rewrite = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(rewrite);
      if (!isJsonObject(value)) return value;
      return Object.fromEntries(
        Object.entries(value).map(([key, member]) => [
          key,
          key === '$ref' && member === '#'
            ? `#/$defs/${id}`
            : key === '$ref' &&
                typeof member === 'string' &&
                parseDefRef(member) !== undefined
              ? `#/$defs/${prefix}${parseDefRef(member)}`
              : rewrite(member),
        ])
      );
    };
    for (const [id, node] of Object.entries(localDefs))
      defs[`${prefix}${id}`] = rewrite(node);
    const { $defs: _defs, $schema: _schema, ...node } = projected;
    defs[id] = rewrite(node);
    customProps.set(type, id);
  }
  const used = new Set(RESERVED_NAMES);
  const claim = (base: string): string => {
    let name = base;
    for (let suffix = 2; used.has(name); suffix += 1) {
      name = `${base}${suffix}`;
    }
    used.add(name);
    return name;
  };

  const names = new Map<string, string>();
  if (Object.hasOwn(defs, 'bodyNode')) {
    names.set('bodyNode', claim('BodyNode'));
  }
  for (const { type } of definitions) {
    if (Object.hasOwn(defs, type) && !names.has(type)) {
      names.set(type, claim(`${pascalCase(type)}Node`));
    }
  }
  for (const id of Object.keys(defs)) {
    if (!names.has(id) && !ANONYMOUS_DEF.test(id)) {
      names.set(id, claim(pascalCase(id)));
    }
  }

  const printer = createTypePrinter({ defs, names, claim });

  const declareType = (
    name: string,
    node: unknown,
    docLines: readonly string[]
  ): string => {
    const doc = jsDoc(docLines, '');
    return isPlainObjectSchema(node)
      ? `${doc}interface ${name} {\n${printer.members(node, 0)}}\n`
      : `${doc}type ${name} = ${printer.print(node)};\n`;
  };

  const declareBodyNode = (name: string, node: unknown): string => {
    const members =
      isJsonObject(node) && Array.isArray(node.oneOf)
        ? node.oneOf.map((member) => printer.print(member))
        : undefined;
    if (!members) {
      return declareType(name, node, []);
    }
    return `type ${name} =${
      members.length === 0
        ? ' never'
        : `\n${members.map((member) => `  | ${member}`).join('\n')}`
    };\n`;
  };

  const declareJsx = (): string[] => {
    if (!model) return [];
    const out = [JSX_PRELUDE, AUTHOR_CHILDREN];
    const bindings: string[] = [];
    const declared = new Set<string>();
    const declareComponent = (
      component: string,
      node: JsonObject | undefined,
      optional: ReadonlySet<string>,
      takesChildren: boolean,
      omit: ReadonlySet<string> = new Set(),
      docs: readonly string[] = []
    ): void => {
      if (declared.has(component)) return;
      declared.add(component);
      const propsName =
        component === 'Composition'
          ? 'CompositionProps'
          : claim(`${pascalCase(component)}Props`);
      const skipped = new Set([
        ...omit,
        ...(takesChildren ? ['children'] : []),
      ]);
      const extra = node?.additionalProperties;
      const props =
        node && isJsonObject(node.properties)
          ? printer.members(node, 0, { omit: skipped, optional })
          : '';
      const combined =
        node &&
        !isJsonObject(node.properties) &&
        ['$ref', 'anyOf', 'oneOf', 'allOf'].some((key) =>
          Object.hasOwn(node, key)
        );
      out.push(
        combined
          ? `type ${propsName} = (${printer.print(node)})${takesChildren ? ' & { children?: AuthorChildren }' : ''};\n`
          : `interface ${propsName} {\n${props}${takesChildren ? '  children?: AuthorChildren;\n' : ''}}\n`
      );
      const open = !combined && (!node || extra !== false);
      const extraType =
        extra === undefined || extra === true
          ? 'unknown'
          : printer.print(extra);
      const inputName = claim('AuthorInput');
      const keyName = claim('AuthorKey');
      const signature = open
        ? `<${inputName} extends ${propsName}>(props: ${inputName} & { [${keyName} in keyof ${inputName} as ${keyName} extends keyof ${propsName} | 'key' ? never : ${keyName}]: ${extraType} }) => null`
        : `(props: ${propsName}) => null`;
      bindings.push(`  ${JSON.stringify(component)}: ${signature};`);
      if (IDENTIFIER.test(component))
        out.push(`${jsDoc(docs, '')}const ${component}: ${signature};\n`);
    };
    declareComponent(
      'Composition',
      schema,
      new Set(['body']),
      true,
      new Set(['type']),
      ['Props of the root `<Composition>` element.']
    );
    for (const definition of definitions) {
      const { type } = definition;
      const node = resolveNode(defs, ownDef(defs, type));
      const spec = model.authoredByType.get(type);
      const slots = model.childSlotsByType.get(type) ?? [];
      const [slot] = slots;
      const filled = spec
        ? [...spec.children, ...spec.text].map(({ field }) => field)
        : slots.length === 1 && slot
          ? [slot.field]
          : [];
      declareComponent(
        capitalize(type),
        node,
        new Set(filled),
        filled.length > 0,
        new Set(['type']),
        primitiveDoc(definition, node)
      );
    }
    for (const [type, { field, primitiveType, path }] of model.children) {
      let node = resolveNode(defs, ownDef(defs, primitiveType));
      for (const step of path) {
        const properties =
          node && isJsonObject(node.properties) ? node.properties : {};
        const property = resolveNode(defs, properties[step.field]);
        node = step.array ? resolveNode(defs, property?.items) : property;
      }
      const customId = customProps.get(type);
      if (field.toItem)
        node = customId ? resolveNode(defs, ownDef(defs, customId)) : undefined;
      const nested = field.toItem
        ? []
        : readAuthoredSpec(field.itemSchema).children;
      const optional = new Set([
        ...nested.map(({ field }) => field),
        ...(field.textField === undefined || field.toItem
          ? []
          : [field.textField]),
      ]);
      declareComponent(
        capitalize(type),
        node,
        optional,
        !!field.toItem || nested.length > 0 || field.textField !== undefined
      );
    }
    out.push(`const components: {\n${bindings.join('\n')}\n};\n`);
    return out;
  };

  const definitionByType = new Map(
    definitions.map((definition) => [definition.type, definition])
  );
  const chunks: string[] = [];
  for (const [id, name] of names) {
    const node = ownDef(defs, id);
    if (id === 'bodyNode') {
      continue;
    }
    const definition = definitionByType.get(id);
    chunks.push(
      declareType(
        name,
        node,
        definition
          ? primitiveDoc(definition, node)
          : [
              isJsonObject(node) && typeof node.description === 'string'
                ? node.description
                : '',
            ]
      )
    );
  }
  const bodyNodeName = names.get('bodyNode');
  if (bodyNodeName !== undefined) {
    chunks.push(declareBodyNode(bodyNodeName, ownDef(defs, 'bodyNode')));
  }

  if (jsx) {
    chunks.push(...declareJsx());
  }
  chunks.push(...printer.promoted().map((alias) => `${alias}\n`));
  const runtimeModule = jsx
    ? `\ndeclare module ${JSON.stringify(`${moduleName}/jsx-runtime`)} {\n  import { authorJsx } from ${JSON.stringify(moduleName)};\n  export import JSX = authorJsx.JSX;\n  export function jsx(type: unknown, props: unknown, key?: string): JSX.Element;\n  export function jsxs(type: unknown, props: unknown, key?: string): JSX.Element;\n}\n\ndeclare module ${JSON.stringify(`${moduleName}/jsx-dev-runtime`)} {\n  import { authorJsx } from ${JSON.stringify(moduleName)};\n  export import JSX = authorJsx.JSX;\n  export function jsxDEV(type: unknown, props: unknown, key?: string, isStaticChildren?: boolean, source?: unknown, self?: unknown): JSX.Element;\n}\n`
    : '';
  return `declare module ${JSON.stringify(moduleName)} {\n${chunks
    .join('\n')
    .split('\n')
    .map((line) => (line ? `  ${line}` : ''))
    .join('\n')}\n}\n${runtimeModule}`;
};
