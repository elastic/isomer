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
const TAKUMI_LICENSE_PATH = join(
  repoRoot,
  'third_party_licenses',
  'takumi-2.14.0-MIT.txt'
);
const takumiLicense = readFileSync(TAKUMI_LICENSE_PATH, 'utf-8').trim();
const TAKUMI_PACKAGE_NAMES = [
  '@takumi-rs/core',
  '@takumi-rs/helpers',
  '@takumi-rs/core-darwin-arm64',
  '@takumi-rs/core-darwin-x64',
  '@takumi-rs/core-linux-arm64-gnu',
  '@takumi-rs/core-linux-arm64-musl',
  '@takumi-rs/core-linux-x64-gnu',
  '@takumi-rs/core-linux-x64-musl',
  '@takumi-rs/core-win32-arm64-msvc',
  '@takumi-rs/core-win32-x64-msvc',
];
const TAKUMI_PACKAGES = new Set(TAKUMI_PACKAGE_NAMES);

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

const curatedLicenseText = (pkg) => {
  if (pkg.version === '2.14.0' && TAKUMI_PACKAGES.has(pkg.name)) {
    return takumiLicense;
  }
  return undefined;
};

const licenseTextOf = (pkg, dir) => {
  const licenseText = readFirstExisting(dir, LICENSE_BASENAMES);
  if (licenseText !== undefined) {
    return licenseText;
  }
  return curatedLicenseText(pkg);
};

// Exact versions only: a range would resolve differently per platform.
const exactVersion = (range) =>
  typeof range === 'string' && /^\d+\.\d+\.\d+$/.test(range)
    ? range
    : undefined;

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

// Platform-bound optional packages are recorded from the declaration. Which
// one is installed depends on the host, and the report must not.
const recordOptional = (name, range, fromDir, parentPkg, seen) => {
  const resolved = resolvePackageDir(name, fromDir);
  const dir = resolved === undefined ? undefined : realpathSync(resolved);
  if (dir !== undefined && seen.has(dir)) {
    return;
  }

  const installed = dir === undefined ? undefined : readPackage(dir);
  const platformBound =
    installed !== undefined &&
    (installed.os !== undefined || installed.cpu !== undefined);
  const version = exactVersion(range);

  if (platformBound || dir === undefined) {
    if (version === undefined) {
      return;
    }
    const key = `optional:${name}@${version}`;
    if (seen.has(key)) {
      return;
    }
    const parentLicense = licenseOf(parentPkg);
    if (installed !== undefined) {
      const installedLicense = licenseOf(installed);
      if (installed.version !== version || installedLicense !== parentLicense) {
        throw new Error(
          `${name}@${version} (${installedLicense}) does not match the declared optional dependency of ${parentPkg.name} (${parentLicense}).`
        );
      }
    }
    seen.set(key, {
      name,
      version,
      license: parentLicense,
      path: 'declared optional dependency',
      licenseText: curatedLicenseText({ name, version }),
      noticeText: undefined,
      optional: [],
    });
    return;
  }

  walk(name, fromDir, seen);
};

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
    licenseText: licenseTextOf(pkg, dir),
    noticeText: readFirstExisting(dir, NOTICE_BASENAMES),
    optional: Object.keys(pkg.optionalDependencies ?? {}).sort(),
  });

  for (const dependency of Object.keys(pkg.dependencies ?? {})) {
    walk(dependency, dir, seen);
  }
  for (const [dependency, range] of Object.entries(
    pkg.optionalDependencies ?? {}
  )) {
    recordOptional(dependency, range, dir, pkg, seen);
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
  "Declared optional dependencies are included in the distribution closure. Packages that are not installed on the current platform must have curated license material before this report can include them. A native binary's statically linked closure and bundled assets still require a separate upstream audit.",
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
    throw new Error(
      `${row.name}@${row.version} has no NOTICE or license text; add curated license material before publishing.`
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
