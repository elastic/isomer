/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { frameContentWidth } from '../../theme/components/frame';
import { quote as quoteTheme, quoteFit } from '../../theme/components/quote';
import { split } from '../../theme/components/split';
import { statement, statementFit } from '../../theme/components/statement';
import { scalePx } from '../../theme/scale';
import { slideSplitDividers, slideSplitRatios } from '../../theme/variants';
import { narrowing, sizeForLoad } from '../size';
import { renderedStep } from '../size.fixtures';

import { paneWidths } from './pane_width';

const middle = {
  gap: 0,
  rule: scalePx(split.ruleWidth),
  hairline: scalePx(split.hairlineWidth),
  arrow: scalePx(split.arrowWidth),
};

describe('paneWidths', () => {
  it.each(
    slideSplitRatios.flatMap((ratio) =>
      slideSplitDividers.map((divider) => [ratio, divider] as const)
    )
  )('fills the row for %s with a %s divider', (ratio, divider) => {
    const [left, right] = paneWidths(frameContentWidth, ratio, divider);
    expect(
      left + right + 2 * scalePx(split.dividerGap[divider]) + middle[divider]
    ).toBeCloseTo(frameContentWidth);
  });

  it('gives an aside its fixed width', () => {
    expect(paneWidths(frameContentWidth, 'aside', 'gap')[1]).toBe(
      scalePx(split.ratio.aside.right)
    );
  });

  it('sizes a statement in a pane against the pane, not the frame', () => {
    const text = 'x'.repeat(statementFit.l);
    const [pane] = paneWidths(frameContentWidth, 'even', 'gap');
    const node = {
      type: 'slideSplit',
      panes: [
        { items: [{ type: 'slideStatement', text }] },
        { items: [{ type: 'slideBulletList', items: ['One'] }] },
      ],
    };
    const step = sizeForLoad(
      undefined,
      text.length * narrowing(scalePx(statement.maxWidth), pane),
      statementFit
    );
    expect(step).not.toBe('l');
    expect(renderedStep('statement-textSize', node)).toBe(step);
    expect(
      renderedStep('statement-textSize', { type: 'slideStatement', text })
    ).toBe('l');
  });

  it('sizes a quote in a pane against the pane, not the frame', () => {
    const quote = {
      type: 'slideQuote',
      text: 'x'.repeat(quoteFit.l),
      source: 'A',
    };
    const [pane] = paneWidths(frameContentWidth, 'even', 'gap');
    const step = sizeForLoad(
      undefined,
      quoteFit.l * narrowing(scalePx(quoteTheme.maxWidth), pane),
      quoteFit
    );
    expect(step).not.toBe('l');
    expect(
      renderedStep('quote-textSize', {
        type: 'slideSplit',
        panes: [
          { items: [quote] },
          { items: [{ type: 'slideBulletList', items: ['One'] }] },
        ],
      })
    ).toBe(step);
  });
});
