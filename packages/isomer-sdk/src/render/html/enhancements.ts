/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildNodeWalker } from '../../composition/body_node_base';
import type { PrimitiveNode } from '../../composition/node';
import {
  type EnhancementDefinition,
  resolveEnhancements,
  scopeScript,
} from '../../pack/enhancements';

export type { EnhancementDefinition };

/** The scripts of `applied`, in order, each in its own function scope. */
export const enhancementScript = (
  applied: readonly EnhancementDefinition[]
): string =>
  applied
    .flatMap(({ script }) => (script ? [scopeScript(script)] : []))
    .join('\n');

/**
 * Binds `root` to the section that contains the emitted `<script>`. Inside a
 * shadow root `document.currentScript` is `null`, so there it warns instead.
 */
export const embedScript = (body: string): string =>
  [
    '(function (root) {',
    'if (!root) {',
    `console.warn("isomer: enhancement script has no root; render with scripts: 'host' and call runEnhancementScript");`,
    'return;',
    '}',
    body,
    '})(document.currentScript && document.currentScript.parentElement);',
  ].join('\n');

/**
 * Whether a render emits node anchors: asked for with `anchors: true`, or
 * declared by a requested enhancement that applies to `body`. `anchors: false`
 * cannot turn off anchors an enhancement needs.
 */
export const rendersAnchors = (
  body: readonly PrimitiveNode[],
  {
    anchors,
    enhancements,
  }: { anchors?: boolean; enhancements?: readonly string[] },
  walk: ChildNodeWalker,
  definitions: readonly EnhancementDefinition[]
): boolean =>
  anchors === true ||
  resolveEnhancements(body, walk, definitions, enhancements ?? []).some(
    (definition) => definition.anchors
  );
