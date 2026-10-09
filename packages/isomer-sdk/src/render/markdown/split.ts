/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Definition,
  FootnoteDefinition,
  Nodes,
  PhrasingContent,
  RootContent,
} from 'mdast';

import type { MarkdownContent } from '../../define/markdown_content';

import { md, printParsed, verbatim } from './builder';
import { exceedsParseBudget, inert, parseGfmBlocks } from './format';
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

const isHost = (node: Nodes): boolean =>
  (node.type as string) === HOST_ELEMENT_TYPE;

const asHost = (node: Nodes): HostElementNode =>
  node as unknown as HostElementNode;

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

// A footnote prints at the end of its segment, away from where it is cited,
// so a tag inside one stays text.
const keepInFootnotes = (blocks: readonly RootContent[]) => {
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

// Removes every descendant `removes` matches, appending each to `removed` in
// document order, and drops what that empties: an empty strong would print as
// a thematic break, and an empty list item as a marker that can read as a
// setext underline. Returns `undefined` when nothing is left.
const strip = (
  node: Nodes,
  removes: (node: Nodes) => boolean,
  removed: Nodes[] = []
): Nodes | undefined => {
  if (!('children' in node) || !contains(node, removes)) {
    return node;
  }
  const kept = (node.children as Nodes[]).flatMap((child) => {
    if (removes(child)) {
      removed.push(child);
      return [];
    }
    const stripped = strip(child, removes, removed);
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

const withoutHosts = (node: Nodes): Piece[] => {
  const found: Nodes[] = [];
  const stripped = strip(node, isHost, found);
  return [
    ...(stripped ? [{ node: stripped }] : []),
    ...found.map((host) => ({ element: asHost(host) })),
  ];
};

/**
 * `block` without its host elements, as nodes and elements in order. A host
 * element directly in a top-level paragraph splits it in place; any other
 * follows the block it was removed from.
 */
const rebuild = (block: RootContent): Piece[] => {
  if (block.type !== 'paragraph' || !block.children.some(isHost)) {
    return withoutHosts(block);
  }
  const pieces: Piece[] = [];
  let run: Nodes[] = [];
  const flushRun = () => {
    const children = trimEdges(run);
    if (children.length > 0) {
      pieces.push(...withoutHosts({ ...block, children } as Nodes));
    }
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

const firstOf = <T extends Definition | FootnoteDefinition>(
  blocks: readonly Nodes[],
  type: T['type']
): Map<string, T> => {
  const first = new Map<string, T>();
  for (const block of blocks) {
    walk(block, (node) => {
      if (node.type === type && !first.has((node as T).identifier)) {
        first.set((node as T).identifier, node as T);
      }
    });
  }
  return first;
};

// A footnote no reference in its segment cites renders nothing, nor does a
// later definition of one, so a top-level one is dropped rather than printed.
const withCitedFootnotes = (
  run: readonly Nodes[],
  footnotes: ReadonlyMap<string, FootnoteDefinition>
): Nodes[] => {
  const cited = new Set<string>();
  const kept = new Set<Nodes>();
  const cite = (root: Nodes) =>
    walk(root, (node) => {
      if (node.type === 'footnoteReference') {
        cited.add(node.identifier);
      }
    });
  run.filter((node) => node.type !== 'footnoteDefinition').forEach(cite);
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of run) {
      if (
        node.type === 'footnoteDefinition' &&
        !kept.has(node) &&
        cited.has(node.identifier) &&
        footnotes.get(node.identifier) === node
      ) {
        kept.add(node);
        cite(node);
        grew = true;
      }
    }
  }
  return run.filter(
    (node) => node.type !== 'footnoteDefinition' || kept.has(node)
  );
};

const splitParsed = (
  source: string,
  blocks: readonly RootContent[]
): AuthoredMarkdownSegment[] | null => {
  keepInFootnotes(blocks);
  if (!blocks.some((block) => contains(block, isHost))) {
    return null;
  }
  const definitions = firstOf<Definition>(blocks, 'definition');
  const footnotes = firstOf<FootnoteDefinition>(blocks, 'footnoteDefinition');

  // Each segment is a document of its own. A link reference whose definition
  // is in another segment is inlined; one past `inlineBudget`, or in a segment
  // inlining would push past the parse budget, prints as its text, as does a
  // footnote reference whose definition is elsewhere. Inlining is charged when
  // tried, so it never adds more than the source's length in total.
  let inlineBudget = source.length;
  const print = (run: readonly Nodes[]): string => {
    const present = new Set<Nodes>();
    for (const node of run) {
      walk(node, (inner) => {
        present.add(inner);
      });
    }
    const local = (identifier: string) => {
      const definition = definitions.get(identifier);
      return definition && present.has(definition) ? undefined : definition;
    };
    let cost = 0;
    for (const node of run) {
      walk(node, (inner) => {
        if (inner.type === 'linkReference' || inner.type === 'imageReference') {
          const { url = '', title } = local(inner.identifier) ?? {};
          cost += url.length + (title?.length ?? 0);
        }
      });
    }
    const resolve =
      (inline: boolean) =>
      (node: Nodes): Nodes[] => {
        if (node.type === 'footnoteReference') {
          const definition = footnotes.get(node.identifier);
          return definition && present.has(definition)
            ? [node]
            : [{ type: 'text', value: `[^${node.label ?? node.identifier}]` }];
        }
        if (node.type === 'linkReference' || node.type === 'imageReference') {
          const definition = local(node.identifier);
          const children =
            node.type === 'linkReference'
              ? (node.children.flatMap(resolve(inline)) as PhrasingContent[])
              : [];
          if (!definition) {
            return [{ ...node, children } as Nodes];
          }
          const { url, title } = definition;
          if (node.type === 'imageReference') {
            return [
              inline
                ? { type: 'image', url, title, alt: node.alt }
                : { type: 'text', value: node.alt ?? '' },
            ];
          }
          return inline ? [{ type: 'link', url, title, children }] : children;
        }
        return 'children' in node
          ? [
              {
                ...node,
                children: node.children.flatMap(resolve(inline)),
              } as Nodes,
            ]
          : [node];
      };
    const printWith = (inline: boolean) =>
      printParsed(run.flatMap(resolve(inline)));
    if (cost === 0 || cost > inlineBudget) {
      return printWith(false);
    }
    inlineBudget -= cost;
    const inlined = printWith(true);
    return exceedsParseBudget(inlined) ? printWith(false) : inlined;
  };

  const segments: AuthoredMarkdownSegment[] = [];
  let run: Nodes[] = [];
  const flush = () => {
    const kept = withCitedFootnotes(run, footnotes);
    if (kept.length > 0) {
      segments.push(...markdown(print(kept)));
    }
    run = [];
  };
  for (const block of blocks) {
    if (isHost(block)) {
      flush();
      segments.push(element(asHost(block)));
    } else if (block.type !== 'definition') {
      // A top-level link definition prints nothing; references to it inline.
      for (const piece of rebuild(block)) {
        if ('element' in piece) {
          flush();
          segments.push(element(piece.element));
        } else {
          run.push(piece.node);
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
