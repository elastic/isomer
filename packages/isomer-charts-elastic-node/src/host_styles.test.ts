/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRequire } from 'node:module';

import { EuiThemeBorealis } from '@elastic/eui-theme-borealis';
import { describe, expect, it } from 'vitest';

import { EUI_BODY_FONT, EUI_RESET, euiHostStyles } from './host_styles';

const require = createRequire(import.meta.url);

const collapse = (css: string) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/ ?([{};,]) ?/g, '$1')
    .trim();

interface Font {
  family: string;
  scale: Record<string, number>;
  weight: Record<string, number>;
  body: { scale: string; weight: string };
}

describe('host styles', () => {
  it('carry EUI’s reset', () => {
    const { resetStyles } =
      require('@elastic/eui/lib/global_styling/reset/reset') as {
        resetStyles: string;
      };
    expect(EUI_RESET).toBe(collapse(resetStyles));
  });

  it('carry EUI Borealis’ body font as EUI’s global styles compute it', () => {
    const { base } = EuiThemeBorealis.root as unknown as { base: number };
    const font = EuiThemeBorealis.root.font as unknown as Font;
    const scale = font.scale[font.body.scale]!;
    expect(EUI_BODY_FONT).toEqual({
      family: font.family,
      size: scale * base,
      lineHeight: base / (scale * base),
      weight: font.weight[font.body.weight],
    });
  });

  it('scope every rule under the chart without adding specificity', () => {
    const styles = euiHostStyles();
    const rules = styles.match(/[^{}]+\{[^{}]*\}/g) ?? [];
    expect(rules.length).toBeGreaterThan(1);
    for (const rule of rules) {
      for (const selector of rule.slice(0, rule.indexOf('{')).split(',')) {
        expect(selector.startsWith(':where(.echChart)')).toBe(true);
      }
    }
  });
});
