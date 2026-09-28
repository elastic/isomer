/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// One import-specifier scanner for every script that walks emitted JavaScript or declarations.
// It parses with TypeScript, so strings, template interpolations, regex literals, and comments read as they run.

import ts from 'typescript';

const literalText = (node) =>
  node !== undefined &&
  (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;

const scan = (source) => {
  const specifiers = [];
  let computed = false;
  const add = (node) => {
    const text = literalText(node);
    if (text !== undefined) {
      specifiers.push(text);
    }
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      add(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      add(node.moduleReference.expression);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument)
    ) {
      add(node.argument.literal);
    } else if (ts.isCallExpression(node)) {
      const [argument] = node.arguments;
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        if (literalText(argument) === undefined) {
          computed = true;
        }
        add(argument);
      } else if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'require'
      ) {
        add(argument);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(
    ts.createSourceFile('scanned.ts', source, ts.ScriptTarget.Latest, false)
  );
  return { specifiers, computed };
};

/** Every static, dynamic, `import()` type, and `require` specifier in `source`. */
export const specifiersIn = (source) => scan(source).specifiers;

/** Whether `source` has an `import()` whose argument is not a string literal, which names a module no scan can see. */
export const hasComputedImport = (source) => scan(source).computed;
