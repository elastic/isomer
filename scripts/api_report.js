/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Writes `api/<package>.api.md`: every declaration each published entry
// exports, as the built `.d.ts` states it, plus the unexported declarations
// those signatures reference. `--check` fails when a committed report is stale.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

import { repoRoot, workspacePackages } from './workspace_packages.js';

const check = process.argv.includes('--check');
const reportDir = join(repoRoot, 'api');

const publishing = workspacePackages().filter(
  ({ manifest }) => manifest.private !== true
);

/** `types` of an export condition, at any nesting depth. */
const typesOf = (condition) => {
  if (typeof condition !== 'object' || condition === null) {
    return undefined;
  }
  if (typeof condition.types === 'string') {
    return condition.types;
  }
  for (const value of Object.values(condition)) {
    const types = typesOf(value);
    if (types) {
      return types;
    }
  }
  return undefined;
};

const entriesOf = ({ dir, manifest }) =>
  Object.entries(manifest.exports ?? {}).flatMap(([key, condition]) => {
    const types = typesOf(condition);
    if (!types) {
      return [];
    }
    const file = resolve(dir, types);
    if (!existsSync(file)) {
      throw new Error(
        `${manifest.name}: ${types} is missing. Run \`pnpm build\` before this report.`
      );
    }
    return [
      {
        specifier:
          key === '.' ? manifest.name : `${manifest.name}/${key.slice(2)}`,
        file,
      },
    ];
  });

const entries = publishing.map((pkg) => ({ pkg, entries: entriesOf(pkg) }));

const program = ts.createProgram(
  entries.flatMap(({ entries: list }) => list.map(({ file }) => file)),
  {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    noEmit: true,
    skipLibCheck: true,
    types: ['node'],
  }
);
const checker = program.getTypeChecker();
const printer = ts.createPrinter({
  removeComments: true,
  newLine: ts.NewLineKind.LineFeed,
});

const distDirs = publishing.map(({ dir }) => `${join(dir, 'dist')}${sep}`);
const isPublishedDeclaration = (node) => {
  const fileName = resolve(node.getSourceFile().fileName);
  return distDirs.some((dist) => fileName.startsWith(dist));
};

const resolveAlias = (symbol) =>
  symbol.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;

/** The statement a declaration prints as: a variable's whole `declare const`. */
const statementOf = (declaration) =>
  ts.isVariableDeclaration(declaration)
    ? declaration.parent.parent
    : declaration;

const stripModifiers = (text) =>
  text.replace(/^(export )?(default )?(declare )?/, '');

const printDeclaration = (declaration) =>
  stripModifiers(
    printer.printNode(
      ts.EmitHint.Unspecified,
      statementOf(declaration),
      declaration.getSourceFile()
    )
  );

/** Symbols a declaration's printed text names, through type and value references alike. */
const referencedSymbols = (declaration) => {
  const found = new Set();
  const visit = (node) => {
    if (
      ts.isTypeReferenceNode(node) ||
      ts.isExpressionWithTypeArguments(node) ||
      ts.isTypeQueryNode(node)
    ) {
      const name = ts.isTypeReferenceNode(node)
        ? node.typeName
        : ts.isTypeQueryNode(node)
          ? node.exprName
          : node.expression;
      const symbol = checker.getSymbolAtLocation(
        ts.isQualifiedName(name) ? name.left : name
      );
      if (symbol && !(symbol.flags & ts.SymbolFlags.TypeParameter)) {
        found.add(resolveAlias(symbol));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(statementOf(declaration));
  return found;
};

/** Every symbol an entry of any published package exports. */
const exported = new Set(
  entries.flatMap(({ entries: list }) =>
    list.flatMap(({ file }) => {
      const moduleSymbol = checker.getSymbolAtLocation(
        program.getSourceFile(file)
      );
      return moduleSymbol
        ? checker.getExportsOfModule(moduleSymbol).map(resolveAlias)
        : [];
    })
  )
);

/** The first bare specifier an alias chain re-exports from, with the name it imports there. */
const externalSourceOf = (alias) => {
  for (
    let current = alias;
    current && current.flags & ts.SymbolFlags.Alias;
    current = checker.getImmediateAliasedSymbol(current)
  ) {
    for (const declaration of current.declarations ?? []) {
      const statement = ts.findAncestor(
        declaration,
        (node) => ts.isExportDeclaration(node) || ts.isImportDeclaration(node)
      );
      const specifier = statement?.moduleSpecifier;
      if (
        specifier &&
        ts.isStringLiteral(specifier) &&
        !specifier.text.startsWith('.')
      ) {
        const imported =
          (ts.isExportSpecifier(declaration) ||
            ts.isImportSpecifier(declaration)) &&
          declaration.propertyName
            ? declaration.propertyName.text
            : declaration.name?.text;
        return { module: specifier.text, imported };
      }
    }
  }
  return undefined;
};

const printSymbol = (symbol) =>
  (symbol.declarations ?? [])
    .filter(isPublishedDeclaration)
    .map(printDeclaration)
    .join('\n');

const printExport = (alias) => {
  const target = resolveAlias(alias);
  const { name } = alias;
  if ((target.declarations ?? []).some(isPublishedDeclaration)) {
    const text = printSymbol(target);
    return target.name === name || target.name === 'default'
      ? text
      : `// exported as \`${name}\`\n${text}`;
  }
  const source = externalSourceOf(alias);
  const imported = source?.imported ?? name;
  const binding = imported === name ? name : `${imported} as ${name}`;
  return `export { ${binding} } from '${source?.module ?? 'unknown'}';`;
};

const reportFor = ({ pkg, entries: list }) => {
  const sections = list.map(({ specifier, file }) => {
    const moduleSymbol = checker.getSymbolAtLocation(
      program.getSourceFile(file)
    );
    const exports = moduleSymbol
      ? checker.getExportsOfModule(moduleSymbol)
      : [];
    const printed = [...exports]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(printExport);

    // Unexported declarations a public signature names, so a change to one shows here too.
    const seen = new Set();
    const queue = exports.map(resolveAlias);
    const unexported = [];
    while (queue.length > 0) {
      const symbol = queue.shift();
      for (const declaration of symbol.declarations ?? []) {
        if (!isPublishedDeclaration(declaration)) {
          continue;
        }
        for (const referenced of referencedSymbols(declaration)) {
          if (seen.has(referenced)) {
            continue;
          }
          seen.add(referenced);
          const own = (referenced.declarations ?? []).some(
            isPublishedDeclaration
          );
          if (!own) {
            continue;
          }
          if (!exported.has(referenced)) {
            unexported.push(referenced);
          }
          queue.push(referenced);
        }
      }
    }
    const unexportedText = [
      ...new Set(
        unexported.sort((a, b) => a.name.localeCompare(b.name)).map(printSymbol)
      ),
    ];

    return [
      `## \`${specifier}\``,
      '',
      '```ts',
      printed.join('\n\n'),
      '```',
      ...(unexportedText.length > 0
        ? [
            '',
            '### Referenced, not exported',
            '',
            '```ts',
            unexportedText.join('\n\n'),
            '```',
          ]
        : []),
    ].join('\n');
  });

  return [
    `# \`${pkg.manifest.name}\` API report`,
    '',
    `Generated by \`pnpm api:report\` from the built declarations. Do not edit.`,
    '',
    sections.join('\n\n'),
    '',
  ].join('\n');
};

const stale = [];
if (!check) {
  mkdirSync(reportDir, { recursive: true });
}
for (const item of entries) {
  const path = join(reportDir, `${item.pkg.folder}.api.md`);
  const report = reportFor(item);
  if (check) {
    if (!existsSync(path) || readFileSync(path, 'utf-8') !== report) {
      stale.push(relative(repoRoot, path));
    }
  } else {
    writeFileSync(path, report);
  }
}

if (stale.length > 0) {
  console.error(
    `API report out of date: ${stale.join(', ')}.\n` +
      'Run `pnpm build && pnpm api:report` and commit the result. A changed signature in a published package is a breaking change unless it only widens what callers may pass or narrows what they get back.'
  );
  process.exit(1);
}

console.log(
  check
    ? 'API reports are current.'
    : `Wrote ${entries.length} API report(s) to ${relative(repoRoot, reportDir)}/.`
);
