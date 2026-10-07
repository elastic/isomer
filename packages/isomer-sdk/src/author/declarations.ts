/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyPrimitiveDefinition } from '../define/primitive_module';

import { type AuthoredChildField, readAuthoredSpec } from './authored_fields';
import { capitalize, inferChildSlots } from './jsx_shim';
import {
  ANONYMOUS_DEF,
  createTypePrinter,
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
}

const RESERVED_NAMES = ['AuthorChildren', 'CompositionProps', 'JSX'];
const MAX_CHILD_DEPTH = 5;

const JSX_PRELUDE = `declare namespace JSX {
  interface Element {}
  interface ElementChildrenAttribute {
    children: {};
  }
}

/** What an authoring element accepts between its tags: elements and text. */
type AuthorChildren =
  | JSX.Element
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly AuthorChildren[];
`;

const LOOSE_PROPS = (name: string): string =>
  `interface ${name} {\n  [prop: string]: unknown;\n  children?: AuthorChildren;\n}\n`;

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
  hops = 0
): JsonObject | undefined => {
  if (!isJsonObject(node) || hops > 8) {
    return undefined;
  }
  if (isJsonObject(node.properties)) {
    return node;
  }
  if (typeof node.$ref === 'string') {
    const id = parseDefRef(node.$ref);
    return id === undefined
      ? node
      : (resolveNode(defs, ownDef(defs, id), hops + 1) ?? node);
  }
  for (const key of ['anyOf', 'oneOf'] as const) {
    const members = node[key];
    if (Array.isArray(members)) {
      const present = members.filter((member) => !isNullSchema(member));
      if (present.length === 1) {
        return resolveNode(defs, present[0], hops + 1);
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

/**
 * `.d.ts` source for an authoring schema, as one ambient script an editor can
 * load as a single extra lib.
 *
 * Each primitive becomes `<Type>Node` with its `catalog` text as JSDoc,
 * `BodyNode` unions them, and every other named `$def` becomes a type of its
 * own. With `jsx`, each primitive and branded child also gets a component and
 * a props type.
 *
 * @param schema - From `buildAuthoringJsonSchema`; its `$defs` must be the ones `definitions` produced.
 */
export const buildAuthoringDeclarations = (
  schema: JsonSchema,
  definitions: readonly AnyPrimitiveDefinition[],
  { jsx = false }: AuthoringDeclarationsOptions = {}
): string => {
  const defs = isJsonObject(schema.$defs) ? schema.$defs : {};
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
    const out = [JSX_PRELUDE];
    const components = new Set(['Composition']);
    const declaredChildren = new Set<string>();

    const propsInterface = (
      name: string,
      node: JsonObject | undefined,
      optional: ReadonlySet<string>,
      takesChildren: boolean
    ): string =>
      node && isJsonObject(node.properties)
        ? `interface ${name} {\n${printer.members(node, 0, {
            omit: new Set(['type']),
            optional,
          })}${takesChildren ? '  children?: AuthorChildren;\n' : ''}}\n`
        : LOOSE_PROPS(name);

    const declareChild = (
      field: AuthoredChildField,
      propertyNode: unknown,
      depth: number
    ): void => {
      const component = capitalize(field.childType);
      if (
        depth > MAX_CHILD_DEPTH ||
        declaredChildren.has(field.childType) ||
        components.has(component)
      ) {
        return;
      }
      declaredChildren.add(field.childType);
      components.add(component);
      const propsName = claim(`${component}Props`);
      const property = resolveNode(defs, propertyNode);
      const item = field.toItem
        ? undefined
        : field.array
          ? resolveNode(defs, property?.items)
          : property;
      const nested = readAuthoredSpec(field.itemSchema).children;
      const optional = new Set([
        ...nested.map(({ field: name }) => name),
        ...(field.textField === undefined ? [] : [field.textField]),
      ]);
      out.push(
        propsInterface(
          propsName,
          item,
          optional,
          nested.length > 0 || field.textField !== undefined
        ),
        `declare const ${component}: (props: ${propsName}) => null;\n`
      );
      const properties =
        item && isJsonObject(item.properties) ? item.properties : {};
      for (const child of nested) {
        declareChild(child, properties[child.field], depth + 1);
      }
    };

    out.push(
      `${jsDoc(['Props of the root `<Composition>` element.'], '')}interface CompositionProps {\n${printer.members(
        schema,
        0,
        { omit: new Set(['type']), optional: new Set(['body']) }
      )}  children?: AuthorChildren;\n}\n`,
      'declare const Composition: (props: CompositionProps) => null;\n'
    );

    for (const definition of definitions) {
      const component = capitalize(definition.type);
      if (components.has(component)) {
        continue;
      }
      components.add(component);
      const node = resolveNode(defs, ownDef(defs, definition.type));
      const spec = readAuthoredSpec(definition.schema);
      const slots = inferChildSlots(definition.children);
      const [slot] = slots;
      const filled =
        spec.children.length + spec.text.length > 0
          ? [...spec.children, ...spec.text].map(({ field }) => field)
          : slots.length === 1 && slot
            ? [slot.field]
            : [];
      const propsName = claim(`${component}Props`);
      out.push(
        propsInterface(propsName, node, new Set(filled), filled.length > 0),
        `declare const ${component}: (props: ${propsName}) => null;\n`
      );
      const properties =
        node && isJsonObject(node.properties) ? node.properties : {};
      for (const field of spec.children) {
        declareChild(field, properties[field.field], 1);
      }
    }
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
  return chunks.join('\n');
};
