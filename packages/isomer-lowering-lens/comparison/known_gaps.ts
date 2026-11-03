/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FingerprintKind } from './fingerprint';

/** A difference Isomer does not close yet, keyed by feature and never by case. */
export interface KnownGap {
  kind: FingerprintKind;
  /** Matches a field path with array indices written as `[]`. */
  path: RegExp;
  /** Narrows the gap by the reference object holding the field, such as a tile. */
  when?: (holder: Record<string, unknown>, field: string) => boolean;
  reason: string;
  issue?: string;
}

export const KNOWN_GAPS: readonly KnownGap[] = [];
