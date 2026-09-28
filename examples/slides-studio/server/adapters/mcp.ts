/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The part a host copies to put the agent tools on an MCP server; the studio's transport stays in `../mcp.ts`.

import type {
  IsomerPrompt,
  IsomerResource,
  IsomerTool,
  IsomerToolResult,
} from '@elastic/isomer-agent-tools';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const toCallToolResult = ({
  content,
  isError,
}: IsomerToolResult): CallToolResult => ({
  content: content.map((block) => ({ ...block })),
  ...(isError === undefined ? {} : { isError }),
});

const registerTool = (server: McpServer, tool: IsomerTool): void => {
  const { name, title, description, inputSchema } = tool;
  // The SDK rejects a call that omits `arguments` against any `inputSchema`, even an empty one.
  if (Object.keys(inputSchema.shape).length === 0) {
    server.registerTool(name, { title, description }, async () =>
      toCallToolResult(await tool.handler(inputSchema.parse({})))
    );
    return;
  }
  server.registerTool(
    name,
    { title, description, inputSchema },
    async (input) => toCallToolResult(await tool.handler(input))
  );
};

const registerResource = (
  server: McpServer,
  resource: IsomerResource
): void => {
  const { name, uri, title, description, mimeType } = resource;
  server.registerResource(
    name,
    uri,
    { title, description, mimeType },
    ({ href }) => ({
      contents: [{ uri: href, mimeType, text: resource.read() }],
    })
  );
};

const registerPrompt = (server: McpServer, prompt: IsomerPrompt): void => {
  const { name, title, description, argsSchema } = prompt;
  server.registerPrompt(
    name,
    { title, description, argsSchema: argsSchema.shape },
    (args) => ({
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: prompt.build(argsSchema.parse(args)) },
        },
      ],
    })
  );
};

/** Registers transport-neutral Isomer tools, resources, and prompts on an MCP server. */
export const registerIsomer = (
  server: McpServer,
  {
    tools = [],
    resources = [],
    prompts = [],
  }: {
    tools?: readonly IsomerTool[];
    resources?: readonly IsomerResource[];
    prompts?: readonly IsomerPrompt[];
  }
): void => {
  for (const tool of tools) {
    registerTool(server, tool);
  }
  for (const resource of resources) {
    registerResource(server, resource);
  }
  for (const prompt of prompts) {
    registerPrompt(server, prompt);
  }
};
