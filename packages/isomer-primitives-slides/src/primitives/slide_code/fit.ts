/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { displayColumns } from '../../render/mono';
import { codeDenseAfter } from '../../theme/components/code';

/** Whether panels holding these lines take the dense size: past `codeDenseAfter` lines, or a line wider than `regularMax` columns. */
export const codeIsDense = (
  panels: readonly (readonly string[])[],
  regularMax: number
): boolean =>
  panels.some(
    (lines) =>
      lines.length > codeDenseAfter ||
      lines.some((line) => displayColumns(line, regularMax) > regularMax)
  );
