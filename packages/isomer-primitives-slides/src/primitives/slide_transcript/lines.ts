/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splitLines } from '../../render/marks';

const blank = (line: string): boolean => line.trim() === '';

/** A turn's lines as every surface prints them, blank lines at either edge dropped. */
export const turnLines = (text: string): string[] => {
  const lines = splitLines(text);
  let end = lines.length;
  while (end > 0 && blank(lines[end - 1]!)) {
    end -= 1;
  }
  let start = 0;
  while (start < end && blank(lines[start]!)) {
    start += 1;
  }
  return lines.slice(start, end);
};
