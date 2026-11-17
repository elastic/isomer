/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLACK_LIMITS,
  type SlackBlock,
  type SlackRichTextBlockElement,
  type SlackRichTextInline,
  type SlackRichTextSection,
  type SlackRichTextText,
  type SlackTableBlock,
  type SlackTableCell,
} from './blocks';
import { containerWithChildren, isContainer } from './container';
import { richTextElementText } from './rich_text_text';
import { splitRichTextElement } from './split_rich_text';
import { isUnmodeledSlackBlock } from './unmodeled';

const tableCellText = (cell: SlackTableCell): string =>
  cell.type === 'raw_text'
    ? cell.text
    : cell.elements.map(richTextElementText).join('');

const tableCharCount = (block: SlackTableBlock): number =>
  block.rows.reduce(
    (total, row) =>
      total + row.reduce((sum, cell) => sum + tableCellText(cell).length, 0),
    0
  );

const textRun = (text: string): SlackRichTextText => ({ type: 'text', text });

const richSection = (
  elements: SlackRichTextInline[]
): SlackRichTextSection => ({ type: 'rich_text_section', elements });

const rowBreak = (): SlackRichTextSection => richSection([textRun('\n')]);

const cellElements = (
  cell: SlackTableCell | undefined
): SlackRichTextBlockElement[] => {
  if (cell?.type === 'rich_text') {
    return cell.elements.filter(({ elements }) => elements.length > 0);
  }
  return cell?.text ? [richSection([textRun(cell.text)])] : [];
};

const boldInline = (inline: SlackRichTextInline): SlackRichTextInline => ({
  ...inline,
  style: { ...inline.style, bold: true },
});

const boldElement = (
  element: SlackRichTextBlockElement
): SlackRichTextBlockElement =>
  element.type === 'rich_text_list'
    ? {
        ...element,
        elements: element.elements.map((item) => ({
          ...item,
          elements: item.elements.map(boldInline),
        })),
      }
    : { ...element, elements: element.elements.map(boldInline) };

const isBlank = (cell: SlackTableCell | undefined): boolean =>
  cell === undefined || tableCellText(cell).trim() === '';

// A one-section heading leads its cell as `heading: `; any other heading keeps
// its blocks, bold, above the cell. A blank heading leaves the cell alone.
const columnElements = (
  heading: SlackTableCell | undefined,
  cell: SlackTableCell | undefined
): SlackRichTextBlockElement[] => {
  const body = cellElements(cell);
  if (isBlank(heading)) {
    return body;
  }
  const head = cellElements(heading);
  const [only] = head;
  if (head.length !== 1 || only?.type !== 'rich_text_section') {
    return [...head.map(boldElement), ...body];
  }
  const lead = [...only.elements.map(boldInline), textRun(': ')];
  const [first, ...rest] = body;
  return first?.type === 'rich_text_section'
    ? [richSection([...lead, ...first.elements]), ...rest]
    : [richSection(lead), ...body];
};

const endsLine = (element: SlackRichTextBlockElement): boolean =>
  /[\n\r\u2028\u2029]$/u.test(richTextElementText(element));

// Slack runs adjacent sections together, so a section followed by another ends
// its line unless its rendered text already does.
const breakSections = (
  elements: readonly SlackRichTextBlockElement[]
): SlackRichTextBlockElement[] =>
  elements.map((element, index) =>
    element.type === 'rich_text_section' &&
    elements[index + 1]?.type === 'rich_text_section' &&
    !endsLine(element)
      ? richSection([...element.elements, textRun('\n')])
      : element
  );

// A table Slack would reject is replaced by one `rich_text` block. Each row's
// columns run `heading: cell` to the wider of the header and the row, and a
// blank section parts the rows. A cell keeps its inlines, styles, and blocks; a
// table whose rows past the header have no cells prints its headings, and one
// with nothing to print is dropped.
const degradeTable = ({
  rows: [header = [], ...body],
}: SlackTableBlock): SlackBlock[] => {
  const rows = body.filter((row) => row.length > 0);
  const pieces =
    rows.length === 0
      ? [
          header
            .filter((heading) => !isBlank(heading))
            .flatMap((heading) => cellElements(heading).map(boldElement)),
        ]
      : rows.map((row) =>
          Array.from(
            { length: Math.max(header.length, row.length) },
            (_, column) => columnElements(header[column], row[column])
          ).flat()
        );
  const elements = pieces
    .filter((piece) => piece.length > 0)
    .flatMap((piece, index) => (index > 0 ? [rowBreak(), ...piece] : piece));
  return elements.length === 0
    ? []
    : [
        {
          type: 'rich_text',
          elements: breakSections(elements).flatMap(splitRichTextElement),
        },
      ];
};

const fitsTableShape = ({ rows }: SlackTableBlock): boolean =>
  rows.length > 0 &&
  rows.length <= SLACK_LIMITS.tableRows &&
  rows.every(
    (row) => row.length > 0 && row.length <= SLACK_LIMITS.tableColumns
  );

// Slack counts table cell characters across the whole message, not per block,
// so a composition whose tables individually fit can still be rejected. In
// document order, a table is kept if its shape fits and its cells fit what the
// kept ones left.
export const enforceTableLimits = (
  blocks: readonly SlackBlock[]
): SlackBlock[] => {
  let spent = 0;
  const fit = (block: SlackBlock): SlackBlock[] => {
    if (isContainer(block)) {
      return containerWithChildren(block, block.child_blocks.flatMap(fit));
    }
    if (block.type !== 'table' || isUnmodeledSlackBlock(block)) {
      return [block];
    }
    const cost = tableCharCount(block);
    if (
      fitsTableShape(block) &&
      spent + cost <= SLACK_LIMITS.tableCellCharsPerMessage
    ) {
      spent += cost;
      return [block];
    }
    return degradeTable(block);
  };
  return blocks.flatMap(fit);
};
