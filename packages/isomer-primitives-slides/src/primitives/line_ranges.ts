/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';

import { authoredTextMaxLength } from './authored_text';
import { crossRefine } from './cross_field';

/** A run of lines, `[first, last]`, both included. */
export type LineRange = readonly [number, number];

const rangeList = /^\s*\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*\s*$/;

/** The runs in an `EuiCode` line-range string such as `2, 5-7`, or `undefined` when it is not one. */
export const lineRanges = (ranges: string): LineRange[] | undefined =>
  ranges.length <= authoredTextMaxLength && rangeList.test(ranges)
    ? ranges.split(',').map((part) => {
        const [first = 0, last = first] = part
          .split('-')
          .map((bound) => Number(bound.trim()));
        return [first, last] as const;
      })
    : undefined;

/** States {@link lineRangeText}'s order rule; a field's description must include it. */
export const lineRangeOrder = 'each range written low to high';

/** Zod schema for an `EuiCode` line-range string, each run written low to high. */
export const lineRangeText = () =>
  z
    .string()
    .max(authoredTextMaxLength)
    .regex(rangeList, {
      error: 'line numbers and ranges separated by commas, e.g. `2, 5-7`',
    })
    .check(
      crossRefine<string>(
        (ranges) =>
          (lineRanges(ranges) ?? []).every(([first, last]) => first <= last),
        {
          error: 'a range runs from its lower number to its higher one',
          rule: lineRangeOrder,
        }
      )
    );

/** Whether `line` falls in one of `ranges`. */
export const inRanges = (ranges: readonly LineRange[], line: number): boolean =>
  ranges.some(([first, last]) => line >= first && line <= last);

/** Whether every run of `ranges` lies within `first` and `last`. */
export const rangesWithin = (
  ranges: readonly LineRange[],
  first: number,
  last: number
): boolean => ranges.every(([low, high]) => low >= first && high <= last);
