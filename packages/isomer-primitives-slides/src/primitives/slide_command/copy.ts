/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type EnhancementDefinition,
  NODE_ANCHOR_ATTRIBUTE,
  someBodyNode,
} from '@elastic/isomer-sdk';

/** Id of the enhancement that adds a Copy button to each `slideCommand`. */
export const SLIDE_COPY = 'slideCopy';

const isCommand = (node: unknown): boolean =>
  typeof node === 'object' &&
  node !== null &&
  (node as { type?: unknown }).type === 'slideCommand';

/**
 * Copies a command when its Copy button is clicked, with `root` the render's
 * section. A command is found by its anchor, and its text is its `code`.
 */
export const copyScriptBody = `root.addEventListener('click', (event) => {
  const button = event.target instanceof Element ? event.target.closest('button') : null;
  const command = button ? button.closest('[${NODE_ANCHOR_ATTRIBUTE}="slideCommand"]') : null;
  const code = command ? command.querySelector('code') : null;
  if (!code || !root.contains(command) || !navigator.clipboard) return;
  navigator.clipboard.writeText(code.textContent || '').catch(() => {});
});`;

/** Wires every Copy button in the render that emitted it to the clipboard. */
export const slideCopyEnhancement: EnhancementDefinition = {
  id: SLIDE_COPY,
  appliesTo: (body, walk) => someBodyNode(body, 'react', isCommand, walk),
  anchors: true,
  script: `(() => {
const root = document.currentScript && document.currentScript.parentElement;
if (!root) return;
${copyScriptBody}
})();`,
};
