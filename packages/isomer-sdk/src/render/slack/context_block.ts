/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLACK_LIMITS, type SlackContextBlock } from './blocks';
import { SLACK_FIELD_LIMITS } from './field_limits';
import { clampMrkdwn } from './format';

export const contextBlock = (
  lines: ReadonlyArray<string>
): SlackContextBlock => ({
  type: 'context',
  elements: lines
    .filter((line): line is string => line !== undefined && line.length > 0)
    .map((text) => ({
      type: 'mrkdwn',
      text: clampMrkdwn(
        text,
        SLACK_LIMITS[SLACK_FIELD_LIMITS.context.chars.elements.limit]
      ),
    })),
});
