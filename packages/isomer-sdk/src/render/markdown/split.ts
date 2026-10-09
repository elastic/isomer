/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Nodes, RootContent } from 'mdast';

import type { MarkdownContent } from '../../define/markdown_content';

import { md, verbatim } from './builder';
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

interface PlacedTag extends Tag {
  /** The tag sits in a top-level paragraph, outside any inline container. */
  direct: boolean;
}

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

// `undefined` when the range straddles sibling blocks, which no tag can.
const locate = (
  blocks: readonly RootContent[],
  range: Range
): { block: RootContent; direct: boolean } | undefined => {
  const block = childContaining(blocks, range);
  if (!block) {
    return undefined;
  }
  let node: Nodes = block;
  let parent: Nodes | undefined;
  while ('children' in node) {
    const child: Nodes | undefined = childContaining<Nodes>(
      node.children,
      range
    );
    if (!child) {
      break;
    }
    parent = node;
    node = child;
  }
  if ('children' in node && !PHRASING_PARENTS.has(node.type)) {
    return undefined;
  }
  const container = 'children' in node ? node : parent;
  return { block, direct: block.type === 'paragraph' && container === block };
};

const collect = (
  blocks: readonly RootContent[]
): { code: Range[]; references: number[] } => {
  const code: Range[] = [];
  const references: number[] = [];
  const pending: Nodes[] = [...blocks].reverse();
  while (pending.length) {
    const node = pending.pop()!;
    const range = offsets(node);
    if (node.type === 'code' || node.type === 'inlineCode') {
      if (range) {
        code.push(range);
      }
    } else {
      if (
        range &&
        (node.type === 'linkReference' || node.type === 'imageReference')
      ) {
        references.push(range[0]);
      }
      if ('children' in node) {
        pending.push(...[...node.children].reverse());
      }
    }
  }
  return { code, references };
};

// Text after a split starts a paragraph of its own, so it must not open
// another block; text before it must not end on a setext underline.
const OPENS_BLOCK_RE = /(?:[-+*>#=_|~`]|\d{1,9}[.)]|\[[^\]\n]*\]:)/y;
const ENDS_ON_UNDERLINE_RE = /(?:^|\n)[ \t]*(?:[-=*_][ \t]*)+$/;
const WHITESPACE_RE = /\s/;
const WORD_RE = /[\p{L}\p{N}]/u;
const LINE_PREFIX_RE = /^[ \t>]*$/;

const splitParsed = (
  source: string,
  blocks: readonly RootContent[],
  tags: readonly Tag[],
  pattern: RegExp
): AuthoredMarkdownSegment[] => {
  const { code, references } = collect(blocks);
  const placed = new Map<RootContent, PlacedTag[]>();
  let codeIndex = 0;
  for (const tag of tags) {
    while (code[codeIndex] && code[codeIndex]![1] <= tag.start) {
      codeIndex += 1;
    }
    if (code[codeIndex] && code[codeIndex]![0] < tag.end) {
      continue;
    }
    const location = locate(blocks, [tag.start, tag.end]);
    if (location) {
      const { block, direct } = location;
      placed.set(block, [...(placed.get(block) ?? []), { ...tag, direct }]);
    }
  }

  const definitions = blocks
    .filter((block) => block.type === 'definition')
    .flatMap((block) => {
      const range = offsets(block);
      return range ? [source.slice(...range)] : [];
    })
    .join('\n');

  const segments: AuthoredMarkdownSegment[] = [];
  let text = '';
  let cursor = 0;
  let referenceIndex = 0;
  let referenced = false;
  let afterSplit = false;

  const take = (end: number) => {
    if (end <= cursor) {
      return;
    }
    text += source.slice(cursor, end);
    while (references[referenceIndex] !== undefined) {
      const start = references[referenceIndex]!;
      if (start >= end) {
        break;
      }
      referenced ||= start >= cursor;
      referenceIndex += 1;
    }
    cursor = end;
  };
  const skip = (end: number) => {
    cursor = Math.max(cursor, end);
  };
  const flush = () => {
    const piece = (
      afterSplit ? text.trimStart() : text.replace(/^(?:[ \t]*\n)+/, '')
    ).trimEnd();
    if (piece !== '') {
      segments.push(
        ...markdown(
          referenced && definitions ? `${piece}\n\n${definitions}` : piece
        )
      );
    }
    text = '';
    referenced = false;
    afterSplit = false;
  };

  const canSplit = (before: string, after: number, end: number): boolean => {
    let start = after;
    while (start < end && WHITESPACE_RE.test(source[start]!)) {
      start += 1;
    }
    OPENS_BLOCK_RE.lastIndex = start;
    return (
      (start === end || !OPENS_BLOCK_RE.test(source)) &&
      !ENDS_ON_UNDERLINE_RE.test(before.trimEnd())
    );
  };

  // A tag alone on its line takes the line with it, so no blank line splits
  // the block around it; otherwise it takes the space before it.
  const removal = (tag: Tag, [start, end]: Range): Range => {
    const lineStart = Math.max(
      source.lastIndexOf('\n', tag.start - 1) + 1,
      start
    );
    const next = source.indexOf('\n', tag.end);
    const lineEnd = next === -1 || next > end ? end : next;
    if (
      LINE_PREFIX_RE.test(source.slice(lineStart, lineEnd).replace(pattern, ''))
    ) {
      if (lineEnd < end) {
        return [lineStart, lineEnd + 1];
      }
      return [lineStart > start ? lineStart - 1 : lineStart, lineEnd];
    }
    let from = tag.start;
    if (tag.end >= lineEnd || !WORD_RE.test(source[tag.end]!)) {
      while (from > lineStart && /[ \t]/.test(source[from - 1]!)) {
        from -= 1;
      }
    }
    return [from, tag.end];
  };

  for (const block of blocks) {
    const range = offsets(block);
    if (!range) {
      continue;
    }
    if (block.type === 'definition') {
      take(range[0]);
      skip(range[1]);
      continue;
    }
    const pending: PlacedTag[] = [];
    let pieceStart = range[0];
    for (const tag of placed.get(block) ?? []) {
      if (
        tag.direct &&
        canSplit(source.slice(pieceStart, tag.start), tag.end, range[1])
      ) {
        take(tag.start);
        skip(tag.end);
        flush();
        segments.push(...pending.splice(0).map(element), element(tag));
        afterSplit = true;
        pieceStart = tag.end;
      } else {
        const [from, to] = removal(tag, range);
        take(from);
        skip(to);
        pending.push(tag);
      }
    }
    if (pending.length) {
      take(range[1]);
      flush();
      segments.push(...pending.map(element));
    }
  }
  take(source.length);
  flush();
  return segments;
};

/**
 * Splits authored Markdown at the host's own elements, such as
 * `<render_attachment id="…" />`, so the host can replace each with content
 * of its own. The source is parsed once, so a tag inside code stays text and
 * no list, table, quote, or emphasis around a tag is cut. A tag that cannot
 * stand where it is without breaking the block around it is lifted out of
 * that block and follows it. Each `markdown` segment is sanitized as
 * `md.authored` sanitizes; past the parse budget the source is cut at each
 * tag and every piece degrades to inert text.
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
  const pattern = tagPattern(names);
  const tags = findTags(source, pattern, names);
  if (tags.length === 0) {
    return markdown(source);
  }
  const blocks = parseGfmBlocks(source) as readonly RootContent[] | null;
  return blocks
    ? splitParsed(source, blocks, tags, pattern)
    : cutLinearly(source, tags);
};
