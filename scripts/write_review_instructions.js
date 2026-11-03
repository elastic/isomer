/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// `.libra/` holds the review instructions; `.github/instructions/` is generated
// from it for Copilot code review. Pass `--check` to fail when they drift.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');

const files = [
  {
    source: '.libra/instructions.md',
    target: '.github/instructions/code-review.instructions.md',
    applyTo: ['**'],
  },
  {
    source: '.libra/specialists/packages.md',
    target: '.github/instructions/code-review-packages.instructions.md',
  },
  {
    source: '.libra/specialists/workflows.md',
    target: '.github/instructions/code-review-workflows.instructions.md',
  },
];

const PREAMBLE = 'Apply these instructions only when reviewing a pull request.';

/** Splits off Libra frontmatter and reads its `apply_to` globs. */
export const parseSource = (text) => {
  const match = /^---\n([\s\S]*?)\n---\n+/.exec(text);
  if (!match) {
    return { applyTo: undefined, body: text };
  }
  const applyTo = [...match[1].matchAll(/^\s+-\s+"([^"]+)"$/gm)].map(
    ([, glob]) => glob
  );
  return { applyTo, body: text.slice(match[0].length) };
};

/** Copilot frontmatter, then the body with the preamble under its title. */
export const renderTarget = (sourceText, applyToOverride) => {
  const { applyTo, body } = parseSource(sourceText);
  const globs = applyToOverride ?? applyTo;
  if (!globs?.length) {
    throw new Error('Review instructions need apply_to globs');
  }
  const [title, ...rest] = body.split('\n');
  if (!title.startsWith('# ')) {
    throw new Error(`Review instructions must start with a title: ${title}`);
  }
  return [
    '---',
    `applyTo: '${globs.join(',')}'`,
    "excludeAgent: 'cloud-agent'",
    '---',
    '',
    title,
    '',
    PREAMBLE,
    ...rest,
  ].join('\n');
};

if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  const check = process.argv.includes('--check');
  const stale = [];
  for (const { source, target, applyTo } of files) {
    const expected = renderTarget(
      readFileSync(join(root, source), 'utf8'),
      applyTo
    );
    const path = join(root, target);
    if (check) {
      if (readFileSync(path, 'utf8') !== expected) {
        stale.push(target);
      }
    } else {
      writeFileSync(path, expected);
    }
  }
  if (stale.length) {
    console.error(
      `Review instructions are out of date: ${stale.join(', ')}. Run \`pnpm review-instructions\`.`
    );
    process.exit(1);
  }
}
