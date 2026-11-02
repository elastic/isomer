/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { metricTrendSchema } from '@elastic/isomer-primitives-charts/model';
import { z } from 'zod';

const hash = z.string().regex(/^[a-f\d]{64}$/);
const text = z.string().min(1).max(4000);
const viewport = z.strictObject({
  width: z.int().positive().max(8000),
  height: z.int().positive().max(8000),
  deviceScaleFactor: z.number().positive().max(4),
});
const context = z.strictObject({
  dataSha256: hash,
  executionContextSha256: hash,
  themeSha256: hash,
  fontsSha256: hash,
  viewport,
  locale: text,
  timeZone: text,
  browser: text,
});

/** A fixture is admitted only after an authorized owner supplies a sanitized real Lens capture. */
export const metricCaptureSchema = z.strictObject({
  version: z.literal(1),
  node: metricTrendSchema,
  provenance: z.strictObject({
    source: z.literal('lens'),
    kibanaRevision: z.string().regex(/^[a-f\d]{40}$/),
    elasticChartsVersion: text,
    savedObjectSha256: hash,
    capturedAt: z.iso.datetime(),
    capturedBy: text,
    authorization: z.literal('approved-sanitized-reference'),
    sanitization: text,
  }),
  context,
  reference: z.strictObject({
    width: z.int().positive().max(32000),
    height: z.int().positive().max(32000),
    rgbaSha256: hash,
  }),
  expectations: z.strictObject({
    visibleText: z.array(text).min(1).max(500),
    absentText: z.array(text).max(500),
    maxChangedPixelRatio: z.number().min(0).max(0.1),
    channelTolerance: z.int().min(0).max(32),
    rationale: text,
  }),
});
export type MetricCaptureFixture = z.infer<typeof metricCaptureSchema>;
export interface MetricCapturePixels {
  width: number;
  height: number;
  rgba: Uint8Array;
}
export interface MetricCaptureCandidate {
  node: MetricCaptureFixture['node'];
  context: MetricCaptureFixture['context'];
  pixels: MetricCapturePixels;
  visibleText: string;
}
export type MetricCaptureResult =
  | { status: 'passed'; changedPixelRatio: number }
  | { status: 'failed'; reasons: string[]; changedPixelRatio?: number };

/** No crop, resize, font masking or semantic expectations generated from the candidate. */
export function compareMetricCapture(
  input: unknown,
  reference: MetricCapturePixels,
  candidate: MetricCaptureCandidate
): MetricCaptureResult {
  const parsed = metricCaptureSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 'failed',
      reasons: parsed.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`
      ),
    };
  }
  const fixture = parsed.data;
  const reasons: string[] = [];
  if (!isDeepStrictEqual(fixture.node, candidate.node)) {
    reasons.push('Candidate model differs from the matched reference model');
  }
  if (!isDeepStrictEqual(fixture.context, candidate.context)) {
    reasons.push('Data, context, theme, fonts, browser or viewport mismatch');
  }
  if (
    createHash('sha256').update(reference.rgba).digest('hex') !==
    fixture.reference.rgbaSha256
  ) {
    reasons.push('Reference pixel digest mismatch');
  }
  const expectedWidth =
    fixture.context.viewport.width * fixture.context.viewport.deviceScaleFactor;
  const expectedHeight =
    fixture.context.viewport.height *
    fixture.context.viewport.deviceScaleFactor;
  if (
    fixture.reference.width !== expectedWidth ||
    fixture.reference.height !== expectedHeight
  ) {
    reasons.push('Reference dimensions differ from viewport and DPR');
  }
  for (const [name, image] of [
    ['reference', reference],
    ['candidate', candidate.pixels],
  ] as const) {
    if (
      image.width !== fixture.reference.width ||
      image.height !== fixture.reference.height ||
      image.rgba.length !== image.width * image.height * 4
    ) {
      reasons.push(`${name} pixel dimensions or RGBA length mismatch`);
    }
  }
  const normalized = candidate.visibleText.replace(/\s+/g, ' ');
  for (const expected of fixture.expectations.visibleText) {
    if (!normalized.includes(expected.replace(/\s+/g, ' '))) {
      reasons.push(`Missing semantic expectation: ${expected}`);
    }
  }
  for (const absent of fixture.expectations.absentText) {
    if (normalized.includes(absent.replace(/\s+/g, ' '))) {
      reasons.push(`Unexpected semantic text: ${absent}`);
    }
  }
  if (reasons.length) {
    return { status: 'failed', reasons };
  }
  let changed = 0;
  for (let i = 0; i < reference.rgba.length; i += 4) {
    if (
      [0, 1, 2, 3].some(
        (channel) =>
          Math.abs(
            reference.rgba[i + channel]! - candidate.pixels.rgba[i + channel]!
          ) > fixture.expectations.channelTolerance
      )
    ) {
      changed++;
    }
  }
  const changedPixelRatio = changed / (reference.width * reference.height);
  return changedPixelRatio > fixture.expectations.maxChangedPixelRatio
    ? {
        status: 'failed',
        reasons: [
          `Changed pixel ratio ${changedPixelRatio} exceeds ${fixture.expectations.maxChangedPixelRatio}`,
        ],
        changedPixelRatio,
      }
    : { status: 'passed', changedPixelRatio };
}
