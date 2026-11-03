/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { type SlackAssetCollector, type SlackAssetRequest } from './assets';
export {
  type SlackBlock,
  type SlackRichTextBlockElement,
  type SlackRichTextInline,
  type SlackRichTextSection,
  type SlackRichTextText,
  type SlackTableCell,
  type SlackTagColor,
  SLACK_LIMITS,
} from './blocks';
export { type SlackContainerOptions, slackContainer } from './container';
export {
  type SlackEnvelopeDispatcher,
  type SlackEnvelopeOptions,
  type SlackEnvelopeResult,
  renderSlackEnvelope,
} from './envelope';

export {
  bold,
  clampSlackText,
  code,
  codeBlock,
  escapeMrkdwn,
  isAbsoluteHttpUrl,
  italic,
  link,
  slackLinkUrl,
} from './format';

export { slackLimitProblems, unmodeledSlackBlockTypes } from './limit_problems';

export { markdownContentToSlackBlocks } from './markdown_content';

export {
  isModeledSlackBlockType,
  isUnmodeledSlackBlock,
  unmodeledSlackBlock,
} from './unmodeled';
