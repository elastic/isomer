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
    actual.tiles[2]!.secondary!.badge!.background = '#ff0000';
    expect(failing(fingerprint(breakdown), actual)).toEqual([
      { path: 'tiles[2].secondary.badge.background', feature: 'color' },
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

  it('fails a progress bar drawn along the other axis', () => {
    const actual = fingerprint(progress);
    actual.tiles[0]!.progress!.orientation = 'vertical';
    expect(failing(fingerprint(progress), actual)).toEqual([
      { path: 'tiles[0].progress.orientation', feature: 'layout.align' },
    ]);
  });

  it('fails a progress bar painted at no length while keeping its value', () => {
    const actual = fingerprint(progress);
    actual.tiles[0]!.progress!.end = actual.tiles[0]!.progress!.start;
    expect(failing(fingerprint(progress), actual)).toEqual([
      { path: 'tiles[0].progress.end', feature: 'progress.geometry' },
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

  it('fails a changed alignment', () => {
    const actual = fingerprint(progress);
    actual.tiles[0]!.valueAlign = 'left';
    expect(failing(fingerprint(progress), actual)).toEqual([
      { path: 'tiles[0].valueAlign', feature: 'layout.align' },
    ]);
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

  it('compares text widths only on the platform the reference was captured on', () => {
    const actual = fingerprint(dateValue);
    actual.tiles[0]!.titleWidth! -= 2;
    const elsewhere = dateValue.context.platform === 'linux' ? 'mac' : 'linux';
    const compare = (platform: Platform) =>
      compareFingerprints(fingerprint(dateValue), actual, {
        expected: dateValue.context,
        drawn: {
          scheme: dateValue.context.scheme,
          deviceScaleFactor: 1,
          platform,
        },
      });
    expect(
      failures(compare(dateValue.context.platform)).map(({ path }) => path)
    ).toEqual(['tiles[0].titleWidth']);
    const off = compare(elsewhere);
    expect(failures(off)).toEqual([]);
    expect(
      off.map(({ path, uncompared }) => [path, Boolean(uncompared)])
    ).toEqual([['tiles[0].titleWidth', true]]);
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

  describe('the Elastic UI Numeric gap', () => {
    it('covers the width of text Elastic UI Numeric draws', () => {
      const actual = fingerprint(dateValue);
      actual.tiles[0]!.valueWidth -= 9;
      const differences = compareFingerprints(fingerprint(dateValue), actual);
      expect(differences.map(({ path, gap }) => [path, Boolean(gap)])).toEqual([
        ['tiles[0].valueWidth', true],
      ]);
      expect(failures(differences)).toEqual([]);
    });

    it('still compares the letters of text it covers', () => {
      const actual = fingerprint(breakdown);
      expect(actual.tiles[1]!.title).toMatch(/[.-]/);
      actual.tiles[1]!.titleWidth! += 5;
      actual.tiles[1]!.titleLetterWidth! += 5;
      expect(failing(fingerprint(breakdown), actual)).toEqual([
        { path: 'tiles[1].titleLetterWidth', feature: 'layout.text' },
      ]);
    });

    it('does not cover the width of text it does not draw', () => {
      const actual = fingerprint(dateValue);
      expect(actual.tiles[0]!.title).toBe('Latest');
      actual.tiles[0]!.titleWidth! -= 2;
      expect(failing(fingerprint(dateValue), actual)).toEqual([
        { path: 'tiles[0].titleWidth', feature: 'layout.text' },
      ]);
    });
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
