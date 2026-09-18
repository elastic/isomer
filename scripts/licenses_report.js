/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  existsSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';

import { repoRoot, workspacePackages } from './workspace_packages.js';

const require = createRequire(import.meta.url);
const checkOnly = process.argv.includes('--check');
const reportPath = join(repoRoot, 'THIRD_PARTY_LICENSES.md');
const noticePath = join(repoRoot, 'NOTICE.txt');
const packages = workspacePackages();

const LICENSE_BASENAMES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'COPYING',
];

const NOTICE_BASENAMES = ['NOTICE', 'NOTICE.txt', 'NOTICE.md'];

const readPackage = (dir) =>
  JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));

const licenseOf = (pkg) => {
  if (typeof pkg.license === 'string') {
    return pkg.license;
  }
  if (pkg.license && typeof pkg.license === 'object' && pkg.license.type) {
    return pkg.license.type;
  }
  if (Array.isArray(pkg.licenses)) {
    return pkg.licenses
      .map((entry) => (typeof entry === 'string' ? entry : entry.type))
      .filter(Boolean)
      .join(' OR ');
  }
  return 'UNKNOWN';
};

const readFirstExisting = (dir, names) => {
  for (const name of names) {
    const candidate = join(dir, name);
    if (existsSync(candidate)) {
      return readFileSync(candidate, 'utf-8').trim();
    }
  }
  return undefined;
};

const packageDirIfNamed = (dir, name) => {
  if (!existsSync(join(dir, 'package.json'))) {
    return undefined;
  }
  const pkg = readPackage(dir);
  return pkg.name === name ? dir : undefined;
};

const findInNodeModules = (name, fromDir) => {
  let dir = fromDir;
  while (true) {
    const match = packageDirIfNamed(join(dir, 'node_modules', name), name);
    if (match !== undefined) {
      return match;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
};

const resolvePackageDir = (name, fromDir) => {
  try {
    return dirname(
      require.resolve(`${name}/package.json`, { paths: [fromDir] })
    );
  } catch {
    // Some packages hide `package.json` behind `exports`.
  }

  try {
    let dir = dirname(require.resolve(name, { paths: [fromDir] }));
    while (dir !== dirname(dir)) {
      const match = packageDirIfNamed(dir, name);
      if (match !== undefined) {
        return match;
      }
      dir = dirname(dir);
    }
  } catch {
    // Import-only `exports` also block `require.resolve` of the package root.
  }

  return findInNodeModules(name, fromDir);
};

const isWorkspaceProtocol = (range) =>
  typeof range === 'string' && range.startsWith('workspace:');

const walk = (name, fromDir, seen) => {
  const resolved = resolvePackageDir(name, fromDir);
  if (resolved === undefined) {
    return;
  }
  const dir = realpathSync(resolved);
  if (seen.has(dir)) {
    return;
  }

  const pkg = readPackage(dir);

  seen.set(dir, {
    name: pkg.name ?? name,
    version: pkg.version ?? 'unknown',
    license: licenseOf(pkg),
    path: relative(repoRoot, dir) || '.',
    licenseText: readFirstExisting(dir, LICENSE_BASENAMES),
    noticeText: readFirstExisting(dir, NOTICE_BASENAMES),
    // Listed by name, never walked: which one is installed depends on the
    // running platform, and the report must not.
    optional: Object.keys(pkg.optionalDependencies ?? {}).sort(),
  });

  for (const dep of Object.keys(pkg.dependencies ?? {})) {
    walk(dep, dir, seen);
  }
};

const collect = (entries) => {
  const seen = new Map();
  for (const { name, fromDir } of entries) {
    walk(name, fromDir, seen);
  }
  return [...seen.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version)
  );
};

const workspaceNames = new Set(packages.map((pkg) => pkg.manifest.name));

const runtimeEntries = [];
const sourceEntries = [];

for (const pkg of packages) {
  // A private package publishes nothing, so its `dependencies` reach no
  // consumer and belong in the source/build section rather than the
  // distribution one. They still have to appear: the tree is the tree.
  const dependencyEntries =
    pkg.manifest.private === true ? sourceEntries : runtimeEntries;
  for (const [name, range] of Object.entries(pkg.manifest.dependencies ?? {})) {
    if (workspaceNames.has(name) || isWorkspaceProtocol(range)) {
      continue;
    }
    dependencyEntries.push({ name, fromDir: pkg.dir });
  }
  for (const [name, range] of Object.entries(
    pkg.manifest.devDependencies ?? {}
  )) {
    if (workspaceNames.has(name) || isWorkspaceProtocol(range)) {
      continue;
    }
    sourceEntries.push({ name, fromDir: pkg.dir });
  }
}

const rootManifest = readPackage(repoRoot);
for (const name of Object.keys(rootManifest.devDependencies ?? {})) {
  if (workspaceNames.has(name)) {
    continue;
  }
  sourceEntries.push({ name, fromDir: repoRoot });
}

const runtimeRows = collect(runtimeEntries);
const sourceRows = collect(sourceEntries);

const table = (rows) => [
  '| Package | Version | SPDX | Path | Optional dependencies |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map(
    (row) =>
      `| \`${row.name}\` | ${row.version} | ${row.license} | \`${row.path}\` | ${row.optional.map((name) => `\`${name}\``).join(', ')} |`
  ),
];

const report = [
  '# Third-party licenses',
  '',
  'Source and distribution dependency closures of the isomer workspace. Regenerated by `pnpm licenses:report`.',
  '',
  '## Distribution (runtime)',
  '',
  'Packages a consumer installs with these libraries. Their license texts are folded into `NOTICE.txt`. Peer dependencies are supplied by the consumer and are not listed here.',
  '',
  ...(runtimeRows.length > 0
    ? table(runtimeRows)
    : [
        '_No package in this workspace currently declares a runtime `dependencies` entry._',
      ]),
  '',
  '## Source and build',
  '',
  'Direct `devDependencies` and their installed dependency closure. These are not distributed in the published tarball.',
  '',
  ...table(sourceRows),
  '',
  '## Optional dependencies',
  '',
  "The last column names each package's `optionalDependencies`. They are not walked: for a package such as `@takumi-rs/core` or `lightningcss` they are one native binary per platform, of which only the running platform's is installed, and a report that walked them would change with the machine that generated it. A native binary's declared SPDX license is what its `package.json` states; the statically linked closure inside the compiled binary, and any bundled asset such as a font, is not audited by this script.",
  '',
].join('\n');

const noticeBlocks = runtimeRows.map((row) => {
  const heading = `This product depends on ${row.name}@${row.version}, licensed under ${row.license}.`;
  const parts = [heading];
  if (row.noticeText !== undefined) {
    parts.push('', row.noticeText);
  }
  if (row.licenseText !== undefined) {
    parts.push('', row.licenseText);
  }
  if (row.noticeText === undefined && row.licenseText === undefined) {
    parts.push(
      '',
      'No LICENSE or NOTICE file was present in the installed package.'
    );
  }
  return parts.join('\n');
});

const notice = [
  'Isomer',
  'Copyright 2026 Elasticsearch B.V.',
  '',
  'This NOTICE includes the notices and license texts of runtime dependencies shipped alongside this product.',
  ...(noticeBlocks.length > 0
    ? ['', '---', '', noticeBlocks.join('\n\n---\n\n')]
    : []),
  '',
].join('\n');

const writeOrCheck = (path, contents, label) => {
  if (checkOnly) {
    if (!existsSync(path)) {
      console.error(
        `${label} is missing. Run \`pnpm licenses:report\` to generate it.`
      );
      return false;
    }
    if (readFileSync(path, 'utf-8') !== contents) {
      console.error(
        `${label} is out of date. Run \`pnpm licenses:report\` and commit the result.`
      );
      return false;
    }
    return true;
  }
  writeFileSync(path, contents);
  return true;
};

const rootLicensePath = join(repoRoot, 'LICENSE.txt');
const rootLicense = readFileSync(rootLicensePath, 'utf-8');

// A private package is never installed on its own, so a copy of the
// workspace-wide report or `NOTICE.txt` in its directory would claim to cover
// dependencies it may not actually pull in.
const removeStaleOrCheck = (path, label) => {
  if (!existsSync(path)) {
    return true;
  }
  if (checkOnly) {
    console.error(
      `${label} is stale. Run \`pnpm licenses:report\` to remove it.`
    );
    return false;
  }
  rmSync(path);
  return true;
};

const reportOk = writeOrCheck(reportPath, report, 'THIRD_PARTY_LICENSES.md');
const noticeOk = writeOrCheck(noticePath, notice, 'NOTICE.txt');
const packageLegalOk = packages
  .flatMap((pkg) => [
    pkg.manifest.private === true
      ? removeStaleOrCheck(
          join(pkg.dir, 'THIRD_PARTY_LICENSES.md'),
          `${pkg.folder}/THIRD_PARTY_LICENSES.md`
        )
      : writeOrCheck(
          join(pkg.dir, 'THIRD_PARTY_LICENSES.md'),
          report,
          `${pkg.folder}/THIRD_PARTY_LICENSES.md`
        ),
    pkg.manifest.private === true
      ? removeStaleOrCheck(
          join(pkg.dir, 'NOTICE.txt'),
          `${pkg.folder}/NOTICE.txt`
        )
      : writeOrCheck(
          join(pkg.dir, 'NOTICE.txt'),
          notice,
          `${pkg.folder}/NOTICE.txt`
        ),
    writeOrCheck(
      join(pkg.dir, 'LICENSE.txt'),
      rootLicense,
      `${pkg.folder}/LICENSE.txt`
    ),
  ])
  .every(Boolean);

if (checkOnly) {
  if (!reportOk || !noticeOk || !packageLegalOk) {
    process.exit(1);
  }
  console.log(
    `License report check passed: ${runtimeRows.length} runtime, ${sourceRows.length} source/build.`
  );
  process.exit(0);
}

console.log(
  `Wrote ${reportPath}, ${noticePath}, and per-package LICENSE.txt (${runtimeRows.length} runtime, ${sourceRows.length} source/build).`
);
