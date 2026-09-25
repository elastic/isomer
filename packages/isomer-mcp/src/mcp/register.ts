/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { IsomerTool, IsomerToolResult } from '../tools';

/** An {@link IsomerToolResult} as an MCP `CallToolResult`. */
export const toCallToolResult = ({
  content,
  isError,
}: IsomerToolResult): CallToolResult => ({
  content: content.map((block) => ({ ...block })),
  ...(isError === undefined ? {} : { isError }),
});

/** Registers each tool on `server` under its own name. */
export const registerIsomerTools = (
  server: McpServer,
  tools: readonly IsomerTool[]
): void => {
  for (const tool of tools) {
    const { name, title, description, inputSchema } = tool;
    // The SDK rejects a call that omits `arguments` against any `inputSchema`, even an empty one.
    if (Object.keys(inputSchema.shape).length === 0) {
      server.registerTool(name, { title, description }, async () =>
        toCallToolResult(await tool.handler(inputSchema.parse({})))
      );
      continue;
    }
    server.registerTool(
      name,
      { title, description, inputSchema },
      async (input) => toCallToolResult(await tool.handler(input))
    );
  }
};
