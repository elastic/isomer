/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Markdown to Block Kit, read from the tree rather than re-parsed line by
// line. Rich text carries formatting as style flags beside literal text, so
// nothing is escaped and nesting survives exactly.

import type {
  Blockquote,
  Definition,
  FootnoteDefinition,
  List,
  ListItem,
  Nodes,
  Paragraph,
  PhrasingContent,
  RootContent,
  Table,
} from 'mdast';

import type { MarkdownContent } from '../../define/markdown_content';
import { markdownBlocks, VERBATIM_TYPE } from '../markdown/builder';
import { parseGfmBlocks } from '../markdown/format';

import {
  SLACK_LIMITS,
  type SlackBlock,
  type SlackRichTextBlockElement,
  type SlackRichTextInline,
  type SlackRichTextSection,
  type SlackRichTextStyle,
  type SlackTableBlock,
  type SlackTableCell,
} from './blocks';
import { clampSlackText, slackLinkUrl } from './format';

const plainText = (node: Nodes): string => {
  if ('value' in node) {
    return node.value;
  }
  if (node.type === 'image') {
    return node.alt ?? '';
  }
  return 'children' in node ? node.children.map(plainText).join('') : '';
};

const styled = (style: SlackRichTextStyle): SlackRichTextStyle | undefined =>
  Object.keys(style).length === 0 ? undefined : style;

const textElement = (
  text: string,
  style: SlackRichTextStyle
): SlackRichTextInline[] => {
  const withStyle = styled(style);
  return text === ''
    ? []
    : [{ type: 'text', text, ...(withStyle ? { style: withStyle } : {}) }];
};

const footnoteLabel = ({
  identifier,
  label,
}: Pick<FootnoteDefinition, 'identifier' | 'label'>): string =>
  `[^${label ?? identifier}]`;

// One link element per styled run of the label, so its formatting survives;
// an empty label is a bare link. A URL Slack cannot link leaves the label.
const linkRuns = (
  href: string,
  runs: SlackRichTextInline[],
  style: SlackRichTextStyle
): SlackRichTextInline[] => {
  const url = slackLinkUrl(href);
  if (url === null) {
    return runs;
  }
  if (runs.length === 0) {
    const withStyle = styled(style);
    return [{ type: 'link', url, ...(withStyle ? { style: withStyle } : {}) }];
  }
  return runs.map((run) =>
    run.type === 'text' ? { ...run, type: 'link', url } : run
  );
};

const inline = (
  nodes: readonly PhrasingContent[],
  style: SlackRichTextStyle = {}
): SlackRichTextInline[] =>
  nodes.flatMap((node): SlackRichTextInline[] => {
    switch (node.type) {
      case 'strong':
        return inline(node.children, { ...style, bold: true });
      case 'emphasis':
        return inline(node.children, { ...style, italic: true });
      case 'delete':
        return inline(node.children, { ...style, strike: true });
      case 'inlineCode':
        return textElement(node.value, { ...style, code: true });
      case 'link':
        return linkRuns(node.url, inline(node.children, style), style);
      // Slack draws no inline image, so it links to the source.
      case 'image':
        return linkRuns(node.url, textElement(node.alt ?? '', style), style);
      case 'break':
        return textElement('\n', style);
      case 'footnoteReference':
        return textElement(footnoteLabel(node), style);
      default:
        return textElement(plainText(node), style);
    }
  });

const inlineText = (element: SlackRichTextInline): string =>
  element.type === 'link' ? (element.text ?? element.url) : element.text;

// The envelope leaves rich text alone, so a section keeps to the budget of a
// `section` block's text.
const clampInline = (
  elements: readonly SlackRichTextInline[],
  budget: number = SLACK_LIMITS.sectionTextChars
): SlackRichTextInline[] => {
  const kept: SlackRichTextInline[] = [];
  let spent = 0;
  for (const element of elements) {
    const length = inlineText(element).length;
    const rest = budget - spent;
    if (length <= rest) {
      kept.push(element);
      spent += length;
      continue;
    }
    const text = rest > 0 ? clampSlackText(inlineText(element), rest) : '';
    if (text !== '') {
      kept.push({ ...element, text });
    }
    break;
  }
  return kept;
};

const section = (elements: SlackRichTextInline[]): SlackRichTextSection[] => {
  const clamped = clampInline(elements);
  return clamped.length === 0
    ? []
    : [{ type: 'rich_text_section', elements: clamped }];
};

type Piece = SlackRichTextBlockElement | SlackBlock;

const isElement = (piece: Piece): piece is SlackRichTextBlockElement =>
  piece.type.startsWith('rich_text_');

// Blocks a rich-text list item holds as lines of its text.
const ITEM_LINES: ReadonlySet<string> = new Set([
  'paragraph',
  'heading',
  'code',
  'html',
]);

const childInline = (
  child: ListItem['children'][number]
): SlackRichTextInline[] =>
  'children' in child
    ? inline(
        child.children as PhrasingContent[],
        child.type === 'heading' ? { bold: true } : {}
      )
    : textElement(
        plainText(child),
        child.type === 'code' ? { code: true } : {}
      );

// A quote holds its blocks at one level.
const unquoted = (node: RootContent): RootContent[] =>
  node.type === 'blockquote' ? node.children.flatMap(unquoted) : [node];

// An item's children are read in order. Its lines of text share one bullet; a
// nested list follows at the next indent; any other block, such as a table,
// follows on its own; what the item holds after either follows unbulleted,
// since a Slack list item cannot resume; and the list resumes at its next
// number.
const listPieces = (list: List, indent: number): Piece[] => {
  const style = list.ordered ? 'ordered' : 'bullet';
  const out: Piece[] = [];
  let current: SlackRichTextSection[] = [];
  let number = list.start ?? 1;
  let offset = number - 1;
  const flush = (): void => {
    if (current.length > 0) {
      out.push({
        type: 'rich_text_list',
        style,
        ...(indent > 0 ? { indent } : {}),
        // A list starting at 0 would need a negative offset, which Slack
        // may reject along with the whole message; it starts at 1 instead.
        ...(list.ordered && offset > 0 ? { offset } : {}),
        elements: current,
      });
    }
    current = [];
    offset = number - 1;
  };
  for (const item of list.children) {
    let runs: SlackRichTextInline[] = [];
    let numbered = false;
    const emit = (): void => {
      const sections = section(runs);
      runs = [];
      if (sections.length === 0) {
        return;
      }
      if (numbered) {
        flush();
        out.push(...sections);
      } else {
        current.push(...sections);
        number += 1;
        numbered = true;
      }
    };
    for (const child of item.children.flatMap(
      unquoted
    ) as ListItem['children']) {
      if (ITEM_LINES.has(child.type)) {
        runs.push(
          ...(runs.length > 0 ? textElement('\n', {}) : []),
          ...childInline(child)
        );
        continue;
      }
      const pieces =
        child.type === 'list'
          ? listPieces(
              child,
              Math.min(indent + 1, SLACK_LIMITS.richTextListMaxIndent)
            )
          : blockPieces(child);
      if (pieces.length > 0) {
        emit();
        flush();
        out.push(...pieces);
      }
    }
    emit();
  }
  flush();
  return out;
};

const tableCell = (cell: PhrasingContent[]): SlackTableCell => {
  const elements = inline(cell);
  const plain = elements.every(
    (element) => element.type === 'text' && element.style === undefined
  );
  return plain
    ? { type: 'raw_text', text: cell.map(plainText).join('') }
    : {
        type: 'rich_text',
        elements: section(elements),
      };
};

// Slack rejects a row with no cells, so such rows are dropped, and a table
// whose header has none prints nothing.
const tableBlock = (table: Table): SlackTableBlock[] => {
  const rows = table.children
    .slice(0, SLACK_LIMITS.tableRows)
    .map((row) =>
      row.children
        .slice(0, SLACK_LIMITS.tableColumns)
        .map((cell) => tableCell(cell.children))
    );
  const [header] = rows;
  if (header === undefined || header.length === 0) {
    return [];
  }
  return [
    {
      type: 'table',
      rows: rows.filter((cells) => cells.length > 0),
      column_settings: header.map((_cell, index) => ({
        align: table.align?.[index] ?? 'left',
        is_wrapped: true,
      })),
    },
  ];
};

// A footnote's label leads its first paragraph.
const footnotePieces = ({
  children,
  ...footnote
}: FootnoteDefinition): Piece[] => {
  const [first, ...rest] = children;
  const label: PhrasingContent = {
    type: 'text',
    value: `${footnoteLabel(footnote)}: `,
  };
  const lead: Paragraph = {
    type: 'paragraph',
    children: [label, ...(first?.type === 'paragraph' ? first.children : [])],
  };
  return [lead, ...(first?.type === 'paragraph' ? rest : children)].flatMap(
    blockPieces
  );
};

const borderedElement = (
  element: SlackRichTextBlockElement
): SlackRichTextBlockElement => {
  switch (element.type) {
    case 'rich_text_list':
    case 'rich_text_preformatted':
      return { ...element, border: 1 };
    case 'rich_text_section':
      return { type: 'rich_text_quote', elements: element.elements };
    default:
      return element;
  }
};

// What a quote holds besides text keeps a quote's border; a table or divider
// has none.
const bordered = (piece: Piece): Piece =>
  isElement(piece) ? borderedElement(piece) : piece;

// A quote is one level, nested quotes spread into it: its text as
// `rich_text_quote`, and any other block it holds with a border.
const quotePieces = (quote: Blockquote): Piece[] => {
  const out: Piece[] = [];
  let runs: SlackRichTextInline[] = [];
  const flush = (): void => {
    const elements = clampInline(runs);
    runs = [];
    if (elements.length > 0) {
      out.push({ type: 'rich_text_quote', elements });
    }
  };
  for (const child of quote.children.flatMap(unquoted)) {
    if (child.type === 'paragraph' || child.type === 'heading') {
      const line = childInline(child);
      runs.push(
        ...(runs.length > 0 && line.length > 0 ? textElement('\n', {}) : []),
        ...line
      );
    } else {
      const pieces = blockPieces(child);
      if (pieces.length > 0) {
        flush();
        out.push(...pieces.map(bordered));
      }
    }
  }
  flush();
  return out;
};

const blockPieces = (node: RootContent): Piece[] => {
  switch (node.type) {
    case 'paragraph':
    case 'html':
      return section(childInline(node));
    case 'heading':
      return section(inline(node.children, { bold: true }));
    case 'code':
      return node.value === ''
        ? []
        : [
            {
              type: 'rich_text_preformatted',
              elements: textElement(
                clampSlackText(node.value, SLACK_LIMITS.sectionTextChars),
                {}
              ),
            },
          ];
    case 'list':
      return listPieces(node, 0);
    case 'blockquote':
      return quotePieces(node);
    case 'table':
      return tableBlock(node);
    case 'thematicBreak':
      return [{ type: 'divider' }];
    case 'footnoteDefinition':
      return footnotePieces(node);
    default:
      return [];
  }
};

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

// Source past the parse budget prints as its literal paragraphs.
const gfmBlocks = (gfm: string): RootContent[] => {
  const source = gfm.replace(/\r\n?/g, '\n');
  const parsed = parseGfmBlocks(source) as RootContent[] | null;
  return parsed === null
    ? source
        .split(/\n[ \t]*\n/)
        .filter((paragraph) => paragraph.trim() !== '')
        .map((paragraph) => ({
          type: 'paragraph',
          children: [{ type: 'text', value: paragraph.trim() }],
        }))
    : withReferences(parsed);
};

// Markdown printed as written is read as the GFM it holds.
const expanded = (node: Nodes): Nodes[] => {
  if ((node.type as string) === VERBATIM_TYPE) {
    return gfmBlocks((node as unknown as { value: string }).value);
  }
  return 'children' in node
    ? [{ ...node, children: node.children.flatMap(expanded) } as Nodes]
    : [node];
};

const toSlackBlocks = (nodes: readonly RootContent[]): SlackBlock[] => {
  const blocks: SlackBlock[] = [];
  let elements: SlackRichTextBlockElement[] = [];
  const flush = (): void => {
    if (elements.length > 0) {
      // A section followed by another ends in a line break, so paragraphs
      // never run together.
      blocks.push({
        type: 'rich_text',
        elements: elements.map((element, index) =>
          element.type === 'rich_text_section' &&
          elements[index + 1]?.type === 'rich_text_section'
            ? {
                ...element,
                elements: [
                  ...clampInline(
                    element.elements,
                    SLACK_LIMITS.sectionTextChars - 1
                  ),
                  { type: 'text', text: '\n' },
                ],
              }
            : element
        ),
      });
    }
    elements = [];
  };
  for (const node of nodes) {
    for (const piece of blockPieces(node)) {
      if (isElement(piece)) {
        elements.push(piece);
      } else {
        flush();
        blocks.push(piece);
      }
    }
  }
  flush();
  return blocks;
};

/**
 * Builder content as Block Kit: paragraphs, headings, lists, quotes, and code
 * as `rich_text`, tables as `table` blocks, and thematic breaks as `divider`
 * blocks. A quote is one level, and inside a list item its blocks are the
 * item's. A run of rich-text blocks shares one `rich_text` block. Markdown
 * printed as written is read as GFM, as {@link gfmToSlackBlocks} reads it.
 */
export const markdownContentToSlackBlocks = (
  content: MarkdownContent
): SlackBlock[] =>
  toSlackBlocks(
    (markdownBlocks(content) as RootContent[]).flatMap(
      expanded
    ) as RootContent[]
  );

/**
 * GFM as Block Kit, parsed as CommonMark with GFM and translated as
 * {@link markdownContentToSlackBlocks} translates builder content. Source past
 * the parse budget that `md.authored` applies prints as literal paragraphs.
 */
export const gfmToSlackBlocks = (gfm: string): SlackBlock[] =>
  toSlackBlocks(gfmBlocks(gfm));
