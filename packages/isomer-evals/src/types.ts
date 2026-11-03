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
  PrimitiveNode,
  ValidationError,
} from '@elastic/isomer-sdk';
import type {
  AuthoringProfileId,
  AuthoringViewSummary,
} from '@elastic/isomer-sdk/author';

/**
 * One prompt to author a view from, and optionally the answer it should reach.
 *
 * `golden` is what primitive-selection scoring compares against, and
 * `expected` what the expected-primitive hit reads; a case without either
 * still scores validity, payload, and answerability.
 */
export interface EvalCase {
  /** Stable identifier, used to address a single case and to key recordings. */
  id: string;
  /** What the model is asked for, in the words a host would use. */
  prompt: string;
  /** The composition a good answer resembles. */
  golden?: Composition | undefined;
  /** Node types a good answer uses somewhere in its tree; any one of them counts as a hit. */
  expected?: readonly string[] | undefined;
}

/** A frame's body rule, applied to a composition that validated; an SDK `Frame` fits. */
export interface EvalFrame {
  validateBody?(body: readonly PrimitiveNode[]): readonly string[];
}

/** Whether an answer used one of its case's `expected` types, and every known type it did use. */
export interface ExpectedPrimitivesScore {
  hit: boolean;
  used: readonly string[];
}

/** One attempt at a case. `attempt` is 0 for the first try, 1 for the retry after validation errors. */
export interface GenerateRequest {
  evalCase: EvalCase;
  /** Shared authoring instructions; send with `evalCase.prompt` and any `previousErrors`. */
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

/** What `judge` is asked about: the case and the `text` rendering of what the model produced. */
export interface JudgeRequest {
  evalCase: EvalCase;
  /** The generated composition rendered through the `text` surface. */
  rendered: string;
}

/** The caller's judge call. Optional: omit it and answerability is skipped. */
export type Judge = (request: JudgeRequest) => Promise<AnswerabilityVerdict>;

/** The validity axis for one case: did the output parse, validate, and validate after a retry. */
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
  /** The first attempt's failures: its parse error, or its validation errors; empty when it validated. */
  errors: readonly string[];
  /** The composition from the attempt that validated: the first attempt's when it did, otherwise the retry's. Absent when neither did. */
  composition?: Composition | undefined;
}

/** Multiset precision, recall, and F1 of every node type in the generated body's tree against the golden's. */
export interface PrimitiveSelectionScore {
  precision: number;
  recall: number;
  f1: number;
  /** Types the model used that the golden does not, as a multiset difference. */
  extra: readonly string[];
  /** Types the golden uses that the model did not reach for. */
  missing: readonly string[];
}

/** How much of the first attempt survived parsing, and whether it reached past the catalog. */
export interface PayloadScore {
  /** UTF-8 bytes of the model output as sent, before any code fence is stripped. */
  rawBytes: number;
  /** Bytes of the copy `validate` checked; `0` when the first attempt did not validate. */
  sanitizedBytes: number;
  /** Sanitized size relative to the golden's; absent without a golden. */
  sizeVsGolden?: number | undefined;
  /** Node types the model invented. */
  unknownTypes: readonly string[];
}

/** The judge's verdict on the `text` rendering. */
export interface AnswerabilityScore {
  verdict: AnswerabilityVerdict;
}

/** Every score for one attempt at one case. */
export interface EvalCaseResult {
  caseId: string;
  validity: ValidityScore;
  /** Absent without a golden, or without a validated composition. */
  selection?: PrimitiveSelectionScore | undefined;
  payload: PayloadScore;
  /** Absent without `expected`; a miss when no attempt validated. */
  expected?: ExpectedPrimitivesScore | undefined;
  /** Absent without a judge, or without a validated composition. */
  answerability?: AnswerabilityScore | undefined;
}

/** What {@link RunEvalsOptions} produces: every case's scores and the counts {@link formatReport} prints. */
export interface EvalReport {
  results: readonly EvalCaseResult[];
  totals: {
    cases: number;
    /** Cases whose first attempt parsed as JSON. */
    parsed: number;
    /** Cases whose first attempt validated. */
    valid: number;
    /** Cases that validated on the first attempt or the retry; never below `valid`. */
    validAfterRetry: number;
    /** Mean F1 across validated cases that had a golden. */
    meanSelectionF1?: number | undefined;
    /** Cases whose validated composition used an expected type, over {@link expectedCases}. */
    expectedHits: number;
    /** Cases with `expected`. */
    expectedCases: number;
    /** Count by verdict, when a judge was supplied. */
    answerability?: Record<AnswerabilityVerdict, number> | undefined;
  };
}

/** Options for `runEvals`. */
export interface RunEvalsOptions {
  /** The pack's assembled runtime. Supplies the authoring context, validation, and text rendering. */
  runtime: EvalRuntime;
  /** The cases to score, each run once, plus one retry when allowed. */
  corpus: readonly EvalCase[];
  /** The model call; see {@link Generate}. */
  generate: Generate;
  /** The answerability judge; omitted, that axis is skipped. */
  judge?: Judge | undefined;
  /** Authoring profile the prompt is built for. Defaults to `'general'`. */
  profile?: AuthoringProfileId | undefined;
  /** Hand a failed attempt its own validation errors and try once more. Defaults to true. */
  retryOnInvalid?: boolean | undefined;
  /** Prose the authoring prompt opens with. Defaults to a short generic guide. */
  guide?: string | undefined;
  /** Rules section of the authoring prompt. */
  rules?: string | undefined;
  /** Applied to each attempt that validates, so an answer the host's frame would refuse scores invalid. */
  frame?: EvalFrame | undefined;
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
  /** `composition` is the schema's output, present only when `valid`. */
  parse(value: unknown): {
    valid: boolean;
    errors: ValidationError[];
    composition?: Composition | undefined;
  };
  /** `composition` is the copy the result describes, and `undefined` only when the input budget refused it. */
  validate(composition: Composition): {
    valid: boolean;
    errors: ValidationError[];
    composition: Composition | undefined;
  };
  surfaces: {
    text: { render(composition: Composition): string };
  };
}
