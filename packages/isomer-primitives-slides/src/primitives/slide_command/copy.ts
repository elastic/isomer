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

/** Marks a Copy button, which renders `hidden` until something wires it. */
export const COPY_BUTTON_ATTRIBUTE = 'data-slide-copy';

const isCommand = (node: unknown): boolean =>
  typeof node === 'object' &&
  node !== null &&
  (node as { type?: unknown }).type === 'slideCommand';

/**
 * Reveals each Copy button in the render, with `root` its section, and copies
 * a command when its button is clicked. Without a clipboard the buttons stay
 * hidden. A command is found by its anchor, and its text is its `code`.
 */
export const copyScriptBody = `if (!navigator.clipboard) return;
const commandSelector = '[${NODE_ANCHOR_ATTRIBUTE}="slideCommand"]';
for (const button of root.querySelectorAll(commandSelector + ' [${COPY_BUTTON_ATTRIBUTE}]')) {
  button.hidden = false;
}
root.addEventListener('click', (event) => {
  const button = event.target instanceof Element ? event.target.closest('[${COPY_BUTTON_ATTRIBUTE}]') : null;
  const command = button ? button.closest(commandSelector) : null;
  const code = command ? command.querySelector('code') : null;
  if (!code || !root.contains(command)) return;
  navigator.clipboard.writeText(code.textContent || '').catch(() => {});
});`;

/** Wires every Copy button in the render that emitted it to the clipboard. */
export const slideCopyEnhancement: EnhancementDefinition = {
  id: SLIDE_COPY,
  appliesTo: (body, walk) => someBodyNode(body, 'react', isCommand, walk),
  anchors: true,
  script: copyScriptBody,
};
