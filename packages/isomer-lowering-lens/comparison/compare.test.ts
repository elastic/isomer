/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { caseSchema, type ComparisonCase, type Platform } from './case';
import { compareFingerprints, failures } from './compare';
import type { MetricFingerprint } from './fingerprint';

const load = (id: string) =>
  caseSchema.parse(
    JSON.parse(
      readFileSync(join(__dirname, '__fixtures__', id, 'case.json'), 'utf8')
    )
  ) as ComparisonCase;

const breakdown = load(
  'isomer-comparison-metric-logs-es-ql--esql-breakdown-compare--light'
);
const trendline = load('isomer-comparison-metric-flights--trendline--light');
const progress = load(
  'isomer-comparison-metric-flights--progress-horizontal--light'
);
const dateValue = load(
  'isomer-comparison-metric-logs-es-ql--esql-date-value--light'
);

const fingerprint = ({ reference }: ComparisonCase) =>
  structuredClone(reference.fingerprint);

/** The key of a tile's drawn element whose key ends with `suffix`. */
const drawnKey = (drawing: MetricFingerprint, tile: number, suffix: string) => {
  const key = Object.keys(drawing.tiles[tile]!.elements).find((candidate) =>
    candidate.endsWith(suffix)
  );
  if (!key) {
    throw new Error(`Tile ${tile} draws no element ending ${suffix}.`);
  }
  return key;
};

/** The features of the differences that fail the comparison. */
const failing = (
  reference: MetricFingerprint,
  actual: MetricFingerprint | null
) =>
  failures(compareFingerprints(reference, actual)).map(({ path, feature }) => ({
    path,
    feature,
  }));

describe('compareFingerprints', () => {
  it.each([breakdown, trendline, progress, dateValue])(
    'passes a drawing identical to its reference',
    (comparison) => {
      expect(
        compareFingerprints(fingerprint(comparison), fingerprint(comparison))
      ).toEqual([]);
    }
  );

  it('fails a wrong reading', () => {
    const actual = fingerprint(breakdown);
    actual.tiles[1]!.value = '12.1MB';
    expect(failing(fingerprint(breakdown), actual)).toEqual([
      { path: 'tiles[1].value', feature: 'text' },
    ]);
  });

  it('fails a missing secondary metric', () => {
    const actual = fingerprint(breakdown);
    delete actual.tiles[0]!.secondary;
    expect(failing(fingerprint(breakdown), actual)).toEqual([
      { path: 'tiles[0].secondary', feature: 'text' },
    ]);
  });

  it('fails a changed badge color', () => {
    const actual = fingerprint(breakdown);
    const key = drawnKey(actual, 2, '>echBadge__content');
    actual.tiles[2]!.elements[key]!.style.background = '#ff0000';
    expect(failing(fingerprint(breakdown), actual)).toEqual([
      { path: `tiles[2].elements.${key}.style.background`, feature: 'color' },
    ]);
  });

  it('fails a changed font size', () => {
    const actual = fingerprint(breakdown);
    const key = drawnKey(actual, 0, '>echMetricText__subtitle');
    actual.tiles[0]!.elements[key]!.style.fontSize = '20px';
    expect(failing(fingerprint(breakdown), actual)).toEqual([
      {
        path: `tiles[0].elements.${key}.style.fontSize`,
        feature: 'layout.font',
      },
    ]);
  });

  it('fails a missing element by its identity', () => {
    const actual = fingerprint(breakdown);
    const key = drawnKey(actual, 0, '>echBadge__content>span');
    delete actual.tiles[0]!.elements[key];
    expect(failing(fingerprint(breakdown), actual)).toEqual([
      { path: `tiles[0].elements.${key}`, feature: 'identity' },
    ]);
  });

  it('fails swapped tiles by their identity', () => {
    const actual = fingerprint(breakdown);
    const [first, second] = actual.tiles;
    actual.tiles[0] = { ...second!, position: second!.position };
    actual.tiles[1] = { ...first!, position: first!.position };
    expect(failing(fingerprint(breakdown), actual)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'tiles[0].position[1]',
          feature: 'identity',
        }),
      ])
    );
  });

  it('fails a dropped trend point', () => {
    const actual = fingerprint(trendline);
    actual.tiles[0]!.trend!.paths[0]!.splice(2, 2);
    expect(failing(fingerprint(trendline), actual)).toEqual([
      { path: 'tiles[0].trend.paths[0]', feature: 'trend.shape' },
    ]);
  });

  it('fails a gap drawn as a line through it', () => {
    const reference = fingerprint(trendline);
    const [whole] = reference.tiles[0]!.trend!.paths;
    reference.tiles[0]!.trend!.paths = [whole!.slice(0, 40), whole!.slice(40)];
    expect(failing(reference, fingerprint(trendline))).toEqual([
      { path: 'tiles[0].trend.paths', feature: 'trend.shape' },
    ]);
  });

  it("fails a trend point moved by the extractor's last decimal", () => {
    const far = fingerprint(trendline);
    far.tiles[0]!.trend!.paths[0]![5]! += 0.0001;
    expect(failing(fingerprint(trendline), far)).toEqual([
      { path: 'tiles[0].trend.paths[0][5]', feature: 'trend.geometry' },
    ]);
  });

  it('fails a wrong progress value', () => {
    const actual = fingerprint(progress);
    actual.tiles[0]!.progress!.now = 100 - actual.tiles[0]!.progress!.now;
    expect(failing(fingerprint(progress), actual)).toEqual([
      { path: 'tiles[0].progress.now', feature: 'progress.value' },
    ]);
  });

  it('fails a progress bar painted at no length while keeping its value', () => {
    const actual = fingerprint(progress);
    const key = drawnKey(actual, 0, '>echMeterBar');
    actual.tiles[0]!.elements[key]!.box!.width = 0;
    expect(failing(fingerprint(progress), actual)).toEqual([
      { path: `tiles[0].elements.${key}.box.width`, feature: 'layout.element' },
    ]);
  });

  it('fails a tile box shifted past a pixel and passes one shifted within it', () => {
    const far = fingerprint(breakdown);
    far.tiles[3]!.box.x += 2;
    expect(failing(fingerprint(breakdown), far)).toEqual([
      { path: 'tiles[3].box.x', feature: 'layout.box' },
    ]);
    const near = fingerprint(breakdown);
    near.tiles[3]!.box.x += 0.5;
    expect(failing(fingerprint(breakdown), near)).toEqual([]);
  });

  it('fails a reading drawn somewhere else in its tile', () => {
    const actual = fingerprint(progress);
    const key = drawnKey(actual, 0, '>echMetricText__value');
    actual.tiles[0]!.elements[key]!.textRect!.x -= 50;
    expect(failing(fingerprint(progress), actual)).toEqual([
      { path: `tiles[0].elements.${key}.textRect.x`, feature: 'layout.text' },
    ]);
  });

  it('records a tile drawn clickable where it is not as the open gap', () => {
    const actual = fingerprint(dateValue);
    const { interactive } = actual.tiles[0]!;
    actual.tiles[0]!.interactive = !interactive;
    expect(
      compareFingerprints(fingerprint(dateValue), actual).map(
        ({ path, gap }) => [path, Boolean(gap)]
      )
    ).toEqual([['tiles[0].interactive', true]]);
  });

  it('fails when nothing was drawn', () => {
    expect(failing(fingerprint(progress), null)).toEqual([
      { path: '(drawing)', feature: 'drawing' },
    ]);
  });

  it('fails a drawing made in another scheme or at another scale', () => {
    const differences = compareFingerprints(
      fingerprint(progress),
      fingerprint(progress),
      {
        expected: progress.context,
        drawn: {
          scheme: 'dark',
          deviceScaleFactor: 2,
          platform: progress.context.platform,
        },
      }
    );
    expect(failures(differences).map(({ path }) => path)).toEqual([
      'context.scheme',
      'context.deviceScaleFactor',
    ]);
  });

  it('compares drawn text and boxes sized around it only on the platform the reference was captured on', () => {
    const actual = fingerprint(breakdown);
    const text = drawnKey(actual, 0, '>echBadge__text');
    const badge = drawnKey(actual, 0, '>echBadge__content');
    actual.tiles[0]!.elements[text]!.textRect!.width -= 2;
    actual.tiles[0]!.elements[badge]!.box!.width -= 2;
    const elsewhere = breakdown.context.platform === 'linux' ? 'mac' : 'linux';
    const compare = (platform: Platform) =>
      compareFingerprints(fingerprint(breakdown), actual, {
        expected: breakdown.context,
        drawn: {
          scheme: breakdown.context.scheme,
          deviceScaleFactor: 1,
          platform,
        },
      });
    const paths = [
      `tiles[0].elements.${badge}.box.width`,
      `tiles[0].elements.${text}.textRect.width`,
    ];
    expect(
      failures(compare(breakdown.context.platform)).map(({ path }) => path)
    ).toEqual(paths);
    const off = compare(elsewhere);
    expect(failures(off)).toEqual([]);
    expect(
      off.map(({ path, uncompared }) => [path, Boolean(uncompared)])
    ).toEqual(paths.map((path) => [path, true]));
  });

  it('compares a box no text sizes on every platform', () => {
    const actual = fingerprint(progress);
    const key = drawnKey(actual, 0, '>echMeterBar');
    actual.tiles[0]!.elements[key]!.box!.width = 0;
    const differences = compareFingerprints(fingerprint(progress), actual, {
      expected: progress.context,
      drawn: {
        scheme: progress.context.scheme,
        deviceScaleFactor: 1,
        platform: progress.context.platform === 'linux' ? 'mac' : 'linux',
      },
    });
    expect(failures(differences).map(({ path }) => path)).toEqual([
      `tiles[0].elements.${key}.box.width`,
    ]);
  });

  it('compares everything else on any platform', () => {
    const actual = fingerprint(dateValue);
    actual.tiles[0]!.box.width += 3;
    const differences = compareFingerprints(fingerprint(dateValue), actual, {
      expected: dateValue.context,
      drawn: {
        scheme: dateValue.context.scheme,
        deviceScaleFactor: 1,
        platform: dateValue.context.platform === 'linux' ? 'mac' : 'linux',
      },
    });
    expect(failures(differences).map(({ path }) => path)).toEqual([
      'tiles[0].box.width',
    ]);
  });
});

describe('caseSchema', () => {
  it('refuses a case that carries its own tolerance', () => {
    const data = JSON.parse(
      readFileSync(
        join(__dirname, '__fixtures__', progress.id, 'case.json'),
        'utf8'
      )
    ) as Record<string, unknown>;
    expect(
      caseSchema.safeParse({ ...data, tolerance: { 'layout.box': 10 } }).success
    ).toBe(false);
  });
});
