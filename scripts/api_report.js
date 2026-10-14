/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Writes `api/<package>.api.md`: every declaration each published entry
// exports, as the built `.d.ts` states it, plus the unexported declarations
// those signatures reference. `--check` fails when a committed report is stale.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import ts from 'typescript';

import { repoRoot, workspacePackages } from './workspace_packages.js';

const REPORT_SUFFIX = '.api.md';

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

/** The statement a declaration prints as: a variable's whole `declare const`. */
const statementOf = (declaration) =>
  ts.isVariableDeclaration(declaration)
    ? declaration.parent.parent
    : declaration;

const stripModifiers = (text) =>
  text.replace(/^(export )?(default )?(declare )?/, '');

const isTypeOnlyAlias = (alias) =>
  (alias.declarations ?? []).some(
    (declaration) =>
      ts.isExportSpecifier(declaration) &&
      (declaration.isTypeOnly || declaration.parent.parent.isTypeOnly)
  );

/**
 * Report text for each package, keyed by `<folder>.api.md`.
 *
 * @param {Array<{ dir: string; folder: string; manifest: import('./workspace_packages.js').PackageManifest }>} packages
 * @returns {Map<string, string>}
 */
export const createApiReports = (packages) => {
  const entries = packages.map((pkg) => ({ pkg, entries: entriesOf(pkg) }));
  const program = ts.createProgram(
    entries.flatMap(({ entries: list }) => list.map(({ file }) => file)),
    {
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ES2022,
      noEmit: true,
      skipLibCheck: true,
      types: [],
    }
  );
  const checker = program.getTypeChecker();
  const printer = ts.createPrinter({
    removeComments: true,
    newLine: ts.NewLineKind.LineFeed,
  });

  const distDirs = packages.map(({ dir }) => `${join(dir, 'dist')}${sep}`);
  const isPublishedDeclaration = (node) => {
    const fileName = resolve(node.getSourceFile().fileName);
    return distDirs.some((dist) => fileName.startsWith(dist));
  };
  const isOwn = (symbol) =>
    (symbol.declarations ?? []).some(isPublishedDeclaration);

  /** A symbol's name, with a module's absolute path replaced by its package-relative specifier. */
  const displayName = (symbol) => {
    const sourceFile = symbol.declarations?.find(ts.isSourceFile);
    if (!sourceFile) {
      return symbol.name;
    }
    const fileName = resolve(sourceFile.fileName);
    const pkg = packages.find(({ dir }) =>
      fileName.startsWith(`${join(dir, 'dist')}${sep}`)
    );
    return pkg
      ? `${pkg.manifest.name}/${relative(pkg.dir, fileName).split(sep).join('/')}`
      : symbol.name;
  };

  const resolveAlias = (symbol) =>
    symbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;

  const exportsOf = (file) => {
    const moduleSymbol = checker.getSymbolAtLocation(
      program.getSourceFile(file)
    );
    return moduleSymbol ? checker.getExportsOfModule(moduleSymbol) : [];
  };

  const printDeclaration = (declaration) =>
    stripModifiers(
      printer.printNode(
        ts.EmitHint.Unspecified,
        statementOf(declaration),
        declaration.getSourceFile()
      )
    );

  const printSymbol = (symbol) =>
    (symbol.declarations ?? [])
      .filter(isPublishedDeclaration)
      .map(printDeclaration)
      .join('\n');

  /** The node naming another declaration, for each way a `.d.ts` can name one. */
  const referenceName = (node) => {
    if (ts.isTypeReferenceNode(node)) {
      return node.typeName;
    }
    if (ts.isTypeQueryNode(node)) {
      return node.exprName;
    }
    if (ts.isExpressionWithTypeArguments(node)) {
      return node.expression;
    }
    if (ts.isComputedPropertyName(node)) {
      return node.expression;
    }
    if (ts.isImportTypeNode(node)) {
      return node.qualifier;
    }
    return undefined;
  };

  const symbolAt = (node) => {
    const symbol = node && checker.getSymbolAtLocation(node);
    return symbol && !(symbol.flags & ts.SymbolFlags.TypeParameter)
      ? resolveAlias(symbol)
      : undefined;
  };

  /**
   * Each name a declaration's printed text uses: the leading identifier and
   * what it binds to, and the declaration the whole name, `Types.Input`, reaches.
   */
  const references = (declaration) => {
    const found = [];
    const visit = (node) => {
      const name = referenceName(node);
      let head = name;
      while (
        head &&
        (ts.isQualifiedName(head) || ts.isPropertyAccessExpression(head))
      ) {
        head = ts.isQualifiedName(head) ? head.left : head.expression;
      }
      const bound = symbolAt(head);
      if (bound) {
        found.push({
          local: head.getText(),
          bound,
          target: symbolAt(name) ?? bound,
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(statementOf(declaration));
    return found;
  };

  /** Whether a symbol is declared as a statement of a file or namespace, not a module or a member. */
  const isTopLevel = (symbol) =>
    (symbol.declarations ?? []).some((declaration) => {
      const { parent } = statementOf(declaration);
      return (
        !ts.isSourceFile(declaration) &&
        (ts.isSourceFile(parent) || ts.isModuleBlock(parent))
      );
    });

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

  const printExport = (alias) => {
    const target = resolveAlias(alias);
    const { name } = alias;
    const notes = [
      ...(isOwn(target) && target.name !== name
        ? [`exported as \`${name}\``]
        : []),
      ...(isTypeOnlyAlias(alias) && target.flags & ts.SymbolFlags.Value
        ? ['type-only export']
        : []),
    ];
    let text;
    if (isOwn(target)) {
      text = printSymbol(target);
    } else {
      const source = externalSourceOf(alias);
      const imported = source?.imported ?? name;
      const binding = imported === name ? name : `${imported} as ${name}`;
      text = `export { ${binding} } from '${source?.module ?? 'unknown'}';`;
    }
    return notes.length > 0 ? `// ${notes.join('; ')}\n${text}` : text;
  };

  const exported = new Set(
    entries.flatMap(({ entries: list }) =>
      list.flatMap(({ file }) => exportsOf(file).map(resolveAlias))
    )
  );

  /**
   * Unexported declarations a public signature names, transitively, and each
   * local name there that differs from the declaration it binds to.
   */
  const signatureReferences = (exports) => {
    const seen = new Set();
    const queue = exports.map(resolveAlias);
    const unexported = [];
    const renamed = new Set();
    while (queue.length > 0) {
      const symbol = queue.shift();
      for (const declaration of symbol.declarations ?? []) {
        if (!isPublishedDeclaration(declaration)) {
          continue;
        }
        for (const { local, bound, target } of references(declaration)) {
          if (isOwn(bound) && local !== displayName(bound)) {
            renamed.add(`${local} = ${displayName(bound)}`);
          }
          // A whole module, as in `typeof Types`, stands for every declaration it exports.
          const reached = [bound, target].flatMap((symbol) =>
            symbol.declarations?.some(ts.isSourceFile)
              ? checker.getExportsOfModule(symbol).map(resolveAlias)
              : [symbol]
          );
          for (const referenced of new Set(reached)) {
            if (
              !isOwn(referenced) ||
              !isTopLevel(referenced) ||
              seen.has(referenced)
            ) {
              continue;
            }
            seen.add(referenced);
            if (!exported.has(referenced)) {
              unexported.push(referenced);
            }
            queue.push(referenced);
          }
        }
      }
    }
    return {
      unexported: [
        ...new Set(
          unexported
            .sort((a, b) => displayName(a).localeCompare(displayName(b)))
            .map(printSymbol)
        ),
      ],
      renamed: [...renamed].sort(),
    };
  };

  const reportFor = ({ pkg, entries: list }) => {
    const sections = list.map(({ specifier, file }) => {
      const exports = exportsOf(file);
      const printed = [...exports]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(printExport);
      const { unexported, renamed } = signatureReferences(exports);
      const block = (title, lines) =>
        lines.length > 0
          ? ['', `### ${title}`, '', '```ts', ...lines, '```']
          : [];
      return [
        `## \`${specifier}\``,
        '',
        '```ts',
        printed.join('\n\n'),
        '```',
        ...block(
          'Referenced, not exported',
          [unexported.join('\n\n')].filter(Boolean)
        ),
        ...block('Names bound under another name', renamed),
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

  return new Map(
    entries.map((item) => [
      `${item.pkg.folder}${REPORT_SUFFIX}`,
      reportFor(item),
    ])
  );
};

/**
 * Committed reports that differ from `reports`, are missing, or belong to no published package.
 *
 * @param {string} reportDir
 * @param {Map<string, string>} reports
 */
export const staleApiReports = (reportDir, reports) => {
  const committed = existsSync(reportDir)
    ? readdirSync(reportDir).filter((file) => file.endsWith(REPORT_SUFFIX))
    : [];
  return [
    ...[...reports].flatMap(([file, report]) => {
      const path = join(reportDir, file);
      return existsSync(path) && readFileSync(path, 'utf-8') === report
        ? []
        : [file];
    }),
    ...committed.filter((file) => !reports.has(file)),
  ].sort();
};

const main = () => {
  const check = process.argv.includes('--check');
  const reportDir = join(repoRoot, 'api');
  const reports = createApiReports(
    workspacePackages().filter(({ manifest }) => manifest.private !== true)
  );

  if (check) {
    const stale = staleApiReports(reportDir, reports);
    if (stale.length > 0) {
      console.error(
        `API report out of date: ${stale.map((file) => `api/${file}`).join(', ')}.\n` +
          'Run `pnpm build && pnpm api:report` and commit the result. A changed signature in a published package is a breaking change unless it only widens what callers may pass or narrows what they get back.'
      );
      process.exit(1);
    }
    console.log('API reports are current.');
    return;
  }

  mkdirSync(reportDir, { recursive: true });
  for (const file of staleApiReports(reportDir, reports)) {
    if (!reports.has(file)) {
      rmSync(join(reportDir, file));
    }
  }
  for (const [file, report] of reports) {
    writeFileSync(join(reportDir, file), report);
  }
  console.log(
    `Wrote ${reports.size} API report(s) to ${relative(repoRoot, reportDir)}/.`
  );
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
