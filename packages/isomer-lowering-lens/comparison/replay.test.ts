/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readCases } from './fixtures';
import { modelReadings, modelValue } from './model';
import { replay } from './replay';

const TEXT_FIELDS = [
  'title',
  'subtitle',
  'value',
  'secondary.label',
  'secondary.value',
];

const cases = readCases();

describe('captured cases', () => {
  it('are present', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases.map((comparison) => [comparison.id, comparison] as const))(
    '%s plans and binds from its captured data',
    (_, comparison) => {
      const result = replay(comparison);
      expect(result.status === 'refused' ? result.diagnostics : []).toEqual([]);
    }
  );

  // Kibana's text, read from its drawing, against the model Isomer resolves: an independent check of both the
  // binding and the extractor, which reads Isomer's drawing the same way it reads Kibana's.
  it.each(cases.map((comparison) => [comparison.id, comparison] as const))(
    '%s resolves the texts Kibana drew',
    (_, comparison) => {
      const result = replay(comparison);
      if (result.status !== 'bound') {
        throw new Error(`${comparison.id} did not bind.`);
      }
      const reference = comparison.reference.fingerprint;
      const readings = modelReadings(
        result.node,
        comparison.context.scheme,
        reference
      );
      const texts = (tile: Record<string, unknown>) =>
        Object.fromEntries(
          TEXT_FIELDS.map((field) => [field, tile[field] ?? undefined])
        );
      expect(readings.map(texts)).toEqual(
        reference.tiles.map(({ title, subtitle, value, secondary }) =>
          texts({
            title,
            subtitle,
            value,
            'secondary.label': secondary?.label,
            'secondary.value': secondary?.value,
          })
        )
      );
    }
  );

  it.each(cases.map((comparison) => [comparison.id, comparison] as const))(
    '%s resolves the colors Kibana painted',
    (_, comparison) => {
      const result = replay(comparison);
      if (result.status !== 'bound') {
        throw new Error(`${comparison.id} did not bind.`);
      }
      const reference = comparison.reference.fingerprint;
      const readings = modelReadings(
        result.node,
        comparison.context.scheme,
        reference
      );
      const pairs = reference.tiles.flatMap(({ elements }, index) =>
        Object.entries(elements).flatMap(([key, { style }]) =>
          Object.entries(style).flatMap(([property, painted]) => {
            const path = `tiles[${index}].elements.${key}.style.${property}`;
            const resolved = modelValue(readings, path);
            return resolved === undefined ? [] : [{ path, painted, resolved }];
          })
        )
      );
      expect(pairs.length).toBeGreaterThan(0);
      expect(
        pairs.filter(({ painted, resolved }) => painted !== resolved)
      ).toEqual([]);
    }
  );
});
