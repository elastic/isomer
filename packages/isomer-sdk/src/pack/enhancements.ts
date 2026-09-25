/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildNodeWalker } from '../composition/body_node_base';
import { IsomerError } from '../composition/error';
import type { PrimitiveNode } from '../composition/node';

/**
 * A progressive enhancement any vocabulary pack may declare.
 *
 * Ids are open strings rather than a closed union so a second pack can
 * register one without editing a shared type. Duplicate ids across packs in
 * one runtime are rejected at construction.
 */
export interface EnhancementDefinition {
  /** What a renderer tests for via `context.enhancements`. Unique across a runtime's packs. */
  id: string;
  /**
   * Whether this composition has anything for the enhancement to act on.
   * Gating on content rather than the opt-in alone is what keeps a composition
   * with no matching node from shipping the script.
   *
   * `walk` is the composition's child walker, so a match nested inside a
   * container from another pack is still found.
   */
  appliesTo: (body: readonly PrimitiveNode[], walk: ChildNodeWalker) => boolean;
  /**
   * A function body with `root: Element`, the render's `.isomer` section, in
   * scope. It runs in its own function, so a top-level `const` or `return`
   * cannot reach another enhancement.
   *
   * It must not look for its root through `document.currentScript`, which is
   * `null` inside a shadow root. It must address markup through `data-*`
   * attributes rather than class names: class names are minified per render,
   * and a selector written against one is a contract nothing checks. An event
   * meant for the host sets `composed: true` as well as `bubbles: true`, or it
   * stops at a shadow boundary.
   */
  script: string;
}

/**
 * Wraps one script body in its own function, so its `const`s and a top-level
 * `return` stay its own. Anything that joins script bodies scopes each first.
 */
export const scopeScript = (body: string): string => `(() => {\n${body}\n})();`;

/** Marks the `<script>` a `scripts: 'embedded'` render emits. */
export const EMBEDDED_SCRIPT_ATTRIBUTE = 'data-isomer-script';

/**
 * Runs a `scripts: 'host'` render's `js` against the
 * `.isomer` section the host inserted.
 *
 * Needed wherever the HTML is inserted by the host rather than parsed with the
 * page, including every shadow root: such a `<script>` never runs, and one
 * that did would find no `document.currentScript`.
 *
 * Compiles with `new Function`, so a strict Content-Security-Policy must allow
 * `'unsafe-eval'`. A host that cannot should render with `scripts: 'embedded'`
 * into light DOM.
 */
export const runEnhancementScript = (js: string, root: Element): void => {
  // Guards untyped callers; typed ones already handled `querySelector`'s null.
  if (!root) {
    throw new IsomerError(
      'ENHANCEMENT_ROOT_MISSING',
      'runEnhancementScript: no root element; pass the `.isomer` section the render produced'
    );
  }
  if (root.querySelector(`script[${EMBEDDED_SCRIPT_ATTRIBUTE}]`)) {
    console.warn(
      "isomer: this HTML was rendered with scripts: 'embedded'; render with scripts: 'host' so its enhancements run once"
    );
  }
  if (js) {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- compiling the render's script is the point.
    const run = new Function('root', js) as (root: Element) => void;
    run(root);
  }
};
