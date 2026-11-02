/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';

import { metricExamples } from '@elastic/isomer-primitives-charts';
import { describe, expect, it } from 'vitest';

import {
  compareMetricCapture,
  type MetricCaptureCandidate,
  type MetricCaptureFixture,
  type MetricCapturePixels,
} from './testing';

// Generated pixels exercise gate mechanics only; this is deliberately not a Lens reference.
const reference: MetricCapturePixels = {
  width: 10,
  height: 10,
  rgba: new Uint8Array(400).fill(255),
};
const context: MetricCaptureFixture['context'] = {
  dataSha256: 'a'.repeat(64),
  executionContextSha256: 'b'.repeat(64),
  themeSha256: 'c'.repeat(64),
  fontsSha256: 'd'.repeat(64),
  viewport: { width: 10, height: 10, deviceScaleFactor: 1 },
  locale: 'en-US',
  timeZone: 'UTC',
  browser: 'test-double',
};
const fixture = (): MetricCaptureFixture => ({
  version: 1,
  node: metricExamples[0]!,
  provenance: {
    source: 'lens',
    kibanaRevision: 'a'.repeat(40),
    elasticChartsVersion: '73.3.2',
    savedObjectSha256: 'e'.repeat(64),
    capturedAt: '2026-11-02T00:00:00Z',
    capturedBy: 'gate unit test only',
    authorization: 'approved-sanitized-reference',
    sanitization: 'No actual capture in this test',
  },
  context,
  reference: {
    width: 10,
    height: 10,
    rgbaSha256: createHash('sha256').update(reference.rgba).digest('hex'),
  },
  expectations: {
    visibleText: ['Requests', '+10', 'gap'],
    absentText: ['Infinity', 'NaN'],
    maxChangedPixelRatio: 0.01,
    channelTolerance: 2,
    rationale: 'Synthetic unit-test boundary, not a parity tolerance',
  },
});
const candidate = (): MetricCaptureCandidate => ({
  node: metricExamples[0]!,
  context: structuredClone(context),
  pixels: { ...reference, rgba: new Uint8Array(reference.rgba) },
  visibleText: 'Requests +10 gap',
});

describe('matched Lens capture gate mechanics (no real Lens fixture)', () => {
  it('passes identical pixels and required semantic expectations', () => {
    expect(compareMetricCapture(fixture(), reference, candidate())).toEqual({
      status: 'passed',
      changedPixelRatio: 0,
    });
  });
  it('accepts the exact changed-pixel boundary and rejects one additional pixel', () => {
    const actual = candidate();
    actual.pixels.rgba[0] = 0;
    expect(compareMetricCapture(fixture(), reference, actual)).toEqual({
      status: 'passed',
      changedPixelRatio: 0.01,
    });
    actual.pixels.rgba[4] = 0;
    expect(compareMetricCapture(fixture(), reference, actual)).toMatchObject({
      status: 'failed',
      changedPixelRatio: 0.02,
    });
  });
  it('counts changed pixels, not changed channels; honors exact channel tolerance', () => {
    const actual = candidate();
    actual.pixels.rgba.fill(253);
    expect(compareMetricCapture(fixture(), reference, actual).status).toBe(
      'passed'
    );
    actual.pixels.rgba.fill(252);
    expect(compareMetricCapture(fixture(), reference, actual)).toMatchObject({
      status: 'failed',
      changedPixelRatio: 1,
    });
  });
  it.each([
    'dataSha256',
    'executionContextSha256',
    'themeSha256',
    'fontsSha256',
    'browser',
    'locale',
    'timeZone',
  ] as const)('rejects mismatched %s before pixel comparison', (key) => {
    const actual = candidate();
    actual.context[key] = 'mismatch';
    expect(compareMetricCapture(fixture(), reference, actual)).toMatchObject({
      status: 'failed',
      reasons: [expect.stringContaining('mismatch')],
    });
  });
  it('refuses unrelated model, tampered reference, mismatched sizes and missing semantics independently', () => {
    const actual = candidate();
    actual.node = { ...actual.node, title: 'Unrelated synthetic data' };
    expect(compareMetricCapture(fixture(), reference, actual).status).toBe(
      'failed'
    );
    expect(
      compareMetricCapture(
        fixture(),
        { ...reference, rgba: new Uint8Array(400) },
        candidate()
      ).status
    ).toBe('failed');
    expect(
      compareMetricCapture(fixture(), reference, {
        ...candidate(),
        pixels: { ...reference, width: 9 },
      }).status
    ).toBe('failed');
    expect(
      compareMetricCapture(fixture(), reference, {
        ...candidate(),
        visibleText: 'Requests NaN',
      })
    ).toMatchObject({
      status: 'failed',
      reasons: [
        expect.stringContaining('+10'),
        expect.stringContaining('gap'),
        expect.stringContaining('NaN'),
      ],
    });
  });
  it('refuses absent provenance, synthetic source declarations and oversized tolerances', () => {
    expect(compareMetricCapture({}, reference, candidate()).status).toBe(
      'failed'
    );
    expect(
      compareMetricCapture(
        {
          ...fixture(),
          provenance: { ...fixture().provenance, source: 'synthetic' },
        },
        reference,
        candidate()
      ).status
    ).toBe('failed');
    expect(
      compareMetricCapture(
        {
          ...fixture(),
          expectations: { ...fixture().expectations, maxChangedPixelRatio: 1 },
        },
        reference,
        candidate()
      ).status
    ).toBe('failed');
  });
});
