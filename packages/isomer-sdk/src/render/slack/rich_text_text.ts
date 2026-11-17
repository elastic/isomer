/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackRichTextBlockElement, SlackRichTextInline } from './blocks';

export const richTextInlineText = (inline: SlackRichTextInline): string =>
  inline.type === 'link' ? (inline.text ?? inline.url) : inline.text;

export const richTextElementText = (
  element: SlackRichTextBlockElement
): string =>
  element.type === 'rich_text_list'
    ? element.elements.map(richTextElementText).join('')
    : element.elements.map(richTextInlineText).join('');
