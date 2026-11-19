/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sceneNotes } from '../../text';
import { CHARTS_THEME } from '../../theme';

import type { TableScene } from './scene';

const theme = CHARTS_THEME.table;

/** The height of the lines around the table: title, description and notes. */
export const textHeight = (scene: TableScene) =>
  (scene.title ? theme.titleHeight : 0) +
  (scene.description ? theme.lineHeight : 0) +
  sceneNotes(scene).length * theme.lineHeight;

/** The rows drawn on the first page, as positions into `scene.rows`. */
export const firstPage = (scene: TableScene): readonly number[] =>
  scene.paging ? scene.order.slice(0, scene.paging.pageSize) : scene.order;

export const hasFooter = (scene: TableScene) =>
  scene.columns.some(({ footer }) => footer !== undefined);

/** Rows besides the body: the header, then a footer and the pager when shown. */
export const chromeRows = (scene: TableScene) =>
  1 + (hasFooter(scene) ? 1 : 0) + (scene.paging ? 1 : 0);

/** The height a table draws at: the Scene's, else its lines and first page's rows. */
export const tableHeight = (scene: TableScene): number =>
  scene.size?.height ??
  textHeight(scene) +
    (chromeRows(scene) + Math.max(firstPage(scene).length, 1)) *
      theme.density[scene.density].rowHeight;
