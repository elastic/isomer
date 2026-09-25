/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from '../../theme/distillery';
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
    flex: none;
    ${typeRole(fanout.source)}
    padding: ${fanout.sourcePadding};
    white-space: nowrap;
  `,
  stem: css`
    background: ${color.line};
    flex: none;
    height: ${fanout.line};
    width: ${fanout.stem};
  `,
  targets: css`
    border-left: ${fanout.line} solid ${color.line};
    display: flex;
    flex-direction: column;
    gap: ${fanout.rowGap};
    list-style: none;
    margin: 0;
    min-width: 0;
    padding: ${fanout.spinePaddingY} 0;
  `,
  target: css`
    align-items: center;
    display: flex;
    gap: ${fanout.tickGap};
  `,
  tick: css`
    background: ${color.line};
    flex: none;
    height: ${fanout.line};
    width: ${fanout.tick};
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
  body: css`
    color: ${color.textSubtle};
    ${typeRole(fanout.body)}
  `,
}));
