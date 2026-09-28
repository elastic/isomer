/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import { stripMarks } from '../../render/marks';

import { example, examples, spansExample } from './examples';
import { markdown, text } from './index';
import { schema, type SlidePipelineNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [node],
});

const authored = ({
  start,
  end,
  steps,
  spans = [],
}: SlidePipelineNode): string[] =>
  [
    start,
    end,
    ...steps.flatMap(({ title, body }) => [title, body]),
    ...spans.flatMap(({ label, title, body }) => [label, title, body]),
  ].filter((value): value is string => value !== undefined);

const firstIssue = (value: unknown) => schema.safeParse(value).error?.issues[0];

describe('slidePipeline', () => {
  it('validates every example', () => {
    for (const node of examples) {
      expect(runtime.validate(compose(node)).errors).toEqual([]);
    }
  });

  it('rejects a span past the last step or running backwards', () => {
    const [span] = spansExample.spans ?? [];
    for (const bad of [
      { ...span, from: 3, to: 5 },
      { ...span, from: 2, to: 1 },
    ]) {
      expect(firstIssue({ ...spansExample, spans: [bad] })).toMatchObject({
        path: ['spans'],
        message: 'each span needs `from` ≤ `to` < the number of steps',
      });
    }
  });

  it('rejects overlapping spans in any order', () => {
    const [first, second] = spansExample.spans ?? [];
    expect(
      firstIssue({
        ...spansExample,
        spans: [second, { ...first, to: 3 }],
      })
    ).toMatchObject({ path: ['spans'], message: 'spans must not overlap' });
  });

  it('rejects start, end, and step bodies in spans mode', () => {
    expect(firstIssue({ ...spansExample, start: 'Cart' })).toMatchObject({
      path: ['spans'],
    });
    const [step, ...steps] = spansExample.steps;
    expect(
      firstIssue({
        ...spansExample,
        steps: [{ ...step, body: 'Hidden.' }, ...steps],
      })
    ).toMatchObject({ path: ['steps'] });
  });

  it('treats an empty spans list as steps mode', () => {
    const node = { ...example, spans: [] };
    expect(runtime.validate(compose(node)).errors).toEqual([]);
    expect(text(node)).toBe(text(example));
  });

  it('holds two to six steps and up to three spans', () => {
    const [step] = example.steps;
    expect(schema.safeParse({ ...example, steps: [step] }).success).toBe(false);
    expect(
      schema.safeParse({ ...example, steps: Array(7).fill(step) }).success
    ).toBe(false);
    const [span] = spansExample.spans ?? [];
    expect(
      schema.safeParse({ ...spansExample, spans: Array(4).fill(span) }).success
    ).toBe(false);
  });

  it('renders steps mode as a chain and a numbered list', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "Refund request → Verify → Score → Approve → Settle → Ledger entry
      1. Verify — Match the order, the amount, and the card on file. A mismatch goes to a person.
      2. Score — The fraud model scores the request against the customer’s last ninety days.
      3. Approve — Scores under the threshold approve on their own; the rest wait for review.
      4. Settle — The processor returns the funds and posts one line to the ledger."
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "Refund request → Verify → Score → Approve → Settle → Ledger entry

      1. **Verify** — Match the order, the amount, and the card on file. A mismatch goes to **a person**.
      2. **Score** — The fraud model scores the request against the customer’s last ninety days.
      3. **Approve** — Scores under the threshold approve on their own; the rest wait for review.
      4. **Settle** — The processor returns the funds and posts one line to the ledger."
    `);
  });

  it('renders spans mode as a chain and a line per span', () => {
    expect(text(spansExample)).toMatchInlineSnapshot(`
      "Basket → Checkout → Payment intent → Card network → Bank
      Our app (Basket → Payment intent): We own the basket to the intent — Every step here ships with the app and is covered by our own tests.
      Partners (Card network → Bank): Settlement is theirs — The network and the bank decide timing; we only see the result."
    `);
    expect(markdown(spansExample)).toMatchInlineSnapshot(`
      "Basket → Checkout → Payment intent → Card network → Bank

      - **Our app** (Basket → Payment intent): We own the basket to the intent — Every step here ships with the app and is covered by our own tests.
      - **Partners** (Card network → Bank): Settlement is theirs — The network and the bank decide timing; we only see the result."
    `);
  });

  it('keeps every authored string on every degraded surface', () => {
    for (const node of examples) {
      const composition = compose(node);
      const outputs = [
        runtime.surfaces.text.render(composition),
        runtime.surfaces.markdown.render(composition),
        JSON.stringify(runtime.surfaces.slack.render(composition).blocks),
      ].map((output) => output.replace(/[`*]/g, '').toLowerCase());
      for (const value of authored(node)) {
        for (const output of outputs) {
          expect(output).toContain(stripMarks(value).toLowerCase());
        }
      }
    }
  });
});
