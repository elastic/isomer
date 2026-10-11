/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Definition, Nodes, PhrasingContent, RootContent } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';

import {
  type MarkdownContent,
  markdownContent,
} from '../../define/markdown_content';
import { MAX_INPUT_CHARACTERS } from '../../validate/input_budget';
import {
  sanitizeParsedAssetUrl,
  sanitizeParsedNavigationHref,
} from '../../validate/url';

import { exceedsParseBudget } from './format';
import {
  createHostElementParser,
  type HostElementNode,
  hostElements,
} from './host_elements';

export interface AuthoredElement {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
}

const documentBrand = Symbol.for('elastic.isomer.authored_document');
const documentParts = Symbol.for('elastic.isomer.authored_document.parts');

/** A parsed, sanitized authored document with one scope for references and footnotes. */
export interface AuthoredMarkdownDocument {
  readonly [documentBrand]: true;
  readonly inert: boolean;
  readonly elements: readonly AuthoredElement[];
}

export interface AuthoredMarkdownOptions {
  readonly elements: readonly string[];
}

interface MarkdownPart {
  type: 'markdown';
  content: MarkdownContent;
  text: string;
}

interface ElementPart {
  type: 'element';
  element: AuthoredElement;
}

type Part = MarkdownPart | ElementPart;
type Document = AuthoredMarkdownDocument & {
  readonly [documentParts]: readonly Part[];
};

const isHost = (node: Nodes): boolean =>
  (node.type as string) === 'isomerHostElement';
const text = (value: string): Nodes => ({ type: 'text', value });

const content = (nodes: readonly RootContent[]): MarkdownContent =>
  nodes.map((node) =>
    Object.assign(node, { [markdownContent]: 'block' as const })
  );

const documentText = (node: Nodes): string => {
  const children = 'children' in node ? node.children.map(documentText) : [];
  switch (node.type) {
    case 'link': {
      const label = children.join('');
      return label === node.url ? label : `${label} (${node.url})`;
    }
    case 'image':
      return node.alt ? `${node.alt} (${node.url})` : node.url;
    case 'break':
      return '\n';
    case 'footnoteReference':
      return `[${node.label ?? node.identifier}]`;
    case 'footnoteDefinition':
      return `[${node.label ?? node.identifier}]: ${children.join('\n\n')}`;
    case 'list':
      return children
        .map(
          (child, index) =>
            `${node.ordered ? `${(node.start ?? 1) + index}.` : '-'} ${child}`
        )
        .join('\n');
    case 'table':
      return children.join('\n');
    case 'tableRow':
      return children.join(' | ');
    case 'listItem':
      return `${node.checked == null ? '' : node.checked ? '[x] ' : '[ ] '}${children.join('\n\n')}`;
    case 'blockquote':
      return children.join('\n\n');
    default:
      return 'value' in node ? node.value : children.join('');
  }
};

const checkRepresentedCharacters = (nodes: readonly RootContent[]): void => {
  const pending: Nodes[] = [...nodes];
  let characters = 0;
  while (pending.length) {
    const node = pending.pop()!;
    for (const value of Object.values(node)) {
      if (typeof value === 'string') {
        characters += value.length;
      }
    }
    if (characters > MAX_INPUT_CHARACTERS) {
      throw new RangeError(
        'Authored document expansion exceeds the input budget.'
      );
    }
    if ('children' in node) {
      pending.push(...node.children);
    }
  }
};

const safeNodes = (nodes: readonly RootContent[]): RootContent[] => {
  const definitions = new Map<string, Definition>();
  const collect = (node: Nodes): void => {
    if (node.type === 'definition' && !definitions.has(node.identifier)) {
      definitions.set(node.identifier, node);
    }
    if ('children' in node) {
      node.children.forEach(collect);
    }
  };
  nodes.forEach(collect);
  const footnotes = new Set<string>();
  const normalize = (node: Nodes, protectedContext = false): Nodes[] => {
    if (isHost(node)) {
      return protectedContext
        ? [text((node as unknown as HostElementNode).value)]
        : [node];
    }
    if (node.type === 'definition') {
      return [];
    }
    if (node.type === 'footnoteDefinition') {
      if (footnotes.has(node.identifier)) {
        return [];
      }
      footnotes.add(node.identifier);
      protectedContext = true;
    }
    const children =
      'children' in node
        ? node.children.flatMap((child) => normalize(child, protectedContext))
        : undefined;
    switch (node.type) {
      case 'html':
        return [text(node.value)];
      case 'link':
      case 'linkReference': {
        const definition =
          node.type === 'linkReference'
            ? definitions.get(node.identifier)
            : node;
        const url = definition && sanitizeParsedNavigationHref(definition.url);
        return url
          ? [
              {
                type: 'link',
                url,
                title: definition?.title,
                children: children as PhrasingContent[],
              },
            ]
          : (children ?? []);
      }
      case 'image':
      case 'imageReference': {
        const definition =
          node.type === 'imageReference'
            ? definitions.get(node.identifier)
            : node;
        const url = definition && sanitizeParsedAssetUrl(definition.url);
        return url
          ? [{ type: 'image', url, title: definition?.title, alt: node.alt }]
          : [text(node.alt ?? '')];
      }
      default:
        return [
          children === undefined ? node : ({ ...node, children } as Nodes),
        ];
    }
  };
  return nodes
    .flatMap((node) => normalize(node))
    .map((node) =>
      node.type === 'text' ? { type: 'paragraph', children: [node] } : node
    ) as RootContent[];
};

const partsFromTree = (nodes: readonly RootContent[]): Part[] => {
  const parts: Part[] = [];
  let blocks: RootContent[] = [];
  const flush = (): void => {
    if (blocks.length) {
      parts.push({
        type: 'markdown',
        content: content(blocks),
        text: blocks.map(documentText).join('\n\n'),
      });
    }
    blocks = [];
  };
  const withoutHosts = (node: Nodes, found: AuthoredElement[]): Nodes[] => {
    if (isHost(node)) {
      const { name, attributes } = node as unknown as HostElementNode;
      found.push(Object.freeze({ name, attributes }));
      return [];
    }
    if (!('children' in node)) {
      return [node];
    }
    const children = node.children.flatMap((child) =>
      withoutHosts(child, found)
    );
    const wrapper = [
      'paragraph',
      'heading',
      'strong',
      'emphasis',
      'delete',
      'link',
      'blockquote',
    ].includes(node.type);
    if (
      wrapper &&
      (children.length === 0 ||
        children.every(
          (child) => child.type === 'text' && child.value.trim() === ''
        ))
    ) {
      return [];
    }
    return [{ ...node, children } as Nodes];
  };
  for (const node of nodes) {
    const found: AuthoredElement[] = [];
    blocks.push(...(withoutHosts(node, found) as RootContent[]));
    if (found.length) {
      flush();
      parts.push(
        ...found.map((element): ElementPart => ({ type: 'element', element }))
      );
    }
  }
  flush();
  return parts;
};

const inertContent = (source: string): MarkdownContent =>
  content([
    {
      type: 'isomerVerbatim',
      value: source.replace(/[[\]\\]/g, '\\$&').replace(/</g, '&lt;'),
      source,
    } as unknown as RootContent,
  ]);

const inertParts = (source: string, names: readonly string[]): Part[] => {
  const parts: Part[] = [];
  const appendText = (value: string): void => {
    if (value.trim()) {
      parts.push({
        type: 'markdown',
        content: inertContent(value),
        text: value,
      });
    }
  };
  let cursor = 0;
  const parser = createHostElementParser(names, (element, start, end) => {
    if (/[\r\n]/.test(source.slice(start, end))) {
      return;
    }
    if (start > cursor) {
      appendText(source.slice(cursor, start));
    }
    parts.push({ type: 'element', element });
    cursor = end;
  });
  parser.write(source);
  if (cursor < source.length) {
    appendText(source.slice(cursor));
  }
  return parts;
};

/** Parses once within the authored-Markdown budget; unavailable parsing uses inert text and linear marker extraction. */
export const parseAuthoredMarkdown = (
  source: string,
  { elements }: AuthoredMarkdownOptions
): AuthoredMarkdownDocument => {
  let inert = exceedsParseBudget(source);
  let parts: Part[];
  try {
    if (inert) {
      parts = inertParts(source, elements);
    } else {
      const { syntax, mdast } = hostElements(elements, source.length);
      const tree = fromMarkdown(source, {
        extensions: [syntax, gfm()],
        mdastExtensions: [mdast, gfmFromMarkdown()],
      });
      const nodes = safeNodes(tree.children);
      checkRepresentedCharacters(nodes);
      parts = partsFromTree(nodes);
    }
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
    inert = true;
    parts = inertParts(source, elements);
  }
  const pending: object[] = [parts];
  while (pending.length) {
    const value = pending.pop()!;
    if (Object.isFrozen(value)) {
      continue;
    }
    const children: unknown[] = Object.values(value);
    for (const child of children) {
      if (typeof child === 'object' && child !== null) {
        pending.push(child);
      }
    }
    Object.freeze(value);
  }
  return Object.freeze({
    [documentBrand]: true as const,
    [documentParts]: parts,
    inert,
    elements: Object.freeze(
      parts.flatMap((part) => (part.type === 'element' ? [part.element] : []))
    ),
  });
};

/** Renders document views and host elements in order without printing or reparsing intermediate Markdown. */
export const renderAuthoredMarkdown = <T>(
  document: AuthoredMarkdownDocument,
  renderers: {
    markdown: (content: MarkdownContent, text: string) => T;
    element: (element: AuthoredElement) => T;
  }
): T[] =>
  (document as Document)[documentParts].map((part) =>
    part.type === 'markdown'
      ? renderers.markdown(part.content, part.text)
      : renderers.element(part.element)
  );
