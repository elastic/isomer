/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Splits authored Markdown at a host's own tags without a second grammar:
// each tag becomes a sentinel, the stock GFM parser parses the whole source
// once, and where the sentinel lands says what the tag is. In a `text`
// node it is a tag; anywhere else (a code span or block, an image's alt, a
// link destination or title, raw HTML) it is literal and the tag text goes
// back. Blocks that held a tag are then printed from the tree.

import type { Definition, Nodes, RootContent } from 'mdast';

import type { MarkdownContent } from '../../define/markdown_content';

import { md, printParsed, verbatim } from './builder';
import { inert, parseGfmBlocks } from './format';
import { findHostTags, type HostTag } from './host_tags';

/** A piece of authored Markdown, or one of the host's elements cut out of it. */
export type AuthoredMarkdownSegment =
  | {
      type: 'markdown';
      content: MarkdownContent;
      /** The text `content` was built from, for a host that stores a string and passes it to `md.authored` later. */
      source: string;
    }
  | {
      type: 'element';
      /** The name as listed in {@link SplitAuthoredMarkdownOptions.elements}. */
      name: string;
      /** Attribute values as written, keyed by lower-cased name; a bare attribute is `''`. */
      attributes: Readonly<Record<string, string>>;
    };

export interface SplitAuthoredMarkdownOptions {
  /** Tag names to cut out, matched case-insensitively and whole. */
  readonly elements: readonly string[];
}

// A sentinel keeps the tag's own `<` and `>` as its edges, so emphasis and
// other delimiters around it read exactly as they did around the tag, and
// holds private-use characters between them, which no Markdown construct
// reads, so it parses as text wherever the tag was written. Any already in
// the source, literal or as a character reference (the only other way text
// can decode to one), are replaced first, so the parsed text holds sentinels
// only where tags were.
const SENTINEL_RE = /<\uE000(\d+)\uE001>/g;
// In a link destination the parser strips the angle brackets.
const SENTINEL_ANYWHERE_RE = /<?\uE000(\d+)\uE001>?/g;
const RESERVED_RE = /[\uE000\uE001]|&#(?:[xX]0*[eE]00[01]|0*5734[45]);/g;
const sentinel = (index: number): string => `<\uE000${index}\uE001>`;
const withoutReserved = (source: string): string =>
  source.replace(RESERVED_RE, (match) =>
    match.length === 1 ? '\uFFFD' : '&#xFFFD;'
  );

// Tags that read the same get the same sentinel, so a reference label that
// holds one still matches its definition, as the parser matches labels.
const labelKey = (tag: HostTag): string =>
  tag.raw.toLowerCase().replace(/\s+/g, ' ');

const substitute = (source: string, tags: readonly HostTag[]): string => {
  const first = new Map<string, number>();
  let out = '';
  let cursor = 0;
  tags.forEach((tag, index) => {
    const key = labelKey(tag);
    if (!first.has(key)) {
      first.set(key, index);
    }
    out += source.slice(cursor, tag.index) + sentinel(first.get(key)!);
    cursor = tag.index + tag.raw.length;
  });
  return out + source.slice(cursor);
};

// The GFM serializer's cost grows steeply with nesting depth, while the
// parse budget bounds breadth, not depth. Nothing authored nests this deep.
const MAX_DEPTH = 64;

const exceedsDepth = (nodes: readonly Nodes[], depth = 1): boolean =>
  depth > MAX_DEPTH ||
  nodes.some(
    (node) => 'children' in node && exceedsDepth(node.children, depth + 1)
  );

// The tag's node in the tree, until it is cut out again.
const HOST = 'isomerHostElement';
interface HostNode {
  type: typeof HOST;
  tag: HostTag;
}

const isHost = (node: Nodes): boolean => (node.type as string) === HOST;
const hostTag = (node: Nodes): HostTag => (node as unknown as HostNode).tag;

const element = ({ name, attributes }: HostTag): AuthoredMarkdownSegment => ({
  type: 'element',
  name,
  attributes,
});

const markdown = (source: string): AuthoredMarkdownSegment[] =>
  source.trim() === ''
    ? []
    : [{ type: 'markdown', content: md.authored(source), source }];

// A sentinel in a text node becomes a host node between the text around it.
// In any other string (code, alt, url, title, HTML) the tag text goes back. A
// footnote prints at the end of its segment, away from where it is cited, so
// a tag inside one is literal too.
const resolve = (
  node: Nodes,
  tags: readonly HostTag[],
  literal: boolean
): Nodes[] => {
  if (node.type === 'text' && !literal) {
    const parts: Nodes[] = [];
    let cursor = 0;
    for (const match of node.value.matchAll(SENTINEL_RE)) {
      if (match.index > cursor) {
        parts.push({
          type: 'text',
          value: node.value.slice(cursor, match.index),
        });
      }
      parts.push({
        type: HOST,
        tag: tags[Number(match[1])]!,
      } as unknown as Nodes);
      cursor = match.index + match[0].length;
    }
    if (parts.length === 0) {
      return [node];
    }
    if (cursor < node.value.length) {
      parts.push({ type: 'text', value: node.value.slice(cursor) });
    }
    return parts;
  }
  const restored = { ...node } as Record<string, unknown>;
  for (const [key, value] of Object.entries(restored)) {
    if (typeof value === 'string') {
      restored[key] = value.replace(
        SENTINEL_ANYWHERE_RE,
        (_, index: string) => tags[Number(index)]!.raw
      );
    }
  }
  if ('children' in node) {
    restored.children = node.children.flatMap((child) =>
      resolve(child, tags, literal || node.type === 'footnoteDefinition')
    );
  }
  return [restored as unknown as Nodes];
};

// Depth-first, in document order.
const walk = (node: Nodes, visit: (node: Nodes) => void): void => {
  visit(node);
  if ('children' in node) {
    node.children.forEach((child) => walk(child, visit));
  }
};

const PHRASING_PARENTS = new Set([
  'delete',
  'emphasis',
  'heading',
  'link',
  'linkReference',
  'paragraph',
  'strong',
  'tableCell',
]);

// A wrapper the tag leaves empty would print its markers alone (`****` is a
// thematic break). Containers keep their place: an empty list item keeps the
// numbering of the items after it.
const DROPPED_WHEN_EMPTY = new Set([
  'delete',
  'emphasis',
  'heading',
  'link',
  'linkReference',
  'paragraph',
  'strong',
]);

// Text either side of a removed tag joins, with one space if either side
// had one. The run's edges are trimmed, and a hard break left at an edge is
// dropped as `md.paragraph` drops it, since it would print as a bare `\\`.
const tidyPhrasing = (children: Nodes[]): Nodes[] => {
  const joined: Nodes[] = [];
  for (const child of children) {
    const previous = joined[joined.length - 1];
    if (previous?.type === 'text' && child.type === 'text') {
      const left = previous.value.replace(/\s+$/, '');
      const right = child.value.replace(/^\s+/, '');
      const spaced = left !== previous.value || right !== child.value;
      joined[joined.length - 1] = {
        type: 'text',
        value: left + (spaced ? ' ' : '') + right,
      };
    } else {
      joined.push(child);
    }
  }
  const isEdge = (node: Nodes | undefined): boolean =>
    node?.type === 'break' ||
    (node?.type === 'text' && node.value.trim() === '');
  while (isEdge(joined[0])) {
    joined.shift();
  }
  while (isEdge(joined[joined.length - 1])) {
    joined.pop();
  }
  const first = joined[0];
  if (first?.type === 'text') {
    joined[0] = { ...first, value: first.value.trimStart() };
  }
  const last = joined[joined.length - 1];
  if (last?.type === 'text') {
    joined[joined.length - 1] = { ...last, value: last.value.trimEnd() };
  }
  return joined;
};

// `node` without its host nodes, which are appended to `found` in document
// order; `[]` when nothing is left of it. Only a node a tag was removed
// from is tidied, so phrasing elsewhere in the block stays as written.
const strip = (node: Nodes, found: HostTag[]): Nodes[] => {
  if (isHost(node)) {
    found.push(hostTag(node));
    return [];
  }
  if (!('children' in node)) {
    return [node];
  }
  const before = found.length;
  const stripped = node.children.flatMap((child) => strip(child, found));
  if (found.length === before) {
    return [node];
  }
  const children = PHRASING_PARENTS.has(node.type)
    ? tidyPhrasing(stripped)
    : stripped;
  return children.length === 0 && DROPPED_WHEN_EMPTY.has(node.type)
    ? []
    : [{ ...node, children } as Nodes];
};

// The first definition of each identifier, anywhere in the tree, as the
// parser resolved references.
const firstDefinitions = (
  blocks: readonly Nodes[]
): ReadonlyMap<string, Definition> => {
  const definitions = new Map<string, Definition>();
  for (const block of blocks) {
    walk(block, (node) => {
      if (node.type === 'definition' && !definitions.has(node.identifier)) {
        definitions.set(node.identifier, node);
      }
    });
  }
  return definitions;
};

// Each segment is a document of its own, so a definition another segment
// holds is copied ahead of the run that references it.
const printRun = (
  run: readonly Nodes[],
  definitions: ReadonlyMap<string, Definition>
): string => {
  const present = new Set<Nodes>();
  const needed = new Map<string, Definition>();
  for (const block of run) {
    walk(block, (node) => {
      present.add(node);
      if (node.type === 'linkReference' || node.type === 'imageReference') {
        const definition = definitions.get(node.identifier);
        if (definition) {
          needed.set(node.identifier, definition);
        }
      }
    });
  }
  const carried = [...needed.values()].filter((node) => !present.has(node));
  return printParsed([...carried, ...run]);
};

const splitBlocks = (
  blocks: readonly Nodes[],
  tags: readonly HostTag[]
): AuthoredMarkdownSegment[] => {
  const resolved = blocks.flatMap((block) => resolve(block, tags, false));
  const definitions = firstDefinitions(resolved);
  const segments: AuthoredMarkdownSegment[] = [];
  let run: Nodes[] = [];
  const flush = (): void => {
    if (run.length > 0) {
      segments.push(...markdown(printRun(run, definitions)));
    }
    run = [];
  };
  // `block` without its tags joins the run; each tag ends the run after it.
  const push = (block: Nodes): void => {
    const found: HostTag[] = [];
    run.push(...strip(block, found));
    for (const tag of found) {
      flush();
      segments.push(element(tag));
    }
  };
  for (const block of resolved) {
    if (block.type === 'definition') {
      // Prints nothing where it stands; it is copied where it is referenced.
      continue;
    }
    if (block.type !== 'paragraph' || !block.children.some(isHost)) {
      push(block);
      continue;
    }
    // A tag directly in a top-level paragraph splits it in place.
    let piece: Nodes[] = [];
    const pushPiece = (): void => {
      const children = tidyPhrasing(piece);
      if (children.length > 0) {
        push({ ...block, children } as Nodes);
      }
      piece = [];
    };
    for (const child of block.children) {
      if (isHost(child)) {
        pushPiece();
        flush();
        segments.push(element(hostTag(child)));
      } else {
        piece.push(child);
      }
    }
    pushPiece();
  }
  flush();
  return segments;
};

// Past the parse budget there is no tree to consult, so the source is cut at
// each tag and every piece degrades to inert text, as `md.authored` degrades.
const cutLinearly = (
  source: string,
  tags: readonly HostTag[]
): AuthoredMarkdownSegment[] => {
  const segments: AuthoredMarkdownSegment[] = [];
  const push = (piece: string): void => {
    const text = piece.trim();
    if (text !== '') {
      segments.push({
        type: 'markdown',
        content: verbatim(inert(text), text),
        source: text,
      });
    }
  };
  let cursor = 0;
  for (const tag of tags) {
    push(source.slice(cursor, tag.index));
    segments.push(element(tag));
    cursor = tag.index + tag.raw.length;
  }
  push(source.slice(cursor));
  return segments;
};

/**
 * Splits authored Markdown at the host's own elements, such as
 * `<render_attachment id="…" />`, so the host can replace each with content
 * of its own without cutting the raw string. The source is parsed once, so a
 * tag in code, a link destination or title, an image's alt text, or raw HTML
 * stays text, and a list, table, quote, or emphasis around a tag stays whole.
 * Each `markdown` segment is sanitized as `md.authored` sanitizes; past the
 * parse budget the source is cut at each tag into inert pieces.
 *
 * @example
 * splitAuthoredMarkdown(message, { elements: ['render_attachment'] })
 */
export const splitAuthoredMarkdown = (
  source: string,
  { elements }: SplitAuthoredMarkdownOptions
): AuthoredMarkdownSegment[] => {
  const cleaned = withoutReserved(source);
  const tags = findHostTags(cleaned, elements);
  if (tags.length === 0) {
    return markdown(source);
  }
  const blocks = parseGfmBlocks(substitute(cleaned, tags)) as
    readonly RootContent[] | null;
  return blocks && !exceedsDepth(blocks)
    ? splitBlocks(blocks, tags)
    : cutLinearly(cleaned, tags);
};
