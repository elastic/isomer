/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Audits the Rust crate tree statically linked into @takumi-rs/core's native
// binary, which `pnpm licenses:report` cannot see. Run manually against a
// candidate upstream commit before taking or upgrading it.
//
// Usage: node scripts/audit_takumi_rust_licenses.js [git-ref]

import { setTimeout as delay } from 'node:timers/promises';

const REPO = 'kane50613/takumi';
const DEFAULT_REF = 'fd4ee323cb167c4041515549b48ced33891d8ce0'; // matches @takumi-rs/core@2.14.0

// Crates whose expression cannot resolve to one of these (after splitting on
// AND/OR) are flagged, not silently skipped.
const ALLOWED_LICENSES = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'Zlib',
  '0BSD',
  'Unlicense',
  'BSL-1.0',
  'Unicode-3.0',
]);

// Crates sourced from git rather than crates.io. crates.io has no record of
// them, so their license is verified by hand against the fork's own
// Cargo.toml / LICENSE files and recorded here rather than re-fetched.
const KNOWN_GIT_SOURCES = {
  'https://github.com/kane50613/fontations': {
    verifiedLicense: 'MIT OR Apache-2.0',
    note: "Matches upstream googlefonts/fontations; confirmed via the fork's workspace.package.license at the pinned rev.",
  },
};

const isAllowed = (expression) =>
  expression.split(' AND ').every((clause) =>
    clause
      .replace(/^\(|\)$/g, '')
      // Some pre-SPDX crates.io entries use "/" rather than " OR " to mean
      // the same thing, e.g. "MIT/Apache-2.0".
      .split(/ OR |\//)
      .some((alt) => ALLOWED_LICENSES.has(alt.trim()))
  );

const parseCargoLock = (text) => {
  const packages = [];
  for (const block of text.split('\n[[package]]\n').slice(1)) {
    const name = block.match(/^name = "([^"]+)"/m)?.[1];
    const version = block.match(/^version = "([^"]+)"/m)?.[1];
    const source = block.match(/^source = "([^"]+)"/m)?.[1];
    if (!name || !version) {
      continue;
    }
    packages.push({ name, version, source });
  }
  return packages;
};

const classify = (source) => {
  if (!source) {
    return { kind: 'local' };
  }
  if (source.includes('crates.io-index')) {
    return { kind: 'registry' };
  }
  if (source.startsWith('git+')) {
    const url = source.slice('git+'.length).split('?')[0];
    return { kind: 'git', url };
  }
  return { kind: 'unknown' };
};

const fetchCrateLicense = async (name, version) => {
  const res = await fetch(
    `https://crates.io/api/v1/crates/${name}/${version}`,
    {
      headers: {
        'User-Agent':
          'isomer-license-audit (elastic/isomer, phase-7 Rust dependency audit for @elastic/isomer-image-takumi)',
      },
    }
  );
  if (!res.ok) {
    throw new Error(`crates.io returned ${res.status} for ${name}@${version}`);
  }
  const data = await res.json();
  return data.version?.license ?? 'UNKNOWN';
};

const main = async () => {
  const ref = process.argv[2] ?? DEFAULT_REF;
  const lockUrl = `https://raw.githubusercontent.com/${REPO}/${ref}/Cargo.lock`;
  const lockRes = await fetch(lockUrl);
  if (!lockRes.ok) {
    throw new Error(`Could not fetch ${lockUrl}: ${lockRes.status}`);
  }
  const packages = parseCargoLock(await lockRes.text());

  const flagged = [];
  const registryCount = packages.filter(
    (p) => classify(p.source).kind === 'registry'
  ).length;
  let checked = 0;

  for (const pkg of packages) {
    const { kind, url } = classify(pkg.source);
    if (kind === 'local') {
      continue;
    }

    if (kind === 'git') {
      const known = KNOWN_GIT_SOURCES[url];
      if (!known || !isAllowed(known.verifiedLicense)) {
        flagged.push({
          ...pkg,
          license: known?.verifiedLicense ?? 'UNVERIFIED',
          reason: 'git source, not on crates.io',
        });
      }
      continue;
    }

    if (kind === 'unknown') {
      flagged.push({
        ...pkg,
        license: 'UNKNOWN',
        reason: `unrecognized source: ${pkg.source}`,
      });
      continue;
    }

    const license = await fetchCrateLicense(pkg.name, pkg.version);
    checked += 1;
    if (!isAllowed(license)) {
      flagged.push({
        ...pkg,
        license,
        reason: 'license expression has no permissive alternative',
      });
    }
    await delay(150); // crates.io asks for polite, low-rate crawling
  }

  console.log(
    `Audited ${ref} (${REPO}): ${packages.length} packages, ${registryCount} from crates.io, ${checked} license lookups.`
  );

  if (flagged.length === 0) {
    console.log('No disallowed licenses found.');
    return;
  }

  console.log(`\n${flagged.length} crate(s) flagged:`);
  for (const f of flagged) {
    console.log(`  - ${f.name} ${f.version}: ${f.license}  (${f.reason})`);
  }
  process.exitCode = 1;
};

await main();
