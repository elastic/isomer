/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChartsTheme } from '@elastic/charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import { xyChartExamples } from '@elastic/isomer-primitives-charts/schema';
import { describe, expect, it } from 'vitest';

import { chromeTheme, KIBANA_THEME_NAME, kibanaBaseTheme } from './theme';

describe.each(['light', 'dark'] as const)('the %s axis', (scheme) => {
  const { chrome } = resolveChart(xyChartExamples[0]!.node, { scheme });
  const kibana = getChartsTheme({
    name: KIBANA_THEME_NAME,
    darkMode: scheme === 'dark',
  }).axes;
  const over = chromeTheme(chrome).axes;
  const base = kibanaBaseTheme(scheme).axes;

  it("draws its lines in Elastic Charts' Borealis color", () => {
    expect(over?.axisLine?.stroke).toBe(kibana.axisLine.stroke);
    expect(over?.tickLine?.stroke).toBe(kibana.tickLine.stroke);
  });

  it("leaves its text in Elastic Charts' Borealis tick label color", () => {
    expect(over?.tickLabel).toBeUndefined();
    expect(over?.axisTitle).toBeUndefined();
    expect(base.tickLabel.fill).toBe(kibana.tickLabel.fill);
    expect(base.axisTitle.fill).toBe(kibana.tickLabel.fill);
  });
});
