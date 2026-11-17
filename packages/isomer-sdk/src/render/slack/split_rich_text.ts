/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLACK_LIMITS,
  type SlackRichTextBlockElement,
  type SlackRichTextInline,
} from './blocks';
import { richTextElementText, richTextInlineText } from './rich_text_text';

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
  const max = SLACK_LIMITS.sectionTextChars;
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
