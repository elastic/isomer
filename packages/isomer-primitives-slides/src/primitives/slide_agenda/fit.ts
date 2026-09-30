/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agenda } from '../../theme/components/agenda';
import { label } from '../../theme/components/shared';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { emWidth, lineFill, wrappedLines } from '../size';

import type { SlideAgendaSection } from './schema';

const trailingWidth = ({ count, current }: SlideAgendaSection): number =>
  current
    ? emWidth(agenda.here.value.toUpperCase(), label.tracking) *
      scalePx(label.size)
    : count
      ? emWidth(count, agenda.count.tracking) * scalePx(agenda.count.size)
      : 0;

/** Title lines the sections take at `step` across `width`, for {@link agendaFit}. */
export const agendaLines = (
  sections: readonly SlideAgendaSection[],
  step: SlideSize,
  width: number
): number =>
  sections.reduce((lines, section) => {
    const titleWidth =
      width -
      scalePx(agenda.numberWidth) -
      2 * scalePx(agenda.countGap) -
      trailingWidth(section);
    return (
      lines +
      wrappedLines(
        section.title,
        scalePx(agenda.titleSizes[step]),
        Math.max(1, titleWidth * lineFill),
        agenda.title.tracking
      )
    );
  }, 0);
