/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';

import { slideDistillery } from '../../theme/distillery';

import type { SlideWindowNode } from './types';

const { channelPrefix } = slideDistillery.tokens.window;

/** The title bar's text on every surface: a Slack window reads `# channel`. */
export const windowTitle = ({ chrome, title }: SlideWindowNode): string =>
  chrome === 'slack'
    ? `${channelPrefix.value} ${oneLine(title)}`
    : oneLine(title);
