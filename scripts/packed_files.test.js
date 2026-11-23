/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  missingPackedFiles,
  packedPackages,
  prunedRuntimeFiles,
} from './packed_files.js';
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
  const pruned = (entries, manifest = {}) =>
    prunedRuntimeFiles({ name: '@elastic/fixture', ...manifest }, entries);

  it("names runtime code under a directory Kibana's build deletes", () => {
    const deleted = [
      'lib/cjs/schema/examples/index.js',
      'lib/esm/docs/view.js',
      'lib/cjs/test/data.json',
      'lib/cjs/benchmarks/run.js',
      'lib/cjs/coverage/index.js',
      'lib/cjs/__tests__/helper.js',
    ];
    expect(pruned([...deleted, 'lib/cjs/schema/index.js'])).toEqual(deleted);
  });

  it('names runtime code whose own name Kibana deletes', () => {
    const deleted = [
      'lib/cjs/benchmark.js',
      'lib/cjs/react.development.js',
      'lib/cjs/babel.config.js',
      'lib/cjs/readme.js',
      'lib/cjs/bower.json',
      'lib/cjs/.eslintrc.js',
      'lib/cjs/.prettierrc.js',
    ];
    expect(pruned([...deleted, 'lib/cjs/benchmarking.js'])).toEqual(deleted);
  });

  it('matches as Kibana does: any case, and no `*` over a leading dot', () => {
    expect(
      pruned([
        'lib/cjs/schema/Examples/index.js',
        'lib/cjs/DOCS/view.js',
        'lib/cjs/renderer.DEV.JS',
        'lib/cjs/.compat.dev.js',
      ])
    ).toEqual([
      'lib/cjs/schema/Examples/index.js',
      'lib/cjs/DOCS/view.js',
      'lib/cjs/renderer.DEV.JS',
    ]);
  });

  it('keeps what Kibana keeps: its own packages, and the code `yaml` holds under `doc`', () => {
    expect(
      prunedRuntimeFiles({ name: '@kbn/fixture' }, ['lib/examples/index.js'])
    ).toEqual([]);
    expect(
      prunedRuntimeFiles({ name: 'yaml' }, [
        'dist/doc/Document.js',
        'lib/doc/Document.js',
      ])
    ).toEqual(['lib/doc/Document.js']);
  });

  it('passes a file named like a directory, declarations, and prose', () => {
    expect(
      pruned([
        'lib/cjs/primitives/grid/examples.js',
        'lib/cjs/schema/examples/index.d.ts',
        'docs/index.md',
        'docs/images/home.png',
      ])
    ).toEqual([]);
  });

  it("exempts only a bin target directly under the package's bin directory", () => {
    const entries = [
      'bin/isomer-studio.js',
      'bin/helper.js',
      'lib/examples/cli.js',
    ];
    expect(
      pruned(entries, {
        bin: {
          'isomer-studio': './bin/isomer-studio.js',
          examples: './lib/examples/cli.js',
        },
      })
    ).toEqual(['bin/helper.js', 'lib/examples/cli.js']);
    expect(pruned(entries, { bin: 'bin/isomer-studio.js' })).toEqual([
      'bin/helper.js',
      'lib/examples/cli.js',
    ]);
  });
});

describe('packedPackages', () => {
  it('packs a publishing package that declares no `files`', () => {
    const packages = [
      { manifest: { name: 'listed', files: ['lib'] } },
      { manifest: { name: 'unlisted' } },
      { manifest: { name: 'private', private: true } },
    ];
    expect(
      packedPackages(
        packages,
        ({ private: isPrivate }) => isPrivate !== true
      ).map(({ manifest }) => manifest.name)
    ).toEqual(['listed', 'unlisted']);
  });
});
