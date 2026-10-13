/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { Children } from 'react';
import { IsomerError } from '@elastic/isomer-sdk';

import { splitLines } from '../render/marks';

/** Text children exactly as written, leading indentation included. */
export const rawText = (children: ReactNode): string =>
  Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child);
      }
      throw new IsomerError(
        'EXPECTED_TEXT_CHILDREN',
        'Expected text children.'
      );
    })
    .join('');

/**
 * Source lines from text children, such as a template literal: the line break
 * after the opening backtick and the indentation before the closing one are
 * dropped, and so is the indentation every line shares.
 */
export const sourceLines = (children: ReactNode): string[] => {
  const all = splitLines(rawText(children));
  const start = all.length > 1 && all[0] === '' ? 1 : 0;
  const end =
    all.length - start > 1 && /^ *$/.test(all[all.length - 1]!)
      ? all.length - 1
      : all.length;
  const lines = all.slice(start, end);
  const indents = lines
    .filter((line) => line.trim() !== '')
    .map((line) => line.length - line.trimStart().length);
  const shared = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(shared));
};
