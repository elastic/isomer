/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Nodes, Parents, RootContent } from 'mdast';

import type { MarkdownContent } from '../../define/markdown_content';

import { md, printParsed, verbatim } from './builder';
import { inert, parseGfmBlocks } from './format';
import {
  HOST_ELEMENT_TYPE,
  hostElementExtensions,
  type HostElementNode,
} from './host_elements';

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

type Element = Pick<HostElementNode, 'name' | 'attributes'>;
type Range = [number, number];

const escapeName = (name: string): string =>
  name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const element = ({ name, attributes }: Element): AuthoredMarkdownSegment => ({
  type: 'element',
  name,
  attributes,
});

const ATTRIBUTE_RE =
  /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`=]+)))?/g;

const parseAttributes = (body: string): Record<string, string> => {
  const attributes = Object.create(null) as Record<string, string>;
  for (const [, key, double, single, bare] of body.matchAll(ATTRIBUTE_RE)) {
    const lower = key!.toLowerCase();
    if (!(lower in attributes)) {
      attributes[lower] = double ?? single ?? bare ?? '';
    }
  }
  return attributes;
};

const markdown = (source: string): AuthoredMarkdownSegment[] =>
  source.trim() === ''
    ? []
    : [{ type: 'markdown', content: md.authored(source), source }];

// Past the parse budget there is no tree to consult, so the source is cut at
// every tag-shaped run and each piece degrades to inert text. A tag body holds
// no `<`, so a scan from one `<` stops at the next.
const cutLinearly = (
  source: string,
  names: readonly string[]
): AuthoredMarkdownSegment[] => {
  const canonical = new Map(
    [...names].reverse().map((name) => [name.toLowerCase(), name])
  );
  const pattern = new RegExp(
    `<(${names.map(escapeName).join('|')})(?=[\\s/>])((?:[^<>"']|"[^"<]*"|'[^'<]*')*)>`,
    'gi'
  );
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
  for (const { 0: whole, 1: name, 2: body, index } of source.matchAll(
    pattern
  )) {
    const text = source.slice(cursor, index);
    push((cursor === 0 ? text : text.trimStart()).trimEnd());
    segments.push(
      element({
        name: canonical.get(name!.toLowerCase())!,
        attributes: parseAttributes(body!.replace(/(^|[\s"'])\/$/, '$1')),
      })
    );
    cursor = index + whole.length;
  }
  push(source.slice(cursor).trim());
  return segments;
};

const offsets = (node: Nodes): Range | undefined => {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start === undefined || end === undefined ? undefined : [start, end];
};

const isHost = (node: Nodes): boolean =>
  (node.type as string) === HOST_ELEMENT_TYPE;

const asHost = (node: Nodes): HostElementNode =>
  node as unknown as HostElementNode;

const isDefinition = (node: Nodes): boolean =>
  node.type === 'definition' || node.type === 'footnoteDefinition';

// Depth-first in document order.
const walk = (root: Nodes, visit: (node: Nodes) => void) => {
  const pending: Nodes[] = [root];
  while (pending.length) {
    const node = pending.pop()!;
    visit(node);
    if ('children' in node) {
      pending.push(...[...(node.children as Nodes[])].reverse());
    }
  }
};

const contains = (root: Nodes, predicate: (node: Nodes) => boolean) => {
  let found = false;
  walk(root, (node) => {
    found ||= predicate(node);
  });
  return found;
};

// A footnote is carried to every segment that cites it, so a tag inside one
// stays text there.
const keepInDefinitions = (blocks: readonly RootContent[]) => {
  for (const block of blocks) {
    walk(block, (node) => {
      if (node.type === 'footnoteDefinition') {
        walk(node, (inner) => {
          if (isHost(inner)) {
            Object.assign(inner, { type: 'text' });
          }
        });
      }
    });
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

const KEPT_WHEN_EMPTY = new Set(['root', 'table', 'tableCell', 'tableRow']);

// Text either side of a removed tag joins, with one run of whitespace between.
const joinText = (children: Nodes[]): Nodes[] =>
  children.reduce<Nodes[]>((joined, child) => {
    const previous = joined[joined.length - 1];
    if (previous?.type === 'text' && child.type === 'text') {
      const left = previous.value;
      const right = /\s$/.test(left) ? child.value.trimStart() : child.value;
      joined[joined.length - 1] = { ...previous, value: left + right };
    } else {
      joined.push(child);
    }
    return joined;
  }, []);

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

// Removes every host element under `node`, appending each to `found` in
// document order, and drops what that empties: an empty strong would print as
// a thematic break, and an empty list item as a marker that can read as a
// setext underline. Returns `undefined` when nothing is left.
const strip = (node: Nodes, found: Element[]): Nodes | undefined => {
  if (!('children' in node) || !contains(node, isHost)) {
    return node;
  }
  const kept = (node.children as Nodes[]).flatMap((child) => {
    if (isHost(child)) {
      found.push(asHost(child));
      return [];
    }
    const stripped = strip(child, found);
    return stripped ? [stripped] : [];
  });
  const children = PHRASING_PARENTS.has(node.type)
    ? trimEdges(joinText(kept))
    : kept;
  return children.length === 0 && !KEPT_WHEN_EMPTY.has(node.type)
    ? undefined
    : ({ ...node, children } as Nodes);
};

type Piece = { node: Nodes } | { element: Element };

/**
 * `block` without its host elements, as printable nodes and the elements in
 * order. A host element directly in a top-level paragraph splits it in place;
 * any other follows the block it was removed from.
 */
const rebuild = (block: RootContent): Piece[] => {
  if (block.type !== 'paragraph' || !block.children.some(isHost)) {
    const found: Element[] = [];
    const stripped = strip(block, found);
    return [
      ...(stripped ? [{ node: stripped }] : []),
      ...found.map((host) => ({ element: host })),
    ];
  }
  const pieces: Piece[] = [];
  let run: Nodes[] = [];
  const flushRun = () => {
    const found: Element[] = [];
    const stripped = strip({ ...block, children: run } as Nodes, found);
    const children =
      stripped &&
      trimEdges(joinText((stripped as Parents).children as Nodes[]));
    if (children?.length) {
      pieces.push({ node: { ...block, children } as Nodes });
    }
    pieces.push(...found.map((host) => ({ element: host })));
    run = [];
  };
  for (const child of block.children) {
    if (isHost(child)) {
      flushRun();
      pieces.push({ element: asHost(child) });
    } else {
      run.push(child);
    }
  }
  flushRun();
  return pieces;
};

interface Usage {
  links: Set<string>;
  footnotes: Set<string>;
  definedLinks: Set<string>;
  definedFootnotes: Set<string>;
  /** Identifiers, footnotes prefixed `^`, with a later duplicate in the segment that a carried copy must precede. */
  shadowed: Set<string>;
}

const newUsage = (): Usage => ({
  links: new Set(),
  footnotes: new Set(),
  definedLinks: new Set(),
  definedFootnotes: new Set(),
  shadowed: new Set(),
});

// `winners` holds the definition of each identifier the whole parse uses.
const use = (root: Nodes, usage: Usage, winners: ReadonlySet<Nodes>) =>
  walk(root, (node) => {
    if (node.type === 'linkReference' || node.type === 'imageReference') {
      usage.links.add(node.identifier);
    } else if (node.type === 'footnoteReference') {
      usage.footnotes.add(node.identifier);
    } else if (node.type === 'definition') {
      if (winners.has(node)) {
        usage.definedLinks.add(node.identifier);
      } else {
        usage.shadowed.add(node.identifier);
      }
    } else if (node.type === 'footnoteDefinition') {
      if (winners.has(node)) {
        usage.definedFootnotes.add(node.identifier);
      } else {
        usage.shadowed.add(`^${node.identifier}`);
      }
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
  const [, bullet, bulletOrdered] =
    /^(?:([-*+])|\d{1,9}([.)]))/.exec(source.slice(start, start + 11)) ?? [];
  if (block.ordered) {
    return bulletOrdered === '.' || bulletOrdered === ')'
      ? { bulletOrdered }
      : {};
  }
  return bullet === '-' || bullet === '*' || bullet === '+' ? { bullet } : {};
};

const splitParsed = (
  source: string,
  blocks: readonly RootContent[]
): AuthoredMarkdownSegment[] | null => {
  keepInDefinitions(blocks);
  if (!blocks.some((block) => contains(block, isHost))) {
    return null;
  }

  // A top-level definition is carried as written; a nested one is printed
  // without the container prefixes its source lines carry. The first of an
  // identifier wins, as it does in the parse.
  const definitions = new Map<string, string>();
  const footnotes = new Map<string, { node: Nodes; text: string }>();
  const winners = new Set<Nodes>();
  for (const block of blocks) {
    const written = (node: Nodes) =>
      node === block ? source.slice(...offsets(node)!) : printParsed(node);
    walk(block, (node) => {
      if (node.type === 'definition' && !definitions.has(node.identifier)) {
        definitions.set(node.identifier, written(node));
        winners.add(node);
      } else if (
        node.type === 'footnoteDefinition' &&
        !footnotes.has(node.identifier)
      ) {
        footnotes.set(node.identifier, { node, text: written(node) });
        winners.add(node);
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
    use(node, usage, winners);
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
      const leading: string[] = [];
      const carried: string[] = [];
      const place = (key: string, copy: string) =>
        (usage.shadowed.has(key) ? leading : carried).push(copy);
      for (const identifier of usage.footnotes) {
        const footnote = footnotes.get(identifier);
        if (
          footnote &&
          !usage.definedFootnotes.has(identifier) &&
          carry(footnote.text)
        ) {
          usage.definedFootnotes.add(identifier);
          place(`^${identifier}`, footnote.text);
          use(footnote.node, usage, winners);
        }
      }
      for (const identifier of usage.links) {
        const definition = definitions.get(identifier);
        if (
          definition &&
          !usage.definedLinks.has(identifier) &&
          carry(definition)
        ) {
          place(identifier, definition);
        }
      }
      segments.push(...markdown([...leading, text, ...carried].join('\n\n')));
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
    } else if (isHost(block)) {
      flush();
      segments.push(element(asHost(block)));
    } else if (!contains(block, isHost)) {
      append(source.slice(...range), block, range);
    } else {
      for (const piece of rebuild(block)) {
        if ('element' in piece) {
          flush();
          segments.push(element(piece.element));
        } else {
          append(printParsed(piece.node, markersOf(source, block)), piece.node);
        }
      }
    }
  }
  flush();
  return segments;
};

/**
 * Splits authored Markdown at the host's own elements, such as
 * `<render_attachment id="…" />`, so the host can replace each with content
 * of its own. The parser reads each tag as a node, so one in code, a link
 * destination or title, an image's alt text, or a raw HTML block stays text.
 * A block that held a tag is rebuilt from its parse, so no list, table,
 * quote, or emphasis around the tag breaks. Each `markdown` segment is
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
  if (
    names.length === 0 ||
    !new RegExp(`<(?:${names.map(escapeName).join('|')})(?=[\\s/>])`, 'i').test(
      source
    )
  ) {
    return markdown(source);
  }
  const blocks = parseGfmBlocks(source, hostElementExtensions(names)) as
    readonly RootContent[] | null;
  if (!blocks) {
    return cutLinearly(source, names);
  }
  return splitParsed(source, blocks) ?? markdown(source);
};
