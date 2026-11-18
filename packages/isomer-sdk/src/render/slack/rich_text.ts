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
import { RICH_TEXT_ELEMENT_LIMIT, SLACK_FIELD_LIMITS } from './field_limits';

// The checker reads unvalidated payloads, so a missing array measures as empty.
const list = <T>(value: readonly T[] | undefined): readonly T[] => value ?? [];

/** The text Slack counts for an inline: a link's label, or its URL when it has none. */
export const richTextInlineText = (inline: SlackRichTextInline): string =>
  inline.type === 'link' ? (inline.text ?? inline.url) : inline.text;

/** The text Slack counts for a rich-text element, a list's items run together. */
export const richTextElementText = (
  element: SlackRichTextBlockElement
): string =>
  element.type === 'rich_text_list'
    ? list(element.elements).map(richTextElementText).join('')
    : list(element.elements).map(richTextInlineText).join('');

/** The text Slack counts for a table cell. */
export const tableCellText = (cell: SlackTableCell): string =>
  cell.type === 'raw_text'
    ? cell.text
    : list(cell.elements).map(richTextElementText).join('');

/** Characters across a table's cells, which Slack budgets per message as `tableCellCharsPerMessage`. */
export const tableCharCount = ({ rows }: SlackTableBlock): number =>
  list(rows).reduce(
    (total, row) =>
      list(row).reduce((sum, cell) => sum + tableCellText(cell).length, total),
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

/** Slack runs adjacent sections together, so a section followed by another ends its line unless its rendered text already does. */
export const breakSections = (
  elements: readonly SlackRichTextBlockElement[]
): SlackRichTextBlockElement[] =>
  elements.map((element, index) =>
    element.type === 'rich_text_section' &&
    elements[index + 1]?.type === 'rich_text_section' &&
    !endsLine(element)
      ? richSection([...element.elements, textRun('\n')])
      : element
  );

// Graphemes, and the code points of any grapheme past `max`.
const textUnits = (text: string, max: number): string[] =>
  Array.from(
    new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
    ({ segment }) => (segment.length > max ? Array.from(segment) : [segment])
  ).flat();

/**
 * A section, quote, or preformatted element past `sectionTextChars` as adjacent ones of its type, with nothing added between them; a list comes back as is.
 * A link or tag no longer than that stays whole; anything longer splits at grapheme boundaries into inlines of its own type, a link's label (or URL) across links to the same URL.
 */
export const splitRichTextElement = (
  element: SlackRichTextBlockElement
): SlackRichTextBlockElement[] => {
  const max = SLACK_LIMITS[RICH_TEXT_ELEMENT_LIMIT];
  if (
    element.type === 'rich_text_list' ||
    richTextElementText(element).length <= max
  ) {
    return [element];
  }
  const chunks: SlackRichTextInline[][] = [];
  let chunk: SlackRichTextInline[] = [];
  let room: number = max;
  const flush = (): void => {
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    chunk = [];
    room = max;
  };
  for (const inline of element.elements) {
    const whole = richTextInlineText(inline);
    if (inline.type !== 'text' && whole.length <= max) {
      if (whole.length > room) {
        flush();
      }
      chunk.push(inline);
      room -= whole.length;
      continue;
    }
    let text = '';
    for (const unit of textUnits(whole, max)) {
      if (text.length + unit.length > room) {
        if (text) {
          chunk.push({ ...inline, text });
        }
        flush();
        text = '';
      }
      text += unit;
    }
    if (text) {
      chunk.push({ ...inline, text });
      room -= text.length;
    }
  }
  flush();
  return chunks.map((elements) => ({ ...element, elements }));
};

/**
 * A table Slack would reject as one `rich_text` block. Each row's columns run `heading: cell` to the wider of the header and the row, and a blank section parts the rows.
 * A cell keeps its inlines, styles, and blocks; a table whose rows past the header have no cells prints its headings, and one with nothing to print is dropped.
 */
export const degradeTable = ({
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

/** Whether a table has between one and `tableRows` rows, each with between one and `tableColumns` cells. */
export const fitsTableShape = ({ rows }: SlackTableBlock): boolean =>
  rows.length > 0 &&
  rows.length <= SLACK_LIMITS[SLACK_FIELD_LIMITS.table.counts.rows] &&
  rows.every(
    (row) => row.length > 0 && row.length <= SLACK_LIMITS.tableColumns
  );
