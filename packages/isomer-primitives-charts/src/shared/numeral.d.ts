/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// `@elastic/numeral` ships no declarations; this covers what the pack calls.
declare module '@elastic/numeral' {
  interface Numeral {
    format(pattern: string): string;
  }
  interface NumeralStatic {
    (value: number): Numeral;
    language(): string;
    language(key: string): NumeralStatic;
  }
  const numeral: NumeralStatic;
  export default numeral;
}
