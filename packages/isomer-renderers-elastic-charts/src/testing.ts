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
// Explicit shape references preserve field JSDoc through schema inference.
const viewportShape = {
  /** Full captured viewport width in CSS pixels. */
  width: z.int().positive().max(8000),
  /** Full captured viewport height in CSS pixels. */
  height: z.int().positive().max(8000),
  /** Physical pixels per CSS pixel, greater than zero and at most four. */
  deviceScaleFactor: z.number().positive().max(4),
};
const viewport: z.ZodObject<typeof viewportShape, z.core.$strict> =
  z.strictObject(viewportShape);
const contextShape = {
  /** Lowercase SHA-256 of matched sanitized output data. */
  dataSha256: hash,
  /** Lowercase SHA-256 of matched query/execution context. */
  executionContextSha256: hash,
  /** Lowercase SHA-256 of resolved host theme settings. */
  themeSha256: hash,
  /** Lowercase SHA-256 of the matched font environment. */
  fontsSha256: hash,
  /** CSS viewport and DPR; no cropped-region comparison is supported. */
  viewport,
  /** Matched locale identifier. */
  locale: text,
  /** Matched timezone identifier. */
  timeZone: text,
  /** Matched browser/version identifier, not merely an engine family. */
  browser: text,
};
const context: z.ZodObject<typeof contextShape, z.core.$strict> =
  z.strictObject(contextShape);

const provenanceShape = {
  /** Reference must be declared as Lens output, not a standalone engine probe. */
  source: z.literal('lens'),
  /** Full 40-character Kibana source commit. */
  kibanaRevision: z.string().regex(/^[a-f\d]{40}$/),
  /** Engine version used by the reference host. */
  elasticChartsVersion: text,
  /** Lowercase SHA-256 of the sanitized saved object. */
  savedObjectSha256: hash,
  /** ISO capture timestamp. */
  capturedAt: z.iso.datetime(),
  /** Capture owner identifier, supplied with authorization to share. */
  capturedBy: text,
  /** Explicit owner attestation, not a permission check. */
  authorization: z.literal('approved-sanitized-reference'),
  /** Account of removed sensitive information and retained comparison semantics. */
  sanitization: text,
};
const provenance: z.ZodObject<typeof provenanceShape, z.core.$strict> =
  z.strictObject(provenanceShape);
const referenceShape = {
  /** Physical width, required to equal viewport width times DPR. */
  width: z.int().positive().max(32000),
  /** Physical height, required to equal viewport height times DPR. */
  height: z.int().positive().max(32000),
  /** Lowercase SHA-256 over decoded RGBA bytes, not the encoded image file. */
  rgbaSha256: hash,
};
const reference: z.ZodObject<typeof referenceShape, z.core.$strict> =
  z.strictObject(referenceShape);
const expectationsShape = {
  /** Required observed-text substrings; whitespace is normalized before matching. */
  visibleText: z.array(text).min(1).max(500),
  /** Forbidden observed-text substrings, with the same whitespace normalization. */
  absentText: z.array(text).max(500),
  /** Maximum changed physical-pixel fraction, inclusive, in the range 0-0.1. */
  maxChangedPixelRatio: z.number().min(0).max(0.1),
  /** Per-channel absolute difference allowed, inclusive, in the range 0-32. */
  channelTolerance: z.int().min(0).max(32),
  /** Owner's justification for semantic expectations and pixel thresholds. */
  rationale: text,
};
const expectations: z.ZodObject<typeof expectationsShape, z.core.$strict> =
  z.strictObject(expectationsShape);
const captureMetadataShape = {
  /** Owner-supplied capture provenance; claims are not independently verified. */
  provenance,
  /** Exact fingerprints and environment required of the candidate. */
  context,
  /** Reference raster metadata; dimensions are physical pixels, not CSS pixels. */
  reference,
  /** Independent semantic expectations and explicit acceptable pixel variance. */
  expectations,
};
const captureShape: typeof captureMetadataShape & {
  /** Fixture format version, currently 1. */
  version: z.ZodLiteral<1>;
  /** Validated portable model independently matched to the Lens capture. */
  node: typeof metricTrendSchema;
} = {
  version: z.literal(1),
  node: metricTrendSchema,
  ...captureMetadataShape,
};

/**
 * Node-only schema for a matched sanitized Lens capture and independent gates.
 * Requires an owner's authorization/provenance declaration; validating that
 * declaration does not independently establish authorization or capture origin.
 * A fixture alone is not evidence that real Lens parity has been measured.
 */
export const metricCaptureSchema: z.ZodObject<
  typeof captureShape,
  z.core.$strict
> = z.strictObject(captureShape);
/**
 * Validated fixture shape inferred from metricCaptureSchema.
 * `provenance` records the owner's authorization/sanitization claims, not verified
 * permissions. `context` pins data, execution, theme and font SHA-256 fingerprints
 * plus viewport, DPR, locale, timezone and browser. `reference` describes decoded
 * RGBA bytes; expectations must be established independently of the candidate.
 */
export type MetricCaptureFixture = z.infer<typeof metricCaptureSchema>;
/** Decoded full-viewport raster, without resizing, cropping or masking. */
export interface MetricCapturePixels {
  /** Physical pixel width, equal to fixture CSS viewport width times DPR. */
  width: number;
  /** Physical pixel height, equal to fixture CSS viewport height times DPR. */
  height: number;
  /** Row-major, top-to-bottom RGBA bytes; exactly width * height * 4 entries. */
  rgba: Uint8Array;
}
/** Observed candidate output and its declared matching model/environment. */
export interface MetricCaptureCandidate {
  /** Exact portable model used to render; must match the validated fixture. */
  node: MetricCaptureFixture['node'];
  /** Exact environment/fingerprints; mismatch rejects before pixel comparison. */
  context: MetricCaptureFixture['context'];
  /** Decoded candidate viewport raster in the same RGBA representation as reference. */
  pixels: MetricCapturePixels;
  /** Independently observed rendered text, not text generated from the model. */
  visibleText: string;
}
/** Fail-closed gate outcome; no pixel ratio is reported until prerequisites pass. */
export type MetricCaptureResult =
  | {
      /** Model/environment, reference integrity, semantic and pixel gates all passed. */
      status: 'passed';
      /** Changed physical-pixel fraction, within the fixture's inclusive threshold. */
      changedPixelRatio: number;
    }
  | {
      /** Invalid fixture or one or more failed comparison gates. */
      status: 'failed';
      /** Human-readable diagnostics, including schema paths for invalid fixtures. */
      reasons: string[];
      /** Present only when prerequisites passed and pixel variance exceeded the limit. */
      changedPixelRatio?: number;
    };

/**
 * Compare matched full-viewport output without crop, resize or font masking.
 * Returns failed diagnostics for schema, model/context, digest, dimension or
 * text mismatches, without attempting a pixel ratio. Only after those gates pass
 * is a pixel counted changed when any RGBA channel exceeds channelTolerance;
 * equality with either tolerance/ratio threshold passes.
 * @param input - Untrusted fixture, validated here; provenance remains an attestation.
 * @param reference - Independently captured decoded pixels matching the fixture hash.
 * @param candidate - Observed raster/text and declared model/environment, not
 * semantic expectations generated by the renderer under test.
 * @returns Passed with changedPixelRatio, or failed with reasons and a ratio
 * only if pixel comparison was reached. Does not execute a browser or Lens query.
 */
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
