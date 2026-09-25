/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The behaviour every primitive definition owes its callers, expressed once.
//
// Framework-agnostic on purpose: only `node:assert/strict` and Node builtins,
// so this ships on a public entry without dragging vitest into a vocabulary
// package's dependency set. Each pack drives the array with `it.each`, so a
// second vocabulary costs one package and one test file.

import assert from 'node:assert/strict';

import type { ChildNodeWalker } from '../composition/body_node_base';
import type { Composition } from '../composition/composition';
import type { ValidationError } from '../composition/validation_error';
import type {
  AnyPrimitiveDefinition,
  PrimitiveNode,
} from '../define/primitive_module';
import {
  anchoredNodesByType,
  anchorValue,
  NODE_ANCHOR_ATTRIBUTE,
} from '../render/anchors';
import type { HTMLRenderResult } from '../render/html/envelope';
import type { SlackBlock } from '../render/slack/blocks';
import type { ValidationResult } from '../validate/validation';

/**
 * The foreign node {@link PrimitiveConformanceHarness.nestForeignChild}
 * hands a container must render text/markdown containing this string, or the
 * cross-pack nesting case cannot tell a dropped child from an empty one.
 */
export const CONFORMANCE_FOREIGN_MARKER = '__isomer_conformance_foreign__';

/** One example node, paired with the definition that published it. */
export interface PrimitiveConformanceExample {
  readonly definition: AnyPrimitiveDefinition;
  /** Always `definition.type`, lifted onto the row so `it.each` titles can read it. */
  readonly type: string;
  /** Index into {@link AnyPrimitiveDefinition.examples}, and half of the preview hint a failure prints. */
  readonly exampleIndex: number;
  readonly node: PrimitiveNode;
}

/** The subset of a host's HTML render options the cases exercise. */
export interface PrimitiveConformanceHtmlOptions {
  /** `'separate'` must move the stylesheet out of the markup and into `css`; the CSS cases assert against that field. */
  readonly css?: 'inline' | 'separate';
  /** `'readable'` must emit human-legible class names, which the CSS coverage case matches back against the emitted selectors. */
  readonly names?: string;
  /** Must render node anchors, as the `anchors` HTML render option does. */
  readonly anchors?: boolean;
}

/** The subset of a host's SVG render result the cases assert on. */
export interface PrimitiveConformanceSvgResult {
  /** Must be empty for every published example. */
  readonly validationErrors: readonly ValidationError[];
  readonly svg: string;
  /** `total` is the rendered byte size, and must be positive. */
  readonly measurement: { readonly total: number };
}

/** The subset of a host's Slack render result the cases assert on. */
export interface PrimitiveConformanceSlackResult {
  readonly blocks: readonly SlackBlock[];
  /** Notification fallback text. Must be non-empty. */
  readonly text: string;
}

/**
 * Pack-owned render and validation bindings. The cases cannot import a
 * vocabulary package, so the pack closes over its dispatcher, frame, and
 * theme when it builds this object.
 *
 * Unsuffixed members take a single node; the `Composition`-suffixed ones take
 * a whole {@link Composition}. Optional members gate the cases that need
 * them, so a pack supplies only what its surfaces can answer.
 */
export interface PrimitiveConformanceHarness {
  /**
   * The smallest composition that carries one node. Its `title` must be
   * `'Conformance fixture'`, which the envelope cases look for as
   * `CONFORMANCE FIXTURE` in text and `# Conformance fixture` in markdown.
   */
  wrapComposition(node: PrimitiveNode): Composition;
  /** Validation errors for the node on its own. Must be empty for every published example. */
  validateNode(node: PrimitiveNode): readonly ValidationError[];
  /** Whole-composition validation. Must be `valid` with no `errors` for a wrapped example. */
  validateComposition(composition: Composition): ValidationResult;
  /** Must return something other than `undefined`; the case does not mount the element. */
  renderReact(node: PrimitiveNode): unknown;
  /** Drives the pack's style collection for one node. Must not throw. */
  collectStyles(node: PrimitiveNode): void;
  /** Must return a string with non-whitespace content. */
  renderText(node: PrimitiveNode): string;
  /** Must return a string with non-whitespace content. */
  renderMarkdown(node: PrimitiveNode): string;
  /** Must return at least one block, each an object with a string `type`. */
  renderSlack(node: PrimitiveNode): readonly SlackBlock[];
  /** `key` is unique per example and only has to survive into the React tree. Must not throw. Omit for a pack with no `svg` path. */
  renderSvg?(node: PrimitiveNode, key: string): unknown;
  /** Must be finite and greater than zero, so a frame can lay the node out unrendered. Omit for a pack with no `svg` path. */
  estimateSvgHeight?(node: PrimitiveNode): number;
  /**
   * Set `false` for packs whose frame is fixed-size (`sizesFromNodeHeights: false`).
   * Skips the positive-finite height assertion, which no fixed-frame pack can satisfy.
   */
  sizesFromNodeHeights?: boolean;
  /**
   * For a container example, returns `container` with one of its children
   * replaced by a node from a pack the harness composed in only for this
   * check — never one `container`'s own pack registers. That node's `text`
   * and `markdown` renderers must emit {@link CONFORMANCE_FOREIGN_MARKER}.
   * Omit to skip the cross-pack nesting case.
   */
  nestForeignChild?(container: PrimitiveNode): PrimitiveNode;
  /**
   * Must honor {@link PrimitiveConformanceHtmlOptions}. Cases assert the
   * markup wraps the body in a `<section>`, that `measurement.js` is zero, and
   * that `validationErrors` is empty. Omit to skip the HTML cases.
   */
  renderHTML?(
    composition: Composition,
    options?: PrimitiveConformanceHtmlOptions
  ): HTMLRenderResult;
  /**
   * The child walker over every definition the harness renders with. Set it
   * once every `react` renderer spreads `nodeAnchor` on its root; the anchor
   * case then asserts each node renders one.
   */
  anchorWalk?: ChildNodeWalker;
  /** Must throw when `css` references a `var(--name)` it never declares. Omit to skip the CSS variable case. */
  assertVarRefsHaveDeclarations?(css: string): void;
  /** Whole-composition text render, title envelope included. */
  renderTextComposition(composition: Composition): string;
  /** Whole-composition markdown render, title heading included. */
  renderMarkdownComposition(composition: Composition): string;
  /** Must lead with a `plain_text` header block carrying the composition title. */
  renderSlackComposition(
    composition: Composition
  ): PrimitiveConformanceSlackResult;
  /** Must resolve to complete `<svg>`/`</svg>` markup with no validation errors. Omit for a pack with no frame. */
  renderSVGComposition?(
    composition: Composition
  ): Promise<PrimitiveConformanceSvgResult>;
}

/** One assertion, run once per example. */
export interface PrimitiveConformanceCase {
  readonly name: string;
  /** Signals failure by throwing. May be async, so a pack must await it. */
  readonly run: (
    example: PrimitiveConformanceExample,
    harness: PrimitiveConformanceHarness
  ) => void | Promise<void>;
}

/** Every definition's examples, flattened to one row each. */
export const examplesFromDefinitions = (
  definitions: readonly AnyPrimitiveDefinition[]
): readonly PrimitiveConformanceExample[] =>
  definitions.flatMap((definition) =>
    definition.examples.map((node, exampleIndex) => ({
      definition,
      type: definition.type,
      exampleIndex,
      node,
    }))
  );

/** Every example crossed with every case, shaped for `it.each`. */
export const primitiveConformanceRows = (
  definitions: readonly AnyPrimitiveDefinition[]
): readonly (PrimitiveConformanceExample & PrimitiveConformanceCase)[] =>
  examplesFromDefinitions(definitions).flatMap((example) =>
    primitiveConformanceCases.map((conformanceCase) => ({
      ...example,
      ...conformanceCase,
    }))
  );

/**
 * Asserts the inventory itself holds up: the pack has examples, every
 * definition contributes one, each example's `type` matches its definition,
 * and `catalog.example` parses or matches a published example.
 */
export const runPrimitiveInventoryConformance = (
  definitions: readonly AnyPrimitiveDefinition[]
): void => {
  const examples = examplesFromDefinitions(definitions);
  assert.ok(examples.length > 0, 'expected at least one primitive example');
  for (const definition of definitions) {
    assert.ok(
      definition.examples.length > 0,
      `${definition.type} primitive must expose at least one example`
    );
    const catalogExample = definition.catalog.example;
    const matchesPublished = definition.examples.some(
      (node) => JSON.stringify(node) === JSON.stringify(catalogExample)
    );
    if (matchesPublished) {
      continue;
    }
    const parsed = definition.schema.safeParse(catalogExample);
    assert.ok(
      parsed.success,
      `${definition.type} catalog.example must parse against its schema or match a published example`
    );
  }
  for (const { type, node } of examples) {
    assert.equal(node.type, type);
  }
};

const previewHint = (type: string, exampleIndex: number): string =>
  `Failing example: \`${type}\` definition, examples[${exampleIndex}].`;

const renderedClassNames = (html: string): string[] => {
  const classNames = new Set<string>();
  for (const match of html.matchAll(/\bclass="([^"]+)"/g)) {
    match[1]!
      .split(/\s+/)
      .filter(Boolean)
      .forEach((className) => classNames.add(className));
  }
  return [...classNames].sort();
};

/** How many times each node anchor value appears in serialized `html`. */
const renderedAnchors = (html: string): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const [, value] of html.matchAll(
    new RegExp(`${NODE_ANCHOR_ATTRIBUTE}="([^"]*)"`, 'g')
  )) {
    counts.set(value!, (counts.get(value!) ?? 0) + 1);
  }
  return counts;
};

const cssEscapeClass = (className: string): string =>
  className.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');

const cssHasClassSelector = (css: string, className: string): boolean =>
  new RegExp(`\\.${cssEscapeClass(className)}(?![\\w-])`).test(css);

/**
 * Every assertion a primitive owes its callers, for a pack to drive with
 * `it.each`.
 */
export const primitiveConformanceCases: readonly PrimitiveConformanceCase[] = [
  {
    name: 'validates as a primitive node and inside a composition',
    run: ({ type, exampleIndex, node }, harness) => {
      const hint = previewHint(type, exampleIndex);
      const primitiveErrors = [...harness.validateNode(node)];
      assert.deepEqual(primitiveErrors, [], hint);
      const result = harness.validateComposition(harness.wrapComposition(node));
      assert.equal(result.valid, true, hint);
      assert.deepEqual(result.errors, [], hint);
    },
  },
  {
    name: 'renders through React without throwing',
    run: ({ node }, harness) => {
      const rendered = harness.renderReact(node);
      assert.notEqual(rendered, undefined);
    },
  },
  {
    name: 'collects styles without throwing',
    run: ({ node }, harness) => {
      assert.doesNotThrow(() => harness.collectStyles(node));
    },
  },
  {
    name: 'a container recurses through scope for a node from another pack',
    run: ({ definition, node }, harness) => {
      if (!definition.children || !harness.nestForeignChild) {
        return;
      }
      const nested = harness.nestForeignChild(node);
      assert.notEqual(harness.renderReact(nested), undefined);
      assert.ok(
        harness.renderText(nested).includes(CONFORMANCE_FOREIGN_MARKER)
      );
      assert.ok(
        harness.renderMarkdown(nested).includes(CONFORMANCE_FOREIGN_MARKER)
      );
    },
  },
  {
    name: 'renders through plain text with non-empty output',
    run: ({ node }, harness) => {
      const text = harness.renderText(node);
      assert.equal(typeof text, 'string');
      assert.ok(text.trim().length > 0);
    },
  },
  {
    name: 'renders through markdown with non-empty output',
    run: ({ node }, harness) => {
      const markdown = harness.renderMarkdown(node);
      assert.equal(typeof markdown, 'string');
      assert.ok(markdown.trim().length > 0);
    },
  },
  {
    name: 'renders through Slack dispatch returning at least one block',
    run: ({ node }, harness) => {
      const blocks = harness.renderSlack(node);
      assert.ok(blocks.length > 0);
      for (const block of blocks) {
        assert.equal(typeof block, 'object');
        assert.equal(typeof block.type, 'string');
      }
    },
  },
  {
    name: 'renders through SVG primitive dispatch without throwing',
    run: ({ type, exampleIndex, node }, harness) => {
      if (!harness.renderSvg) {
        return;
      }
      assert.doesNotThrow(() =>
        harness.renderSvg?.(node, `conformance-${type}-${exampleIndex}`)
      );
    },
  },
  {
    name: 'reports a positive finite SVG height estimate',
    run: ({ node }, harness) => {
      if (
        harness.sizesFromNodeHeights === false ||
        !harness.estimateSvgHeight
      ) {
        return;
      }
      const height = harness.estimateSvgHeight(node);
      assert.equal(Number.isFinite(height), true);
      assert.ok(height > 0);
    },
  },
  {
    name: 'renders through renderHTML wrapped in a minimal composition',
    run: ({ node }, harness) => {
      if (!harness.renderHTML) {
        return;
      }
      const result = harness.renderHTML(harness.wrapComposition(node));
      assert.deepEqual(result.validationErrors, []);
      assert.ok(result.html.includes('<section'));
      assert.equal(result.measurement.js, 0);
      assert.ok(result.measurement.total > 0);
    },
  },
  {
    name: 'renders no node anchors unless asked',
    run: ({ node }, harness) => {
      if (!harness.renderHTML) {
        return;
      }
      const { body } = harness.renderHTML(harness.wrapComposition(node));
      assert.equal(renderedAnchors(body).size, 0);
    },
  },
  {
    name: 'renders a node anchor on every node when asked',
    run: ({ type, exampleIndex, node }, harness) => {
      if (!harness.renderHTML || !harness.anchorWalk) {
        return;
      }
      const composition = harness.wrapComposition(node);
      const { body } = harness.renderHTML(composition, { anchors: true });
      const hint = previewHint(type, exampleIndex);
      const counts = renderedAnchors(body);
      for (const [anchored, nodes] of anchoredNodesByType(
        composition.body,
        harness.anchorWalk
      )) {
        const rendered = counts.get(anchorValue(anchored)) ?? 0;
        assert.equal(
          rendered,
          nodes.length,
          `Expected ${nodes.length} \`${anchored}\` anchor(s), found ${rendered}. ${hint}`
        );
      }
    },
  },
  {
    name: 'emits CSS where every var(...) reference has a matching declaration',
    run: ({ node }, harness) => {
      if (!harness.renderHTML || !harness.assertVarRefsHaveDeclarations) {
        return;
      }
      const result = harness.renderHTML(harness.wrapComposition(node), {
        css: 'separate',
      });
      harness.assertVarRefsHaveDeclarations(result.css);
    },
  },
  {
    name: 'reaches every rendered readable class in compact CSS collection',
    run: ({ type, exampleIndex, node }, harness) => {
      if (!harness.renderHTML) {
        return;
      }
      const result = harness.renderHTML(harness.wrapComposition(node), {
        css: 'separate',
        names: 'readable',
      });
      const missing = renderedClassNames(result.body).filter(
        (className) => !cssHasClassSelector(result.css, className)
      );
      const hint =
        `Missing CSS for ${type} example #${exampleIndex}: ` +
        `${missing.join(', ') || '(none)'}. ` +
        previewHint(type, exampleIndex);
      assert.deepEqual(missing, [], hint);
    },
  },
  {
    name: 'renders through renderText wrapped in a minimal composition',
    run: ({ node }, harness) => {
      const text = harness.renderTextComposition(harness.wrapComposition(node));
      assert.ok(text.length > 0);
      assert.ok(text.includes('CONFORMANCE FIXTURE'));
    },
  },
  {
    name: 'renders through renderMarkdown wrapped in a minimal composition',
    run: ({ node }, harness) => {
      const markdown = harness.renderMarkdownComposition(
        harness.wrapComposition(node)
      );
      assert.ok(markdown.length > 0);
      assert.ok(markdown.includes('# Conformance fixture'));
    },
  },
  {
    name: 'renders through renderSlack wrapped in a minimal composition',
    run: ({ node }, harness) => {
      const result = harness.renderSlackComposition(
        harness.wrapComposition(node)
      );
      assert.ok(result.blocks.length > 0);
      assert.ok(result.text.length > 0);
      const first = result.blocks[0];
      assert.ok(first);
      if (first.type !== 'header') {
        assert.fail(`expected a header block, got ${first.type}`);
      }
      assert.equal(first.text.type, 'plain_text');
    },
  },
  {
    name: 'renders through renderSVG wrapped in a minimal composition',
    run: async ({ node }, harness) => {
      if (!harness.renderSVGComposition) {
        return;
      }
      const result = await harness.renderSVGComposition(
        harness.wrapComposition(node)
      );
      assert.deepEqual(result.validationErrors, []);
      assert.ok(result.svg.includes('<svg'));
      assert.ok(result.svg.includes('</svg>'));
      assert.ok(result.measurement.total > 0);
    },
  },
];
