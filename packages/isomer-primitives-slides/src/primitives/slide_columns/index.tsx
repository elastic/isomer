/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import { code, escapeMrkdwn, type SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  marksMarkdown,
  marksRichText,
  marksSlack,
  plainText,
  richTextRun,
} from '../../render/marks';
import {
  richTextBreak,
  richTextSection,
  slackBold,
  slackContext,
  slackFields,
  slackRichText,
} from '../../render/slack_text';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideColumnsNode } from './schema';

export type { SlideColumn, SlideColumnsNode } from './schema';

const { separator } = slideDistillery.tokens.glyph;
const { highlightLabel } = slideDistillery.tokens.columns;
const join = ` ${separator.value} `;

/** The title, with the highlight's label when it is the recommended column. */
const titleLine = (title: string, highlighted: boolean): string =>
  highlighted
    ? `${oneLine(title)}${join}${highlightLabel.value}`
    : oneLine(title);

export const text = ({ items, footnote, highlight }: SlideColumnsNode) =>
  [
    ...items.map(({ title, tags = [], body }, index) =>
      [
        titleLine(title, index === highlight),
        tags.map(oneLine).join(join),
        plainText(body),
      ]
        .filter(Boolean)
        .join('\n')
    ),
    footnote ? `${oneLine(footnote.code)} ${plainText(footnote.text)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

export const markdown = ({ items, footnote, highlight }: SlideColumnsNode) => [
  ...items.flatMap(({ title, tags = [], body }, index) => [
    md.heading(2, titleLine(title, index === highlight)),
    ...(tags.length > 0
      ? [
          md.paragraph(
            ...tags.flatMap((tag, at) => [...(at ? [join] : []), md.code(tag)])
          ),
        ]
      : []),
    md.paragraph(...marksMarkdown(body)),
  ]),
  ...(footnote
    ? [
        md.paragraph(
          md.code(footnote.code),
          ' ',
          ...marksMarkdown(footnote.text)
        ),
      ]
    : []),
];

// `code` cannot hold a backtick, and rich text keeps one whole.
const codeSafe = (text: string) => !text.includes('`');

const richColumns = ({ items, highlight }: SlideColumnsNode): SlackBlock =>
  slackRichText(
    ...items.map(({ title, tags = [], body }, index) =>
      richTextSection(
        richTextRun(oneLine(title), { bold: true }),
        ...(index === highlight
          ? [richTextRun(`${join}${highlightLabel.value}`)]
          : []),
        richTextBreak,
        ...tags.flatMap((tag, at) => [
          ...(at ? [richTextRun(join)] : []),
          richTextRun(tag, { code: true }),
        ]),
        ...(tags.length > 0 ? [richTextBreak] : []),
        ...marksRichText(body)
      )
    )
  );

const richFootnote = ({ code: id, text }: { code: string; text: string }) =>
  slackRichText(
    richTextSection(
      richTextRun(id, { code: true }),
      richTextRun(' '),
      ...marksRichText(text)
    )
  );

export const slack = (node: SlideColumnsNode): SlackBlock[] => {
  const { items, footnote, highlight } = node;
  const fields = items.map(({ title, tags = [], body }, index) =>
    [
      index === highlight
        ? `${slackBold(title)}${join}${escapeMrkdwn(highlightLabel.value)}`
        : slackBold(title),
      tags.map((tag) => code(oneLine(tag))).join(join),
      oneLine(marksSlack(body)),
    ]
      .filter(Boolean)
      .join('\n')
  );
  return [
    items.every(({ tags = [] }) => tags.every(codeSafe))
      ? slackFields(
          fields,
          () => richColumns(node),
          items.flatMap(({ title, tags = [], body }) => [
            title,
            ...tags.map((tag) => ({ code: tag })),
            { marks: body },
          ])
        )
      : richColumns(node),
    ...(footnote
      ? [
          codeSafe(footnote.code)
            ? slackContext(
                `${code(oneLine(footnote.code))} ${oneLine(marksSlack(footnote.text))}`,
                () => richFootnote(footnote),
                [{ code: footnote.code }, { marks: footnote.text }]
              )
            : richFootnote(footnote),
        ]
      : []),
  ];
};

/** Catalog, schema, and renderers for {@link SlideColumnsNode}. */
export const slideColumnsPrimitive = definePrimitive({
  type: 'slideColumns',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
    slack,
  },
});
