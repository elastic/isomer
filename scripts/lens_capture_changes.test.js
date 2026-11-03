/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  describeCaptureChanges,
  leafChanges,
  readCapture,
} from './lens_capture_changes.js';

const aCase = (
  id,
  { build = '1', charts = '73.3.2', value = '1,234' } = {}
) => ({
  id,
  input: { savedObject: { id } },
  data: { layers: {} },
  context: { scheme: 'light' },
  provenance: {
    kibana: { version: '9.7.0-SNAPSHOT', build },
    elasticCharts: charts,
    fonts: {},
  },
  reference: {
    fingerprint: { kind: 'metric', value: { text: value } },
    screenshot: 'reference.png',
  },
});

const capture = (cases, files = {}) => ({
  cases: new Map(cases.map((item) => [item.id, item])),
  files: new Map([
    ...cases.flatMap(({ id }) => [
      [`${id}/case.json`, JSON.stringify(cases.find((c) => c.id === id))],
      [`${id}/reference.png`, 'png'],
    ]),
    ...Object.entries(files),
  ]),
});

describe('leafChanges', () => {
  it('names each leaf that differs', () => {
    expect(
      leafChanges(
        { a: { b: 1, c: [1, 2] }, d: 'x' },
        { a: { b: 2, c: [1, 3] }, e: 'y' }
      )
    ).toEqual([
      { path: 'a.b', before: 1, after: 2 },
      { path: 'a.c[1]', before: 2, after: 3 },
      { path: 'd', before: 'x', after: undefined },
      { path: 'e', before: undefined, after: 'y' },
    ]);
  });
});

describe('describeCaptureChanges', () => {
  it('finds nothing material when only the Kibana build moved', () => {
    const { material, body } = describeCaptureChanges(
      capture([aCase('a')]),
      capture([aCase('a', { build: '2' })])
    );
    expect(material).toBe(false);
    expect(body).toContain('9.7.0-SNAPSHOT build 1 | 9.7.0-SNAPSHOT build 2');
  });

  it('lists the fingerprint paths that moved', () => {
    const { material, body } = describeCaptureChanges(
      capture([aCase('a'), aCase('b')]),
      capture([aCase('a', { value: '1,240' }), aCase('b')])
    );
    expect(material).toBe(true);
    expect(body).toContain('1 of 2 cases changed, 1 with a moved fingerprint.');
    expect(body).toContain('| `a` | fingerprint |');
    expect(body).toContain('- `value.text`: `"1,234"` → `"1,240"`');
  });

  it('counts a screenshot, a font or a case set change as material', () => {
    const before = capture([aCase('a')], { 'fonts/Inter.woff2': '1' });
    const screenshot = capture([aCase('a')], { 'fonts/Inter.woff2': '1' });
    screenshot.files.set('a/reference.png', 'other');
    expect(describeCaptureChanges(before, screenshot).body).toContain(
      '| `a` | screenshot |'
    );
    const font = describeCaptureChanges(
      before,
      capture([aCase('a')], { 'fonts/Inter.woff2': '2' })
    );
    expect(font).toMatchObject({ material: true });
    expect(font.body).toContain('Other files: `fonts/Inter.woff2`.');
    const added = describeCaptureChanges(
      before,
      capture([aCase('a'), aCase('b')], { 'fonts/Inter.woff2': '1' })
    );
    expect(added.body).toContain('Added: `b`.');
  });

  it('warns when Kibana draws with an Elastic Charts the renderer does not pin', () => {
    const { material, body } = describeCaptureChanges(
      capture([aCase('a')]),
      capture([aCase('a', { charts: '74.0.0' })]),
      { pinnedElasticCharts: '73.3.2' }
    );
    expect(material).toBe(true);
    expect(body).toContain('| Elastic Charts | 73.3.2 | 74.0.0 |');
    expect(body).toContain('but the renderer pins 73.3.2');
    expect(body).toContain('| `a` | provenance |');
  });
});

describe('readCapture', () => {
  let directory;
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  it('reads every case and digests every file', () => {
    directory = mkdtempSync(join(tmpdir(), 'lens-capture-'));
    mkdirSync(join(directory, 'a'));
    mkdirSync(join(directory, 'fonts'));
    writeFileSync(join(directory, 'a/case.json'), JSON.stringify(aCase('a')));
    writeFileSync(join(directory, 'a/reference.png'), 'png');
    writeFileSync(join(directory, 'fonts/Inter.woff2'), 'font');
    const { cases, files } = readCapture(directory);
    expect([...cases.keys()]).toEqual(['a']);
    expect([...files.keys()]).toEqual([
      'a/case.json',
      'a/reference.png',
      'fonts/Inter.woff2',
    ]);
  });
});
