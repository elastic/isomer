/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The inverse of `toComposition`: a composition as JSX source that parses back
// to the same value. A lone unbranded child slot prints as children; every
// other field prints as a prop, which the shim accepts as plain data.

import { IsomerError } from '../composition/error';

/** Options for {@link JsxShim.toJsx}. */
export interface JsxPrintOptions {
  /** Name the root element prints as. Defaults to `Composition`, the shim's own. */
  root?: string;
  /** Columns a line may take before its attributes or items break onto their own lines. Defaults to 80. */
  width?: number;
}

/** What the printer needs to know about a pack, from its shim. */
export interface JsxPrintEnv {
  /** The field a type's JSX children fill, when it has exactly one. */
  childField: (type: string) => { field: string; array: boolean } | undefined;
  /** Paths of `node`'s nested nodes, as its primitive's `children` walker reports them (`items[0]`, `left.items[1]`). */
  childPaths: (node: Record<string, unknown>) => ReadonlySet<string>;
  /** Whether `type` is a registered primitive. */
  isPrimitive: (type: string) => boolean;
  /** The component name `type` prints as. */
  nameOf: (type: string) => string;
}

const INDENT = '  ';
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const ATTRIBUTE_NAME = /^[A-Za-z_$][\w$-]*$/;
const COMPONENT_NAME = /^[A-Z_$][\w$]*$/;
const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const MAX_DEPTH = 256;
// Props JSX cannot carry as data: `createElement` assigns props, so `__proto__` sets the prototype; React consumes `key` and `ref`; the shim reads `children` as JSX children.
const RESERVED_PROPS = new Set(['__proto__', 'children', 'key', 'ref']);
// JSX decodes HTML entities in attribute strings, so any `&` must be an expression; a lone surrogate does not survive a UTF-8 file.
const UNSAFE_ATTRIBUTE =
  /["\n\r\u2028\u2029\\{}<>&]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

interface ChildSite {
  paths: ReadonlySet<string>;
  path: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const quote = (text: string): string =>
  `'${text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(
      LONE_SURROGATE,
      (unit) => `\\u${unit.charCodeAt(0).toString(16).toUpperCase()}`
    )}'`;

// A literal `__proto__` key, quoted or not, sets the prototype; only a computed key makes an own property.
const objectKey = (key: string): string =>
  key === '__proto__'
    ? `[${quote(key)}]`
    : IDENTIFIER.test(key)
      ? key
      : quote(key);

const defined = (entries: [string, unknown][]) =>
  entries.filter(([, value]) => value !== undefined);

/** Prints `composition` as JSX for a shim whose pack `env` describes. */
export const printJsx = (
  composition: Record<string, unknown>,
  env: JsxPrintEnv,
  { root = 'Composition', width = 80 }: JsxPrintOptions = {}
): string => {
  const isNode = (value: unknown): value is Record<string, unknown> =>
    isRecord(value) &&
    typeof value.type === 'string' &&
    env.isPrimitive(value.type);

  const fits = (text: string, indent: string) =>
    !text.includes('\n') && indent.length + text.length <= width;

  const assertDepth = (indent: string): void => {
    if (indent.length > MAX_DEPTH * INDENT.length) {
      throw new IsomerError(
        'INVALID_BODY_NODE',
        `toJsx: the composition nests deeper than ${MAX_DEPTH} levels`
      );
    }
  };

  // An element only where the owning node's walker reports a child; anything else is data, whatever its `type`.
  const value = (item: unknown, indent: string, at?: ChildSite): string => {
    assertDepth(indent);
    if (at?.paths.has(at.path) && isNode(item)) {
      return element(item, indent);
    }
    if (typeof item === 'string') {
      return quote(item);
    }
    const inner = indent + INDENT;
    if (Array.isArray(item)) {
      const items = item.map((entry, index) =>
        value(entry, inner, at && { ...at, path: `${at.path}[${index}]` })
      );
      const inline = `[${items.join(', ')}]`;
      return fits(inline, indent)
        ? inline
        : `[\n${items.map((entry) => `${inner}${entry},`).join('\n')}\n${indent}]`;
    }
    if (isRecord(item)) {
      const entries = defined(Object.entries(item)).map(
        ([key, entry]) =>
          `${objectKey(key)}: ${value(entry, inner, at && { ...at, path: `${at.path}.${key}` })}`
      );
      if (entries.length === 0) {
        return '{}';
      }
      const inline = `{ ${entries.join(', ')} }`;
      return fits(inline, indent)
        ? inline
        : `{\n${entries.map((entry) => `${inner}${entry},`).join('\n')}\n${indent}}`;
    }
    return String(item);
  };

  const attribute = (
    key: string,
    item: unknown,
    indent: string,
    paths?: ReadonlySet<string>
  ): string => {
    if (RESERVED_PROPS.has(key)) {
      throw new IsomerError(
        'INVALID_BODY_NODE',
        `toJsx: a \`${key}\` prop cannot be carried by JSX`
      );
    }
    const at = paths && { paths, path: key };
    if (!ATTRIBUTE_NAME.test(key)) {
      return `{...{ ${objectKey(key)}: ${value(item, indent, at)} }}`;
    }
    return typeof item === 'string' && !UNSAFE_ATTRIBUTE.test(item)
      ? `${key}="${item}"`
      : `${key}={${value(item, indent, at)}}`;
  };

  const tag = (
    name: string,
    props: [string, unknown][],
    children: readonly Record<string, unknown>[],
    indent: string,
    paths?: ReadonlySet<string>
  ): string => {
    const inner = indent + INDENT;
    const attributes = props.map(([key, item]) =>
      attribute(key, item, inner, paths)
    );
    const open = [name, ...attributes].join(' ');
    const head = fits(`<${open}>`, indent)
      ? `<${open}`
      : `<${name}\n${attributes.map((line) => `${inner}${line}`).join('\n')}\n${indent}`;
    if (children.length === 0) {
      return `${head}${head.endsWith('\n' + indent) ? '' : ' '}/>`;
    }
    const body = children
      .map((child) => `${inner}${element(child, inner)}`)
      .join('\n');
    return `${head}>\n${body}\n${indent}</${name}>`;
  };

  const element = (node: Record<string, unknown>, indent: string): string => {
    assertDepth(indent);
    const type = node.type as string;
    const paths = env.childPaths(node);
    const slot = env.childField(type);
    const slotted = slot ? node[slot.field] : undefined;
    const sites = !slot
      ? []
      : slot.array
        ? (Array.isArray(slotted) ? slotted : []).map((child, index) => ({
            child: child as unknown,
            path: `${slot.field}[${index}]`,
          }))
        : [{ child: slotted, path: slot.field }];
    const children = sites.flatMap(({ child, path }) =>
      paths.has(path) && isNode(child) ? [child] : []
    );
    const asChildren =
      children.length > 0 &&
      children.length === (Array.isArray(slotted) ? slotted.length : 1);
    const props = defined(Object.entries(node)).filter(
      ([key]) => key !== 'type' && !(asChildren && key === slot?.field)
    );
    const name = env.nameOf(type);
    if (!COMPONENT_NAME.test(name)) {
      throw new IsomerError(
        'INVALID_BODY_NODE',
        `toJsx: primitive type ${JSON.stringify(type)} has no JSX component name`
      );
    }
    return tag(name, props, asChildren ? children : [], indent, paths);
  };

  if (!COMPONENT_NAME.test(root)) {
    throw new IsomerError(
      'INVALID_BODY_NODE',
      `toJsx: root ${JSON.stringify(root)} is no JSX component name`
    );
  }
  const { body, type: _type, ...rest } = composition;
  if (!Array.isArray(body)) {
    throw new IsomerError(
      'INVALID_BODY_NODE',
      'toJsx: `body` must be an array'
    );
  }
  const nodes = body.map((node, index) => {
    if (!isNode(node)) {
      throw new IsomerError(
        'INVALID_BODY_NODE',
        `toJsx: body[${index}] is not a node of a registered primitive`
      );
    }
    return node;
  });
  return tag(root, defined(Object.entries(rest)), nodes, '');
};
