/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildNodeWalker } from '../composition/body_node_base';
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
   * An IIFE scoped to `document.currentScript.parentElement`, so it only ever
   * touches the render that emitted it.
   *
   * It must address markup through `data-*` attributes rather than class names:
   * class names are minified per render, and a selector written against one is
   * a contract nothing checks.
   */
  script: string;
}
