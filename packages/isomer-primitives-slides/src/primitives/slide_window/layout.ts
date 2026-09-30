/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideLayout } from '../../render/context';
import { window } from '../../theme/components/window';
import { scalePx } from '../../theme/scale';
import type { SlideWindowChrome } from '../../theme/variants';
import { lineBox } from '../size';

/** The layout a window's body nodes get inside `layout`: less its border, one-line title bar, and body padding. */
export const windowBodyLayout = (
  { width, height }: SlideLayout,
  chrome: SlideWindowChrome
): SlideLayout => {
  const slack = chrome === 'slack';
  const border = scalePx(window.border);
  const bar =
    lineBox(slack ? window.slackBar : window.bar) +
    2 * scalePx(slack ? window.slackBarPaddingY : window.barPaddingY) +
    border;
  const padY = scalePx(slack ? window.slackBodyPadding : window.bodyPaddingY);
  const padX = scalePx(slack ? window.slackBodyPadding : window.bodyPaddingX);
  return {
    width: Math.max(0, width - 2 * border - 2 * padX),
    height: Math.max(0, height - 2 * border - bar - 2 * padY),
  };
};
