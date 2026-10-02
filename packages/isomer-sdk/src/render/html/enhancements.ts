/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type EnhancementDefinition,
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
