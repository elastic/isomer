/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { build } from 'esbuild';
import semver from 'semver';

import { repoRoot, workspacePackages } from './workspace_packages.js';

const workspace = workspacePackages();
const privateNames = new Set(
  workspace
    .filter(({ manifest }) => manifest.private === true)
    .map(({ manifest }) => manifest.name)
);

// Every package that publishes: the packed tarball of each must import with
// only its declared dependencies and required peers beside it.
const publishing = workspace.filter(
  ({ manifest }) => manifest.private !== true
);
const packageNames = publishing.map(({ manifest }) => manifest.name);

// A published package cannot reach one that never publishes.
const privateReferences = publishing.flatMap(({ manifest }) =>
  ['dependencies', 'peerDependencies', 'optionalDependencies'].flatMap(
    (field) =>
      Object.keys(manifest[field] ?? {})
        .filter((name) => privateNames.has(name))
        .map((name) => `${manifest.name} ${field} lists private ${name}`)
  )
);
if (privateReferences.length > 0) {
  for (const reference of privateReferences) {
    console.error(reference);
  }
  process.exit(1);
}
const tempDir = mkdtempSync(join(tmpdir(), 'isomer-pack-consumer-'));

const linkDirectory = (target, path) => {
  if (existsSync(path)) {
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  symlinkSync(target, path, process.platform === 'win32' ? 'junction' : 'dir');
};

const packPackage = (packageName) => {
  const folder = packageName.slice(packageName.lastIndexOf('/') + 1);
  const packageDir = join(repoRoot, 'packages', folder);
  const sourceDir = packageDir;
  const packOutput = execFileSync(
    'pnpm',
    ['pack', '--json', '--pack-destination', tempDir],
    { cwd: packageDir, encoding: 'utf-8' }
  );
  const { filename } = JSON.parse(packOutput);
  const extractDir = join(tempDir, 'extract', folder);
  mkdirSync(extractDir, { recursive: true });
  execFileSync('tar', ['-xzf', filename, '-C', extractDir]);

  const dir = join(extractDir, 'package');
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
  return { dir, manifest, sourceDir };
};

// Fails an import on any process warning, such as the `ExperimentalWarning`
// Node 22.12 prints when `require()` loads an ES module.
const failOnWarning =
  "process.on('warning', (warning) => { console.error(warning); process.exitCode = 1; });";

/** Where pnpm installed `dependency` for the workspace package, or `undefined`. */
const installedDependency = (pkg, dependency) =>
  [
    join(pkg.sourceDir, 'node_modules', dependency),
    join(repoRoot, 'node_modules', dependency),
  ].find((candidate) => existsSync(candidate));

/** Required peers whose installed version falls outside the package's own range. */
const unsatisfiedPeers = (pkg) =>
  Object.entries(pkg.manifest.peerDependencies ?? {}).filter(
    ([peer, range]) => {
      if (
        packageNames.includes(peer) ||
        pkg.manifest.peerDependenciesMeta?.[peer]?.optional === true
      ) {
        return false;
      }
      const manifestPath = resolve(
        repoRoot,
        'node_modules',
        peer,
        'package.json'
      );
      return (
        existsSync(manifestPath) &&
        !semver.satisfies(
          JSON.parse(readFileSync(manifestPath, 'utf-8')).version,
          range
        )
      );
    }
  );

const exportSpecifiers = ({ name, exports: exportMap = {} }) =>
  Object.keys(exportMap).map((key) =>
    key === '.' ? name : `${name}/${key.slice(2)}`
  );

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');

/** Entries that only Node loads, so they bundle for Node alone. */
const NODE_ONLY_ENTRIES = new Set([
  '@elastic/isomer-image-takumi',
  '@elastic/isomer-runtime/testing',
  '@elastic/isomer-sdk/testing',
]);

/**
 * Bundles one packed entry's ESM build with esbuild, as a consumer's bundler would.
 * Isomer packages are bundled from their packed `lib/esm`; the package's own
 * dependencies and peers stay external, as installed beside it.
 */
const bundleEsm = (specifier, resolveDir, manifest, platform, outfile) =>
  build({
    stdin: {
      contents: `export * from '${specifier}';\n`,
      resolveDir,
      loader: 'js',
    },
    outfile,
    bundle: true,
    format: 'esm',
    platform,
    target: 'es2022',
    conditions: platform === 'node' ? ['node'] : [],
    external: [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ].filter((name) => !name.startsWith('@elastic/isomer-')),
    // A Node bundle that keeps a CommonJS dependency's `require` calls needs one.
    banner:
      platform === 'node'
        ? {
            js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
          }
        : {},
    logLevel: 'warning',
    write: platform === 'node',
  });

try {
  const packages = new Map();
  for (const packageName of packageNames) {
    const pkg = packPackage(packageName);
    const unsatisfied = unsatisfiedPeers(pkg);
    if (unsatisfied.length > 0) {
      console.log(
        `${packageName}: skipped, installed ${unsatisfied.map(([peer, range]) => `${peer} is outside ${range}`).join(', ')}.`
      );
      continue;
    }
    packages.set(packageName, pkg);
  }

  // Every packed package gets its dependencies before any is imported, since
  // one package's import loads another's packed copy.
  const requiredPeersOf = new Map();
  for (const [packageName, pkg] of packages) {
    const dependencies = Object.keys(pkg.manifest.dependencies ?? {});
    const requiredPeers = Object.keys(
      pkg.manifest.peerDependencies ?? {}
    ).filter(
      (peer) => pkg.manifest.peerDependenciesMeta?.[peer]?.optional !== true
    );

    for (const dependency of dependencies) {
      const packedDependency = packages.get(dependency);
      const installed = installedDependency(pkg, dependency);
      if (packedDependency) {
        linkDirectory(
          packedDependency.dir,
          join(pkg.dir, 'node_modules', dependency)
        );
      } else if (installed) {
        linkDirectory(installed, join(pkg.dir, 'node_modules', dependency));
      } else {
        throw new Error(
          `${packageName}: dependency "${dependency}" is not installed`
        );
      }
    }

    for (const peer of requiredPeers) {
      const installedPeer =
        packages.get(peer)?.dir ?? resolve(repoRoot, 'node_modules', peer);
      if (!existsSync(installedPeer)) {
        throw new Error(
          `${packageName}: required peer "${peer}" is not installed`
        );
      }
      linkDirectory(installedPeer, join(pkg.dir, 'node_modules', peer));
      for (const dependency of dependencies) {
        const packedDependency = packages.get(dependency);
        if (packedDependency?.manifest.peerDependencies?.[peer]) {
          linkDirectory(
            installedPeer,
            join(packedDependency.dir, 'node_modules', peer)
          );
        }
      }
    }
    requiredPeersOf.set(packageName, requiredPeers);
  }

  for (const [packageName, pkg] of packages) {
    const requiredPeers = requiredPeersOf.get(packageName);
    const consumerDir = join(tempDir, 'consumers', packageName);
    linkDirectory(pkg.dir, join(consumerDir, 'node_modules', packageName));
    const specifiers = exportSpecifiers(pkg.manifest);

    // Node loads the CommonJS build.
    execFileSync(
      process.execPath,
      [
        '--eval',
        `${failOnWarning} ${specifiers.map((specifier) => `require('${specifier}');`).join(' ')}`,
      ],
      { cwd: consumerDir, stdio: 'inherit' }
    );

    // The ESM build is for bundlers: each entry must bundle, and the Node bundle must import.
    const bundleDir = join(pkg.dir, '.esm-check');
    for (const [index, specifier] of specifiers.entries()) {
      const platforms = NODE_ONLY_ENTRIES.has(specifier)
        ? ['node']
        : ['node', 'browser'];
      for (const platform of platforms) {
        const outfile = join(bundleDir, `${index}.${platform}.mjs`);
        await bundleEsm(
          specifier,
          consumerDir,
          pkg.manifest,
          platform,
          outfile
        );
        if (platform === 'node') {
          execFileSync(
            process.execPath,
            [
              '--input-type=module',
              '--eval',
              `${failOnWarning} await import(${JSON.stringify(pathToFileURL(outfile).href)})`,
            ],
            { cwd: consumerDir, stdio: 'inherit' }
          );
        }
      }
    }
    rmSync(bundleDir, { force: true, recursive: true });

    const platforms = specifiers.some(
      (specifier) => !NODE_ONLY_ENTRIES.has(specifier)
    )
      ? 'node and browser'
      : 'node';
    console.log(
      `${packageName}: ${specifiers.length} packed entry point(s) require, and bundle as ESM for ${platforms}, with required peers (${requiredPeers.join(', ')}).`
    );
  }

  // Unit tests start the PDF worker from TypeScript source; a consumer gets the packed worker.
  const takumiName = '@elastic/isomer-image-takumi';
  if (packages.has(takumiName)) {
    const takumiConsumerDir = join(tempDir, 'consumers', takumiName);
    const renderPdf = `const backend = createTakumiImageBackend();
const pdf = await backend.pdf({ pages: [{ html: '<div style="width:64px;height:64px;background:red"></div>' }], css: '', width: 64, height: 64 });
await backend.close();
if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error('rendered no PDF');`;
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `${failOnWarning} const { createTakumiImageBackend } = await import('${takumiName}');\n${renderPdf}`,
      ],
      { cwd: takumiConsumerDir, stdio: 'inherit' }
    );
    execFileSync(
      process.execPath,
      [
        '--eval',
        `${failOnWarning} const { createTakumiImageBackend } = require('${takumiName}');\n(async () => {\n${renderPdf}\n})().catch((error) => { console.error(error); process.exit(1); });`,
      ],
      { cwd: takumiConsumerDir, stdio: 'inherit' }
    );
    console.log(
      `${takumiName}: packed import and require each rendered a PDF on the packed worker.`
    );
  }

  // A consumer compiles every published declaration with `skipLibCheck` off,
  // against whichever `@types/react` this install has.
  for (const types of ['node', 'react', 'react-dom']) {
    linkDirectory(
      resolve(repoRoot, 'node_modules', '@types', types),
      join(tempDir, 'node_modules', '@types', types)
    );
  }
  const typesConsumerDir = join(tempDir, 'consumers', 'types');
  const specifiers = [...packages].flatMap(([packageName, pkg]) => {
    linkDirectory(pkg.dir, join(typesConsumerDir, 'node_modules', packageName));
    return exportSpecifiers(pkg.manifest);
  });
  mkdirSync(typesConsumerDir, { recursive: true });
  // takumi's own dependencies publish their subpath types through `exports` alone, which `node10` cannot read.
  const node10Unresolvable = new Set(['@elastic/isomer-image-takumi']);
  const resolutions = [
    ['commonjs', 'node10'],
    ['nodenext', 'nodenext'],
    ['esnext', 'bundler'],
  ];
  for (const [module, moduleResolution] of resolutions) {
    const checked = specifiers.filter(
      (specifier) =>
        moduleResolution !== 'node10' || !node10Unresolvable.has(specifier)
    );
    writeFileSync(
      join(typesConsumerDir, 'index.ts'),
      `${checked.map((specifier, index) => `import type * as entry${index} from '${specifier}';`).join('\n')}\nexport type { ${checked.map((_, index) => `entry${index}`).join(', ')} };\n`
    );
    writeFileSync(
      join(typesConsumerDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module,
          moduleResolution,
          target: 'es2022',
          lib: ['es2023', 'dom'],
          strict: true,
          skipLibCheck: false,
          esModuleInterop: true,
          noEmit: true,
          types: ['node'],
        },
        files: ['index.ts'],
      })
    );
    execFileSync(process.execPath, [tsc, '-p', typesConsumerDir], {
      stdio: 'inherit',
    });
    console.log(
      `Packed declarations of ${checked.length} entry points compile under ${moduleResolution} resolution.`
    );
  }

  // `assertPackRegistrationComplete` loads files by itself, so each module
  // system's build must load a primitive directory.
  const sdkName = '@elastic/isomer-sdk';
  const sdkConsumerDir = join(tempDir, 'consumers', sdkName);
  const primitivesDir = join(tempDir, 'registration', 'primitives');
  mkdirSync(join(primitivesDir, 'demo'), { recursive: true });
  writeFileSync(
    join(primitivesDir, 'demo', 'index.ts'),
    "exports.demoPrimitive = { type: 'demo', catalog: {}, schema: {}, renderers: {} };\n"
  );
  const registrationCall = `assertPackRegistrationComplete({ primitivesDir: ${JSON.stringify(relative(sdkConsumerDir, primitivesDir))}, registered: [{ type: 'demo' }] })`;
  // Node strips TypeScript by default only from 22.18.
  const stripTypes = process.features.typescript
    ? []
    : ['--experimental-strip-types'];
  const testingBundle = join(
    packages.get(sdkName).dir,
    '.esm-check',
    'testing.node.mjs'
  );
  await bundleEsm(
    `${sdkName}/testing`,
    sdkConsumerDir,
    packages.get(sdkName).manifest,
    'node',
    testingBundle
  );
  execFileSync(
    process.execPath,
    [
      ...stripTypes,
      '--input-type=module',
      '--eval',
      `const { assertPackRegistrationComplete } = await import(${JSON.stringify(pathToFileURL(testingBundle).href)}); await ${registrationCall};`,
    ],
    { cwd: sdkConsumerDir, stdio: 'inherit' }
  );
  execFileSync(
    process.execPath,
    [
      ...stripTypes,
      '--eval',
      `const { assertPackRegistrationComplete } = require('${sdkName}/testing'); ${registrationCall}.catch((error) => { console.error(error); process.exit(1); });`,
    ],
    { cwd: sdkConsumerDir, stdio: 'inherit' }
  );
  console.log(
    `${sdkName}: packed assertPackRegistrationComplete loaded primitives through an ESM bundle and require.`
  );
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
