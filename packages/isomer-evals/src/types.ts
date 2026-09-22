/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnyPrimitiveDefinition,
  Composition,
  PrimitiveCatalogEntry,
  ValidationError,
} from '@elastic/isomer-sdk';
import type {
  AuthoringProfileId,
  AuthoringViewSummary,
} from '@elastic/isomer-sdk/author';

/**
 * One prompt to author a view from, and optionally the answer it should reach.
 *
 * `golden` is what primitive-selection scoring compares against; a case without
 * one still scores validity, payload, and answerability.
 */
export interface EvalCase {
  /** Stable identifier, used to address a single case and to key recordings. */
  id: string;
  /** What the model is asked for, in the words a host would use. */
  prompt: string;
  /** The composition a good answer resembles. */
  golden?: Composition | undefined;
}

/** One attempt at a case. `attempt` is 0 for the first try, 1 for the retry after validation errors. */
export interface GenerateRequest {
  evalCase: EvalCase;
  /** The authoring prompt to send, already assembled from the runtime's context. */
  prompt: string;
  attempt: number;
  /** What the previous attempt got wrong, a parse failure or validation errors; present only when `attempt > 0`. */
  previousErrors?: readonly string[] | undefined;
}

/**
 * The caller's model call.
 *
 * This package never makes one: no SDK, no credentials, no environment reads.
 * Returning a recorded string instead of calling a model is what makes a run
 * replayable in CI.
 */
export type Generate = (request: GenerateRequest) => Promise<string>;

/** Whether the rendered text still answers the prompt. */
export type AnswerabilityVerdict = 'yes' | 'partial' | 'no';

export interface JudgeRequest {
  evalCase: EvalCase;
  /** The generated composition rendered through the `text` surface. */
  rendered: string;
}

/** The caller's judge call. Optional: omit it and answerability is skipped. */
export type Judge = (request: JudgeRequest) => Promise<AnswerabilityVerdict>;

export interface ValidityScore {
  /** Whether the raw output parsed as JSON at all. */
  parsed: boolean;
  /** Whether the composition validated on the first attempt. */
  valid: boolean;
  /**
   * Cumulative: `true` when `valid` already is, or when the retry (handed the
   * first attempt's own errors) validates. Not "the retry alone passed".
   */
  validAfterRetry: boolean;
  errors: readonly string[];
  /** The composition that validated, from whichever attempt reached one. */
  composition?: Composition | undefined;
}

export interface PrimitiveSelectionScore {
  precision: number;
  recall: number;
  f1: number;
  /** Types the model used that the golden does not, as a multiset difference. */
  extra: readonly string[];
  /** Types the golden uses that the model did not reach for. */
  missing: readonly string[];
}

export interface PayloadScore {
  /** UTF-8 bytes of the model output as sent, before any code fence is stripped. */
  rawBytes: number;
  /** Bytes after parsing, which drops unknown properties. */
  sanitizedBytes: number;
  /** Sanitized size relative to the golden's; absent without a golden. */
  sizeVsGolden?: number | undefined;
  /** Node types the model invented. */
  unknownTypes: readonly string[];
}

export interface AnswerabilityScore {
  verdict: AnswerabilityVerdict;
}

/** Every score for one attempt at one case. */
export interface EvalCaseResult {
  caseId: string;
  validity: ValidityScore;
  selection?: PrimitiveSelectionScore | undefined;
  payload: PayloadScore;
  answerability?: AnswerabilityScore | undefined;
}

export interface EvalReport {
  results: readonly EvalCaseResult[];
  totals: {
    cases: number;
    parsed: number;
    valid: number;
    validAfterRetry: number;
    /** Mean F1 across cases that had a golden. */
    meanSelectionF1?: number | undefined;
    /** Count by verdict, when a judge was supplied. */
    answerability?: Record<AnswerabilityVerdict, number> | undefined;
  };
}

export interface RunEvalsOptions {
  /** The pack's assembled runtime. Supplies the authoring context, validation, and text rendering. */
  runtime: EvalRuntime;
  corpus: readonly EvalCase[];
  generate: Generate;
  judge?: Judge | undefined;
  /** Authoring profile the prompt is built for. Defaults to `'general'`. */
  profile?: AuthoringProfileId | undefined;
  /** Hand a failed attempt its own validation errors and try once more. Defaults to true. */
  retryOnInvalid?: boolean | undefined;
  /** Prose the authoring prompt opens with. Defaults to a short generic guide. */
  guide?: string | undefined;
  /** Rules section of the authoring prompt. */
  rules?: string | undefined;
  /** Cases run at once. Defaults to 1 (sequential); `generate`/`judge` still decide their own rate limits. */
  concurrency?: number | undefined;
}

/**
 * The part of `IsomerRuntime` this harness uses, declared structurally so a
 * pack can pass anything that renders and validates, including a stub.
 */
export interface EvalRuntime {
  /** The flattened definitions, for walking a payload's node positions. */
  primitives: readonly AnyPrimitiveDefinition[];
  getAuthoringContext(): {
    schema: Record<string, unknown>;
    primitives: readonly PrimitiveCatalogEntry[];
    views?: readonly AuthoringViewSummary[] | undefined;
  };
  validate(composition: Composition): {
    valid: boolean;
    errors: ValidationError[];
  };
  parse(value: unknown): {
    valid: boolean;
    errors: ValidationError[];
    composition?: Composition | undefined;
  };
  surfaces: {
    text: { render(composition: Composition): string };
  };
}
