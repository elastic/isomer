/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  escapeMrkdwn,
  italic,
  link,
  SLACK_LIMITS,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';

import type { TableScene } from '../scene/types';

import { described, sceneNotes } from './scene_text';

/** A table Scene as Slack blocks: its summary, description and notes, then a native `table` block of its strings in starting order, without empty columns and within Slack's caps, then its link. */
export const tableSceneToSlack = (
  scene: TableScene,
  baseUrl?: string
): SlackBlock[] => {
  const shown = scene.columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => !column.empty)
    .slice(0, SLACK_LIMITS.tableColumns);
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          ...[scene.summary, ...described(scene)].map(escapeMrkdwn),
          ...sceneNotes(scene).map(italic),
        ].join('\n'),
      },
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
