/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { slideDistillery } from '../theme/distillery';
import { tonesModule } from '../theme/modules';
import type { SlideTone } from '../theme/variants';

import { cls } from './cls';
import type { SlideRenderContext } from './context';

const { glyph, label } = slideDistillery.tokens.tone;

/** Goes first inside a toned title, so its tone is never color alone; nothing for a neutral one. */
export const ToneCue = ({
  tone,
  context,
  labels = label,
}: {
  tone: SlideTone | undefined;
  context: SlideRenderContext | undefined;
  /** A primitive's own name for each tone, from its theme group. */
  labels?: Readonly<Record<SlideTone, { value: string }>>;
}): ReactNode => {
  if (tone === undefined) {
    return null;
  }
  const { handles: tones } = tonesModule;
  return (
    <span
      role="img"
      aria-label={labels[tone].value}
      className={cls(
        context,
        tones.tone[tone],
        tones.cue,
        tones.cueShape[tone]
      )}
    />
  );
};

/** Text, Markdown, and Slack prefix for a toned title, or `''` for a neutral one. */
export const toneCueText = (tone: SlideTone | undefined): string =>
  tone === undefined ? '' : `${glyph[tone].value} `;
