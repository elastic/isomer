/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { missingPackedFiles, prunedRuntimeFiles } from './packed_files.js';
import { workspacePackages } from './workspace_packages.js';

const studio = workspacePackages().find(
  ({ manifest }) => manifest.name === '@elastic/isomer-studio'
);
const studioPackedFiles = studio?.manifest.isomer?.packedFiles ?? [];

describe('missingPackedFiles', () => {
  it('matches `*` within one path segment only', () => {
    expect(
      missingPackedFiles(
        ['lib/app/assets/codicon-ABC123.ttf'],
        ['lib/app/assets/codicon-*.ttf']
      )
    ).toEqual([]);
    expect(
      missingPackedFiles(
        ['lib/app/assets/nested/codicon-ABC123.ttf'],
        ['lib/app/assets/codicon-*.ttf']
      )
    ).toEqual(['lib/app/assets/codicon-*.ttf']);
  });

  it('treats other pattern characters literally', () => {
    expect(
      missingPackedFiles(['lib/app/indexXhtml'], ['lib/app/index.html'])
    ).toEqual(['lib/app/index.html']);
  });

  it('declares the Studio asset contract', () => {
    expect(studioPackedFiles).toEqual(
      expect.arrayContaining([
        'lib/app/index.html',
        'lib/app/assets/studio.css',
        'lib/app/assets/codicon-*.ttf',
        'lib/app/assets/editor.worker.js',
        'lib/app/assets/ts.worker.js',
        'lib/app/assets/json.worker.js',
        'lib/app/assets/slack.css',
        'lib/app/assets/esbuild.wasm',
      ])
    );
  });

  it('fails a Studio tarball without `lib/app/`', () => {
    const entries = [
      'package.json',
      'README.md',
      'lib/cjs/index.js',
      'lib/cjs/cli.js',
    ];
    expect(missingPackedFiles(entries, studioPackedFiles)).toEqual(
      studioPackedFiles
    );
  });
});

describe('prunedRuntimeFiles', () => {
  it('names runtime code under a directory a host build deletes', () => {
    expect(
      prunedRuntimeFiles([
        'lib/cjs/schema/examples/index.js',
        'lib/esm/docs/view.js',
        'lib/cjs/test/data.json',
        'lib/cjs/schema/index.js',
      ])
    ).toEqual([
      'lib/cjs/schema/examples/index.js',
      'lib/esm/docs/view.js',
      'lib/cjs/test/data.json',
    ]);
  });

  it('passes a file named like one, declarations, and prose', () => {
    expect(
      prunedRuntimeFiles([
        'lib/cjs/primitives/grid/examples.js',
        'lib/cjs/schema/examples/index.d.ts',
        'docs/index.md',
        'docs/images/home.png',
      ])
    ).toEqual([]);
  });

  it('exempts only the manifest bin targets', () => {
    const entries = ['bin/isomer-studio.js', 'bin/helper.js'];
    expect(
      prunedRuntimeFiles(entries, { 'isomer-studio': './bin/isomer-studio.js' })
    ).toEqual(['bin/helper.js']);
    expect(prunedRuntimeFiles(entries, 'bin/isomer-studio.js')).toEqual([
      'bin/helper.js',
    ]);
  });
});
