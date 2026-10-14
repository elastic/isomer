/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Writes an API Extractor report to `api/` for every export subpath of each
// published package, from its built `.d.ts`. `--check` fails when a committed
// report differs from the build, is missing, or belongs to no published entry.

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';

import { repoRoot, workspacePackages } from './workspace_packages.js';

const REPORT_SUFFIX = '.api.md';
const RUNTIME_SUFFIX = '.runtime.txt';

/** The path an export condition gives `name` (`types`, `import`), at any nesting depth. */
const conditionPath = (condition, name) => {
  if (typeof condition !== 'object' || condition === null) {
    return undefined;
  }
  if (typeof condition[name] === 'string') {
    return condition[name];
  }
  for (const value of Object.values(condition)) {
    const path = conditionPath(value, name);
    if (path) {
      return path;
    }
  }
  return undefined;
};

/**
 * One report per export subpath that declares `types`: `isomer-sdk` for `.`,
 * `isomer-sdk.html` for `./html`.
 *
 * @param {Array<{ dir: string; folder: string; manifest: import('./workspace_packages.js').PackageManifest }>} packages
 */
export const apiReportEntries = (packages) =>
  packages.flatMap((pkg) =>
    Object.entries(pkg.manifest.exports ?? {}).flatMap(([key, condition]) => {
      const types = conditionPath(condition, 'types');
      if (!types) {
        return [];
      }
      const file = resolve(pkg.dir, types);
      if (!existsSync(file)) {
        throw new Error(
          `${pkg.manifest.name}: ${types} is missing. Run \`pnpm build\` before this report.`
        );
      }
      const subpath =
        key === '.' ? '' : `.${key.slice(2).replaceAll('/', '.')}`;
      const module = conditionPath(condition, 'import');
      return [
        {
          pkg,
          file,
          module: module && resolve(pkg.dir, module),
          reportName: `${pkg.folder}${subpath}`,
        },
      ];
    })
  );

/**
 * The names an entry's built ESM module exports at run time, one per line, so
 * a value made type-only shows even though its declaration prints the same.
 *
 * @param {{ module?: string }} entry
 */
export const runtimeExports = async ({ module }) =>
  module
    ? `${Object.keys(await import(pathToFileURL(module).href))
        .sort()
        .join('\n')}\n`
    : undefined;

/**
 * Committed report files no entry produces.
 *
 * @param {string} reportDir
 * @param {Array<{ reportName: string }>} entries
 */
export const orphanedApiReports = (reportDir, entries) => {
  const expected = new Set(
    entries.flatMap(({ module, reportName }) => [
      `${reportName}${REPORT_SUFFIX}`,
      ...(module ? [`${reportName}${RUNTIME_SUFFIX}`] : []),
    ])
  );
  return existsSync(reportDir)
    ? readdirSync(reportDir)
        .filter(
          (file) =>
            (file.endsWith(REPORT_SUFFIX) || file.endsWith(RUNTIME_SUFFIX)) &&
            !expected.has(file)
        )
        .sort()
    : [];
};

const silent = { logLevel: 'none' };

/**
 * Runs API Extractor for one entry. With `localBuild`, writes the report;
 * without, leaves it and reports whether it changed.
 */
export const runApiExtractor = (
  { pkg, file, reportName },
  { reportDir, tempDir, localBuild }
) => {
  mkdirSync(reportDir, { recursive: true });
  const config = ExtractorConfig.prepare({
    configObject: {
      projectFolder: pkg.dir,
      mainEntryPointFilePath: file,
      compiler: {
        overrideTsconfig: {
          compilerOptions: {
            module: 'nodenext',
            moduleResolution: 'nodenext',
            target: 'es2022',
            lib: ['es2023', 'dom'],
            types: ['node'],
            strict: true,
            skipLibCheck: true,
          },
          files: [file],
        },
      },
      apiReport: {
        enabled: true,
        reportFileName: reportName,
        reportFolder: reportDir,
        reportTempFolder: tempDir,
        includeForgottenExports: true,
      },
      docModel: { enabled: false },
      dtsRollup: { enabled: false },
      tsdocMetadata: { enabled: false },
      newlineKind: 'lf',
      messages: {
        compilerMessageReporting: { default: silent },
        extractorMessageReporting: {
          default: silent,
          'ae-missing-release-tag': { ...silent, addToApiReportFile: false },
        },
        tsdocMessageReporting: { default: silent },
      },
    },
    configObjectFullPath: join(pkg.dir, 'api-extractor.json'),
    packageJsonFullPath: join(pkg.dir, 'package.json'),
  });
  return Extractor.invoke(config, {
    localBuild,
    showVerboseMessages: false,
    messageCallback: (message) => {
      message.handled = true;
    },
  });
};

const main = async () => {
  const check = process.argv.includes('--check');
  const reportDir = join(repoRoot, 'api');
  const entries = apiReportEntries(
    workspacePackages().filter(({ manifest }) => manifest.private !== true)
  );
  const tempDir = mkdtempSync(join(tmpdir(), 'isomer-api-report-'));
  mkdirSync(reportDir, { recursive: true });

  try {
    const changed = entries
      .filter(
        (entry) =>
          runApiExtractor(entry, { reportDir, tempDir, localBuild: !check })
            .apiReportChanged
      )
      .map(({ reportName }) => `${reportName}${REPORT_SUFFIX}`);
    for (const entry of entries) {
      const names = await runtimeExports(entry);
      if (names === undefined) {
        continue;
      }
      const path = join(reportDir, `${entry.reportName}${RUNTIME_SUFFIX}`);
      if (check) {
        if (!existsSync(path) || readFileSync(path, 'utf-8') !== names) {
          changed.push(`${entry.reportName}${RUNTIME_SUFFIX}`);
        }
      } else {
        writeFileSync(path, names);
      }
    }
    const orphaned = orphanedApiReports(reportDir, entries);

    if (check) {
      const stale = [...changed, ...orphaned].sort();
      if (stale.length > 0) {
        console.error(
          `API report out of date: ${stale.map((name) => `api/${name}`).join(', ')}.\n` +
            'Run `pnpm build && pnpm api:report` and commit the result. A changed signature in a published package is a breaking change unless it only widens what callers may pass or narrows what they get back.'
        );
        process.exit(1);
      }
      console.log('API reports are current.');
      return;
    }

    for (const name of orphaned) {
      rmSync(join(reportDir, name));
    }
    console.log(
      `Wrote ${entries.length} API report(s) to ${relative(repoRoot, reportDir)}/.`
    );
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main();
}
