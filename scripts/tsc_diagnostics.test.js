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
  it('allows the known Elastic Charts constraint error', () => {
    expect(splitDiagnostics(`${ELASTIC_CHARTS}\n`)).toEqual({
      errors: [],
      known: [ELASTIC_CHARTS],
    });
  });

  it('matches the known error in CRLF output and returns it without `\r`', () => {
    expect(
      splitDiagnostics(`${ELASTIC_CHARTS}\r\n${PACKED_ISOMER}\r\n`)
    ).toEqual({ errors: [PACKED_ISOMER], known: [ELASTIC_CHARTS] });
  });

  it('rejects errors in packed and linked Isomer declarations and the consumer', () => {
    expect(
      splitDiagnostics(
        [ELASTIC_CHARTS, PACKED_ISOMER, LINKED_ISOMER, CONSUMER, ''].join('\n')
      )
    ).toEqual({
      errors: [PACKED_ISOMER, LINKED_ISOMER, CONSUMER],
      known: [ELASTIC_CHARTS],
    });
  });

  it('carries indented continuation lines with their diagnostic', () => {
    const continuation = "  Type 'string' is not assignable to type 'number'.";
    expect(
      splitDiagnostics(`${PACKED_ISOMER}\n${continuation}\n`).errors
    ).toEqual([`${PACKED_ISOMER}\n${continuation}`]);
  });

  it.each([
    "node_modules/zod/index.d.ts(1,1): error TS2307: Cannot find module './gone'.",
    "node_modules/@types/react/index.d.ts(1,1): error TS2344: Type 'New' does not satisfy the constraint 'Other'.",
    "error TS6053: File '/tmp/node_modules/x/index.d.ts' not found.",
    ELASTIC_CHARTS.replace('TS2344', 'TS2307'),
    ELASTIC_CHARTS.replace('theme.d.ts', 'other.d.ts'),
    ELASTIC_CHARTS.replace('GeometryStateStyle', 'NewStyle'),
  ])('rejects a diagnostic outside the known exception: %s', (diagnostic) => {
    expect(splitDiagnostics(diagnostic)).toEqual({
      errors: [diagnostic],
      known: [],
    });
  });
});
