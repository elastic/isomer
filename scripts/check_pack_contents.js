/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';

import { workspacePackages } from './workspace_packages.js';

const npmCache = mkdtempSync(join(tmpdir(), 'isomer-pack-contents-'));

process.once('exit', () => rmSync(npmCache, { force: true, recursive: true }));

const REQUIRED_FILES = [
  'LICENSE.txt',
  'NOTICE.txt',
  'README.md',
  'THIRD_PARTY_LICENSES.md',
  'package.json',
];

const FORBIDDEN_FILES = [
  /(^|\/)node_modules\//,
  /(^|\/)(__tests__|fixtures?|tests?)\//,
  /\.(fixtures?|tests?)\./,
  /\.tsbuildinfo$/,
];

// A link into a sibling package's docs, the same shape
// `scripts/assemble_package_docs.js` rewrites for the docs site. GitHub and
// the docs site resolve it; a tarball installed on its own cannot, because
// sibling docs are not in it. Exempt rather than a broken link.
const CROSS_PACKAGE_DOC_LINK = /^\.\.\/\.\.\/isomer-[^/]+\/docs\//;

const markdownTargets = (source) =>
  [...source.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/g)]
    .map((match) => match[1].replace(/^<|>$/g, ''))
    .filter(
      (target) =>
        !target.startsWith('#') &&
        !target.startsWith('/') &&
        !/^[a-z][a-z\d+.-]*:/i.test(target) &&
        !CROSS_PACKAGE_DOC_LINK.test(target)
    );

const packedPath = (from, target) => {
  const [path] = target.split(/[?#]/, 1);
  return posix.normalize(posix.join(posix.dirname(from), decodeURI(path)));
};

let allPassed = true;

for (const pkg of workspacePackages()) {
  const { exports: exportMap, name, files: filesField } = pkg.manifest;

  // Skip private packages and packages without a files field.
  if (pkg.manifest.private === true || !filesField) {
    continue;
  }

  let packOutput;
  try {
    packOutput = execFileSync(
      'npm',
      ['pack', '--dry-run', '--json', '--cache', npmCache],
      {
        cwd: pkg.dir,
        encoding: 'utf-8',
      }
    );
  } catch (err) {
    console.error(`${name}: npm pack failed: ${err.message}`);
    allPassed = false;
    continue;
  }

  let entries;
  try {
    const parsed = JSON.parse(packOutput);
    entries = (parsed[0]?.files ?? []).map((f) => f.path);
  } catch (err) {
    console.error(`${name}: could not parse npm pack output: ${err.message}`);
    allPassed = false;
    continue;
  }

  const entrySet = new Set(entries);
  const missing = filesField.filter(
    (declared) =>
      !entries.some(
        (entry) => entry === declared || entry.startsWith(declared + '/')
      )
  );

  const missingRequired = REQUIRED_FILES.filter((file) => !entrySet.has(file));
  const forbidden = entries.filter((entry) =>
    FORBIDDEN_FILES.some((pattern) => pattern.test(entry))
  );
  const missingExports = Object.values(exportMap ?? {})
    .flatMap((conditions) =>
      conditions && typeof conditions === 'object'
        ? ['types', 'import', 'require'].map((key) => conditions[key])
        : []
    )
    .filter((target) => typeof target === 'string')
    .map((target) => target.replace(/^\.\//, ''))
    .filter((target) => !entrySet.has(target));
  const brokenLinks = entries
    .filter((entry) => entry === 'README.md' || /^docs\/.*\.md$/.test(entry))
    .flatMap((entry) => {
      const source = readFileSync(posix.join(pkg.dir, entry), 'utf-8');
      return markdownTargets(source)
        .map((target) => ({ entry, target: packedPath(entry, target) }))
        .filter(
          ({ target }) =>
            !entrySet.has(target) &&
            !entries.some((candidate) => candidate.startsWith(`${target}/`))
        );
    });

  const violations = [
    ...(missing.length > 0
      ? [
          `files field declares [${missing.map((file) => `"${file}"`).join(', ')}] but npm pack finds none of them`,
        ]
      : []),
    ...(missingRequired.length > 0
      ? [`missing required files: ${missingRequired.join(', ')}`]
      : []),
    ...(missingExports.length > 0
      ? [`missing export targets: ${missingExports.join(', ')}`]
      : []),
    ...(forbidden.length > 0
      ? [`contains forbidden files: ${forbidden.join(', ')}`]
      : []),
    ...brokenLinks.map(
      ({ entry, target }) => `${entry} links to unpacked path ${target}`
    ),
  ];

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(`${name}: ${violation}`);
    }
    allPassed = false;
  } else {
    console.log(`${name}: pack contents OK (${entries.length} files)`);
  }
}

if (!allPassed) {
  process.exit(1);
}

console.log('Pack contents check passed.');
