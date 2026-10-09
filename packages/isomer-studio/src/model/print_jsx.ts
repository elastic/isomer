/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import type { AuthoredSpec } from '@elastic/isomer-sdk/author';
import { readAuthoredSpec } from '@elastic/isomer-sdk/author';
import type { ZodType } from 'zod';

/** Reads the JSX authoring brands on a schema; `undefined` prints every field as a prop. */
export type AuthoredSpecReader = (schema: ZodType) => AuthoredSpec | undefined;

const isRecord = (item: unknown): item is Record<string, unknown> =>
  typeof item === 'object' && item !== null && !Array.isArray(item);

const MAX_LINE = 80;
const INDENT = '  ';
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const UNSAFE_TEXT = /[{}<>&]/;
const UNSAFE_ATTRIBUTE = /["\\\n\r&]/;

const printKey = (key: string): string => {
  if (key === '__proto__') {
    return '["__proto__"]';
  }
  return IDENTIFIER.test(key) ? key : JSON.stringify(key);
};

/** The authoring component name for a primitive or child `type`, as `buildJsxShim` derives it. */
export const componentName = (type: string): string =>
  type.charAt(0).toUpperCase() + type.slice(1);

/** A JavaScript literal for `value`, on one line when it fits. */
export const printValue = (value: unknown, indent = ''): string => {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value !== 'object' || value === null) {
    return String(value);
  }

  const inner = indent + INDENT;
  const parts = Array.isArray(value)
    ? value.map((item) => printValue(item, inner))
    : Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => `${printKey(key)}: ${printValue(item, inner)}`);
  const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{ ', ' }'];

  if (!parts.length) {
    return Array.isArray(value) ? '[]' : '{}';
  }

  const inline = `${open}${parts.join(', ')}${close}`;
  if (inline.length + indent.length <= MAX_LINE && !inline.includes('\n')) {
    return inline;
  }
  return `${open.trim()}\n${parts
    .map((part) => `${inner}${part},`)
    .join('\n')}\n${indent}${close.trim()}`;
};

const printAttribute = (
  name: string,
  value: unknown,
  indent: string
): string =>
  typeof value === 'string' && !UNSAFE_ATTRIBUTE.test(value)
    ? `${name}="${value}"`
    : `${name}={${printValue(value, indent)}}`;

/** Text that survives a round trip as JSX children, or `undefined` when it must stay a prop. */
const printText = (
  text: string,
  collapseWhitespace: boolean
): string | undefined => {
  if (
    !text ||
    text.trim() !== text ||
    (collapseWhitespace && /\s{2,}|[^\S ]/.test(text))
  ) {
    return undefined;
  }
  return UNSAFE_TEXT.test(text) || /[^\S ]/.test(text)
    ? `{${JSON.stringify(text)}}`
    : text;
};

const printElement = (
  name: string,
  attributes: ReadonlyArray<[string, unknown]>,
  children: readonly string[],
  indent: string
): string => {
  const inner = indent + INDENT;
  const inlineAttributes = attributes.map(([key, value]) =>
    printAttribute(key, value, indent)
  );
  const inlineOpen = [name, ...inlineAttributes].join(' ');
  const fits =
    indent.length + inlineOpen.length + 2 <= MAX_LINE &&
    !inlineAttributes.some((attribute) => attribute.includes('\n'));

  const open = fits
    ? `<${inlineOpen}`
    : `<${name}\n${attributes
        .map(([key, value]) => `${inner}${printAttribute(key, value, inner)}`)
        .join('\n')}\n${indent}`;

  if (!children.length) {
    return `${open}${fits ? ' ' : ''}/>`;
  }
  const only = children[0] ?? '';
  const inline = `${open}>${only}</${name}>`;
  const isText =
    children.length === 1 && !only.startsWith('<') && !only.includes('\n');
  if (fits && isText && indent.length + inline.length <= MAX_LINE) {
    return inline;
  }
  return `${open}>\n${children.map((child) => `${inner}${child}`).join('\n')}\n${indent}</${name}>`;
};

interface PrintContext {
  readSpec: AuthoredSpecReader;
}

/**
 * The shim hands a primitive's JSX children to every child and text field its props leave unset,
 * and an item's element children to every unset field of their child type.
 */
type ChildrenLevel = 'node' | 'item';

const printObject = (
  name: string,
  fields: ReadonlyArray<[string, unknown]>,
  spec: AuthoredSpec | undefined,
  textField: { field: string; collapseWhitespace: boolean } | undefined,
  indent: string,
  context: PrintContext,
  level: ChildrenLevel
): string => {
  const inner = indent + INDENT;
  const attributes: Array<[string, unknown]> = [];
  const children: string[] = [];
  let textChild: string | undefined;

  const isSet = new Set(
    fields.flatMap(([key, value]) => (value === undefined ? [] : [key]))
  );
  const rivals: ReadonlyArray<{ field: string; childType?: string }> = [
    ...(spec?.children ?? []),
    ...(level === 'node' ? (spec?.text ?? []) : []),
  ];
  let claimed = false;
  const mayTakeChildren = (key: string, childType?: string): boolean =>
    level === 'node'
      ? !claimed &&
        rivals.every(({ field }) => field === key || isSet.has(field))
      : rivals.every(
          (rival) =>
            rival.field === key ||
            rival.childType !== childType ||
            isSet.has(rival.field)
        );

  fields.forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (
      textField?.field === key &&
      typeof value === 'string' &&
      mayTakeChildren(key)
    ) {
      textChild = printText(value, textField.collapseWhitespace);
      if (textChild !== undefined) {
        claimed = true;
        return;
      }
    }

    const childField = spec?.children.find(({ field }) => field === key);
    const items: unknown[] = Array.isArray(value) ? value : [value];
    if (
      childField &&
      !childField.toItem &&
      items.length &&
      items.every(isRecord) &&
      mayTakeChildren(key, childField.childType)
    ) {
      claimed = true;
      items.forEach((item) =>
        children.push(
          printObject(
            componentName(childField.childType),
            Object.entries(item),
            context.readSpec(childField.itemSchema),
            childField.textField
              ? { field: childField.textField, collapseWhitespace: true }
              : undefined,
            inner,
            context,
            'item'
          )
        )
      );
      return;
    }

    attributes.push([key, value]);
  });

  return printElement(
    name,
    attributes,
    textChild === undefined ? children : [textChild, ...children],
    indent
  );
};

/** Prints one node as authoring JSX for `buildJsxShim`'s components. */
export const printNodeJsx = (
  node: PrimitiveNode,
  schemaFor: (type: string) => ZodType | undefined,
  { readSpec = readAuthoredSpec }: { readSpec?: AuthoredSpecReader } = {}
): string => {
  const { type } = node;
  const schema = schemaFor(type);
  const spec = schema ? readSpec(schema) : undefined;
  const [text] = spec?.text ?? [];

  return printObject(
    componentName(type),
    Object.entries(node).filter(([key]) => key !== 'type'),
    spec,
    text,
    '',
    { readSpec },
    'node'
  );
};

/** Prints a composition body as JSX children of `<Composition>`. */
export const printCompositionJsx = (
  body: readonly PrimitiveNode[],
  schemaFor: (type: string) => ZodType | undefined,
  options?: { readSpec?: AuthoredSpecReader }
): string => {
  const nodes = body
    .map((node) => printNodeJsx(node, schemaFor, options))
    .join('\n')
    .split('\n')
    .map((line) => (line ? `${INDENT}${line}` : line))
    .join('\n');
  return `<Composition>\n${nodes}\n</Composition>`;
};
