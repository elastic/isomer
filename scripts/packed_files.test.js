/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { missingPackedFiles } from './packed_files.js';
import { workspacePackages } from './workspace_packages.js';

const studio = workspacePackages().find(
  ({ manifest }) => manifest.name === '@elastic/isomer-studio'
);
const studioPackedFiles = studio?.manifest.isomer?.packedFiles ?? [];

describe('missingPackedFiles', () => {
  it('matches `*` within one path segment only', () => {
    expect(
      missingPackedFiles(
        ['dist/app/assets/codicon-ABC123.ttf'],
        ['dist/app/assets/codicon-*.ttf']
      )
    ).toEqual([]);
    expect(
      missingPackedFiles(
        ['dist/app/assets/nested/codicon-ABC123.ttf'],
        ['dist/app/assets/codicon-*.ttf']
      )
    ).toEqual(['dist/app/assets/codicon-*.ttf']);
  });

  it('treats other pattern characters literally', () => {
    expect(
      missingPackedFiles(['dist/app/indexXhtml'], ['dist/app/index.html'])
    ).toEqual(['dist/app/index.html']);
  });

  it('declares the Studio asset contract', () => {
    expect(studioPackedFiles).toEqual(
      expect.arrayContaining([
        'dist/app/index.html',
        'dist/app/assets/app.css',
        'dist/app/assets/codicon-*.ttf',
        'dist/app/assets/editor.worker.js',
        'dist/app/assets/ts.worker.js',
        'dist/app/assets/json.worker.js',
        'dist/app/assets/slack.css',
        'dist/app/assets/esbuild.wasm',
      ])
    );
  });

  it('fails a Studio tarball without `dist/app/`', () => {
    const entries = [
      'package.json',
      'README.md',
      'dist/index.js',
      'dist/cli.js',
    ];
    expect(missingPackedFiles(entries, studioPackedFiles)).toEqual(
      studioPackedFiles
    );
  });
});
