/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Builder content to Block Kit, read from the tree rather than re-parsed from
// Markdown. Rich text carries formatting as style flags beside literal text,
// so nothing is escaped and nesting survives exactly.

import type {
  List,
  ListItem,
  Nodes,
  PhrasingContent,
  RootContent,
  Table,
} from 'mdast';

import type { MarkdownContent } from '../../define/markdown_content';
import {
  markdownBlocks,
  serializeMarkdown,
  VERBATIM_TYPE,
} from '../markdown/builder';

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
import { clampSlackText, gfmToSlackBlocks, slackLinkUrl } from './format';

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
      default:
        return textElement(plainText(node), style);
    }
  });

const inlineText = (element: SlackRichTextInline): string =>
  element.type === 'link' ? (element.text ?? element.url) : element.text;

// The envelope leaves rich text alone, so a section keeps to the budget the
// string path gives a section's text.
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

// An item's children are read in order. Its paragraphs share one bullet; a
// nested list follows at the next indent; what the item holds after a nested
// list follows unbulleted, since a Slack list item cannot resume; and the
// outer list resumes at its next number.
const listElements = (
  list: List,
  indent: number
): SlackRichTextBlockElement[] => {
  const style = list.ordered ? 'ordered' : 'bullet';
  const out: SlackRichTextBlockElement[] = [];
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
    for (const child of item.children) {
      if (child.type === 'list') {
        emit();
        flush();
        out.push(
          ...listElements(
            child,
            Math.min(indent + 1, SLACK_LIMITS.richTextListMaxIndent)
          )
        );
      } else {
        runs.push(
          ...(runs.length > 0 ? textElement('\n', {}) : []),
          ...childInline(child)
        );
      }
    }
    emit();
  }
  flush();
  return out;
};

const richTextElements = (node: RootContent): SlackRichTextBlockElement[] => {
  switch (node.type) {
    case 'paragraph':
      return section(inline(node.children));
    case 'heading':
      return section(inline(node.children, { bold: true }));
    case 'list':
      return listElements(node, 0);
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
    default:
      return [];
  }
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

const containsVerbatim = (node: Nodes): boolean =>
  (node.type as string) === VERBATIM_TYPE ||
  ('children' in node && node.children.some(containsVerbatim));

const LIST_ITEM_CONTENT: ReadonlySet<string> = new Set([
  'paragraph',
  'heading',
  'code',
  'list',
]);

// A rich-text list item holds lines of text, so a list holding any other
// block, such as a table, goes through the string translator whole.
const fitsRichTextList = (list: List): boolean =>
  list.children.every((item) =>
    item.children.every(
      (child) =>
        LIST_ITEM_CONTENT.has(child.type) &&
        (child.type !== 'list' || fitsRichTextList(child))
    )
  );

/**
 * Builder content as Block Kit: paragraphs, headings, lists, and code as
 * `rich_text`, tables as `table` blocks. A run of rich-text blocks shares one
 * `rich_text` block. Markdown printed as written, and any block holding it,
 * goes through {@link gfmToSlackBlocks}.
 */
export const markdownContentToSlackBlocks = (
  content: MarkdownContent
): SlackBlock[] => {
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
  for (const node of markdownBlocks(content) as RootContent[]) {
    if (
      containsVerbatim(node) ||
      (node.type === 'list' && !fitsRichTextList(node))
    ) {
      flush();
      blocks.push(
        ...gfmToSlackBlocks(
          serializeMarkdown(node as unknown as MarkdownContent)
        )
      );
    } else if (node.type === 'table') {
      flush();
      blocks.push(...tableBlock(node));
    } else {
      const translated = richTextElements(node);
      if (
        translated.length === 0 &&
        !['paragraph', 'heading', 'code'].includes(node.type)
      ) {
        flush();
        blocks.push(
          ...gfmToSlackBlocks(
            serializeMarkdown(node as unknown as MarkdownContent)
          )
        );
      } else {
        elements.push(...translated);
      }
    }
  }
  flush();
  return blocks;
};
