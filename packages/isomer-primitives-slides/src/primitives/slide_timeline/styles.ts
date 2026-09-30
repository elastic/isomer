/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { countOf, slideSizes } from '../../theme/variants';

import { timelineHeadingLines } from './fit';

const { createStyleModule, tokens } = slideDistillery;
const { color, timeline } = tokens;

export const timelineModule = createStyleModule('timeline', ({ css }) => ({
  row: css`
    display: flex;
    flex-direction: column;
    position: relative;
  `,
  list: css`
    display: flex;
    gap: ${timeline.gap};
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  rail: css`
    background: ${timeline.railColor};
    height: ${timeline.rail};
    left: 0;
    position: absolute;
    right: 0;
  `,
  railTop: variants(
    slideSizes,
    (size) => css`
      top: ${timeline.railTops[size]};
    `
  ),
  // Positioned so it paints above the rail.
  item: css`
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-width: 0;
    position: relative;
  `,
  labelSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${timeline.labelSizes[size]};
    `
  ),
  // The rail sits under one line of label.
  label: css`
    ${typeRole(timeline.label)}
  `,
  labelPast: css`
    color: ${color.text};
  `,
  labelCurrent: css`
    color: ${color.primary};
  `,
  dot: css`
    border-radius: 50%;
    height: ${timeline.dotSize};
    margin-top: ${timeline.dotGap};
    width: ${timeline.dotSize};
  `,
  dotPast: css`
    background: ${color.text};
  `,
  dotCurrent: css`
    background: ${color.primary};
    box-shadow: 0 0 0 ${timeline.halo} ${timeline.haloColor};
  `,
  channel: css`
    margin-top: ${timeline.channelGap};
  `,
  headingSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${timeline.headingSizes[size]};
    `
  ),
  headingLines: variants(
    timelineHeadingLines,
    (lines) => css`
      min-height: ${countOf(lines) * Number(timeline.heading.lineHeight.value)}em;
    `
  ),
  heading: css`
    color: ${color.text};
    ${typeRole(timeline.heading)}
    margin: ${timeline.headingGap} 0 0;
    text-wrap: pretty;
  `,
  bodySize: variants(
    slideSizes,
    (size) => css`
      font-size: ${timeline.bodySizes[size]};
    `
  ),
  body: css`
    color: ${color.textSoft};
    ${typeRole(timeline.body)}
    margin: ${timeline.bodyGap} 0 0;
    text-wrap: pretty;
  `,
}));
