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

import { slideDistillery } from '../../theme/distillery';

const { copy } = slideDistillery.tokens.command;

/** Id of the enhancement that adds a Copy button to each `slideCommand`. */
export const SLIDE_COPY = 'slideCopy';

/** Marks the Copy button the {@link SLIDE_COPY} script adds to a command's panel. */
export const COPY_BUTTON_ATTRIBUTE = 'data-slide-copy';

const isCommand = (node: unknown): boolean =>
  typeof node === 'object' &&
  node !== null &&
  (node as { type?: unknown }).type === 'slideCommand';

/**
 * Adds a Copy button to each command in the render, with `root` its section,
 * that copies the command's `code` text. A command is found by its anchor. It
 * adds nothing without a clipboard, and nothing twice.
 */
export const copyScriptBody = `if (!navigator.clipboard) return;
for (const command of root.querySelectorAll('[${NODE_ANCHOR_ATTRIBUTE}="slideCommand"]')) {
  const code = command.querySelector('code');
  const panel = code && code.parentElement;
  if (!panel || panel.querySelector('[${COPY_BUTTON_ATTRIBUTE}]')) continue;
  const button = root.ownerDocument.createElement('button');
  button.type = 'button';
  button.setAttribute('${COPY_BUTTON_ATTRIBUTE}', '');
  button.textContent = ${JSON.stringify(copy.label.value)};
  button.addEventListener('click', () => {
    navigator.clipboard.writeText(code.textContent || '').catch(() => {});
  });
  panel.append(button);
}`;

/** Wires every Copy button in the render that emitted it to the clipboard. */
export const slideCopyEnhancement: EnhancementDefinition = {
  id: SLIDE_COPY,
  appliesTo: (body, walk) => someBodyNode(body, 'react', isCommand, walk),
  anchors: true,
  script: copyScriptBody,
};
