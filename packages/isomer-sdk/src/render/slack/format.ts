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

/**
 * Slack mrkdwn link, `<url|label>`, or a bare `<url>` when `label` is omitted.
 *
 * URL and label are both escaped so `&` and `>` cannot break Slack's link
 * parser. A URL failing the navigation policy in `src/validate/url.ts` degrades
 * to plain escaped text with no link.
 */
export const link = (url: string, label?: string): string => {
  const sanitized = sanitizeNavigationHref(url);
  if (!sanitized) {
    return escapeMrkdwn(label ?? url);
  }
  const safeUrl = escapeMrkdwn(sanitized);
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

type InlineKind = 'escape' | 'code' | 'link' | 'bold' | 'italic';

interface InlineSegment {
  kind: 'text' | 'code' | 'bold' | 'italic' | 'link';
  text: string;
  url?: string;
}

// In tie order. Each label, destination, or body stops at the first character
// that cannot continue it, so one search from a position is linear.
const INLINE_PATTERNS: ReadonlyArray<{ kind: InlineKind; pattern: RegExp }> = [
  // A CommonMark backslash escape: any ASCII punctuation character.
  { kind: 'escape', pattern: /\\([!-/:-@[-`{-~])/g },
  { kind: 'code', pattern: /`([^`\n]+)`/g },
  {
    kind: 'link',
    pattern:
      /\[((?:\\.|[^[\]\\])+)\]\((<[^<>\n]*>|(?:\\.|[^\s()\\]|\([^()\s]*\))+)\)/g,
  },
  { kind: 'bold', pattern: /\*\*((?:\\.|[^*\n\\])+?)\*\*/g },
  { kind: 'italic', pattern: /(?<![\w])_((?:\\.|[^_\n\\])+?)_(?![\w])/g },
];

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
    ? '\uFFFD'
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

// Resolves the backslash escapes and numeric character references a GFM
// serializer writes, which Slack would otherwise show literally, and leaves
// code spans as written.
const unescapeGfm = (text: string): string => {
  let out = '';
  let index = 0;
  // Indexed once, on the first backtick; each length's cursor only moves forward.
  let runs: Map<number, number[]> | undefined;
  const cursors = new Map<number, number>();
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
      const length = fenceEnd - index;
      runs ??= backtickRuns(text);
      const starts = runs.get(length) ?? [];
      let cursor = cursors.get(length) ?? 0;
      while (cursor < starts.length && starts[cursor]! < fenceEnd) {
        cursor += 1;
      }
      cursors.set(length, cursor);
      const close = starts[cursor];
      if (close === undefined) {
        out += text.slice(index, fenceEnd);
        index = fenceEnd;
      } else {
        out += text.slice(index, close + length);
        index = close + length;
      }
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

// Tokenizes a single line of GFM into ordered inline segments. The earliest
// match wins; on a tie, the order of `INLINE_PATTERNS` does. An escaped
// character is text and never a delimiter. Each pattern's next match is reused
// until the cursor passes it, so a line is not rescanned per segment.
const tokenizeInline = (line: string): InlineSegment[] => {
  const segments: InlineSegment[] = [];
  const found = new Map<InlineKind, RegExpExecArray | null>();
  const nextMatch = (
    kind: InlineKind,
    pattern: RegExp,
    cursor: number
  ): RegExpExecArray | null => {
    const cached = found.get(kind);
    if (cached === null || (cached !== undefined && cached.index >= cursor)) {
      return cached;
    }
    pattern.lastIndex = cursor;
    const match = pattern.exec(line);
    found.set(kind, match);
    return match;
  };
  let cursor = 0;
  while (cursor < line.length) {
    let first: { kind: InlineKind; match: RegExpExecArray } | undefined;
    for (const { kind, pattern } of INLINE_PATTERNS) {
      const match = nextMatch(kind, pattern, cursor);
      if (match && (first === undefined || match.index < first.match.index)) {
        first = { kind, match };
      }
    }
    if (first === undefined) {
      segments.push({ kind: 'text', text: line.slice(cursor) });
      break;
    }
    const { kind, match } = first;
    if (match.index > cursor) {
      segments.push({ kind: 'text', text: line.slice(cursor, match.index) });
    }
    if (kind === 'escape') {
      segments.push({ kind: 'text', text: match[1] ?? '' });
    } else if (kind === 'link') {
      segments.push({ kind, text: match[1] ?? '', url: match[2] ?? '' });
    } else {
      segments.push({ kind, text: match[1] ?? '' });
    }
    cursor = match.index + match[0].length;
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
        case 'bold':
          return bold(unescapeGfm(segment.text));
        case 'italic':
          return italic(unescapeGfm(segment.text));
        case 'link':
          return link(
            linkDestination(segment.url ?? ''),
            unescapeGfm(segment.text)
          );
        default: {
          const unexpected: never = segment.kind;
          return unexpected;
        }
      }
    })
    .join('');
};

const FENCE_RE = /^\s*```/;
const TABLE_SEPARATOR_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/;
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
  return cells.map((value) => unescapeGfm(value.trim()));
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
    if (FENCE_RE.test(line)) {
      // Fenced code block: copy verbatim, including the opening/closing
      // fences. Slack honours the triple-backtick fence but ignores the
      // language hint, so we strip it for cleanliness.
      out.push('```');
      i += 1;
      while (i < lines.length && !FENCE_RE.test(lines[i]!)) {
        out.push(lines[i]!);
        i += 1;
      }
      out.push('```');
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
      out.push('```');
      out.push(
        ...tableLines.map((row) =>
          TABLE_SEPARATOR_RE.test(row)
            ? row
            : `| ${splitPipeRow(row).join(' | ')} |`
        )
      );
      out.push('```');
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
    if (FENCE_RE.test(line)) {
      flushProse();
      i += 1;
      const code: string[] = [];
      while (i < lines.length && !FENCE_RE.test(lines[i]!)) {
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
