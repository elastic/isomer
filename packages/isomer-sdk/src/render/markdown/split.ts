/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Html, Nodes, Parents, RootContent, Text } from 'mdast';

import type { MarkdownContent } from '../../define/markdown_content';

import { md, printParsed, verbatim } from './builder';
import { inert, parseGfmBlocks } from './format';

/** A piece of authored Markdown, or one of the host's elements cut out of it. */
export type AuthoredMarkdownSegment =
  | {
      type: 'markdown';
      content: MarkdownContent;
      /** The authored text `content` was built from, for a host that stores a string and passes it to `md.authored` later. */
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
  /** Tag names to cut out, matched case-insensitively. */
  readonly elements: readonly string[];
}

interface Tag {
  start: number;
  end: number;
  name: string;
  attributes: Record<string, string>;
}

interface Hit extends Tag {
  /** From the top-level block down to the text or HTML node holding the tag. */
  path: Nodes[];
  valueStart: number;
  valueEnd: number;
}

type Leaf = Text | Html;
type Range = [number, number];

// A tag body holds no `<`, so a scan from one `<` stops at the next and an
// unclosed tag costs linear time.
const tagPattern = (names: readonly string[]): RegExp =>
  new RegExp(
    `<(${names
      .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|')})(?=[\\s/>])((?:[^<>"']|"[^"<]*"|'[^'<]*')*)>`,
    'gi'
  );

const ATTRIBUTE_RE =
  /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`=]+)))?/g;

const parseAttributes = (body: string): Record<string, string> => {
  const attributes = Object.create(null) as Record<string, string>;
  for (const [, name, double, single, bare] of body.matchAll(ATTRIBUTE_RE)) {
    const key = name!.toLowerCase();
    if (!(key in attributes)) {
      attributes[key] = double ?? single ?? bare ?? '';
    }
  }
  return attributes;
};

const isEscaped = (source: string, index: number): boolean => {
  let backslashes = 0;
  while (source[index - 1 - backslashes] === '\\') {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
};

const findTags = (
  source: string,
  pattern: RegExp,
  names: readonly string[]
): Tag[] => {
  const canonical = new Map(
    [...names].reverse().map((name) => [name.toLowerCase(), name])
  );
  return [...source.matchAll(pattern)].flatMap((match): Tag[] => {
    const { index: start } = match;
    const [whole, name, body] = match;
    return isEscaped(source, start)
      ? []
      : [
          {
            start,
            end: start + whole.length,
            name: canonical.get(name!.toLowerCase())!,
            attributes: parseAttributes(body!),
          },
        ];
  });
};

const element = ({ name, attributes }: Tag): AuthoredMarkdownSegment => ({
  type: 'element',
  name,
  attributes,
});

const markdown = (source: string): AuthoredMarkdownSegment[] =>
  source.trim() === ''
    ? []
    : [{ type: 'markdown', content: md.authored(source), source }];

const cutLinearly = (
  source: string,
  tags: readonly Tag[]
): AuthoredMarkdownSegment[] => {
  const segments: AuthoredMarkdownSegment[] = [];
  const push = (text: string) => {
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
    const text = source.slice(cursor, tag.start);
    push((cursor === 0 ? text : text.trimStart()).trimEnd());
    segments.push(element(tag));
    cursor = tag.end;
  }
  push(source.slice(cursor).trim());
  return segments;
};

const offsets = (node: Nodes): Range | undefined => {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start === undefined || end === undefined ? undefined : [start, end];
};

const childContaining = <T extends Nodes>(
  children: readonly T[],
  [start, end]: Range
): T | undefined => {
  let low = 0;
  let high = children.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const range = offsets(children[middle]!);
    if (!range) {
      return undefined;
    }
    if (range[1] <= start) {
      low = middle + 1;
    } else if (range[0] > start) {
      high = middle - 1;
    } else {
      return end <= range[1] ? children[middle] : undefined;
    }
  }
  return undefined;
};

const isLeaf = (node: Nodes | undefined): node is Leaf =>
  node?.type === 'text' || node?.type === 'html';

const isDefinition = (node: Nodes): boolean =>
  node.type === 'definition' || node.type === 'footnoteDefinition';

// Only text and raw HTML hold a tag: one in code, a link destination or
// title, an image, or a definition stays as written.
const locate = (
  blocks: readonly RootContent[],
  range: Range
): Nodes[] | undefined => {
  const path: Nodes[] = [];
  let children: readonly Nodes[] = blocks;
  for (;;) {
    const child = childContaining<Nodes>(children, range);
    if (!child) {
      break;
    }
    path.push(child);
    if (!('children' in child)) {
      break;
    }
    children = child.children;
  }
  return isLeaf(path[path.length - 1]) && !path.some(isDefinition)
    ? path
    : undefined;
};

const addTo = <K, V>(groups: Map<K, V[]>, key: K, value: V) => {
  const group = groups.get(key);
  if (group) {
    group.push(value);
  } else {
    groups.set(key, [value]);
  }
};

const indexesOf = (text: string, search: string): number[] => {
  const found: number[] = [];
  for (
    let index = text.indexOf(search);
    index !== -1;
    index = text.indexOf(search, index + search.length)
  ) {
    found.push(index);
  }
  return found;
};

// A leaf's value drops escapes, entities, and container prefixes, so each tag
// is matched to the same occurrence of its text in the value. A leaf whose
// occurrences disagree in number keeps its tags as text.
const placeInValue = (
  source: string,
  leaf: Leaf,
  tags: readonly (Tag & { path: Nodes[] })[]
): Hit[] => {
  const [leafStart, leafEnd] = offsets(leaf)!;
  const slice = source.slice(leafStart, leafEnd);
  const byText = new Map<string, (Tag & { path: Nodes[] })[]>();
  for (const tag of tags) {
    const text = source.slice(tag.start, tag.end);
    addTo(byText, text, tag);
  }
  return [...byText].flatMap(([text, group]) => {
    const inSource = indexesOf(slice, text);
    const inValue = indexesOf(leaf.value, text);
    if (inSource.length !== inValue.length) {
      return [];
    }
    return group.flatMap((tag): Hit[] => {
      const occurrence = inSource.indexOf(tag.start - leafStart);
      const valueStart = inValue[occurrence];
      return valueStart === undefined
        ? []
        : [{ ...tag, valueStart, valueEnd: valueStart + text.length }];
    });
  });
};

// Whitespace on one side of a removed tag goes with it, so no run doubles.
const cut = (value: string, start: number, end: number): string => {
  const before = value.slice(0, start);
  const after = value.slice(end);
  return before + (/\s$/.test(before) ? after.trimStart() : after);
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

const KEPT_WHEN_EMPTY = new Set(['root', 'table', 'tableCell', 'tableRow']);

const trimEdges = (children: Nodes[]): Nodes[] => {
  const trimmed = [...children];
  const isBlank = (node: Nodes | undefined) =>
    node?.type === 'break' ||
    (node?.type === 'text' && node.value.trim() === '');
  while (isBlank(trimmed[0])) {
    trimmed.shift();
  }
  while (isBlank(trimmed[trimmed.length - 1])) {
    trimmed.pop();
  }
  const first = trimmed[0];
  if (first?.type === 'text') {
    trimmed[0] = { ...first, value: first.value.trimStart() };
  }
  const last = trimmed[trimmed.length - 1];
  if (last?.type === 'text') {
    trimmed[trimmed.length - 1] = { ...last, value: last.value.trimEnd() };
  }
  return trimmed;
};

// Drops what a removed tag emptied, along the paths it was removed from: an
// empty strong would print as a thematic break, and an empty list item would
// leave a marker that reads as a setext underline.
const prune = (node: Nodes, touched: ReadonlySet<Nodes>): Nodes | undefined => {
  if (node.type === 'text') {
    return node.value === '' ? undefined : node;
  }
  if (node.type === 'html') {
    return node.value.trim() === '' ? undefined : node;
  }
  if (!('children' in node) || !touched.has(node)) {
    return node;
  }
  const kept = (node.children as Nodes[]).flatMap((child) => {
    const pruned = prune(child, touched);
    return pruned ? [pruned] : [];
  });
  const children = PHRASING_PARENTS.has(node.type) ? trimEdges(kept) : kept;
  node.children = children as Parents['children'];
  return children.length === 0 && !KEPT_WHEN_EMPTY.has(node.type)
    ? undefined
    : node;
};

type Piece = { node: Nodes } | { tag: Tag };

/**
 * `block` without its tags, as printable nodes and the elements they follow.
 * A tag directly in a top-level paragraph splits it in place; any other is
 * removed and its element follows the block.
 */
const rebuild = (block: RootContent, hits: readonly Hit[]): Piece[] => {
  const touched = new Set<Nodes>(hits.flatMap(({ path }) => path.slice(0, -1)));
  const isDirect = ({ path }: Hit) =>
    block.type === 'paragraph' && path.length === 2;
  const byLeaf = new Map<Leaf, Hit[]>();
  for (const hit of hits) {
    const leaf = hit.path[hit.path.length - 1] as Leaf;
    addTo(byLeaf, leaf, hit);
  }
  for (const [leaf, leafHits] of byLeaf) {
    if (!leafHits.some(isDirect)) {
      for (const { valueStart, valueEnd } of [...leafHits].sort(
        (a, b) => b.valueStart - a.valueStart
      )) {
        leaf.value = cut(leaf.value, valueStart, valueEnd);
      }
    }
  }
  const nested = hits.filter((hit) => !isDirect(hit));

  if (block.type !== 'paragraph' || nested.length === hits.length) {
    const pruned = prune(block, touched);
    return [
      ...(pruned ? [{ node: pruned }] : []),
      ...nested.map((tag) => ({ tag })),
    ];
  }

  const splits: Hit[] = [];
  const groups: Nodes[][] = [[]];
  for (const child of block.children) {
    const leafHits = byLeaf.get(child as Leaf);
    if (!leafHits?.some(isDirect)) {
      groups[groups.length - 1]!.push(child);
      continue;
    }
    const leaf = child as Leaf;
    let from = 0;
    for (const hit of [...leafHits].sort(
      (a, b) => a.valueStart - b.valueStart
    )) {
      groups[groups.length - 1]!.push({
        ...leaf,
        value: leaf.value.slice(from, hit.valueStart),
      });
      splits.push(hit);
      groups.push([]);
      from = hit.valueEnd;
    }
    groups[groups.length - 1]!.push({ ...leaf, value: leaf.value.slice(from) });
  }
  return groups.flatMap((children, index): Piece[] => {
    const paragraph = { ...block, children } as Nodes;
    const pruned = prune(paragraph, new Set([...touched, paragraph]));
    const from = index === 0 ? -1 : splits[index - 1]!.start;
    const to = splits[index]?.start ?? Infinity;
    const split = splits[index];
    return [
      ...(pruned ? [{ node: pruned }] : []),
      ...nested
        .filter(({ start }) => start > from && start < to)
        .map((tag) => ({ tag })),
      ...(split ? [{ tag: split }] : []),
    ];
  });
};

interface Usage {
  links: Set<string>;
  footnotes: Set<string>;
  definedLinks: Set<string>;
  definedFootnotes: Set<string>;
}

const newUsage = (): Usage => ({
  links: new Set(),
  footnotes: new Set(),
  definedLinks: new Set(),
  definedFootnotes: new Set(),
});

const walk = (root: Nodes, visit: (node: Nodes) => void) => {
  const pending: Nodes[] = [root];
  while (pending.length) {
    const node = pending.pop()!;
    visit(node);
    if ('children' in node) {
      pending.push(...(node.children as Nodes[]));
    }
  }
};

const use = (root: Nodes, usage: Usage) =>
  walk(root, (node) => {
    if (node.type === 'linkReference' || node.type === 'imageReference') {
      usage.links.add(node.identifier);
    } else if (node.type === 'footnoteReference') {
      usage.footnotes.add(node.identifier);
    } else if (node.type === 'definition') {
      usage.definedLinks.add(node.identifier);
    } else if (node.type === 'footnoteDefinition') {
      usage.definedFootnotes.add(node.identifier);
    }
  });

const markersOf = (
  source: string,
  block: RootContent
): Parameters<typeof printParsed>[1] => {
  const start = offsets(block)?.[0];
  if (block.type !== 'list' || start === undefined) {
    return {};
  }
  const marker = /^(?:([-*+])|\d{1,9}([.)]))/.exec(
    source.slice(start, start + 11)
  );
  const [, bullet, bulletOrdered] = marker ?? [];
  return block.ordered
    ? bulletOrdered === '.' || bulletOrdered === ')'
      ? { bulletOrdered }
      : {}
    : bullet === '-' || bullet === '*' || bullet === '+'
      ? { bullet }
      : {};
};

const splitParsed = (
  source: string,
  blocks: readonly RootContent[],
  tags: readonly Tag[]
): AuthoredMarkdownSegment[] => {
  const byLeaf = new Map<Leaf, (Tag & { path: Nodes[] })[]>();
  for (const tag of tags) {
    const path = locate(blocks, [tag.start, tag.end]);
    if (path) {
      const leaf = path[path.length - 1] as Leaf;
      addTo(byLeaf, leaf, { ...tag, path });
    }
  }
  const byBlock = new Map<Nodes, Hit[]>();
  for (const [leaf, leafTags] of byLeaf) {
    for (const hit of placeInValue(source, leaf, leafTags)) {
      const [block] = hit.path;
      addTo(byBlock, block!, hit);
    }
  }
  if (byBlock.size === 0) {
    return markdown(source);
  }

  // A top-level definition is carried as written; a nested one is printed
  // without the container prefixes its source lines carry.
  const definitions = new Map<string, string>();
  const footnotes = new Map<string, { node: Nodes; text: string }>();
  for (const block of blocks) {
    const written = (node: Nodes) =>
      node === block ? source.slice(...offsets(node)!) : printParsed(node);
    walk(block, (node) => {
      if (node.type === 'definition' && !definitions.has(node.identifier)) {
        definitions.set(node.identifier, written(node));
      } else if (
        node.type === 'footnoteDefinition' &&
        !footnotes.has(node.identifier)
      ) {
        footnotes.set(node.identifier, { node, text: written(node) });
      }
    });
  }

  const segments: AuthoredMarkdownSegment[] = [];
  let text = '';
  let lastEnd: number | undefined;
  let usage = newUsage();

  const append = (piece: string, node: Nodes, range?: Range) => {
    const gap =
      range && lastEnd !== undefined ? source.slice(lastEnd, range[0]) : '\n\n';
    text = text === '' ? piece : `${text}${gap}${piece}`;
    lastEnd = range?.[1];
    use(node, usage);
  };

  // A reference resolves only within its own segment, so each takes a copy
  // of the definitions it uses, and of those its footnotes use in turn.
  // Copies stop once they would add more than the source's length, so they
  // never more than double the parsing each segment's `md.authored` does.
  let carryBudget = source.length;
  const carry = (copy: string): boolean => {
    if (copy.length > carryBudget) {
      return false;
    }
    carryBudget -= copy.length;
    return true;
  };
  const flush = () => {
    if (text.trim() !== '') {
      const carried: string[] = [];
      for (const identifier of usage.footnotes) {
        const footnote = footnotes.get(identifier);
        if (
          footnote &&
          !usage.definedFootnotes.has(identifier) &&
          carry(footnote.text)
        ) {
          usage.definedFootnotes.add(identifier);
          carried.push(footnote.text);
          use(footnote.node, usage);
        }
      }
      for (const identifier of usage.links) {
        const definition = definitions.get(identifier);
        if (
          definition &&
          !usage.definedLinks.has(identifier) &&
          carry(definition)
        ) {
          carried.push(definition);
        }
      }
      segments.push(...markdown([text, ...carried].join('\n\n')));
    }
    text = '';
    lastEnd = undefined;
    usage = newUsage();
  };

  for (const block of blocks) {
    const range = offsets(block);
    if (!range) {
      continue;
    }
    if (isDefinition(block)) {
      lastEnd = undefined;
      continue;
    }
    const hits = byBlock.get(block);
    if (!hits) {
      append(source.slice(...range), block, range);
      continue;
    }
    for (const piece of rebuild(block, hits)) {
      if ('tag' in piece) {
        flush();
        segments.push(element(piece.tag));
      } else {
        append(printParsed(piece.node, markersOf(source, block)), piece.node);
      }
    }
  }
  flush();
  return segments;
};

/**
 * Splits authored Markdown at the host's own elements, such as
 * `<render_attachment id="…" />`, so the host can replace each with content
 * of its own. The source is parsed once, and only a tag in text or raw HTML
 * is cut: one in code, a link destination or title, an image, or a definition
 * stays text. A block that held a tag is rebuilt from its parse, so no list,
 * table, quote, or emphasis around the tag breaks. Each `markdown` segment is
 * sanitized as `md.authored` sanitizes; past the parse budget the source is
 * cut at each tag and every piece degrades to inert text.
 *
 * @example
 * splitAuthoredMarkdown(message, { elements: ['render_attachment'] })
 */
export const splitAuthoredMarkdown = (
  source: string,
  { elements }: SplitAuthoredMarkdownOptions
): AuthoredMarkdownSegment[] => {
  const names = elements.filter((name) => name !== '');
  if (names.length === 0) {
    return markdown(source);
  }
  const tags = findTags(source, tagPattern(names), names);
  if (tags.length === 0) {
    return markdown(source);
  }
  const blocks = parseGfmBlocks(source) as readonly RootContent[] | null;
  return blocks ? splitParsed(source, blocks, tags) : cutLinearly(source, tags);
};
