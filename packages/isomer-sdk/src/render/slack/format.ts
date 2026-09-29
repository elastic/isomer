/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Slack mrkdwn helpers.
//
// Slack uses a flavour of Markdown called "mrkdwn" that differs from CommonMark
// in subtle ways: links are `<url|label>`, code uses single backticks (or
// fenced ```` ``` ```` blocks), and `&`, `<`, `>` must be HTML-escaped inside
// any text element. These helpers centralize the escaping so primitive
// renderers cannot accidentally emit a literal `<https://...>` that Slack
// would parse as auto-link with no label.
//
// See https://api.slack.com/reference/surfaces/formatting

import { sanitizeNavigationHref } from '../../validate/url';

import {
  SLACK_LIMITS,
  type SlackBlock,
  type SlackRawTextElement,
  type SlackRichTextBlock,
  type SlackTableBlock,
  type SlackTableColumnSetting,
} from './blocks';

const MRKDWN_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

/**
 * Escapes the three characters Slack treats as HTML in `mrkdwn` text.
 *
 * The formatting markers (`*`, `_`, `~`, `` ` ``) are left intact so callers
 * can compose markdown with them. Wrap text in {@link code} when literal
 * asterisks are needed.
 */
export const escapeMrkdwn = (value: string): string =>
  value.replace(/[&<>]/g, (match) => MRKDWN_ESCAPES[match] ?? match);

export const bold = (text: string): string => `*${escapeMrkdwn(text)}*`;
export const italic = (text: string): string => `_${escapeMrkdwn(text)}_`;
export const strike = (text: string): string => `~${escapeMrkdwn(text)}~`;

/**
 * Inline code span. Contents are not mrkdwn-escaped, since `<` and friends are
 * literal inside a code span; only embedded backticks are demoted, to a
 * modifier letter that cannot close the span.
 */
export const code = (text: string): string =>
  `\`${text.replace(/`/g, '\u02CB')}\``;

/**
 * Fenced code block. Slack honours the triple-backtick fence but not a language
 * hint. Embedded triple-backticks are demoted with a zero-width joiner so they
 * cannot terminate the block early.
 */
export const codeBlock = (text: string): string =>
  `\`\`\`\n${text.replace(/```/g, '``\u200d`')}\n\`\`\``;

const parsedUrl = (url: string): URL | null => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

// `URL` repairs a missing authority (`https:///a` has host `a`), so the literal
// authority is checked too.
const HTTP_AUTHORITY_RE = /^https?:\/\/[^/?#\\]/i;

/** Whether `url` is an `http:` or `https:` URL with a host. */
export const isAbsoluteHttpUrl = (url: string): boolean =>
  HTTP_AUTHORITY_RE.test(url) && Boolean(parsedUrl(url)?.hostname);

/**
 * `href` when it passes {@link sanitizeNavigationHref} as an absolute URL,
 * `null` otherwise. Slack has no page to resolve a relative URL against.
 */
export const slackLinkUrl = (href: string): string | null => {
  const url = sanitizeNavigationHref(href);
  if (url === null) {
    return null;
  }
  return isAbsoluteHttpUrl(url) ||
    (/^mailto:/i.test(url) && Boolean(parsedUrl(url)?.pathname))
    ? url
    : null;
};

/**
 * Slack mrkdwn link, `<url|label>`, or a bare `<url>` when `label` is omitted.
 *
 * URL and label are both escaped so `&` and `>` cannot break Slack's link
 * parser, and a `|` in the URL is percent-encoded so it cannot end the URL
 * early. A URL {@link slackLinkUrl} rejects degrades to plain escaped text
 * with no link.
 */
export const link = (url: string, label?: string): string => {
  const sanitized = slackLinkUrl(url);
  if (!sanitized) {
    return escapeMrkdwn(label ?? url);
  }
  const safeUrl = escapeMrkdwn(sanitized).replaceAll('|', '%7C');
  if (!label) {
    return `<${safeUrl}>`;
  }
  return `<${safeUrl}|${escapeMrkdwn(label)}>`;
};

/**
 * Truncates `value` to `max` UTF-16 code units at a grapheme boundary,
 * appending an ellipsis when it had to cut. Pass a `SLACK_LIMITS` constant as
 * the budget.
 */
export const clampSlackText = (value: string, max: number): string => {
  if (value.length <= max) {
    return value;
  }
  const budget = max <= 1 ? max : max - 1;
  let end = 0;
  for (const { index, segment } of new Intl.Segmenter(undefined, {
    granularity: 'grapheme',
  }).segment(value)) {
    if (index + segment.length > budget) {
      break;
    }
    end = index + segment.length;
  }
  const head = value.slice(0, end);
  return max <= 1 ? head : `${head.trimEnd()}…`;
};

/**
 * Collapses whitespace and clamps to `SLACK_LIMITS.headerTextChars`. Header
 * text is `plain_text`, so no markdown survives — do not pre-format it.
 */
export const formatHeaderText = (value: string): string =>
  clampSlackText(
    value.replace(/\s+/g, ' ').trim(),
    SLACK_LIMITS.headerTextChars
  );

/**
 * Joins mrkdwn lines into one section body, dropping empties and clamping to
 * `budget`. A single `\n` between lines reads as one paragraph in Slack's UI.
 */
export const joinMrkdwn = (
  lines: ReadonlyArray<string | undefined>,
  budget: number = SLACK_LIMITS.sectionTextChars
): string => {
  const filtered = lines.filter(
    (line): line is string => line !== undefined && line.length > 0
  );
  return clampSlackText(filtered.join('\n'), budget);
};

// ---------------------------------------------------------------------------
// GitHub-flavored markdown -> Slack mrkdwn translation.
//
// Per-primitive `renderMarkdown(node)` implementations emit GFM. The Slack
// dispatcher runs it through here to fill a `section` block when a primitive
// has no stronger Block Kit override.

interface InlineSegment {
  kind: 'text' | 'code' | 'bold' | 'italic' | 'link';
  text: string;
  url?: string;
}

interface InlineMatch {
  index: number;
  end: number;
  segment: InlineSegment;
}

// The closer of a code-span opener ending at `end`: the start of the next
// maximal backtick run exactly `length` long.
type CodeSpanCloser = (end: number, length: number) => number | undefined;

const ASCII_PUNCTUATION_RE = /[!-/:-@[-`{-~]/;
const NUMERIC_REFERENCE_RE = /&#(?:[xX]([0-9a-fA-F]{1,6})|(\d{1,7}));/y;

// micromark's rule: controls other than tab and line breaks, surrogates,
// noncharacters, and out-of-range values become U+FFFD.
const decodeCodePoint = (codePoint: number): string =>
  codePoint < 9 ||
  codePoint === 11 ||
  (codePoint > 13 && codePoint < 32) ||
  (codePoint > 126 && codePoint < 160) ||
  (codePoint > 55_295 && codePoint < 57_344) ||
  (codePoint > 64_975 && codePoint < 65_008) ||
  codePoint % 65_536 >= 65_534 ||
  codePoint > 1_114_111
    ? '�'
    : String.fromCodePoint(codePoint);

const backtickRunEnd = (text: string, start: number): number => {
  let end = start;
  while (text[end] === '`') {
    end += 1;
  }
  return end;
};

// Every maximal backtick run's start, keyed by the run's length, in order.
const backtickRuns = (text: string): Map<number, number[]> => {
  const runs = new Map<number, number[]>();
  let start = text.indexOf('`');
  while (start !== -1) {
    const end = backtickRunEnd(text, start);
    const starts = runs.get(end - start);
    if (starts) {
      starts.push(start);
    } else {
      runs.set(end - start, [start]);
    }
    start = text.indexOf('`', end);
  }
  return runs;
};

const firstAtOrAfter = (
  sorted: readonly number[],
  from: number
): number | undefined => {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (sorted[middle]! < from) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return sorted[low];
};

// Indexes `text`'s backtick runs once, on the first query.
const codeSpanCloser = (text: string): CodeSpanCloser => {
  let runs: Map<number, number[]> | undefined;
  return (end, length) => {
    runs ??= backtickRuns(text);
    return firstAtOrAfter(runs.get(length) ?? [], end);
  };
};

// CommonMark strips one space from each side of a span that is not all spaces.
const codeSpanText = (content: string): string =>
  /[^ ]/.test(content) && content.startsWith(' ') && content.endsWith(' ')
    ? content.slice(1, -1)
    : content;

// Resolves the backslash escapes and numeric character references a GFM
// serializer writes, which Slack would otherwise show literally, and leaves
// code spans as written.
const unescapeGfm = (text: string): string => {
  const closer = codeSpanCloser(text);
  let out = '';
  let index = 0;
  while (index < text.length) {
    const char = text[index]!;
    const next = text[index + 1];
    if (
      char === '\\' &&
      next !== undefined &&
      ASCII_PUNCTUATION_RE.test(next)
    ) {
      out += next;
      index += 2;
      continue;
    }
    if (char === '`') {
      const fenceEnd = backtickRunEnd(text, index);
      const close = closer(fenceEnd, fenceEnd - index);
      const end = close === undefined ? fenceEnd : close + fenceEnd - index;
      out += text.slice(index, end);
      index = end;
      continue;
    }
    if (char === '&') {
      NUMERIC_REFERENCE_RE.lastIndex = index;
      const reference = NUMERIC_REFERENCE_RE.exec(text);
      if (reference) {
        const [match, hex, decimal] = reference;
        out += decodeCodePoint(
          hex === undefined ? Number(decimal) : parseInt(hex, 16)
        );
        index += match.length;
        continue;
      }
    }
    out += char;
    index += 1;
  }
  return out;
};

// A link destination may be wrapped in angle brackets (`[x](<dest>)`).
const linkDestination = (dest: string): string =>
  unescapeGfm(dest.replace(/^<([^<>]*)>$/, '$1'));

// The code span whose opener starts at `open`, or `undefined`.
const codeSpanAt = (
  line: string,
  open: number,
  closer: CodeSpanCloser
): InlineMatch | undefined => {
  const fenceEnd = backtickRunEnd(line, open);
  const close = closer(fenceEnd, fenceEnd - open);
  return close === undefined
    ? undefined
    : {
        index: open,
        end: close + fenceEnd - open,
        segment: {
          kind: 'code',
          text: codeSpanText(line.slice(fenceEnd, close)),
        },
      };
};

type InlineFinder = (
  line: string,
  from: number,
  closer: CodeSpanCloser
) => InlineMatch | null;

const regexFinder =
  (
    pattern: RegExp,
    toSegment: (match: RegExpExecArray) => InlineSegment
  ): InlineFinder =>
  (line, from) => {
    pattern.lastIndex = from;
    const match = pattern.exec(line);
    return (
      match && {
        index: match.index,
        end: match.index + match[0].length,
        segment: toSegment(match),
      }
    );
  };

const findCodeSpan: InlineFinder = (line, from, closer) => {
  let open = line.indexOf('`', from);
  while (open !== -1) {
    const span = codeSpanAt(line, open, closer);
    if (span) {
      return span;
    }
    open = line.indexOf('`', backtickRunEnd(line, open));
  }
  return null;
};

const WHITESPACE_RE = /\s/u;
const PUNCTUATION_RE = /[\p{P}\p{S}]/u;

// The line's edges count as whitespace.
const isSpace = (char: string | undefined): boolean =>
  char === undefined || WHITESPACE_RE.test(char);

const isPunctuation = (char: string | undefined): boolean =>
  char !== undefined && PUNCTUATION_RE.test(char);

// An odd run of backslashes escapes the character at `index`.
const isEscaped = (line: string, index: number): boolean => {
  let run = 0;
  while (line[index - 1 - run] === '\\') {
    run += 1;
  }
  return run % 2 === 1;
};

// GFM's flanking rules for a lone delimiter; `_` also cannot open or close
// inside a word.
const flanking = (
  line: string,
  index: number,
  delimiter: '*' | '_'
): { opens: boolean; closes: boolean } => {
  // Whole code points, so an astral symbol such as an emoji is classified as one.
  const trailing = line.charCodeAt(index - 1);
  const before =
    index === 0
      ? undefined
      : trailing >= 0xdc00 && trailing <= 0xdfff && index >= 2
        ? String.fromCodePoint(line.codePointAt(index - 2) ?? trailing)
        : line[index - 1];
  const next = line.codePointAt(index + 1);
  const after = next === undefined ? undefined : String.fromCodePoint(next);
  if (before === delimiter || after === delimiter) {
    return { opens: false, closes: false };
  }
  const left =
    !isSpace(after) &&
    (!isPunctuation(after) || isSpace(before) || isPunctuation(before));
  const right =
    !isSpace(before) &&
    (!isPunctuation(before) || isSpace(after) || isPunctuation(after));
  return delimiter === '*'
    ? { opens: left, closes: right }
    : {
        opens: left && (!right || isPunctuation(before)),
        closes: right && (!left || isPunctuation(after)),
      };
};

// The index past what starts at `index` when it is an escape or a code span,
// whose characters are never delimiters, or past one character otherwise.
const stepOver = (
  line: string,
  index: number,
  closer: CodeSpanCloser
): number => {
  if (line[index] === '\\') {
    return index + 2;
  }
  if (line[index] === '`') {
    return codeSpanAt(line, index, closer)?.end ?? backtickRunEnd(line, index);
  }
  return index + 1;
};

const LINK_DESTINATION_RE = /\((<[^<>\n]*>|(?:\\.|[^\s()\\]|\([^()\s]*\))+)\)/y;

// A link, or an image, which degrades to a link to its source labelled with
// its alt text. The label may hold escapes and code spans but no bare bracket.
const findLink: InlineFinder = (line, from, closer) => {
  let open = line.indexOf('[', from);
  while (open !== -1) {
    let index = open + 1;
    while (index < line.length && line[index] !== '[' && line[index] !== ']') {
      index = stepOver(line, index, closer);
    }
    if (line[index] === ']') {
      LINK_DESTINATION_RE.lastIndex = index + 1;
      const destination = LINK_DESTINATION_RE.exec(line);
      if (destination) {
        const bang = line[open - 1] === '!' && !isEscaped(line, open - 1);
        return {
          index: bang ? open - 1 : open,
          end: LINK_DESTINATION_RE.lastIndex,
          segment: {
            kind: 'link',
            text: line.slice(open + 1, index),
            url: destination[1] ?? '',
          },
        };
      }
    }
    open = line.indexOf('[', index);
  }
  return null;
};

// Strong between `**` pairs whose body holds no `*` outside escapes and code.
const findBold: InlineFinder = (line, from, closer) => {
  let open = line.indexOf('**', from);
  while (open !== -1) {
    let index = open + 2;
    while (index < line.length && line[index] !== '*') {
      index = stepOver(line, index, closer);
    }
    if (index > open + 2 && line.startsWith('**', index)) {
      return {
        index: open,
        end: index + 2,
        segment: { kind: 'bold', text: line.slice(open + 2, index) },
      };
    }
    open = line.indexOf('**', index > open + 2 ? index : open + 1);
  }
  return null;
};

// Emphasis between two lone `delimiter`s, in one forward pass: the first
// closer pairs with the nearest opener before it, and a delimiter that can
// do neither is text.
const emphasisFinder =
  (delimiter: '*' | '_'): InlineFinder =>
  (line, from, closer) => {
    let open = -1;
    let index = from;
    while (index < line.length) {
      if (line[index] === '\\' || line[index] === '`') {
        index = stepOver(line, index, closer);
        continue;
      }
      if (line[index] === delimiter && !isEscaped(line, index)) {
        const { opens, closes } = flanking(line, index, delimiter);
        if (open !== -1 && closes) {
          return {
            index: open,
            end: index + 1,
            segment: { kind: 'italic', text: line.slice(open + 1, index) },
          };
        }
        if (opens) {
          open = index;
        }
      }
      index += 1;
    }
    return null;
  };

// In tie order. Each label, destination, or body stops at the first character
// that cannot continue it, so one search from a position is linear.
const INLINE_FINDERS: readonly InlineFinder[] = [
  // A CommonMark backslash escape: any ASCII punctuation character.
  regexFinder(/\\([!-/:-@[-`{-~])/g, ([, text = '']) => ({
    kind: 'text',
    text,
  })),
  findCodeSpan,
  findLink,
  findBold,
  emphasisFinder('_'),
  emphasisFinder('*'),
];

// Tokenizes a single line of GFM into ordered inline segments. The earliest
// match wins; on a tie, the order of `INLINE_FINDERS` does. An escaped
// character is text and never a delimiter. Each finder's next match is reused
// until the cursor passes it, so a line is not rescanned per segment.
const tokenizeInline = (line: string): InlineSegment[] => {
  const segments: InlineSegment[] = [];
  const closer = codeSpanCloser(line);
  const found = new Map<InlineFinder, InlineMatch | null>();
  const nextMatch = (
    finder: InlineFinder,
    cursor: number
  ): InlineMatch | null => {
    const cached = found.get(finder);
    if (cached === null || (cached !== undefined && cached.index >= cursor)) {
      return cached;
    }
    const match = finder(line, cursor, closer);
    found.set(finder, match);
    return match;
  };
  let cursor = 0;
  while (cursor < line.length) {
    let first: InlineMatch | undefined;
    for (const finder of INLINE_FINDERS) {
      const match = nextMatch(finder, cursor);
      if (match && (first === undefined || match.index < first.index)) {
        first = match;
      }
    }
    if (first === undefined) {
      segments.push({ kind: 'text', text: line.slice(cursor) });
      break;
    }
    if (first.index > cursor) {
      segments.push({ kind: 'text', text: line.slice(cursor, first.index) });
    }
    segments.push(first.segment);
    cursor = first.end;
    // Backticks after an escaped one open a shorter run of their own.
    if (line[cursor - 1] === '`' && line[cursor] === '`') {
      const span = codeSpanAt(line, cursor, closer);
      const end = span?.end ?? backtickRunEnd(line, cursor);
      segments.push(
        span?.segment ?? { kind: 'text', text: line.slice(cursor, end) }
      );
      cursor = end;
    }
  }
  return segments;
};

const renderInline = (line: string): string => {
  const segments = tokenizeInline(line);
  return segments
    .map((segment) => {
      switch (segment.kind) {
        case 'text':
          return escapeMrkdwn(unescapeGfm(segment.text));
        case 'code':
          // Code spans pass through with mrkdwn's single-backtick syntax, but
          // we still need to neutralize any embedded backticks.
          return code(segment.text);
        // The inner text is translated too, so `**a _b_**` nests.
        case 'bold':
          return `*${renderInline(segment.text)}*`;
        case 'italic':
          return `_${renderInline(segment.text)}_`;
        case 'link':
          return link(
            linkDestination(segment.url ?? ''),
            plainInline(segment.text)
          );
        default: {
          const unexpected: never = segment.kind;
          return unexpected;
        }
      }
    })
    .join('');
};

// Inline GFM as its text alone, for a link label or a table cell, where
// mrkdwn formatting would show its markers.
const plainInline = (line: string): string =>
  tokenizeInline(line)
    .map(({ kind, text }) =>
      kind === 'text'
        ? unescapeGfm(text)
        : kind === 'code'
          ? text
          : plainInline(text)
    )
    .join('');

// GFM: up to three spaces of indent, and no backtick in the opener's info.
const FENCE_RE = /^ {0,3}(`{3,})[^`]*$/;
// Spaces and tabs only after it, plus the `\r` a CRLF line keeps.
const CLOSING_FENCE_RE = /^ {0,3}(`{3,})[ \t]*\r?$/;

// A closing fence is backticks alone, at least as long as the opening run.
const closesFence = (line: string, opening: string): boolean =>
  (CLOSING_FENCE_RE.exec(line)?.[1]?.length ?? 0) >= opening.length;
// At least one pipe, so a single-column table counts and a thematic break does not.
const TABLE_SEPARATOR_RE =
  /^(?=[^|]*\|)\s*(?!\s)\|?\s*:?-+:?\s*(?!\s)(\|\s*:?-+:?\s*(?!\s))*\|?\s*$/;
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const BLOCKQUOTE_RE = /^(>\s?)(.*)$/;

// An ATX heading's text without its closing `#` run, or `undefined`. An
// escaped `\#` is text, not part of the closing run.
const headingText = (line: string): string | undefined => {
  const text = /^#{1,6}[ \t]+(.*)$/.exec(line)?.[1]?.trimEnd();
  if (text === undefined) {
    return undefined;
  }
  const closing = /(?:^|[ \t])#+$/.exec(text);
  const content = closing ? text.slice(0, closing.index).trimEnd() : text;
  return content.length > 0 ? content : undefined;
};

// Splits a `| a | b |` row on its unescaped pipes into cell text, dropping the
// optional leading/trailing pipes. GFM unescapes `\|` before reading a cell,
// code spans included.
const splitPipeRow = (line: string): string[] => {
  const row = line.trim();
  const cells: string[] = [];
  let cell = '';
  let endsWithPipe = false;
  for (let index = 0; index < row.length; index += 1) {
    const char = row[index]!;
    const next = row[index + 1];
    endsWithPipe = false;
    if (char === '\\' && next !== undefined) {
      cell += next === '|' ? '|' : `\\${next}`;
      index += 1;
    } else if (char === '|') {
      cells.push(cell);
      cell = '';
      endsWithPipe = true;
    } else {
      cell += char;
    }
  }
  if (!endsWithPipe) {
    cells.push(cell);
  }
  if (row.startsWith('|')) {
    cells.shift();
  }
  return cells.map((value) => plainInline(value.trim()));
};

/**
 * Translates GFM into one Slack `mrkdwn` string:
 *
 * - Bold `**X**` to `*X*`, links `[L](U)` to `<U|L>`.
 * - ATX headings to bold, since Slack renders no headings.
 * - Pipe tables into a fenced code block, mrkdwn having no table syntax — the
 *   monospace alignment is all that survives. Prefer
 *   {@link gfmToSlackBlocks} when a native `table` block is acceptable.
 *
 * Free text is HTML-escaped (`&` `<` `>`) per Slack's rules; code spans and
 * fenced blocks pass through untouched.
 */
export const gfmToSlackMrkdwn = (gfm: string): string => {
  const lines = gfm.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const opening = FENCE_RE.exec(line)?.[1];
    if (opening !== undefined) {
      // Fenced code block: copy the body verbatim. Slack honours the
      // triple-backtick fence but ignores the language hint, so we strip it
      // for cleanliness.
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !closesFence(lines[i]!, opening)) {
        body.push(lines[i]!);
        i += 1;
      }
      out.push(codeBlock(body.join('\n')));
      i += 1;
      continue;
    }
    if (
      TABLE_ROW_RE.test(line) &&
      i + 1 < lines.length &&
      TABLE_SEPARATOR_RE.test(lines[i + 1]!)
    ) {
      // GFM pipe table: Slack mrkdwn cannot render tables, so we wrap the
      // entire block in a code fence to preserve the column alignment that
      // the markdown renderer worked hard to produce.
      const tableLines: string[] = [];
      while (i < lines.length && TABLE_ROW_RE.test(lines[i]!)) {
        tableLines.push(lines[i]!);
        i += 1;
      }
      out.push(
        codeBlock(
          tableLines
            .map((row) =>
              TABLE_SEPARATOR_RE.test(row)
                ? row
                : `| ${splitPipeRow(row).join(' | ')} |`
            )
            .join('\n')
        )
      );
      continue;
    }
    const heading = headingText(line);
    if (heading !== undefined) {
      // Headings have no first-class mrkdwn equivalent. Bolding the text keeps
      // the visual hierarchy without inventing markup Slack would render as
      // a literal `#`.
      out.push(bold(unescapeGfm(heading)));
      i += 1;
      continue;
    }
    const blockquoteMatch = line.match(BLOCKQUOTE_RE);
    if (blockquoteMatch) {
      // Slack mrkdwn supports `>` blockquotes. Preserve the prefix verbatim
      // and run only the body through inline transformation so that bold,
      // italic, links, and emoji glyphs inside the quote still translate.
      out.push(
        `${blockquoteMatch[1]}${renderInline(blockquoteMatch[2] ?? '')}`
      );
      i += 1;
      continue;
    }
    out.push(renderInline(line));
    i += 1;
  }
  return out.join('\n');
};

// ---------------------------------------------------------------------------
// GFM -> Slack *block* translation.

const slackPreformattedBlock = (code: string): SlackRichTextBlock => ({
  type: 'rich_text',
  elements: [
    {
      type: 'rich_text_preformatted',
      elements: [
        {
          type: 'text',
          text: clampSlackText(code, SLACK_LIMITS.sectionTextChars),
        },
      ],
    },
  ],
});

// Reads a GFM alignment marker (`:---`, `---:`, `:---:`) into a column align.
const parseColumnAlign = (marker: string): 'left' | 'center' | 'right' => {
  const left = marker.startsWith(':');
  const right = marker.endsWith(':');
  if (left && right) {
    return 'center';
  }
  return right ? 'right' : 'left';
};

const pipeTableToTableBlock = (lines: readonly string[]): SlackTableBlock => {
  const [headerLine, separatorLine, ...bodyLines] = lines;
  const aligns = splitPipeRow(separatorLine ?? '').map(parseColumnAlign);
  const rows = [splitPipeRow(headerLine ?? ''), ...bodyLines.map(splitPipeRow)]
    .slice(0, SLACK_LIMITS.tableRows)
    .map((cells) =>
      cells
        .slice(0, SLACK_LIMITS.tableColumns)
        .map((value): SlackRawTextElement => ({
          type: 'raw_text',
          text: value,
        }))
    );
  return {
    type: 'table',
    rows,
    column_settings: aligns
      .slice(0, SLACK_LIMITS.tableColumns)
      .map((align): SlackTableColumnSetting => ({ align, is_wrapped: true })),
  };
};

/**
 * Translates GFM into structural Block Kit: prose runs as `section`, fenced
 * code as `rich_text_preformatted`, pipe tables as a native `table` block.
 *
 * The markdown fallback for any primitive without a dedicated `slack` renderer.
 * Preferred over {@link gfmToSlackMrkdwn}, which collapses code and tables into
 * a section-level fence that Slack and pixel-faithful previews render poorly.
 */
export const gfmToSlackBlocks = (gfm: string): SlackBlock[] => {
  const lines = gfm.split('\n');
  const blocks: SlackBlock[] = [];
  let prose: string[] = [];

  const flushProse = (): void => {
    while (prose.length > 0 && prose[0]!.trim() === '') {
      prose.shift();
    }
    while (prose.length > 0 && prose[prose.length - 1]!.trim() === '') {
      prose.pop();
    }
    if (prose.length === 0) {
      return;
    }
    const text = clampSlackText(
      gfmToSlackMrkdwn(prose.join('\n')),
      SLACK_LIMITS.sectionTextChars
    );
    prose = [];
    if (text.length > 0) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text } });
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const opening = FENCE_RE.exec(line)?.[1];
    if (opening !== undefined) {
      flushProse();
      i += 1;
      const code: string[] = [];
      while (i < lines.length && !closesFence(lines[i]!, opening)) {
        code.push(lines[i]!);
        i += 1;
      }
      i += 1; // Consume the closing fence.
      blocks.push(slackPreformattedBlock(code.join('\n')));
      continue;
    }
    if (
      TABLE_ROW_RE.test(line) &&
      i + 1 < lines.length &&
      TABLE_SEPARATOR_RE.test(lines[i + 1]!)
    ) {
      flushProse();
      const tableLines: string[] = [];
      while (i < lines.length && TABLE_ROW_RE.test(lines[i]!)) {
        tableLines.push(lines[i]!);
        i += 1;
      }
      blocks.push(pipeTableToTableBlock(tableLines));
      continue;
    }
    prose.push(line);
    i += 1;
  }
  flushProse();
  return blocks;
};
