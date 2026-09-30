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
import { lineFill, measureText } from '../size';

import type { SlideAgendaSection } from './schema';

const trailingWidth = ({ count, current }: SlideAgendaSection): number =>
  current
    ? measureText(agenda.here.value, label).widest
    : count
      ? measureText(count, agenda.count).widest
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
      Math.max(
        1,
        measureText(
          section.title,
          { ...agenda.title, size: agenda.titleSizes[step] },
          titleWidth * lineFill
        ).lines
      )
    );
  }, 0);
