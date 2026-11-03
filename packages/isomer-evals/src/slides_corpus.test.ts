/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  slideDeckFrame,
  slidesAuthoringGuide,
  slidesAuthoringRules,
  slidesPack,
} from '@elastic/isomer-primitives-slides';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { checkComposition } from '@elastic/isomer-sdk/author';
import { describe, expect, it } from 'vitest';

import { formatReport } from './report';
import { runEvals } from './run';
import type { AnswerabilityVerdict, EvalCase, EvalReport } from './types';

/**
 * Replays a recorded slides corpus through `runEvals` and compares the report
 * with the committed baseline. `pnpm exec vitest run packages/isomer-evals -u`
 * rewrites the baseline; see the package docs' "Recorded slides corpus".
 */

const dir = fileURLToPath(new URL('../corpus/slides/', import.meta.url));
const read = (name: string) => readFileSync(`${dir}${name}`, 'utf8');

interface CorpusFile {
  provenance: Record<string, string>;
  cases: EvalCase[];
}
interface JudgmentsFile {
  provenance: Record<string, string>;
  verdicts: Record<string, { verdict: AnswerabilityVerdict; rendered: string }>;
}

const { cases } = JSON.parse(read('corpus.json')) as CorpusFile;
const { verdicts } = JSON.parse(read('judgments.json')) as JudgmentsFile;

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const sha256 = (text: string) =>
  createHash('sha256').update(text).digest('hex');

const round = (value: number | undefined) =>
  value === undefined ? undefined : Math.round(value * 1000) / 1000;

/** The per-case and total numbers a reviewer should see move. */
const summarize = (report: EvalReport) => ({
  totals: {
    ...report.totals,
    meanSelectionF1: round(report.totals.meanSelectionF1),
  },
  cases: report.results.map(
    ({ caseId, validity, selection, expected, payload, answerability }) => ({
      id: caseId,
      valid: validity.valid,
      validAfterRetry: validity.validAfterRetry,
      firstAttemptErrors: validity.errors,
      selection: selection && {
        precision: round(selection.precision),
        recall: round(selection.recall),
        f1: round(selection.f1),
        extra: selection.extra,
        missing: selection.missing,
      },
      expected,
      unknownTypes: payload.unknownTypes,
      sizeVsGolden: round(payload.sizeVsGolden),
      answerability: answerability?.verdict,
    })
  ),
});

describe('recorded slides corpus', () => {
  it.each(
    cases.flatMap(({ id, golden }) =>
      golden === undefined ? [] : [[id, golden] as const]
    )
  )(
    'has a golden for %s that passes the check it scores answers by',
    (_id, golden) => {
      expect(checkComposition(runtime, golden, slideDeckFrame).errors).toEqual(
        []
      );
    }
  );

  it('replays through runEvals to the committed baseline', async () => {
    const prompts = new Set<string>();
    const missingRecordings: string[] = [];
    const staleJudgments: string[] = [];

    const report = await runEvals({
      runtime,
      corpus: cases,
      profile: 'compose-from-primitives',
      guide: slidesAuthoringGuide,
      rules: slidesAuthoringRules.map((rule) => `- ${rule}`).join('\n'),
      frame: slideDeckFrame,
      generate: ({ evalCase, prompt, attempt }) => {
        prompts.add(prompt);
        const name = `answers/${evalCase.id}.${attempt}.txt`;
        if (!existsSync(`${dir}${name}`)) {
          missingRecordings.push(name);
          return Promise.resolve('');
        }
        return Promise.resolve(read(name));
      },
      judge: ({ evalCase, rendered }) => {
        const recorded = verdicts[evalCase.id];
        if (recorded?.rendered !== rendered) {
          staleJudgments.push(evalCase.id);
        }
        return Promise.resolve(recorded?.verdict ?? 'no');
      },
    });

    expect(prompts.size).toBe(1);
    const [prompt = ''] = prompts;
    await expect(prompt).toMatchFileSnapshot('../corpus/slides/prompt.txt');

    const baseline = {
      promptSha256: sha256(prompt),
      missingRecordings,
      staleJudgments,
      ...summarize(report),
    };
    await expect(`${JSON.stringify(baseline, null, 2)}\n`).toMatchFileSnapshot(
      '../corpus/slides/baseline.json'
    );
    await expect(`${formatReport(report)}\n`).toMatchFileSnapshot(
      '../corpus/slides/baseline.txt'
    );
  });
});
