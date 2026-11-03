/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

import {
  decodePng,
  keepCommittedScreenshots,
  samePicture,
} from './screenshots';

const chunk = (type: string, data: Buffer) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  // Decoding ignores the CRC.
  return Buffer.concat([
    length,
    Buffer.from(type, 'latin1'),
    data,
    Buffer.alloc(4),
  ]);
};

/** Encodes RGB rows, each with its own filter type, as a PNG. */
const encodePng = (
  rows: { filter: number; bytes: number[] }[],
  width: number
) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(rows.length, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk(
      'IDAT',
      deflateSync(
        Buffer.from(rows.flatMap(({ filter, bytes }) => [filter, ...bytes]))
      )
    ),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/** Two RGB pixels per row, filtered so each row decodes to `[10, 20, 30, 40, 50, 60]` plus its index. */
const picture = (jitter = 0) =>
  encodePng(
    [
      { filter: 0, bytes: [10, 20, 30, 40, 50, 60 + jitter] },
      { filter: 1, bytes: [11, 21, 31, 30, 30, 30] },
      { filter: 2, bytes: [1, 1, 1, 1, 1, 1] },
      { filter: 3, bytes: [7, 12, 17, 16, 16, 16] },
      { filter: 4, bytes: [1, 1, 1, 1, 1, 1] },
    ],
    2
  );

describe('decodePng', () => {
  it('undoes every filter type', () => {
    const { width, height, channels, pixels } = decodePng(picture());
    expect({ width, height, channels }).toEqual({
      width: 2,
      height: 5,
      channels: 3,
    });
    expect([...pixels]).toEqual([
      10, 20, 30, 40, 50, 60, 11, 21, 31, 41, 51, 61, 12, 22, 32, 42, 52, 62,
      13, 23, 33, 43, 53, 63, 14, 24, 34, 44, 54, 64,
    ]);
  });
});

describe('samePicture', () => {
  it('allows two levels of jitter and no more', () => {
    expect(samePicture(picture(), picture(2))).toBe(true);
    expect(samePicture(picture(), picture(3))).toBe(false);
  });
});

describe('keepCommittedScreenshots', () => {
  let directory: string;
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  it('keeps the committed file only where the picture is the same', () => {
    directory = mkdtempSync(join(tmpdir(), 'screenshots-'));
    const write = (folder: string, id: string, bytes: Buffer) => {
      mkdirSync(join(directory, folder, id), { recursive: true });
      writeFileSync(join(directory, folder, id, 'reference.png'), bytes);
    };
    write('committed', 'jitter', picture());
    write('next', 'jitter', picture(1));
    write('committed', 'moved', picture());
    write('next', 'moved', picture(9));
    write('next', 'new', picture(1));
    keepCommittedScreenshots(
      join(directory, 'committed'),
      join(directory, 'next'),
      ['jitter', 'moved', 'new']
    );
    const read = (id: string) =>
      readFileSync(join(directory, 'next', id, 'reference.png'));
    expect(read('jitter').equals(picture())).toBe(true);
    expect(read('moved').equals(picture(9))).toBe(true);
    expect(read('new').equals(picture(1))).toBe(true);
  });
});
