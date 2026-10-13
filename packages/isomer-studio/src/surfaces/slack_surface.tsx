/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';
import type { Block } from 'slack-blocks-to-jsx';
import { Message } from 'slack-blocks-to-jsx';

const LOGO = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect width="36" height="36" rx="6" fill="#0B64DD"/><text x="18" y="24" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700" fill="#fff" text-anchor="middle">I</text></svg>'
)}`;

/** Both type the same Block Kit JSON, but disagree on which fields of some elements are optional. */
const toMessageBlocks = (blocks: readonly SlackBlock[]) =>
  [...blocks] as unknown as Block[];

/**
 * The message as Slack would draw it, via `slack-blocks-to-jsx`.
 *
 * Its stylesheet, `slack-blocks-to-jsx/dist/style.css`, is the host's to load.
 */
export const SlackSurface = ({ blocks }: { blocks: readonly SlackBlock[] }) => {
  const { colorMode } = useEuiTheme();
  return (
    <Message
      blocks={toMessageBlocks(blocks)}
      name="Isomer"
      logo={LOGO}
      theme={colorMode === 'DARK' ? 'dark' : 'light'}
    />
  );
};

/** Opens the blocks in Slack's Block Kit Builder. */
export const blockKitBuilderUrl = (blocks: readonly SlackBlock[]): string =>
  `https://app.slack.com/block-kit-builder#${encodeURIComponent(JSON.stringify({ blocks }))}`;
