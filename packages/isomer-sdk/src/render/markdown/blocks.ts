/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The mdast blocks behind builder content, shared by the Slack and React
// translations so both read one parse.

import type { Definition, Nodes, PhrasingContent, RootContent } from 'mdast';

import type { MarkdownContent } from '../../define/markdown_content';

import { markdownBlocks, VERBATIM_TYPE } from './builder';
import { parseGfmBlocks } from './format';

// Each reference resolved to its document's first definition.
const withReferences = (blocks: readonly RootContent[]): RootContent[] => {
  const definitions = new Map<string, Definition>();
  const collect = (node: Nodes): void => {
    if (node.type === 'definition' && !definitions.has(node.identifier)) {
      definitions.set(node.identifier, node);
    }
    if ('children' in node) {
      node.children.forEach(collect);
    }
  };
  blocks.forEach(collect);
  if (definitions.size === 0) {
    return [...blocks];
  }
  const resolve = (node: Nodes): Nodes => {
    switch (node.type) {
      case 'linkReference':
        return {
          type: 'link',
          url: definitions.get(node.identifier)?.url ?? '',
          children: node.children.map(resolve) as PhrasingContent[],
        };
      case 'imageReference':
        return {
          type: 'image',
          url: definitions.get(node.identifier)?.url ?? '',
          alt: node.alt ?? null,
        };
      default:
        return 'children' in node
          ? ({ ...node, children: node.children.map(resolve) } as Nodes)
          : node;
    }
  };
  return blocks.map(resolve) as RootContent[];
};

const lines = (text: string): string => text.replace(/\r\n?/g, '\n');

const literalParagraphs = (text: string): RootContent[] =>
  lines(text)
    .split(/\n[ \t]*\n/)
    .filter((paragraph) => paragraph.trim() !== '')
    .map((paragraph) => ({
      type: 'paragraph',
      children: [{ type: 'text', value: paragraph.trim() }],
    }));

const parsedBlocks = (gfm: string): RootContent[] => {
  const parsed = parseGfmBlocks(lines(gfm)) as RootContent[] | null;
  return parsed === null ? literalParagraphs(gfm) : withReferences(parsed);
};

/** GFM as mdast blocks with references resolved, typed `unknown[]` so no declaration names mdast; source past the parse budget is its literal paragraphs. */
export const gfmBlocks = (gfm: string): readonly unknown[] => parsedBlocks(gfm);

// Markdown printed as written is read as the GFM it holds; authored source
// that sanitizing left inert is never parsed.
const expanded = (node: Nodes): Nodes[] => {
  if ((node.type as string) === VERBATIM_TYPE) {
    const { value, source } = node as unknown as {
      value: string;
      source?: string;
    };
    return source === undefined
      ? parsedBlocks(value)
      : literalParagraphs(source);
  }
  return 'children' in node
    ? [{ ...node, children: node.children.flatMap(expanded) } as Nodes]
    : [node];
};

/** `content` as flat mdast blocks with authored source parsed, typed `unknown[]` so no declaration names mdast. */
export const resolvedMarkdownBlocks = (
  content: MarkdownContent
): readonly unknown[] =>
  (markdownBlocks(content) as RootContent[]).flatMap(expanded);
