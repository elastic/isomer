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
 * Truncates `value` to `max` characters, appending an ellipsis when it had to
 * cut. Pass a `SLACK_LIMITS` constant as the budget.
 */
export const clampSlackText = (value: string, max: number): string => {
  if (value.length <= max) {
    return value;
  }
  if (max <= 1) {
    return value.slice(0, max);
  }
  return `${value.slice(0, max - 1).trimEnd()}…`;
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

const BOLD_RE = /\*\*([^*\n][^*\n]*?)\*\*/;
const ITALIC_RE = /(?<![\w])_([^_\n][^_\n]*?)_(?![\w])/;
const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/;
const CODE_RE = /`([^`\n]+)`/;

// Tokenizes a single line of GFM into ordered inline segments. Order matters:
// code spans win over everything (no inner formatting), then links, then
// bold (which uses `**` so we must consume both characters before italic with
// `_` is considered).
const tokenizeInline = (line: string): InlineSegment[] => {
  const segments: InlineSegment[] = [];
  let cursor = 0;
  while (cursor < line.length) {
    const remainder = line.slice(cursor);
    const codeMatch = CODE_RE.exec(remainder);
    const linkMatch = LINK_RE.exec(remainder);
    const boldMatch = BOLD_RE.exec(remainder);
    const italicMatch = ITALIC_RE.exec(remainder);
    const candidates = [
      { kind: 'code' as const, match: codeMatch },
      { kind: 'link' as const, match: linkMatch },
      { kind: 'bold' as const, match: boldMatch },
      { kind: 'italic' as const, match: italicMatch },
    ].filter((c): c is { kind: typeof c.kind; match: RegExpExecArray } =>
      Boolean(c.match)
    );
    if (candidates.length === 0) {
      segments.push({ kind: 'text', text: remainder });
      break;
    }
    candidates.sort((a, b) => a.match.index - b.match.index);
    const first = candidates[0]!;
    if (first.match.index > 0) {
      segments.push({
        kind: 'text',
        text: remainder.slice(0, first.match.index),
      });
    }
    if (first.kind === 'link') {
      segments.push({
        kind: 'link',
        text: first.match[1] ?? '',
        url: first.match[2] ?? '',
      });
    } else {
      segments.push({ kind: first.kind, text: first.match[1] ?? '' });
    }
    cursor += first.match.index + first.match[0].length;
  }
  return segments;
};

const renderInline = (line: string): string => {
  const segments = tokenizeInline(line);
  return segments
    .map((segment) => {
      switch (segment.kind) {
        case 'text':
          return escapeMrkdwn(segment.text);
        case 'code':
          // Code spans pass through with mrkdwn's single-backtick syntax, but
          // we still need to neutralize any embedded backticks.
          return code(segment.text);
        case 'bold':
          return bold(segment.text);
        case 'italic':
          return italic(segment.text);
        case 'link':
          return link(segment.url ?? '', segment.text);
        default: {
          const unexpected: never = segment.kind;
          return unexpected;
        }
      }
    })
    .join('');
};

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const FENCE_RE = /^\s*```/;
const TABLE_SEPARATOR_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/;
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const BLOCKQUOTE_RE = /^(>\s?)(.*)$/;

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
      out.push(...tableLines);
      out.push('```');
      continue;
    }
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      // Headings have no first-class mrkdwn equivalent. Bolding the text keeps
      // the visual hierarchy without inventing markup Slack would render as
      // a literal `#`.
      out.push(bold(headingMatch[2] ?? ''));
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

// Splits a `| a | b |` row into trimmed cell strings, dropping the optional
// leading/trailing pipes.
const splitPipeRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

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
