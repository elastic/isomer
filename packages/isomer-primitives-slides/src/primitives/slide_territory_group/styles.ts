/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery, toneVar } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';

const { createStyleModule, tokens } = slideDistillery;
const { color, territory } = tokens;

/** Distillate module for `slideTerritoryGroup`. */
export const territoryModule = createStyleModule('territory', ({ css }) => ({
  list: css`
    display: flex;
    gap: ${territory.gap};
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  item: css`
    border-left: ${territory.rule} solid ${toneVar};
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    gap: ${territory.titleGap};
    min-width: 0;
    padding-left: ${territory.paddingLeft};
  `,
  title: css`
    margin: 0;
  `,
  body: css`
    color: ${color.text};
    ${typeRole(territory.body)}
    margin: 0;
    text-wrap: pretty;
  `,
}));
