/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Bundles each entry the way a React Native app's bundler would (non-DOM target,
// `react-native` condition, `.native.*` files first) and fails if the bundle
// reaches code that Hermes can't load: react-dom, Node built-ins, Elastic
// Charts, the Isomer runtime root, the MessageChannel or structuredClone
// globals, top-level await, or import.meta.
//
//   node scripts/check_hermes_imports.js [options] <entry>...
//
//   --ban <specifier>        also forbid a module (and its subpaths); repeatable
//   --ban-global <name>      also forbid a global; repeatable
//   --allow-global <path>    ignore banned globals in modules whose path contains <path>
//   --condition <name>       extra package.json export condition; repeatable
//   --json                   print the result as JSON
//
// Exit 0: every entry is clean. 1: violations. 2: usage error or esbuild missing.

import { existsSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

/** Modules unreachable from a Hermes-safe entry. Each covers its subpaths unless `exact`. */
export const BANNED_MODULES = [
  { specifier: 'react-dom', reason: 'needs a DOM' },
  { specifier: '@elastic/charts', reason: 'needs a DOM' },
  {
    specifier: '@elastic/isomer-runtime',
    exact: true,
    reason: 'the runtime root, which reaches react-dom/server',
  },
];

export const BANNED_GLOBALS = [
  'MessageChannel',
  'structuredClone',
  'document',
  'window',
  'HTMLElement',
  'Element',
  'Node',
  'HTMLCanvasElement',
  'CanvasRenderingContext2D',
  'DOMParser',
  'XMLSerializer',
  'MutationObserver',
  'ResizeObserver',
  'IntersectionObserver',
];

const NODE_BUILTINS = new Set(
  builtinModules.filter((name) => !name.startsWith('_'))
);

const GLOBAL_OWNERS = ['globalThis', 'global', 'self', 'window'];

const MARKER_PREFIX = '__hermes_banned_global__';

const RESOLVE_EXTENSIONS = [
  '.native.tsx',
  '.native.ts',
  '.native.jsx',
  '.native.js',
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
];

const matchesSpecifier = (specifier, { specifier: banned, exact }) =>
  specifier === banned || (!exact && specifier.startsWith(`${banned}/`));

/** Why `specifier` is banned, or undefined. */
export const bannedReason = (specifier, extraBans = []) => {
  if (specifier.startsWith('node:')) {
    return 'Node built-in';
  }
  const [head] = specifier.split('/');
  if (NODE_BUILTINS.has(head) || NODE_BUILTINS.has(specifier)) {
    return 'Node built-in';
  }
  const rule = [
    ...BANNED_MODULES,
    ...extraBans.map((ban) => ({ specifier: ban, reason: 'banned by --ban' })),
  ].find((candidate) => matchesSpecifier(specifier, candidate));
  return rule ? `${rule.specifier}: ${rule.reason}` : undefined;
};

/**
 * esbuild's `define` rewrites only free references to a global (and the
 * `globalThis.X` forms), never shadowed locals, property names or strings. So
 * each banned global becomes a marker identifier that can be found in the
 * output and traced to its module.
 */
const globalDefines = (globals) =>
  Object.fromEntries(
    globals.flatMap((name, index) => {
      const marker = `${MARKER_PREFIX}${index}`;
      return [
        [name, marker],
        ...GLOBAL_OWNERS.map((owner) => [`${owner}.${name}`, marker]),
      ];
    })
  );

const namespaceGlobals = (text, globals) => {
  const file = '/hermes-bundle.js';
  const tree = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  const options = { allowJs: true, noLib: true, noResolve: true };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (name) => (name === file ? tree : undefined);
  const checker = ts.createProgram([file], options, host).getTypeChecker();
  const reads = [];
  const namespace = (node, seen = new Set()) => {
    if (!node || !ts.isIdentifier(node) || seen.has(node)) {
      return false;
    }
    seen.add(node);
    const symbol = checker.getSymbolAtLocation(node);
    const declarations = symbol?.declarations ?? [];
    if (GLOBAL_OWNERS.includes(node.text) && declarations.length === 0) {
      return true;
    }
    return declarations.some(
      (declaration) =>
        ts.isVariableDeclaration(declaration) &&
        namespace(declaration.initializer, seen)
    );
  };
  const property = (name) => {
    if (ts.isComputedPropertyName(name)) {
      return ts.isStringLiteral(name.expression)
        ? name.expression.text
        : undefined;
    }
    return name.text;
  };
  const record = (name, node) => {
    if (globals.includes(name)) {
      reads.push({
        name,
        line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line,
      });
    }
  };
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      namespace(node.initializer)
    ) {
      for (const element of node.name.elements) {
        record(property(element.propertyName ?? element.name), node);
      }
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isObjectLiteralExpression(node.left) &&
      namespace(node.right)
    ) {
      for (const element of node.left.properties) {
        if (element.name) {
          record(property(element.name), node);
        }
      }
    } else if (
      ts.isPropertyAccessExpression(node) &&
      namespace(node.expression)
    ) {
      record(node.name.text, node);
    } else if (
      ts.isElementAccessExpression(node) &&
      namespace(node.expression) &&
      ts.isStringLiteral(node.argumentExpression)
    ) {
      record(node.argumentExpression.text, node);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return reads;
};

const location = (message) =>
  message.location
    ? `${message.location.file}:${message.location.line}:${message.location.column}`
    : undefined;

/** Bundles one entry and returns its violations. */
export const checkEntry = async (esbuild, entry, options = {}) => {
  const {
    bans = [],
    globals = [],
    allowGlobalIn = [],
    conditions = [],
  } = options;
  const bannedGlobals = [...BANNED_GLOBALS, ...globals];
  const violations = [];
  const record = (kind, detail, where) => {
    if (
      !violations.some(
        (v) => v.kind === kind && v.detail === detail && v.where === where
      )
    ) {
      violations.push({ kind, detail, where });
    }
  };

  const guard = {
    name: 'hermes-import-guard',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === 'entry-point') {
          return undefined;
        }
        const reason = bannedReason(args.path, bans);
        if (!reason) {
          return undefined;
        }
        record(
          'import',
          `"${args.path}" (${reason})`,
          relative(process.cwd(), args.importer)
        );
        return { path: args.path, external: true };
      });
    },
  };

  let result;
  try {
    result = await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      write: false,
      // `iife` is what a Metro bundle is: esbuild rejects top-level await and
      // empties `import.meta` for it, so both surface as messages.
      format: 'iife',
      platform: 'neutral',
      mainFields: ['react-native', 'browser', 'module', 'main'],
      conditions: ['react-native', ...conditions],
      resolveExtensions: RESOLVE_EXTENSIONS,
      jsx: 'automatic',
      target: 'esnext',
      minify: false,
      metafile: true,
      logLevel: 'silent',
      define: globalDefines(bannedGlobals),
      plugins: [guard],
    });
  } catch (error) {
    if (!Array.isArray(error.errors)) {
      throw error;
    }
    for (const message of error.errors) {
      if (/top-level await/i.test(message.text)) {
        record('syntax', 'top-level await', location(message));
      } else {
        record('build', message.text, location(message));
      }
    }
    return { entry, violations, modules: 0, bytes: 0 };
  }

  for (const warning of result.warnings) {
    if (
      warning.id === 'empty-import-meta' ||
      /import\.meta/.test(warning.text)
    ) {
      record('syntax', 'import.meta', location(warning));
    }
  }

  // Unminified esbuild output starts each module with a `// <path>` comment.
  const text = result.outputFiles[0].text;
  const markerPattern = new RegExp(`${MARKER_PREFIX}(\\d+)`, 'g');
  const namespaceReads = new Map();
  for (const { name, line } of namespaceGlobals(text, bannedGlobals)) {
    namespaceReads.set(line, [...(namespaceReads.get(line) ?? []), name]);
  }
  let module = relative(process.cwd(), entry);
  for (const [index, line] of text.split('\n').entries()) {
    const header = /^\s*\/\/ (\S+)$/.exec(line);
    if (header) {
      module = header[1];
      continue;
    }
    for (const name of namespaceReads.get(index) ?? []) {
      if (!allowGlobalIn.some((allowed) => module.includes(allowed))) {
        record('global', name, module);
      }
    }
    for (const match of line.matchAll(markerPattern)) {
      if (!allowGlobalIn.some((allowed) => module.includes(allowed))) {
        record('global', bannedGlobals[Number(match[1])], module);
      }
    }
  }

  return {
    entry,
    violations,
    modules: Object.keys(result.metafile.inputs).length,
    bytes: Buffer.byteLength(text),
  };
};

export const parseArgs = (argv) => {
  const options = {
    bans: [],
    globals: [],
    allowGlobalIn: [],
    conditions: [],
    entries: [],
    json: false,
  };
  const flags = {
    '--ban': 'bans',
    '--ban-global': 'globals',
    '--allow-global': 'allowGlobalIn',
    '--condition': 'conditions',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg in flags) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`${arg} needs a value`);
      }
      options[flags[arg]].push(value);
      i += 1;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg.startsWith('--')) {
      throw new Error(`unknown option ${arg}`);
    } else {
      options.entries.push(resolve(arg));
    }
  }
  if (options.entries.length === 0) {
    throw new Error('no entries given');
  }
  return options;
};

const USAGE =
  'usage: node scripts/check_hermes_imports.js [--ban <specifier>] [--ban-global <name>] [--allow-global <path>] [--condition <name>] [--json] <entry>...';

const main = async () => {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`${error.message}\n${USAGE}`);
    return 2;
  }
  const missing = options.entries.filter((entry) => !existsSync(entry));
  if (missing.length > 0) {
    console.error(`entry not found: ${missing.join(', ')}`);
    return 2;
  }
  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch {
    console.error('check_hermes_imports needs esbuild as a devDependency');
    return 2;
  }

  const results = [];
  for (const entry of options.entries) {
    results.push(await checkEntry(esbuild, entry, options));
  }
  const failed = results.some((result) => result.violations.length > 0);

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const { entry, violations, modules, bytes } of results) {
      const label = relative(process.cwd(), entry);
      if (violations.length === 0) {
        console.log(`ok   ${label} (${modules} modules, ${bytes} bytes)`);
        continue;
      }
      console.error(`FAIL ${label}`);
      for (const { kind, detail, where } of violations) {
        console.error(`  - ${kind}: ${detail}${where ? ` at ${where}` : ''}`);
      }
    }
    console.log(
      failed
        ? 'Hermes import check failed.'
        : `Hermes import check passed: ${results.length} entry point(s).`
    );
  }
  return failed ? 1 : 0;
};

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = await main();
}
