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
  scopeScript,
} from '../../pack/enhancements';

export type { EnhancementDefinition };

/** The requested enhancements the composition actually has content for. */
export const resolveEnhancements = (
  body: readonly PrimitiveNode[],
  requested: readonly string[] | undefined,
  walk: ChildNodeWalker,
  definitions: readonly EnhancementDefinition[]
): ReadonlySet<string> => {
  const wanted = new Set(requested ?? []);
  return new Set(
    definitions
      .filter(({ id }) => wanted.has(id))
      .filter((definition) => definition.appliesTo(body, walk))
      .map(({ id }) => id)
  );
};

/**
 * The script for a resolved enhancement set, deduplicated by id and emitted in
 * definition order so two enhancements cannot fight over ordering. Each
 * {@link EnhancementDefinition.script} gets its own function scope.
 */
export const enhancementScript = (
  enhancements: ReadonlySet<string>,
  definitions: readonly EnhancementDefinition[]
): string =>
  definitions
    .filter((definition) => enhancements.has(definition.id))
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
  resolveEnhancements(
    body,
    enhancements,
    walk,
    definitions.filter((definition) => definition.anchors)
  ).size > 0;
