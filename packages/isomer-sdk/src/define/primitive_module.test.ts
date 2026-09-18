/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';

import type { PrimitivePack } from '../pack/primitive_pack';

import type { DefaultPackTypes, SurfaceMap } from './primitive_module';
import type { SlackBlock } from './slack_blocks';

interface WideTheme {
  text: string;
  background: string;
}

interface NarrowTheme {
  text: string;
}

const assertThemeBound = (wide: PrimitivePack<WideTheme>): void => {
  // @ts-expect-error a pack needing a richer palette must not fit a narrower slot
  const narrow: PrimitivePack<NarrowTheme> = wide;
  void narrow;
};

describe('PrimitivePack theme bound', () => {
  it('rejects a pack that needs a richer palette than the slot supplies', () => {
    expect(assertThemeBound).toEqual(expect.any(Function));
  });
});

describe('SurfaceMap slack payload', () => {
  it('defaults the slack payload type to Block Kit', () => {
    expectTypeOf<SurfaceMap['slack']['output']>().toEqualTypeOf<
      SlackBlock | readonly SlackBlock[]
    >();
  });

  it('binds a slack payload type when one is supplied', () => {
    interface DividerPack extends DefaultPackTypes {
      slackBlock: { type: 'divider' };
    }
    expectTypeOf<SurfaceMap<DividerPack>['slack']['output']>().toEqualTypeOf<
      { type: 'divider' } | readonly { type: 'divider' }[]
    >();
  });
});
