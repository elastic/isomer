/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Numbers format with `@elastic/numeral`, the library and the locales Kibana's
// number, percent and bytes field formats use, so a pattern means the same
// thing here as there.

import numeralModule from '@elastic/numeral';
import languagesModule from '@elastic/numeral/languages.js';

// Both are CommonJS. Read through a possible `default` so the import resolves
// whether a bundler hands over `module.exports` or a namespace wrapping it.
const interop = <T>(value: T): T => (value as { default?: T }).default ?? value;

const numeral = interop(numeralModule);
const numeralLanguages = interop(languagesModule);

for (const { id, lang } of numeralLanguages) {
  numeral.language(id, lang);
}

const instance = numeral();

const known = new Set(['en', ...numeralLanguages.map(({ id }) => id)]);

export interface NumeralOptions {
  pattern: string;
  /** A Numeral.js locale id. Absent, or one Numeral.js does not know, means `en`. */
  locale?: string | undefined;
  alwaysShowSign?: boolean | undefined;
}

/**
 * Formats a finite number with a Numeral.js pattern, as Kibana's numeral
 * formats do: in the given locale, with `alwaysShowSign` adding `+` only when
 * the value does not round to zero under the pattern.
 */
export const formatNumeral = (
  value: number,
  { pattern, locale, alwaysShowSign }: NumeralOptions
): string => {
  const previous = numeral.language() as unknown as string;
  numeral.language(locale !== undefined && known.has(locale) ? locale : 'en');
  try {
    let formatted = instance.set(value).format(pattern);
    if (alwaysShowSign && !pattern.startsWith('+')) {
      const zero = instance.set(0).format(pattern);
      if (formatted !== zero) {
        formatted = instance.set(value).format(`+ ${pattern}`);
      }
    }
    return formatted;
  } finally {
    numeral.language(previous);
  }
};
