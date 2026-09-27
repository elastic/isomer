/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { slideAuthoringNotes } from './authoring_notes';
export {
  quoteMarkdown,
  quoteSlackBlocks,
  quoteText,
  renderChildren,
  renderSlackChildren,
  slackCaption,
} from './children';
export { cls } from './cls';
export type {
  SlidePackTypes,
  SlideReactEnv,
  SlideRenderContext,
  SlideRenderScope,
} from './context';
export {
  type MarkRun,
  LINE_TERMINATORS,
  hasLineTerminator,
  markdownCode,
  markdownText,
  marksMarkdown,
  marksReact,
  marksSlack,
  parseMarks,
  stripMarks,
} from './marks';
export {
  type SlideLayoutBox,
  type SlideOverflow,
  type SlideOverlap,
  slideOverflow,
  slideOverlaps,
} from './overflow';
export {
  markdownDelimiterRow,
  markdownRow,
  markdownTable,
  textTable,
} from './table';
