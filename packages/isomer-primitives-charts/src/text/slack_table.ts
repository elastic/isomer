/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  link,
  SLACK_LIMITS,
  type SlackBlock,
  type SlackRichTextSection,
} from '@elastic/isomer-sdk/slack';

import type { TableScene } from '../scene/types';

import { described, sceneNotes } from './scene_text';

/** A table Scene as Slack blocks: its summary, description and notes as paragraphs, then a native `table` block of its strings in starting order, without empty columns and within Slack's caps, then its link. */
export const tableSceneToSlack = (
  scene: TableScene,
  baseUrl?: string
): SlackBlock[] => {
  const shown = scene.columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => !column.empty)
    .slice(0, SLACK_LIMITS.tableColumns);
  const paragraphs = [
    ...[scene.summary, ...described(scene)].map((text) => ({ text })),
    ...sceneNotes(scene).map((text) => ({ text, style: { italic: true } })),
  ];
  // Rich text, which the envelope splits past a section's limit rather than cutting.
  const blocks: SlackBlock[] = [
    {
      type: 'rich_text',
      elements: paragraphs.map((paragraph, index): SlackRichTextSection => ({
        type: 'rich_text_section',
        elements: [
          { type: 'text', ...paragraph },
          ...(index < paragraphs.length - 1
            ? [{ type: 'text' as const, text: '\n' }]
            : []),
        ],
      })),
    },
  ];
  if (shown.length > 0 && scene.rows.length > 0) {
    const footer = shown.some(({ column }) => column.footer !== undefined);
    const body = scene.order
      .slice(0, SLACK_LIMITS.tableRows - 1 - (footer ? 1 : 0))
      .map((position) =>
        shown.map(({ index }) => scene.rows[position]!.cells[index]!.text)
      );
    blocks.push({
      type: 'table',
      rows: [
        shown.map(({ column }) => column.label),
        ...body,
        ...(footer ? [shown.map(({ column }) => column.footer ?? '')] : []),
      ].map((row) => row.map((text) => ({ type: 'raw_text' as const, text }))),
      column_settings: shown.map(({ column }) => ({
        align: column.alignment,
        is_wrapped: true,
      })),
    });
  }
  const target = scene.interactions.link;
  if (target) {
    blocks.push({
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: link(target.href, target.label, baseUrl) },
      ],
    });
  }
  return blocks;
};
