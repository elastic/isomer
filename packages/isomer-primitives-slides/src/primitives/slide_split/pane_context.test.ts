/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { frameContentWidth } from '../../theme/components/frame';
import { split } from '../../theme/components/split';
import { scalePx } from '../../theme/scale';
import { slideSplitDividers, slideSplitRatios } from '../../theme/variants';

import { paneContexts, paneWidths } from './pane_context';
import type { SlideSplitNode } from './types';

const node = (fields: Partial<SlideSplitNode> = {}): SlideSplitNode => ({
  type: 'slideSplit',
  panes: [{ items: [] }, { items: [] }],
  ...fields,
});

describe('paneWidths', () => {
  it.each(
    slideSplitRatios.flatMap((ratio) =>
      slideSplitDividers.map((divider) => ({ ratio, divider }))
    )
  )(
    '$ratio with $divider leaves the gaps and divider',
    ({ ratio, divider }) => {
      const [left, right] = paneWidths(frameContentWidth, ratio, divider);
      const gaps = 2 * scalePx(split.dividerGap[divider]);
      expect(left + right + gaps).toBeLessThanOrEqual(frameContentWidth);
      expect(left + right + gaps).toBeGreaterThan(frameContentWidth - 80);
    }
  );

  it('holds the aside column at its width', () => {
    expect(paneWidths(frameContentWidth, 'aside', 'hairline')[1]).toBe(
      scalePx(split.ratio.aside.right)
    );
  });
});

describe('paneContexts', () => {
  it('gives each pane its width, inside the enclosing one', () => {
    const [left, right] = paneContexts({ width: 1000 }, node());
    expect(left.width).toBe(paneWidths(1000, 'even', 'gap')[0]);
    expect(right.width).toBe(paneWidths(1000, 'even', 'gap')[1]);
  });

  it('crowds a pane under a label or above a footnote', () => {
    const [plain] = paneContexts({ crowding: 1 }, node());
    const [labelled] = paneContexts(
      { crowding: 1 },
      node({ panes: [{ label: 'Ours', items: [] }, { items: [] }] })
    );
    const [noted] = paneContexts({ crowding: 1 }, node({ footnote: 'Note.' }));
    expect(plain.crowding).toBe(1);
    expect(labelled.crowding).toBeGreaterThan(1);
    expect(noted.crowding).toBeGreaterThan(1);
  });
});
