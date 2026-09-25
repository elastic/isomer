/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

// In canvas pixels; sub-pixel rounding reads as overflow without it.
const tolerance = 1;

/**
 * Whether any element on the slide under `root` has a box outside its frame
 * body: into the footer's band or off the canvas. Boxes, not `scrollHeight`,
 * so a glyph overhanging a tight line height does not count.
 */
export const overflows = (root: ParentNode): boolean => {
  const body = root.querySelector('main');
  if (!body) {
    return false;
  }
  const box = body.getBoundingClientRect();
  const slack = tolerance * (box.width / body.clientWidth || 1);
  return [...body.querySelectorAll('*')].some((element) => {
    const { top, right, bottom, left, width, height } =
      element.getBoundingClientRect();
    return (
      width > 0 &&
      height > 0 &&
      (bottom > box.bottom + slack ||
        right > box.right + slack ||
        top < box.top - slack ||
        left < box.left - slack)
    );
  });
};

/**
 * Reports whether the slide rendered under `root` overflows, once its fonts
 * have loaded and again whenever `version` changes. Runs after layout effects,
 * so a stylesheet written in one is already applied.
 */
export const useOverflow = (
  root: ParentNode | undefined,
  version: unknown,
  onOverflow: ((overflowing: boolean) => void) | undefined
) => {
  useEffect(() => {
    if (!root || !onOverflow) {
      return undefined;
    }
    let live = true;
    void document.fonts.ready.then(() => {
      if (live) {
        onOverflow(overflows(root));
      }
    });
    return () => {
      live = false;
    };
  }, [root, version, onOverflow]);
};
