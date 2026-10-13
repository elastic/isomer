/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, type ReactElement, type ReactNode } from 'react';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import type {
  AuthorChildContext,
  AuthoredChildField,
  AuthoredSpec,
  JsxShim,
} from '@elastic/isomer-sdk/author';
import { readAuthoredSpec, textFromChildren } from '@elastic/isomer-sdk/author';
import type { ZodType } from 'zod';

/** Reads the JSX authoring brands on a schema; `undefined` prints every field as a prop. */
export type AuthoredSpecReader = (schema: ZodType) => AuthoredSpec | undefined;

/** What the printer reads a pack's authoring from. */
export interface PrintJsxEnv {
  schemaFor: (type: string) => ZodType | undefined;
  /** Parses each candidate back, so a field prints as children only when that round-trips. */
  shim: JsxShim;
  readSpec?: AuthoredSpecReader;
}

const MAX_LINE = 80;
const INDENT = '  ';
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const UNSAFE_TEXT = /[{}<>&]/;
const UNSAFE_ATTRIBUTE = /["\\\n\r&]/;

const TREE = Symbol.for('elastic.isomer.studio.jsx_tree');

/** A text child: the value React receives, and how it prints at an indent. */
interface TextChild {
  value: string;
  print: (indent: string) => string;
}

/** An element to print. Attribute values may hold trees, printed as JSX expressions. */
interface JsxTree {
  [TREE]: true;
  name: string;
  attributes: ReadonlyArray<[string, unknown]>;
  children: ReadonlyArray<JsxTree | TextChild>;
}

const isRecord = (item: unknown): item is Record<string, unknown> =>
  typeof item === 'object' && item !== null && !Array.isArray(item);

const isTree = (value: unknown): value is JsxTree =>
  isRecord(value) && (value as Partial<JsxTree>)[TREE] === true;

const tree = (
  name: string,
  attributes: ReadonlyArray<[string, unknown]>,
  children: ReadonlyArray<JsxTree | TextChild> = []
): JsxTree => ({ [TREE]: true, name, attributes, children });

const printKey = (key: string): string => {
  if (key === '__proto__') {
    return '["__proto__"]';
  }
  return IDENTIFIER.test(key) ? key : JSON.stringify(key);
};

/** The authoring component name for a primitive `type`, as `buildJsxShim` derives it. */
export const componentName = (type: string): string =>
  type.charAt(0).toUpperCase() + type.slice(1);

/** A child's element name: the member `buildJsxShim` puts on its primitive's component. */
export const memberName = (owner: string, name: string): string =>
  `${componentName(owner)}.${componentName(name)}`;

/** A JavaScript literal for `value`, on one line when it fits. */
export const printValue = (value: unknown, indent = ''): string => {
  if (isTree(value)) {
    return printTree(value, indent);
  }
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
): string => {
  if (typeof value === 'string' && !UNSAFE_ATTRIBUTE.test(value)) {
    return `${name}="${value}"`;
  }
  const printed = printValue(value, indent);
  if (isTree(value) && printed.includes('\n')) {
    const inner = indent + INDENT;
    return `${name}={\n${inner}${printValue(value, inner)}\n${indent}}`;
  }
  return `${name}={${printed}}`;
};

const escapeTemplate = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

/** A template literal's text at `indent`: a line break after the backtick, each line one step in, and the closing one back at `indent`. */
const templateText = (lines: readonly string[], indent: string): string =>
  `\n${lines.map((line) => (line ? `${indent}${INDENT}${line}` : line)).join('\n')}\n${indent}`;

/**
 * Ways to write `text` as a child, most readable first. A template literal's value depends on its
 * indent only through leading whitespace every line shares, so it is checked at no indent.
 */
const textChildren = (text: string): TextChild[] => {
  const children: TextChild[] = [];
  if (
    text &&
    text.trim() === text &&
    !UNSAFE_TEXT.test(text) &&
    !/[^\S ]/.test(text)
  ) {
    children.push({ value: text, print: () => text });
  }
  if (text.includes('\n') && !text.includes('\r')) {
    const lines = text.split('\n');
    children.push({
      value: templateText(lines, ''),
      print: (indent) =>
        `{\`${templateText(lines.map(escapeTemplate), indent)}\`}`,
    });
  }
  children.push({
    value: text,
    print: () => `{${JSON.stringify(text)}}`,
  });
  return children;
};

const printTree = (
  { name, attributes, children }: JsxTree,
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
  const printed = children.map((child) =>
    isTree(child) ? printTree(child, inner) : child.print(inner)
  );
  const [only = ''] = printed;
  const inline = `${open}>${only}</${name}>`;
  const isText =
    printed.length === 1 && !only.startsWith('<') && !only.includes('\n');
  if (fits && isText && indent.length + inline.length <= MAX_LINE) {
    return inline;
  }
  return `${open}>\n${printed.map((child) => `${inner}${child}`).join('\n')}\n${indent}</${name}>`;
};

/** Deep equality that ignores `undefined` entries and key order. */
const sameValue = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => sameValue(item, b[index]))
    );
  }
  if (isRecord(a) && isRecord(b)) {
    const keys = (record: Record<string, unknown>) =>
      Object.keys(record).filter((key) => record[key] !== undefined);
    const [aKeys, bKeys] = [keys(a), keys(b)];
    return (
      aKeys.length === bKeys.length &&
      aKeys.every((key) => sameValue(a[key], b[key]))
    );
  }
  return a === b;
};

/** A field's children, or `undefined` when they cannot carry it. */
type Children = ReadonlyArray<JsxTree | TextChild> | undefined;

/** Unique subsets of `count` indexes, largest first. */
const subsetsBySize = (count: number): number[][] =>
  Array.from({ length: 2 ** count }, (_, mask) =>
    Array.from({ length: count }, (_, index) => index).filter(
      (index) => mask & (1 << index)
    )
  ).sort((a, b) => b.length - a.length);

interface Printer {
  nodeTree: (node: PrimitiveNode) => JsxTree;
}

const createPrinter = ({
  schemaFor,
  shim,
  readSpec = readAuthoredSpec,
}: PrintJsxEnv): Printer => {
  const components = shim as unknown as Record<string, unknown>;
  const trees = new WeakMap<object, JsxTree>();

  const isNode = (value: unknown): value is PrimitiveNode =>
    isRecord(value) &&
    typeof value.type === 'string' &&
    schemaFor(value.type) !== undefined;

  const toReact = (value: unknown): unknown => {
    if (isTree(value)) {
      return toElement(value);
    }
    return Array.isArray(value) ? value.map(toReact) : value;
  };

  const toElement = ({ name, attributes, children }: JsxTree): ReactElement => {
    const component = name
      .split('.')
      .reduce<unknown>(
        (scope, part) =>
          typeof scope === 'function' || isRecord(scope)
            ? (scope as Record<string, unknown>)[part]
            : undefined,
        components
      );
    if (typeof component !== 'function' && !isRecord(component)) {
      throw new Error(`No authoring component <${name}>.`);
    }
    return createElement(
      component as Parameters<typeof createElement>[0],
      Object.fromEntries(
        attributes.map(([key, value]) => [key, toReact(value)])
      ),
      ...children.map((child) =>
        isTree(child) ? toElement(child) : child.value
      )
    );
  };

  const parseBody = (children: ReactNode): PrimitiveNode[] =>
    shim.toComposition(createElement(shim.Composition, null, children)).body;

  const childContext: AuthorChildContext = { parseChildren: parseBody };

  const roundTrips = (candidate: JsxTree, node: PrimitiveNode): boolean => {
    try {
      const [parsed, ...rest] = parseBody(toElement(candidate));
      return rest.length === 0 && sameValue(parsed, node);
    } catch {
      return false;
    }
  };

  /** Nodes as element children, or `undefined` when `value` is not a node or a non-empty list of them. */
  const nodeChildren = (value: unknown): JsxTree[] | undefined => {
    const items: unknown[] = Array.isArray(value) ? value : [value];
    return items.length && items.every(isNode)
      ? items.map(nodeTree)
      : undefined;
  };

  /** `value` with each node, alone or in a list, as an element. */
  const jsxAttribute = (value: unknown): unknown => {
    if (isNode(value)) {
      return nodeTree(value);
    }
    return Array.isArray(value) && value.length && value.every(isNode)
      ? value.map(nodeTree)
      : value;
  };

  const textChild = (
    text: unknown,
    readBack: (value: string) => string
  ): TextChild | undefined =>
    typeof text === 'string'
      ? textChildren(text).find(({ value }) => readBack(value) === text)
      : undefined;

  /** Children of a custom `toItem` field's element: the first whose `toItem` gives `item` back. */
  const customItemTree = (
    item: unknown,
    {
      textField,
      toItem,
    }: Pick<AuthoredChildField, 'textField'> & {
      toItem: NonNullable<AuthoredChildField['toItem']>;
    },
    name: string
  ): JsxTree | undefined => {
    const candidates: JsxTree[] = [];
    const withChildren = (
      attributes: ReadonlyArray<[string, unknown]>,
      value: unknown
    ) => {
      if (value === '') {
        candidates.push(tree(name, attributes));
      }
      if (typeof value === 'string') {
        textChildren(value).forEach((child) =>
          candidates.push(tree(name, attributes, [child]))
        );
        return;
      }
      if (
        Array.isArray(value) &&
        value.length &&
        value.every((line) => typeof line === 'string')
      ) {
        withChildren(attributes, value.join('\n'));
        return;
      }
      const nodes = nodeChildren(value);
      if (nodes) {
        candidates.push(tree(name, attributes, nodes));
      }
    };

    if (isRecord(item) && !isNode(item)) {
      const keys = [
        ...new Set([...(textField ? [textField] : []), ...Object.keys(item)]),
      ];
      keys.forEach((key) =>
        withChildren(
          Object.entries(item).filter(
            ([other, value]) => other !== key && value !== undefined
          ),
          item[key]
        )
      );
      candidates.push(
        tree(
          name,
          Object.entries(item).filter(([, value]) => value !== undefined)
        )
      );
    } else {
      withChildren([], item);
    }

    return candidates.find((candidate) => {
      try {
        const { props } = toElement(candidate) as ReactElement<object>;
        return sameValue(toItem(props, childContext), item);
      } catch {
        return false;
      }
    });
  };

  /** One child-field item as an element, or `undefined` when it cannot be one. */
  const itemTree = (
    item: unknown,
    field: AuthoredChildField,
    owner: string
  ): JsxTree | undefined => {
    const name = memberName(owner, field.name);
    const { toItem } = field;
    if (toItem) {
      return customItemTree(item, { ...field, toItem }, name);
    }
    if (!isRecord(item)) {
      return undefined;
    }
    const spec = readSpec(field.itemSchema);
    const entries = Object.entries(item).filter(
      ([, value]) => value !== undefined
    );
    const attributes: Array<[string, unknown]> = [];
    const children: Array<JsxTree | TextChild> = [];
    const claimed = new Set<string>();
    const text = field.textField
      ? textChild(item[field.textField], (value) => textFromChildren(value))
      : undefined;
    entries.forEach(([key, value]) => {
      if (key === field.textField && text) {
        children.unshift(text);
        return;
      }
      const nested = spec?.children.find((child) => child.field === key);
      const sharesName = (other: AuthoredChildField) =>
        other.field !== key &&
        other.name === nested?.name &&
        item[other.field] === undefined;
      if (
        nested &&
        !claimed.has(nested.name) &&
        !spec?.children.some(sharesName)
      ) {
        const items: unknown[] = Array.isArray(value) ? value : [value];
        const nestedTrees = items.map((entry) =>
          itemTree(entry, nested, owner)
        );
        if (items.length && nestedTrees.every(isTree)) {
          claimed.add(nested.name);
          children.push(...nestedTrees);
          return;
        }
      }
      attributes.push([key, value]);
    });
    return tree(name, attributes, children);
  };

  /** What a node's field prints as when it is in children. */
  const fieldChildren = (
    key: string,
    value: unknown,
    spec: AuthoredSpec,
    owner: string
  ): Children => {
    const text = spec.text.find(({ field }) => field === key);
    if (text) {
      const child = textChild(value, (read) =>
        textFromChildren(read, {
          collapseWhitespace: text.collapseWhitespace,
          ...(text.dedent ? { dedent: true } : {}),
        })
      );
      return child ? [child] : undefined;
    }
    const field = spec.children.find((child) => child.field === key);
    if (field) {
      const items: unknown[] = Array.isArray(value) ? value : [value];
      const itemTrees = items.map((item) => itemTree(item, field, owner));
      return items.length && itemTrees.every(isTree) ? itemTrees : undefined;
    }
    return nodeChildren(value);
  };

  const nodeTree = (node: PrimitiveNode): JsxTree => {
    const cached = trees.get(node);
    if (cached) {
      return cached;
    }
    const { type } = node;
    const name = componentName(type);
    const schema = schemaFor(type);
    const spec = schema ? readSpec(schema) : undefined;
    const entries = Object.entries(node).filter(
      ([key, value]) => key !== 'type' && value !== undefined
    );
    if (!spec) {
      return tree(name, entries);
    }

    const capable = entries.flatMap(([key, value]) => {
      const children = fieldChildren(key, value, spec, type);
      return children ? [{ key, children }] : [];
    });
    const build = (
      inChildren: ReadonlySet<string>,
      attribute: (value: unknown) => unknown
    ): JsxTree => {
      const children = capable
        .filter(({ key }) => inChildren.has(key))
        .flatMap(({ children: fieldTrees }) => fieldTrees);
      return tree(
        name,
        entries
          .filter(([key]) => !inChildren.has(key))
          .map(([key, value]) => [key, attribute(value)]),
        [
          ...children.filter((child) => !isTree(child)),
          ...children.filter(isTree),
        ]
      );
    };

    const subsets = subsetsBySize(capable.length).map(
      (indexes) => new Set(indexes.map((index) => capable[index]!.key))
    );
    const found =
      [jsxAttribute, (value: unknown) => value]
        .flatMap((attribute) => subsets.map((set) => build(set, attribute)))
        .find((candidate) => roundTrips(candidate, node)) ??
      tree(name, entries);
    trees.set(node, found);
    return found;
  };

  return { nodeTree };
};

/** Prints one node as authoring JSX for `buildJsxShim`'s components. */
export const printNodeJsx = (node: PrimitiveNode, env: PrintJsxEnv): string =>
  printTree(createPrinter(env).nodeTree(node), '');

/** Prints a composition body as JSX children of `<Composition>`. */
export const printCompositionJsx = (
  body: readonly PrimitiveNode[],
  env: PrintJsxEnv
): string => {
  const { nodeTree } = createPrinter(env);
  const nodes = body
    .map((node) => printTree(nodeTree(node), ''))
    .join('\n')
    .split('\n')
    .map((line) => (line ? `${INDENT}${line}` : line))
    .join('\n');
  return `<Composition>\n${nodes}\n</Composition>`;
};
