/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type JsonObject = Record<string, unknown>;

export const DEF_PREFIX = '#/$defs/';

/** Ids `z.toJSONSchema` gives a def no one named. */
export const ANONYMOUS_DEF = /^__schema\d+$/;

const STRUCTURAL_KEYS = [
  'type',
  'const',
  'enum',
  'properties',
  'additionalProperties',
  'items',
  'prefixItems',
  'oneOf',
  'anyOf',
  'allOf',
] as const;

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const INDENT = '  ';

export const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseDefRef = (ref: unknown): string | undefined =>
  typeof ref === 'string' && ref.startsWith(DEF_PREFIX)
    ? ref.slice(DEF_PREFIX.length)
    : undefined;

export const ownDef = (defs: JsonObject, id: string): unknown =>
  Object.hasOwn(defs, id) ? defs[id] : undefined;

/** `slideStats` becomes `SlideStats`; anything but letters and digits splits words. */
export const pascalCase = (value: string): string => {
  const name = value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join('');
  if (name === '') {
    return 'Type';
  }
  return /^\d/.test(name) ? `_${name}` : name;
};

/** A JSDoc block for `lines`, or `''` when there are none. */
export const jsDoc = (lines: readonly string[], pad: string): string => {
  const text = lines
    .flatMap((line) => line.split('\n'))
    .map((line) => line.replaceAll('*/', '*\\/').trimEnd());
  while (text[0] === '') {
    text.shift();
  }
  while (text.at(-1) === '') {
    text.pop();
  }
  if (text.length === 0) {
    return '';
  }
  const [only] = text;
  if (text.length === 1 && only !== undefined) {
    return `${pad}/** ${only} */\n`;
  }
  return `${pad}/**\n${text
    .map((line) => (line === '' ? `${pad} *` : `${pad} * ${line}`))
    .join('\n')}\n${pad} */\n`;
};

const propertyKey = (key: string): string =>
  IDENTIFIER.test(key) ? key : JSON.stringify(key);

const literal = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'number':
    case 'boolean':
      return String(value);
    default:
      return 'unknown';
  }
};

interface Printed {
  text: string;
  kind: 'atom' | 'union' | 'intersection';
}

const atom = (text: string): Printed => ({ text, kind: 'atom' });

const union = (members: readonly Printed[]): Printed => {
  const unique = [...new Set(members.map(({ text }) => text))];
  if (unique.length === 0) {
    return atom('never');
  }
  const [only] = unique;
  return unique.length === 1 && only !== undefined
    ? atom(only)
    : { text: unique.join(' | '), kind: 'union' };
};

const intersection = (members: readonly Printed[]): Printed => {
  const unique = new Map(members.map((member) => [member.text, member]));
  const [only] = [...unique.values()];
  if (unique.size === 1 && only) {
    return only;
  }
  return {
    text: [...unique.values()]
      .map(({ text, kind }) => (kind === 'union' ? `(${text})` : text))
      .join(' & '),
    kind: 'intersection',
  };
};

const arrayOf = ({ text, kind }: Printed): Printed =>
  atom(kind === 'atom' ? `${text}[]` : `(${text})[]`);

/** What {@link TypePrinter.members} prints and how. */
export interface MemberOptions {
  /** Properties left out. */
  omit?: ReadonlySet<string>;
  /** Properties printed optional whether or not the schema requires them. */
  optional?: ReadonlySet<string>;
}

export interface TypePrinterOptions {
  defs: JsonObject;
  /** TypeScript names for defs printed by reference; every other def is inlined. */
  names: ReadonlyMap<string, string>;
  /** A fresh, unused name, for a def inlining cannot express. */
  claim: (base: string) => string;
}

export interface TypePrinter {
  /** `schema` as a TypeScript type, written at `depth` levels of indent. */
  print: (schema: unknown, depth?: number) => string;
  /** The `key?: Type;` members of an object schema, with their JSDoc, at `depth + 1`. */
  members: (
    schema: JsonObject,
    depth: number,
    options?: MemberOptions
  ) => string;
  /** Type aliases for the anonymous defs that refer to themselves. Call last. */
  promoted: () => string[];
}

/** A TypeScript printer over the subset of JSON Schema `z.toJSONSchema` emits. */
export const createTypePrinter = ({
  defs,
  names,
  claim,
}: TypePrinterOptions): TypePrinter => {
  const promotedNames = new Map<string, string>();

  const printRef = (
    id: string,
    depth: number,
    active: ReadonlySet<string>
  ): Printed => {
    const named = names.get(id);
    if (named !== undefined) {
      return atom(named);
    }
    const target = ownDef(defs, id);
    if (target === undefined) {
      return atom('unknown');
    }
    if (active.has(id)) {
      const name = promotedNames.get(id) ?? claim(pascalCase(id));
      promotedNames.set(id, name);
      return atom(name);
    }
    return printNode(target, depth, new Set([...active, id]));
  };

  const printNode = (
    node: unknown,
    depth: number,
    active: ReadonlySet<string>
  ): Printed => {
    if (node === false) {
      return atom('never');
    }
    if (!isJsonObject(node)) {
      return atom('unknown');
    }
    const parts: Printed[] = [];
    const ref = parseDefRef(node.$ref);
    if (ref !== undefined) {
      parts.push(printRef(ref, depth, active));
    }
    if (STRUCTURAL_KEYS.some((key) => Object.hasOwn(node, key))) {
      parts.push(printStructure(node, depth, active));
    }
    return parts.length === 0 ? atom('unknown') : intersection(parts);
  };

  const printStructure = (
    node: JsonObject,
    depth: number,
    active: ReadonlySet<string>
  ): Printed => {
    const parts: Printed[] = [];
    const own = printOwn(node, depth, active);
    if (own) {
      parts.push(own);
    }
    for (const key of ['oneOf', 'anyOf'] as const) {
      const members = node[key];
      if (Array.isArray(members)) {
        parts.push(
          union(members.map((member) => printNode(member, depth, active)))
        );
      }
    }
    if (Array.isArray(node.allOf)) {
      parts.push(
        intersection(
          node.allOf.map((member) => printNode(member, depth, active))
        )
      );
    }
    return parts.length === 0 ? atom('unknown') : intersection(parts);
  };

  // `undefined` when the node only combines other schemas.
  const printOwn = (
    node: JsonObject,
    depth: number,
    active: ReadonlySet<string>
  ): Printed | undefined => {
    if (Object.hasOwn(node, 'const')) {
      return atom(literal(node.const));
    }
    if (Array.isArray(node.enum)) {
      return union(node.enum.map((value) => atom(literal(value))));
    }
    const { type } = node;
    if (Array.isArray(type)) {
      return union(
        type.map((member) => printTyped(member, node, depth, active))
      );
    }
    if (typeof type === 'string') {
      return printTyped(type, node, depth, active);
    }
    if (
      Object.hasOwn(node, 'properties') ||
      Object.hasOwn(node, 'additionalProperties')
    ) {
      return printObject(node, depth, active);
    }
    if (Object.hasOwn(node, 'items') || Object.hasOwn(node, 'prefixItems')) {
      return printArray(node, depth, active);
    }
    return undefined;
  };

  const printTyped = (
    type: unknown,
    node: JsonObject,
    depth: number,
    active: ReadonlySet<string>
  ): Printed => {
    switch (type) {
      case 'string':
        return atom('string');
      case 'number':
      case 'integer':
        return atom('number');
      case 'boolean':
        return atom('boolean');
      case 'null':
        return atom('null');
      case 'array':
        return printArray(node, depth, active);
      case 'object':
        return printObject(node, depth, active);
      default:
        return atom('unknown');
    }
  };

  const printArray = (
    node: JsonObject,
    depth: number,
    active: ReadonlySet<string>
  ): Printed => {
    const { prefixItems, items } = node;
    if (Array.isArray(prefixItems)) {
      const elements = prefixItems.map(
        (item) => printNode(item, depth, active).text
      );
      if (items !== undefined && items !== false) {
        elements.push(`...${arrayOf(printNode(items, depth, active)).text}`);
      }
      return atom(`[${elements.join(', ')}]`);
    }
    return arrayOf(
      items === undefined ? atom('unknown') : printNode(items, depth, active)
    );
  };

  const printObject = (
    node: JsonObject,
    depth: number,
    active: ReadonlySet<string>
  ): Printed => {
    const hasProperties =
      isJsonObject(node.properties) && Object.keys(node.properties).length > 0;
    const extra = node.additionalProperties;
    if (!hasProperties) {
      if (extra === false) {
        return atom('Record<string, never>');
      }
      return isJsonObject(extra) && Object.keys(extra).length > 0
        ? atom(`Record<string, ${printNode(extra, depth, active).text}>`)
        : atom('Record<string, unknown>');
    }
    const lines = printMembers(node, depth, active, {});
    const index =
      extra === undefined || extra === false
        ? ''
        : `${INDENT.repeat(depth + 1)}[key: string]: unknown;\n`;
    return atom(`{\n${lines}${index}${INDENT.repeat(depth)}}`);
  };

  const printMembers = (
    node: JsonObject,
    depth: number,
    active: ReadonlySet<string>,
    { omit, optional }: MemberOptions
  ): string => {
    const pad = INDENT.repeat(depth + 1);
    const required = new Set(
      Array.isArray(node.required)
        ? node.required.filter((key) => typeof key === 'string')
        : []
    );
    const properties = isJsonObject(node.properties) ? node.properties : {};
    return Object.entries(properties)
      .filter(([key]) => !omit?.has(key))
      .map(([key, property]) => {
        const doc = isJsonObject(property)
          ? jsDoc(
              [
                typeof property.description === 'string'
                  ? property.description
                  : '',
                ...(Object.hasOwn(property, 'default')
                  ? [`@default ${JSON.stringify(property.default)}`]
                  : []),
              ],
              pad
            )
          : '';
        const mark = required.has(key) && !optional?.has(key) ? '' : '?';
        return `${doc}${pad}${propertyKey(key)}${mark}: ${
          printNode(property, depth + 1, active).text
        };\n`;
      })
      .join('');
  };

  return {
    print: (schema, depth = 0) => printNode(schema, depth, new Set()).text,
    members: (schema, depth, options = {}) =>
      printMembers(schema, depth, new Set(), options),
    promoted: () => {
      const aliases: string[] = [];
      for (const [id, name] of promotedNames) {
        aliases.push(
          `type ${name} = ${printNode(ownDef(defs, id), 0, new Set([id])).text};`
        );
      }
      return aliases;
    },
  };
};
