/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Slack clamps `header`, `section`, field, and `context` text, and leaves `rich_text` whole, so authored text that outgrows the first falls back to the second.

import { oneLine } from '@elastic/isomer-sdk/author';
import {
  clampSlackText,
  codeBlock,
  escapeMrkdwn,
  formatHeaderText,
  SLACK_LIMITS,
  type SlackBlock,
  slackLinkUrl,
  type SlackRichTextBlockElement,
  type SlackRichTextInline,
  type SlackRichTextSection,
  type SlackRichTextText,
} from '@elastic/isomer-sdk/slack';

import { marksRichText, marksSlack, richTextRun } from './marks';

/** Whether `text` holds a character `mrkdwn` reads as formatting and {@link escapeMrkdwn} leaves as is. */
export const hasMrkdwnDelimiter = (text: string): boolean =>
  /[*_~`]/.test(text);

/** Whether a `mrkdwn` code block might not print `text` as written: `codeBlock` breaks a backtick fence, and Slack reads `<` and the `&amp;`, `&lt;`, and `&gt;` escapes. */
export const alteredInCodeBlock = (text: string): boolean =>
  /```|<|&(?:amp|lt|gt);/.test(text);

/** Whether Slack keeps all of `text` in a field of `limit` characters. */
export const fitsSlack = (text: string, limit: number): boolean =>
  clampSlackText(text, limit) === text;

export const slackRichText = (
  ...elements: SlackRichTextBlockElement[]
): SlackBlock => ({ type: 'rich_text', elements });

export const richTextSection = (
  ...elements: SlackRichTextInline[]
): SlackRichTextSection => ({ type: 'rich_text_section', elements });

/** A literal line break, which {@link richTextRun} would fold into a space. */
export const richTextBreak: SlackRichTextInline = { type: 'text', text: '\n' };

/** `runs` linked to `href` when Slack can link it, as they are otherwise. */
export const richTextLinked = (
  runs: readonly SlackRichTextText[],
  href: string | undefined
): SlackRichTextInline[] => {
  const url = href ? slackLinkUrl(href) : null;
  return url === null
    ? [...runs]
    : runs.map(({ text, style }) => ({
        type: 'link',
        url,
        text,
        ...(style ? { style } : {}),
      }));
};

/** `*text*` on one line, its edge whitespace dropped, since Slack will not bold against a space. */
export const slackBold = (text: string): string => {
  const line = escapeMrkdwn(oneLine(text)).trim();
  return line ? `*${line}*` : '';
};

/** A `header` when it keeps all of `text`, otherwise bold rich text, from `runs` when the text has marks. */
export const slackHeading = (
  text: string,
  runs: readonly SlackRichTextText[] = [richTextRun(text)]
): SlackBlock => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return formatHeaderText(normalized) === normalized
    ? {
        type: 'header',
        text: { type: 'plain_text', text: normalized, emoji: true },
      }
    : slackRichText(
        richTextSection(
          ...runs.map((run) => ({
            ...run,
            style: { ...run.style, bold: true },
          }))
        )
      );
};

/** A `mrkdwn` section when it keeps all of `text`, `fallback` otherwise. */
export const slackSection = (
  text: string,
  fallback: () => SlackBlock
): SlackBlock =>
  fitsSlack(text, SLACK_LIMITS.sectionTextChars)
    ? { type: 'section', text: { type: 'mrkdwn', text } }
    : fallback();

/** A one-element `mrkdwn` context when it keeps all of `text`, `fallback` otherwise. */
export const slackContext = (
  text: string,
  fallback: () => SlackBlock
): SlackBlock =>
  fitsSlack(text, SLACK_LIMITS.contextElementChars)
    ? { type: 'context', elements: [{ type: 'mrkdwn', text }] }
    : fallback();

/** A section of `mrkdwn` fields when each keeps all of its text, `fallback` otherwise. */
export const slackFields = (
  fields: readonly string[],
  fallback: () => SlackBlock
): SlackBlock =>
  fields.length <= SLACK_LIMITS.fieldsPerSection &&
  fields.every((text) => fitsSlack(text, SLACK_LIMITS.sectionFieldChars))
    ? {
        type: 'section',
        fields: fields.map((text) => ({ type: 'mrkdwn', text })),
      }
    : fallback();

const marksRichTextBlock = (text: string): SlackBlock =>
  slackRichText(richTextSection(...marksRichText(text)));

/** Authored text with marks as a section, whole at any length. */
export const slackMarksSection = (text: string): SlackBlock =>
  slackSection(oneLine(marksSlack(text)), () => marksRichTextBlock(text));

/** Authored text with marks as a context line, whole at any length. */
export const slackMarksContext = (text: string): SlackBlock =>
  slackContext(oneLine(marksSlack(text)), () => marksRichTextBlock(text));

/** A code block under an optional caption, or literal rich text where `mrkdwn` would not print either as written. */
export const slackCodePanel = (
  source: string,
  caption?: string,
  strong = false
): SlackBlock => {
  const literal = () =>
    slackRichText(
      ...(caption
        ? [
            richTextSection(
              richTextRun(caption, strong ? { bold: true } : undefined)
            ),
          ]
        : []),
      {
        type: 'rich_text_preformatted',
        elements: [{ type: 'text', text: source }],
      }
    );
  if (
    (caption !== undefined && hasMrkdwnDelimiter(caption)) ||
    alteredInCodeBlock(source)
  ) {
    return literal();
  }
  const heading = caption
    ? strong
      ? slackBold(caption)
      : escapeMrkdwn(oneLine(caption))
    : '';
  return slackSection(
    [heading, codeBlock(source)].filter(Boolean).join('\n'),
    literal
  );
};
