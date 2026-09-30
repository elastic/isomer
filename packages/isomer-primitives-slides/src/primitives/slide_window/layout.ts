/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideLayout } from '../../render/context';
import { window } from '../../theme/components/window';
import { scalePx } from '../../theme/scale';
import { bodyLayout } from '../layout';
import { lineBox, measureText } from '../size';

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
  const lines = Math.max(1, measureText(windowTitle(node), role, across).lines);
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

/** The layout a window in `layout` gives its body node at `index`, below any leading heading. */
export const windowNodeLayout = (
  layout: SlideLayout,
  node: SlideWindowNode,
  index: number
): SlideLayout =>
  bodyLayout(
    windowBodyLayout(layout, node),
    scalePx(window.bodyGap),
    node.body,
    index
  );
