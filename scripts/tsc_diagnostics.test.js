/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { splitDiagnostics } from './tsc_diagnostics.js';

const ELASTIC_CHARTS =
  "../../../../repo/node_modules/.pnpm/@elastic+charts@73.3.2_react@18.3.1/node_modules/@elastic/charts/dist/utils/themes/theme.d.ts(96,69): error TS2344: Type 'GeometryStateStyle' does not satisfy the constraint 'CSSProperties'.";
const PACKED_ISOMER =
  "../../extract/isomer-primitives-charts/package/lib/cjs/scene/types.d.ts(12,3): error TS2304: Cannot find name 'Missing'.";
const LINKED_ISOMER =
  "node_modules/@elastic/isomer-sdk/lib/cjs/entries/index.d.ts(1,1): error TS2307: Cannot find module './gone'.";
const CONSUMER =
  "index.ts(3,1): error TS2307: Cannot find module '@elastic/isomer-runtime/missing'.";

describe('splitDiagnostics', () => {
  it("keeps a third-party package's own declaration errors apart", () => {
    expect(splitDiagnostics(`${ELASTIC_CHARTS}\n`)).toEqual({
      own: [],
      thirdParty: [ELASTIC_CHARTS],
    });
  });

  it('counts packed and linked Isomer declarations and the consumer as ours', () => {
    expect(
      splitDiagnostics(
        [ELASTIC_CHARTS, PACKED_ISOMER, LINKED_ISOMER, CONSUMER, ''].join('\n')
      )
    ).toEqual({
      own: [PACKED_ISOMER, LINKED_ISOMER, CONSUMER],
      thirdParty: [ELASTIC_CHARTS],
    });
  });

  it('carries indented continuation lines with their diagnostic', () => {
    const continuation = "  Type 'string' is not assignable to type 'number'.";
    expect(splitDiagnostics(`${PACKED_ISOMER}\n${continuation}\n`).own).toEqual(
      [`${PACKED_ISOMER}\n${continuation}`]
    );
  });
});
