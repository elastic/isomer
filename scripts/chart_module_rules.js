/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The charts pack's module rules. Its contract entries load where React and a
// DOM cannot, and renderers read only the Scene: a renderer that formats,
// validates or resolves would decide something the Scene already decided.

import { dirname, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

export const CHARTS = '@elastic/isomer-primitives-charts';

/** The charts entries that must load on Hermes, and what they may never reach. */
export const CONTRACT_ENTRIES = ['./schema', './scene'];

/**
 * Bare specifiers a contract entry may not reach. A string covers its
 * subpaths; `{ exact }` covers only itself, so `@elastic/isomer-sdk/schema`
 * stays allowed while the SDK root, which reaches React, does not.
 */
export const CONTRACT_FORBIDDEN = [
  'react',
  'react-dom',
  '@elastic/charts',
  '@elastic/isomer-runtime',
  { exact: '@elastic/isomer-sdk' },
  '@elastic/isomer-sdk/html',
  '@elastic/isomer-sdk/react',
  '@elastic/isomer-sdk/author',
  '@elastic/isomer-sdk/testing',
];

export const matchesForbidden = (specifier, rule) =>
  typeof rule === 'string'
    ? specifier === rule || specifier.startsWith(`${rule}/`)
    : specifier === rule.exact;

/** Charts-pack directories that hold renderers, relative to the package. */
export const CHARTS_RENDERER_DIRS = ['src/svg'];

/** Workspace packages whose names start with this are chart engines. */
export const ENGINE_PACKAGE_PREFIX = '@elastic/isomer-charts-';

/** What a renderer may read from the charts pack: the Scene, nothing that builds one. */
const RENDERER_SCENE_ENTRY = `${CHARTS}/scene`;
const RENDERER_SOURCES = ['scene/types', 'scene/events'];

const SOURCE = /\.[cm]?[jt]sx?$/;

const withoutExtension = (path) => path.replace(SOURCE, '');

/**
 * Why a renderer file's import breaks the rule, or `undefined`.
 *
 * `file` is absolute; `chartsSrc` is the charts pack's absolute `src`, so a
 * relative import inside the pack can be resolved against it.
 */
export const rendererViolation = (specifier, file, chartsSrc) => {
  if (specifier === CHARTS || specifier.startsWith(`${CHARTS}/`)) {
    return specifier === RENDERER_SCENE_ENTRY
      ? undefined
      : `"${specifier}": a renderer reads only ${RENDERER_SCENE_ENTRY}`;
  }
  if (!specifier.startsWith('.') || chartsSrc === undefined) {
    return undefined;
  }
  const target = withoutExtension(resolve(dirname(file), specifier));
  const fromSrc = relative(chartsSrc, target).split(sep).join('/');
  if (fromSrc.startsWith('..')) {
    return undefined;
  }
  const ownDir = relative(chartsSrc, dirname(file)).split(sep)[0];
  if (fromSrc.split('/')[0] === ownDir || RENDERER_SOURCES.includes(fromSrc)) {
    return undefined;
  }
  return `"${specifier}" (src/${fromSrc}): a renderer reads only the Scene types`;
};

const RESOLVER_VALUES = new Set([
  'resolveChart',
  'resolveColor',
  'categoricalColor',
  'CATEGORICAL_PALETTE',
  'CHART_CHROME',
  'metricSingleValueScene',
  'xyInteractiveScene',
  'xyTimeSeriesScene',
]);

const sceneBindings = (source, file) => {
  const tree = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const violations = [];
  const record = () =>
    violations.push({
      file,
      specifier: RENDERER_SCENE_ENTRY,
      reason: `"${RENDERER_SCENE_ENTRY}": import only Scene types and event helpers`,
    });
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier?.text === RENDERER_SCENE_ENTRY
    ) {
      const clause = ts.isImportDeclaration(node) ? node.importClause : node;
      const bindings = ts.isImportDeclaration(node)
        ? clause?.namedBindings
        : node.exportClause;
      if (clause?.isTypeOnly) {
        return;
      }
      if (!bindings || !('elements' in bindings) || clause?.name) {
        record();
      } else if (
        bindings.elements.some((binding) => {
          const name = (binding.propertyName ?? binding.name).text;
          return !binding.isTypeOnly && RESOLVER_VALUES.has(name);
        })
      ) {
        record();
      }
    } else if (
      ts.isCallExpression(node) &&
      node.arguments[0]?.text === RENDERER_SCENE_ENTRY &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        node.expression.getText(tree) === 'require')
    ) {
      record();
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression?.text === RENDERER_SCENE_ENTRY
    ) {
      record();
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return violations;
};

/** Every violation in `files`, each `{ file, specifier, reason }`. */
export const rendererViolations = (
  files,
  specifiersOf,
  chartsSrc,
  sourceOf = () => ''
) =>
  files.flatMap((file) => [
    ...specifiersOf(file).flatMap((specifier) => {
      const reason = rendererViolation(specifier, file, chartsSrc);
      return reason ? [{ file, specifier, reason }] : [];
    }),
    ...sceneBindings(sourceOf(file), file),
  ]);

/** The renderer source files in a charts pack directory or engine package, tests excluded. */
export const isRendererSource = (file) =>
  SOURCE.test(file) &&
  !/\.(test|fixtures)\.[cm]?[jt]sx?$/.test(file) &&
  !file.endsWith('.d.ts');
