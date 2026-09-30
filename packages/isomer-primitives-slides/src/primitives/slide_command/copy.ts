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

export const SLIDE_COPY = 'slideCopy';

export const COPY_BUTTON_ATTRIBUTE = 'data-slide-copy';

const isCommand = (node: unknown): boolean =>
  typeof node === 'object' &&
  node !== null &&
  (node as { type?: unknown }).type === 'slideCommand';

/**
 * A command is found by its anchor.
 * Adds nothing without a clipboard, and nothing twice.
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
  button.setAttribute('aria-label', button.textContent + ' ' + code.textContent);
  button.addEventListener('click', () => {
    navigator.clipboard.writeText(code.textContent || '').catch(() => {});
  });
  panel.append(button);
}`;

export const slideCopyEnhancement: EnhancementDefinition = {
  id: SLIDE_COPY,
  appliesTo: (body, walk) => someBodyNode(body, 'react', isCommand, walk),
  anchors: true,
  script: copyScriptBody,
};
