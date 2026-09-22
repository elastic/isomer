/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAuthoringPrompt } from '@elastic/isomer-sdk/author';

import {
  scoreAnswerability,
  scorePayload,
  scorePrimitiveSelection,
  scoreValidity,
} from './score';
import {
  checkAttempt,
  type CheckedAttempt,
  parseGenerated,
} from './score/validity';
import type {
  AnswerabilityVerdict,
  EvalCase,
  EvalCaseResult,
  EvalReport,
  RunEvalsOptions,
} from './types';

const DEFAULT_GUIDE =
  'Answer the request with a single composition. Prefer one primitive that says the whole thing over several that each say part of it.';

const mean = (values: readonly number[]): number | undefined =>
  values.length === 0
    ? undefined
    : values.reduce((sum, n) => sum + n, 0) / values.length;

/** Runs `fn` over `items` with at most `limit` in flight at once. */
const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await fn(items[index]!);
      }
    }
  );
  await Promise.all(workers);
  return results;
};

/**
 * Scores a corpus against a pack's authoring context.
 *
 * Stateless by construction: the model call, the judge, the corpus, and the
 * goldens all arrive as arguments, and nothing is read from the environment or
 * written to disk. Pass a `generate` that replays recorded output and a run
 * becomes deterministic, which is what lets CI run this without credentials.
 *
 * Three of the four axes need no model at all — only answerability calls
 * `judge`, and omitting it skips that axis.
 */
export const runEvals = async ({
  runtime,
  corpus,
  generate,
  judge,
  profile = 'general',
  retryOnInvalid = true,
  guide = DEFAULT_GUIDE,
  rules,
  concurrency = 1,
}: RunEvalsOptions): Promise<EvalReport> => {
  const context = runtime.getAuthoringContext();
  const { primitives } = context;
  const knownTypes = new Set(primitives.map(({ type }) => type));

  // Spread rather than pass `undefined`: `AuthoringPromptContext` declares these
  // optional, and `exactOptionalPropertyTypes` treats absent and undefined as
  // different. Absent is what drops the section.
  const { views } = context;
  const prompt = buildAuthoringPrompt(profile, {
    guide,
    schema: context.schema,
    primitives,
    // No host examples: each catalog entry already shows its own shape.
    examples: [],
    ...(rules === undefined ? {} : { rules }),
    ...(views === undefined ? {} : { views }),
  });

  const runCase = async (evalCase: EvalCase): Promise<EvalCaseResult> => {
    const raw = await generate({ evalCase, prompt, attempt: 0 });
    const attempt = checkAttempt(runtime, parseGenerated(raw));

    let retryAttempt: CheckedAttempt | undefined;
    if (retryOnInvalid && !(attempt.parsed && attempt.check.valid)) {
      const retryRaw = await generate({
        evalCase,
        prompt,
        attempt: 1,
        previousErrors: attempt.parsed ? attempt.check.errors : [attempt.error],
      });
      retryAttempt = checkAttempt(runtime, parseGenerated(retryRaw));
    }

    const validity = scoreValidity(attempt, retryAttempt);
    const { composition } = validity;

    const payload = scorePayload(runtime, attempt, knownTypes, evalCase.golden);

    const selection =
      composition && evalCase.golden
        ? scorePrimitiveSelection(composition, evalCase.golden)
        : undefined;

    const answerability =
      judge && composition
        ? await scoreAnswerability(runtime, judge, evalCase, composition)
        : undefined;

    return {
      caseId: evalCase.id,
      validity,
      selection,
      payload,
      answerability,
    };
  };

  const results = await mapWithConcurrency(corpus, concurrency, runCase);

  const verdicts = results
    .map(({ answerability }) => answerability?.verdict)
    .filter(
      (verdict): verdict is AnswerabilityVerdict => verdict !== undefined
    );

  return {
    results,
    totals: {
      cases: results.length,
      parsed: results.filter(({ validity }) => validity.parsed).length,
      valid: results.filter(({ validity }) => validity.valid).length,
      validAfterRetry: results.filter(
        ({ validity }) => validity.validAfterRetry
      ).length,
      meanSelectionF1: mean(
        results
          .map(({ selection }) => selection?.f1)
          .filter((f1): f1 is number => f1 !== undefined)
      ),
      answerability:
        verdicts.length === 0
          ? undefined
          : {
              yes: verdicts.filter((v) => v === 'yes').length,
              partial: verdicts.filter((v) => v === 'partial').length,
              no: verdicts.filter((v) => v === 'no').length,
            },
    },
  };
};
