/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery, toneVar } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';

const { createStyleModule, tokens } = slideDistillery;
const { color, fanout } = tokens;

/** Distillate module for `slideFanout`. Its root is `layoutModule`'s `fill`. */
export const fanoutModule = createStyleModule('fanout', ({ css }) => ({
  diagram: css`
    align-items: center;
    display: flex;
    min-width: 0;
  `,
  source: css`
    align-items: center;
    border: ${fanout.sourceBorder} solid ${color.primary};
    border-radius: ${fanout.sourceRadius};
    color: ${color.text};
    display: flex;
    flex: 0 0 auto;
    ${typeRole(fanout.source)}
    padding: ${fanout.sourcePadding};
    white-space: nowrap;
  `,
  stem: css`
    background: ${color.line};
    flex: 0 0 auto;
    height: ${fanout.line};
    width: ${fanout.stem};
  `,
  targets: css`
    display: flex;
    flex-direction: column;
    gap: ${fanout.rowGap};
    list-style: none;
    margin: 0;
    min-width: 0;
    padding: 0;
  `,
  target: css`
    align-items: flex-start;
    display: flex;
    gap: ${fanout.tickGap};
    position: relative;
  `,
  spine: css`
    background: ${color.line};
    left: 0;
    position: absolute;
    width: ${fanout.line};
  `,
  spineFirst: css`
    bottom: ${fanout.spineReach};
    top: ${fanout.tickTop};
  `,
  spineMiddle: css`
    bottom: ${fanout.spineReach};
    top: 0;
  `,
  spineLast: css`
    height: ${fanout.spineEnd};
    top: 0;
  `,
  tick: css`
    background: ${color.line};
    flex: 0 0 auto;
    height: ${fanout.line};
    margin-top: ${fanout.tickTop};
    width: ${fanout.tick};
  `,
  tonedTick: css`
    background: ${toneVar};
  `,
  label: css`
    display: flex;
    flex-direction: column;
    gap: ${fanout.nameGap};
    min-width: 0;
  `,
  name: css`
    color: ${color.text};
    ${typeRole(fanout.name)}
  `,
  tonedName: css`
    color: ${toneVar};
  `,
  body: css`
    color: ${color.textSubtle};
    ${typeRole(fanout.body)}
    text-wrap: balance;
  `,
}));
