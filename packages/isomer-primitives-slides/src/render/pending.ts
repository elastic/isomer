/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import { italic } from '@elastic/isomer-sdk/slack';

import { slideDistillery } from '../theme/distillery';

import { richTextRun } from './marks';

const { caption } = slideDistillery.tokens.placeholder;

/** A value not measured yet, as each degraded surface prints it. */
export const pending = {
  text: `[${caption.value}]`,
  markdown: md.emphasis(caption.value),
  mrkdwn: italic(caption.value),
  richText: richTextRun(caption.value, { italic: true }),
};
