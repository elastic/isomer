/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const command = join(
  dirname(fileURLToPath(import.meta.url)),
  'check_pack_contents.js'
);

const REQUIRED = {
  'LICENSE.txt': '',
  'NOTICE.txt': '',
  'README.md': '# Fixture\n',
  'THIRD_PARTY_LICENSES.md': '',
  'lib/index.js': '',
};

describe('check_pack_contents', () => {
  let root;

  const writePackage = (folder, manifest, files) => {
    const dir = join(root, 'packages', folder);
    for (const [file, contents] of Object.entries({
      ...REQUIRED,
      ...files,
      'package.json': JSON.stringify({ version: '1.0.0', ...manifest }),
    })) {
      mkdirSync(dirname(join(dir, file)), { recursive: true });
      writeFileSync(join(dir, file), contents);
    }
  };

  const run = () =>
    spawnSync(process.execPath, [command, root], { encoding: 'utf-8' });

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'isomer-check-pack-contents-'));
  });

  afterEach(() => {
    rmSync(root, { force: true, recursive: true });
  });

  it('passes a publishing package that declares no `files`', () => {
    writePackage('unlisted', { name: 'fixture-unlisted' }, {});
    const { status, stdout } = run();
    expect(stdout).toContain('fixture-unlisted: pack contents OK');
    expect(status).toBe(0);
  });

  it("fails one shipping runtime code Kibana's build deletes", () => {
    writePackage(
      'unlisted',
      { name: 'fixture-unlisted' },
      { 'lib/examples/index.js': '' }
    );
    const { status, stderr } = run();
    expect(stderr).toContain(
      "fixture-unlisted: ships runtime code Kibana's build deletes from node_modules: lib/examples/index.js"
    );
    expect(status).toBe(1);
  });

  it("runs no package's pack scripts", () => {
    writePackage(
      'scripted',
      {
        name: 'fixture-scripted',
        scripts: {
          prepack: `node -e "require('fs').writeFileSync('prepack-ran', '')"`,
        },
      },
      {}
    );
    const { status } = run();
    expect(status).toBe(0);
    expect(existsSync(join(root, 'packages', 'scripted', 'prepack-ran'))).toBe(
      false
    );
  });

  it('fails a root that holds no packages', () => {
    const { status, stderr, stdout } = run();
    expect(stderr).toContain(`${root}: no packages found`);
    expect(stdout).not.toContain('Pack contents check passed.');
    expect(status).toBe(1);
  });

  it('skips a package that never publishes', () => {
    writePackage(
      'private',
      { name: 'fixture-private', private: true },
      { 'lib/examples/index.js': '' }
    );
    const { status, stdout } = run();
    expect(stdout).not.toContain('fixture-private');
    expect(status).toBe(0);
  });
});
