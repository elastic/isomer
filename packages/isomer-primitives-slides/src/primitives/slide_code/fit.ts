/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { displayColumns } from '../../render/mono';
import { codeDenseAfter } from '../../theme/components/code';

/** Whether panels holding these lines take the dense size: past `codeDenseAfter` lines, or a line wider than `regularMax` columns less its panel's `gutter`. */
export const codeIsDense = (
  panels: readonly { lines: readonly string[]; gutter: number }[],
  regularMax: number
): boolean =>
  panels.some(({ lines, gutter }) => {
    const max = regularMax - gutter;
    return (
      lines.length > codeDenseAfter ||
      lines.some((line) => displayColumns(line, max) > max)
    );
  });
