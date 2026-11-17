/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Composition, definePrimitivePack } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { defineView } from '../registry';

import { createIsomerRuntime } from './index';
import {
  boldPrimitive,
  drawingRuntime,
  notePrimitive,
  packOf,
  view,
} from './runtime.fixtures';

describe('the input budget', () => {
  const deep = (): unknown => {
    let value: unknown = [];
    for (let level = 0; level < 100_000; level += 1) {
      value = [value];
    }
    return value;
  };
  const composition = {
    type: 'view',
    body: [{ type: 'note', text: deep() }],
  } as unknown as Composition;
  const overBudget = {
    path: '',
    message: 'input nests deeper than 64 levels',
    code: 'INPUT_OVER_BUDGET',
  };
  const refused = {
    name: 'CompositionValidationError',
    code: 'COMPOSITION_INVALID',
    errors: [overBudget],
  };

  it('refuses over-budget input at parse, validate, and every validating surface', () => {
    const runtime = drawingRuntime(notePrimitive);
    const { html, text, markdown, slack, snapshot } = runtime.surfaces;
    expect(runtime.parse(composition)).toEqual({
      valid: false,
      errors: [overBudget],
    });
    expect(runtime.validate(composition).errors).toEqual([overBudget]);
    for (const render of [
      () => html.render(composition),
      () => text.render(composition, { onValidationError: 'collect' }),
      () => markdown.render(composition, { onValidationError: 'collect' }),
      () => slack.render(composition, { onValidationError: 'collect' }),
      () => snapshot.render(composition, { onValidationError: 'collect' }),
    ]) {
      expect(render).toThrow(expect.objectContaining(refused));
    }
  });

  it('refuses over-budget input at every validating surface’s renderNode', () => {
    const { html, text, markdown, slack, snapshot } =
      drawingRuntime(notePrimitive).surfaces;
    const [node] = composition.body;
    if (node === undefined) {
      throw new Error('expected a node');
    }
    for (const render of [
      () => html.renderNode(node),
      () => text.renderNode(node, { onValidationError: 'collect' }),
      () => markdown.renderNode(node, { onValidationError: 'collect' }),
      () => slack.renderNode(node, { onValidationError: 'collect' }),
      () => snapshot.renderNode(node, { onValidationError: 'collect' }),
    ]) {
      expect(render).toThrow(expect.objectContaining(refused));
    }
  });

  it('refuses over-budget view input before the view runs', async () => {
    let built = false;
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      views: [
        defineView({
          id: 'test.any',
          title: 'Any',
          answers: [],
          build: () => {
            built = true;
            return view('x');
          },
        }),
      ],
    });
    await expect(
      runtime.viewRegistry.request('test.any', undefined, { deep: deep() })
    ).rejects.toMatchObject({
      name: 'RegisteredViewInputError',
      code: 'VIEW_INPUT_INVALID',
      errors: [overBudget],
    });
    expect(built).toBe(false);
  });

  it('hands a view the checked copy of its input', async () => {
    let received: unknown;
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      views: [
        defineView({
          id: 'test.copy',
          title: 'Copy',
          answers: [],
          build: ({ input }) => {
            received = input;
            return view('x');
          },
        }),
      ],
    });
    const input = { list: Object.assign([1], { extra: 2 }) };
    await runtime.viewRegistry.request('test.copy', undefined, input);
    expect(received).toEqual({ list: [1] });
    expect(received).not.toBe(input);
  });

  it('grows with the packs registered, and a host limit replaces only its own', () => {
    const roomy = definePrimitivePack({
      id: 'roomy',
      primitives: [notePrimitive],
      inputBudget: { characters: 2_000_000 },
    });
    const long = view('x'.repeat(1_500_000));
    expect(
      createIsomerRuntime({ packs: [packOf(notePrimitive)] }).parse(long)
        .errors[0]?.code
    ).toBe('INPUT_OVER_BUDGET');
    expect(createIsomerRuntime({ packs: [roomy] }).parse(long).errors).toEqual(
      []
    );
    expect(
      createIsomerRuntime({
        packs: [roomy],
        inputBudget: { values: 50 },
      }).parse(long).errors
    ).toEqual([]);
    expect(
      createIsomerRuntime({
        packs: [roomy],
        inputBudget: { characters: 1_000 },
      }).parse(long).errors[0]?.code
    ).toBe('INPUT_OVER_BUDGET');
  });

  it('takes, per limit, the largest any pack declares, in either order, never below the default', () => {
    const roomy = definePrimitivePack({
      id: 'roomy',
      primitives: [boldPrimitive],
      inputBudget: { characters: 2_000_000, values: 1 },
    });
    const tight = definePrimitivePack({
      id: 'tight',
      primitives: [notePrimitive],
      inputBudget: { characters: 1_000 },
    });
    const long = view('x'.repeat(1_500_000));
    const tooLong = view('x'.repeat(2_000_001));
    for (const packs of [
      [roomy, tight],
      [tight, roomy],
    ]) {
      const runtime = createIsomerRuntime({ packs });
      expect(runtime.parse(long).errors).toEqual([]);
      expect(runtime.parse(tooLong).errors[0]?.code).toBe('INPUT_OVER_BUDGET');
    }
    // `roomy`'s one value and `tight`'s 1,000 characters are below the defaults.
    const small = view('x'.repeat(5_000));
    expect(createIsomerRuntime({ packs: [tight] }).parse(small).errors).toEqual(
      []
    );
    expect(
      createIsomerRuntime({ packs: [roomy, tight] }).parse(view('a')).errors
    ).toEqual([]);
  });

  it('takes the host’s limits', () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      inputBudget: { characters: 3 },
    });
    expect(runtime.parse(view('four')).errors).toEqual([
      { ...overBudget, message: 'input holds more than 3 characters' },
    ]);
  });
});
