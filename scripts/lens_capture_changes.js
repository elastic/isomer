/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Describes how a Lens comparison capture moved from the fixtures before it, for the recapture workflow's pull request.
// Usage: node scripts/lens_capture_changes.js <before> <after> <body.md>; prints `material=true|false`.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Changes listed per case before the rest are counted. */
const PATHS_SHOWN = 12;
/** GitHub rejects a pull request body over 65,536 characters. */
const BODY_LIMIT = 60_000;

/**
 * Every file under `directory`, as its relative path and SHA-256.
 *
 * @param {string} directory
 * @returns {Map<string, string>}
 */
const digests = (directory) => {
  const files = new Map();
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        walk(path);
      } else {
        files.set(
          relative(directory, path),
          createHash('sha256').update(readFileSync(path)).digest('hex')
        );
      }
    }
  };
  walk(directory);
  return files;
};

/**
 * A fixtures folder as its cases and file digests.
 *
 * @param {string} directory
 */
export const readCapture = (directory) => {
  const files = digests(directory);
  const cases = new Map();
  for (const path of files.keys()) {
    const [id, name] = path.split('/');
    if (name === 'case.json') {
      cases.set(id, JSON.parse(readFileSync(join(directory, path), 'utf8')));
    }
  }
  return { cases, files };
};

const isObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The leaf paths at which `before` and `after` differ, with both values.
 *
 * @returns {{ path: string, before: unknown, after: unknown }[]}
 */
export const leafChanges = (before, after, path = '') => {
  if (
    (isObject(before) && isObject(after)) ||
    (Array.isArray(before) && Array.isArray(after))
  ) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    return keys.flatMap((key) =>
      leafChanges(
        before[key],
        after[key],
        Array.isArray(before)
          ? `${path}[${key}]`
          : path
            ? `${path}.${key}`
            : key
      )
    );
  }
  return JSON.stringify(before) === JSON.stringify(after)
    ? []
    : [{ path, before, after }];
};

/** A case with the build number blanked, since a new build alone moves nothing Isomer compares. */
const withoutBuild = ({ provenance, ...rest }) => ({
  ...rest,
  provenance: { ...provenance, kibana: { ...provenance.kibana, build: '' } },
});

const SECTIONS = [
  ['input', 'saved state'],
  ['data', 'data'],
  ['context', 'context'],
  ['reference', 'fingerprint'],
];

const shown = (value) => {
  const text = value === undefined ? 'absent' : JSON.stringify(value);
  return `\`${text.length > 60 ? `${text.slice(0, 57)}...` : text}\``;
};

const versions = (cases, read) =>
  [...new Set([...cases.values()].map(read))].sort().join(', ') || 'none';

/**
 * Whether a capture moved anything but the Kibana build, and a Markdown description of what moved.
 *
 * @param {ReturnType<typeof readCapture>} before
 * @param {ReturnType<typeof readCapture>} after
 * @param {{ pinnedElasticCharts?: string }} [options]
 */
export const describeCaptureChanges = (
  before,
  after,
  { pinnedElasticCharts } = {}
) => {
  const added = [...after.cases.keys()].filter((id) => !before.cases.has(id));
  const removed = [...before.cases.keys()].filter((id) => !after.cases.has(id));
  const changedFiles = [
    ...new Set([...before.files.keys(), ...after.files.keys()]),
  ]
    .filter((path) => before.files.get(path) !== after.files.get(path))
    .sort();
  const otherFiles = changedFiles.filter(
    (path) => !/^[^/]+\/(case\.json|reference\.png)$/.test(path)
  );

  const changed = [];
  for (const [id, next] of after.cases) {
    const previous = before.cases.get(id);
    if (!previous) {
      continue;
    }
    const sections = SECTIONS.flatMap(([key, label]) =>
      leafChanges(previous[key], next[key]).length ? [label] : []
    );
    const screenshot = changedFiles.includes(`${id}/reference.png`);
    if (screenshot) {
      sections.push('screenshot');
    }
    const material =
      sections.length > 0 ||
      leafChanges(withoutBuild(previous), withoutBuild(next)).length > 0;
    if (material) {
      changed.push({
        id,
        sections,
        fingerprint: leafChanges(
          previous.reference.fingerprint,
          next.reference.fingerprint
        ),
      });
    }
  }
  const material =
    added.length + removed.length + otherFiles.length + changed.length > 0;

  const kibana = (cases) =>
    versions(
      cases,
      ({ provenance: { kibana: k } }) => `${k.version} build ${k.build}`
    );
  const charts = (cases) =>
    versions(cases, ({ provenance }) => provenance.elasticCharts);
  const lines = [
    `| | Before | After |`,
    `| --- | --- | --- |`,
    `| Kibana | ${kibana(before.cases)} | ${kibana(after.cases)} |`,
    `| Elastic Charts | ${charts(before.cases)} | ${charts(after.cases)} |`,
    '',
  ];
  const drawnWith = charts(after.cases);
  if (pinnedElasticCharts && drawnWith !== pinnedElasticCharts) {
    lines.push(
      `> [!WARNING]`,
      `> Kibana now draws with Elastic Charts ${drawnWith}, but the renderer pins ${pinnedElasticCharts}. \`comparison/fixtures.test.ts\` fails until the pin moves to match.`,
      ''
    );
  }
  if (!material) {
    lines.push('Nothing Kibana saves or draws moved.');
    return { material, body: lines.join('\n') };
  }
  const moved = changed.filter(({ fingerprint }) => fingerprint.length);
  lines.push(
    `${changed.length} of ${after.cases.size} cases changed, ${moved.length} with a moved fingerprint.`,
    ''
  );
  if (added.length) {
    lines.push(`Added: ${added.map((id) => `\`${id}\``).join(', ')}.`, '');
  }
  if (removed.length) {
    lines.push(`Removed: ${removed.map((id) => `\`${id}\``).join(', ')}.`, '');
  }
  if (otherFiles.length) {
    lines.push(
      `Other files: ${otherFiles.map((path) => `\`${path}\``).join(', ')}.`,
      ''
    );
  }
  if (changed.length) {
    lines.push('| Case | Changed |', '| --- | --- |');
    for (const { id, sections } of changed) {
      lines.push(`| \`${id}\` | ${sections.join(', ') || 'provenance'} |`);
    }
    lines.push('');
  }
  for (const { id, fingerprint } of moved) {
    lines.push(
      `<details><summary><code>${id}</code>: ${fingerprint.length} fingerprint ${fingerprint.length === 1 ? 'change' : 'changes'}</summary>`,
      '',
      ...fingerprint
        .slice(0, PATHS_SHOWN)
        .map(
          ({ path, before: was, after: now }) =>
            `- \`${path}\`: ${shown(was)} → ${shown(now)}`
        ),
      ...(fingerprint.length > PATHS_SHOWN
        ? [`- and ${fingerprint.length - PATHS_SHOWN} more`]
        : []),
      '',
      '</details>',
      ''
    );
  }
  let body = lines.join('\n');
  if (body.length > BODY_LIMIT) {
    body = `${body.slice(0, BODY_LIMIT)}\n\nTruncated; the diff has the rest.`;
  }
  return { material, body };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [beforeDir, afterDir, bodyFile] = process.argv.slice(2);
  if (!beforeDir || !afterDir || !bodyFile) {
    throw new Error(
      'Usage: node scripts/lens_capture_changes.js <before> <after> <body.md>'
    );
  }
  const root = join(fileURLToPath(import.meta.url), '../..');
  const pinnedElasticCharts = JSON.parse(
    readFileSync(
      join(root, 'packages/isomer-renderers-elastic-charts/package.json'),
      'utf8'
    )
  ).dependencies?.['@elastic/charts'];
  const { material, body } = describeCaptureChanges(
    readCapture(beforeDir),
    readCapture(afterDir),
    { pinnedElasticCharts }
  );
  writeFileSync(bodyFile, `${body}\n`);
  console.log(`material=${material}`);
}
