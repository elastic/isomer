/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A stored slide as JSX to read beside its JSON. Babel builds and prints the
// source, so quoting and escaping are its concern; the JSON tab stays the exact form.

import generatorModule from '@babel/generator';
import {
  arrayExpression,
  booleanLiteral,
  type Expression,
  identifier,
  isValidIdentifier,
  jsxAttribute,
  jsxClosingElement,
  type JSXElement,
  jsxElement,
  jsxExpressionContainer,
  jsxIdentifier,
  jsxOpeningElement,
  jsxSpreadAttribute,
  jsxText,
  nullLiteral,
  numericLiteral,
  objectExpression,
  objectProperty,
  stringLiteral,
  unaryExpression,
} from '@babel/types';
import { slideDeckPrimitives } from '@elastic/isomer-primitives-slides';
import type { Composition } from '@elastic/isomer-sdk';

// The package is CommonJS, so Node's loader hands over its exports object where Vite hands over the function.
const generate =
  (generatorModule as unknown as { default?: typeof generatorModule })
    .default ?? generatorModule;

type Walker = (node: never) => readonly { path: string }[];

const walkers = new Map<string, Walker>(
  slideDeckPrimitives.flatMap((primitive) =>
    'children' in primitive && typeof primitive.children === 'function'
      ? [[primitive.type, primitive.children as Walker]]
      : []
  )
);

type Node = Record<string, unknown> & { type: string };

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { type?: unknown }).type === 'string';

const childPathsOf = (node: Node): ReadonlySet<string> =>
  new Set(
    walkers
      .get(node.type)?.(node as never)
      .map(({ path }) => path)
  );

// Props JSX would swallow or cannot name print through a spread instead.
const ATTRIBUTE_NAME = /^[A-Za-z_$][\w$-]*$/;
const RESERVED = new Set(['children', 'key', 'ref']);

// JSX attribute strings have no escapes, so only a string with nothing to escape, surrogates included, prints as one.
const PLAIN_ATTRIBUTE = /^[^"&{}<>\\\n\r\u2028\u2029\uD800-\uDFFF]*$/;

const componentName = (type: string): string =>
  `${type.slice(0, 1).toUpperCase()}${type.slice(1)}`;

const expressionOf = (
  value: unknown,
  path: string,
  paths: ReadonlySet<string>,
  depth: number
): Expression => {
  if (isNode(value) && paths.has(path)) {
    return elementOf(value, depth);
  }
  if (Array.isArray(value)) {
    return arrayExpression(
      value.map((item, index) =>
        expressionOf(item, `${path}[${index}]`, paths, depth)
      )
    );
  }
  switch (typeof value) {
    case 'string':
      return stringLiteral(value);
    case 'number':
      return value < 0
        ? unaryExpression('-', numericLiteral(-value))
        : numericLiteral(value);
    case 'boolean':
      return booleanLiteral(value);
    case 'object':
      return value === null
        ? nullLiteral()
        : objectExpression(
            Object.entries(value)
              .filter(([, entry]) => entry !== undefined)
              .map(([key, entry]) =>
                objectProperty(
                  isValidIdentifier(key) && key !== '__proto__'
                    ? identifier(key)
                    : stringLiteral(key),
                  expressionOf(entry, `${path}.${key}`, paths, depth),
                  key === '__proto__'
                )
              )
          );
    default:
      return identifier('undefined');
  }
};

/** The field whose every entry is a child node, which prints as the element's children. */
const childrenField = (
  node: Record<string, unknown>,
  paths: ReadonlySet<string>
): string | undefined => {
  const fields = new Set(
    [...paths].map((path) => /^([A-Za-z_$][\w$]*)\[\d+\]$/.exec(path)?.[1])
  );
  const [field] = fields;
  if (fields.size !== 1 || field === undefined) {
    return undefined;
  }
  const value = node[field];
  return Array.isArray(value) && value.length === paths.size
    ? field
    : undefined;
};

const indented = (depth: number) => jsxText(`\n${'  '.repeat(depth)}`);

const elementNamed = (
  name: string,
  props: Record<string, unknown>,
  children: readonly unknown[],
  paths: ReadonlySet<string>,
  depth: number
): JSXElement => {
  const attributes = [];
  const spread: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) {
      continue;
    }
    if (!ATTRIBUTE_NAME.test(key) || RESERVED.has(key)) {
      spread[key] = value;
      continue;
    }
    attributes.push(
      jsxAttribute(
        jsxIdentifier(key),
        typeof value === 'string' && PLAIN_ATTRIBUTE.test(value)
          ? stringLiteral(value)
          : jsxExpressionContainer(expressionOf(value, key, paths, depth + 1))
      )
    );
  }
  const spreadKeys = Object.keys(spread);
  const allAttributes = [
    ...attributes,
    ...(spreadKeys.length > 0
      ? [jsxSpreadAttribute(expressionOf(spread, '', new Set(), depth + 1))]
      : []),
  ];
  const tag = jsxIdentifier(name);
  if (children.length === 0) {
    return jsxElement(jsxOpeningElement(tag, allAttributes, true), null, []);
  }
  return jsxElement(
    jsxOpeningElement(tag, allAttributes),
    jsxClosingElement(jsxIdentifier(name)),
    [
      ...children.flatMap((child) => [
        indented(depth + 1),
        isNode(child)
          ? elementOf(child, depth + 1)
          : jsxExpressionContainer(
              expressionOf(child, '', new Set(), depth + 1)
            ),
      ]),
      indented(depth),
    ]
  );
};

const elementOf = (node: Node, depth: number): JSXElement => {
  const { type, ...props } = node;
  const paths = childPathsOf(node);
  const field = childrenField(props, paths);
  if (field === undefined) {
    return elementNamed(componentName(type), props, [], paths, depth);
  }
  const { [field]: children, ...rest } = props;
  return elementNamed(
    componentName(type),
    rest,
    children as unknown[],
    new Set(),
    depth
  );
};

/** `composition` as JSX for reading: nested nodes print as elements, and everything else as props. */
export const jsxSource = (
  { type: _type, body, ...root }: Composition,
  { root: rootName = 'Composition' }: { root?: string } = {}
): string =>
  generate(elementNamed(rootName, root, body, new Set(), 0), {
    jsescOption: { minimal: true },
  }).code;
