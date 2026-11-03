/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

/** Channels per pixel of each 8-bit PNG color type a screenshot uses. */
const CHANNELS: Partial<Record<number, number>> = { 0: 1, 2: 3, 4: 2, 6: 4 };

/** Chromium antialiases a panel's edge a level or two differently from run to run. */
const JITTER = 2;

/** Decodes an 8-bit, non-interlaced PNG to its unfiltered pixels. */
export const decodePng = (bytes: Buffer) => {
  let width = 0;
  let height = 0;
  let channels = 0;
  const data: Buffer[] = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('latin1', offset + 4, offset + 8);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      channels = CHANNELS[chunk[9]!] ?? 0;
      if (chunk[8] !== 8 || chunk[12] !== 0 || !channels) {
        throw new Error('Only 8-bit, non-interlaced, non-palette PNGs decode.');
      }
    } else if (type === 'IDAT') {
      data.push(chunk);
    }
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const source = y * (stride + 1) + 1;
    const line = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? pixels[line + x - channels]! : 0;
      const up = y > 0 ? pixels[line - stride + x]! : 0;
      const corner =
        x >= channels && y > 0 ? pixels[line - stride + x - channels]! : 0;
      let predicted = 0;
      if (filter === 1) {
        predicted = left;
      } else if (filter === 2) {
        predicted = up;
      } else if (filter === 3) {
        predicted = (left + up) >> 1;
      } else if (filter === 4) {
        const estimate = left + up - corner;
        const [toLeft, toUp, toCorner] = [left, up, corner].map((value) =>
          Math.abs(estimate - value)
        ) as [number, number, number];
        predicted =
          toLeft <= toUp && toLeft <= toCorner
            ? left
            : toUp <= toCorner
              ? up
              : corner;
      }
      pixels[line + x] = (raw[source + x]! + predicted) & 0xff;
    }
  }
  return { width, height, channels, pixels };
};

/** Whether two PNGs show the same picture, allowing Chromium's edge jitter. */
export const samePicture = (a: Buffer, b: Buffer) => {
  const first = decodePng(a);
  const second = decodePng(b);
  return (
    first.width === second.width &&
    first.height === second.height &&
    first.channels === second.channels &&
    first.pixels.every(
      (value, index) => Math.abs(value - second.pixels[index]!) <= JITTER
    )
  );
};

/** Keeps each case's committed screenshot wherever the new one shows the same picture, so jitter is no diff. */
export const keepCommittedScreenshots = (
  committed: string,
  next: string,
  ids: readonly string[]
) => {
  for (const id of ids) {
    const before = join(committed, id, 'reference.png');
    const after = join(next, id, 'reference.png');
    if (
      existsSync(before) &&
      samePicture(readFileSync(before), readFileSync(after))
    ) {
      copyFileSync(before, after);
    }
  }
};
