/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// What the SDK and runtime cost on their own: a pack whose renderers do next
// to nothing, swept one axis at a time.

const { join } = require('node:path');

const LABEL_CHARACTERS = 8;
const DEFAULTS = {
  primitives: 10,
  nodes: 100,
  depth: 1,
  characters: 100 * LABEL_CHARACTERS,
};

const AXES = {
  primitives: {
    unit: 'primitive type in the pack',
    points: [1, 10, 50, 200],
    about: (n) => `a pack of ${n} primitive type${n === 1 ? '' : 's'}`,
  },
  nodes: {
    unit: 'node',
    points: [10, 100, 1000, 4000],
    about: (n) => `${n} nodes, flat, ${LABEL_CHARACTERS} label characters each`,
  },
  depth: {
    unit: 'level of nesting',
    points: [1, 8, 16, 24],
    about: (n) => `${DEFAULTS.nodes} nodes, ${n} of them nested in one chain`,
  },
  characters: {
    unit: '1,000 label characters',
    per: 1000,
    points: [1_000, 10_000, 100_000, 900_000],
    about: (n) => `${n.toLocaleString('en')} label characters in all`,
  },
};

const PLAN = Object.fromEntries(
  Object.entries(AXES).flatMap(([axis, { points, about }]) =>
    points.map((point) => [
      `${axis}-${point}`,
      {
        axis,
        about: about(point),
        options: {
          ...DEFAULTS,
          [axis]: point,
          // More nodes keep each label's length, so text doesn't grow with them.
          ...(axis === 'nodes' ? { characters: point * LABEL_CHARACTERS } : {}),
        },
      },
    ])
  )
);

/** The median of an op's time, repeated until it has enough samples. */
const timeOp = (op) => {
  const samples = [];
  const until = performance.now() + 250;
  while (
    samples.length < 5 ||
    (samples.length < 50 && performance.now() < until)
  ) {
    const started = performance.now();
    op();
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
};

const MEASURES = [
  { key: 'assembleMs', label: 'Assemble (ms)', digits: 1 },
  { key: 'runtimeHeapMb', label: 'Runtime heap (MB)', digits: 1 },
  { key: 'validateFirstMs', label: 'First validate (ms)', digits: 2 },
  { key: 'validateMs', label: 'Validate (ms)', digits: 2 },
  { key: 'htmlMs', label: 'Validate + HTML (ms)', digits: 2 },
  { key: 'textMs', label: 'Validate + text (ms)', digits: 2 },
  { key: 'snapshotMs', label: 'Validate + snapshot (ms)', digits: 2 },
  { key: 'peakRssMb', label: 'Peak RSS (MB)', digits: 0 },
];

/** Cost per added unit along each axis, from its first and last points. */
const perUnit = ({ summary }) => {
  const keys = ['assembleMs', 'validateMs', 'htmlMs', 'snapshotMs'];
  const rows = Object.entries(AXES).map(([axis, { unit, points, per = 1 }]) => {
    const first = summary[`${axis}-${points[0]}`];
    const last = summary[`${axis}-${points[points.length - 1]}`];
    const units = (points[points.length - 1] - points[0]) / per;
    const cells = keys.map((key) => {
      if (first?.[key] === undefined || last?.[key] === undefined) {
        return '';
      }
      const micros = ((last[key].median - first[key].median) / units) * 1000;
      // Noise around no cost rounds to `-0.0`.
      return Math.abs(micros) < 0.05 ? '0.0' : micros.toFixed(1);
    });
    return `| ${axis} | ${unit} | ${cells.join(' | ')} |`;
  });
  return [
    "Each added unit along an axis costs, in microseconds, from the axis's first and last points:",
    '',
    '| Axis | Per | Assemble (µs) | Validate (µs) | Validate + HTML (µs) | Validate + snapshot (µs) |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
    ...rows,
  ].join('\n');
};

module.exports = {
  title: 'SDK and runtime overhead',
  about: `A generated pack whose renderers each return one element or line, so the cost is the SDK's and the runtime's: assembling a runtime (which builds the composition schema), validating, and rendering. Each axis moves alone from ${DEFAULTS.primitives} primitive types, ${DEFAULTS.nodes} flat nodes and ${DEFAULTS.characters} label characters. Every composition uses one of the pack's types, so the primitive axis changes only the pack. Assembling excludes defining the pack, which a host has already done. Each surface's \`render\` validates first, so the render columns include a validate. Times past the first validate are the median of repeated calls in the same process.`,
  measures: MEASURES,
  // The synthetic pack is the suite's own; a config's pack plays no part.
  scenarios: async () =>
    Object.entries(PLAN).map(([name, { about, options }]) => ({
      name,
      about,
      spec: options,
    })),
  notes: (result) => [perUnit(result)],
  run: async (options) => {
    const { createIsomerRuntime } = require('@elastic/isomer-runtime');
    // Each from its own file: the package's main entry would load more than the suite measures.
    const { createStepRecorder } = require(
      join(__dirname, '../../lib/cjs/steps.js')
    );
    const { createSyntheticPack, syntheticFrame, synthTree } = require(
      join(__dirname, '../../lib/cjs/synthetic_pack.js')
    );

    const pack = createSyntheticPack({
      primitives: options.primitives,
      fieldsPerPrimitive: 4,
    });
    const { step, records } = createStepRecorder();
    const runtime = await step('assemble', () =>
      createIsomerRuntime({
        packs: [pack],
        frames: { synthetic: syntheticFrame },
      })
    );
    const [assembled] = records;
    const tree = synthTree({
      types: 1,
      nodes: options.nodes,
      depth: options.depth,
      labelCharacters: options.characters,
    });

    const started = performance.now();
    const validation = runtime.validate(tree);
    const validateFirstMs = performance.now() - started;
    if (!validation.valid) {
      throw new Error(
        `invalid tree for ${JSON.stringify(options)}: ${JSON.stringify(validation.errors.slice(0, 3))}`
      );
    }
    const { surfaces } = runtime;
    return {
      assembleMs: assembled.ms,
      runtimeHeapMb: assembled.heapRetainedMb,
      validateFirstMs,
      validateMs: timeOp(() => runtime.validate(tree)),
      htmlMs: timeOp(() => surfaces.html.render(tree)),
      textMs: timeOp(() => surfaces.text.render(tree)),
      snapshotMs: timeOp(() => surfaces.snapshot.render(tree)),
    };
  },
};
