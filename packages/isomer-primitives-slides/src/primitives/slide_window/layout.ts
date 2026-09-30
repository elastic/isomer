/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideLayout } from '../../render/context';
import { font } from '../../theme/base';
import { window } from '../../theme/components/window';
import { scalePx } from '../../theme/scale';
import { lineBox, monoLines, wrappedLines } from '../size';

import { windowTitle } from './title';
import type { SlideWindowNode } from './types';

/** The layout a window's body nodes get inside `layout`: less its border, its title bar with the title wrapped across it, and body padding. */
export const windowBodyLayout = (
  { width, height }: SlideLayout,
  node: SlideWindowNode
): SlideLayout => {
  const slack = node.chrome === 'slack';
  const border = scalePx(window.border);
  const role = slack ? window.slackBar : window.bar;
  const across = Math.max(
    0,
    width -
      2 * border -
      2 * scalePx(slack ? window.slackBarPaddingX : window.barPaddingX)
  );
  const title = windowTitle(node);
  const lines = slack
    ? wrappedLines(title, scalePx(role.size), across, font.tracking.none)
    : monoLines(title, scalePx(role.size), across);
  const bar =
    lines * lineBox(role) +
    2 * scalePx(slack ? window.slackBarPaddingY : window.barPaddingY) +
    border;
  const padY = scalePx(slack ? window.slackBodyPadding : window.bodyPaddingY);
  const padX = scalePx(slack ? window.slackBodyPadding : window.bodyPaddingX);
  return {
    width: Math.max(0, width - 2 * border - 2 * padX),
    height: Math.max(0, height - 2 * border - bar - 2 * padY),
  };
};
