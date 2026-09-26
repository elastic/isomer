/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  buildIsomerAuthoringGuide,
  createIsomerTools,
  ISOMER_TOOL_NAMES,
  type IsomerToolsOptions,
} from '../tools';

import { registerIsomerTools } from './register';

/** Where {@link createIsomerMcpServer} exposes the authoring guide as a resource. */
export const ISOMER_AUTHORING_GUIDE_URI = 'isomer://authoring-guide';

/** Where {@link createIsomerMcpServer} exposes the whole composition JSON Schema. */
export const ISOMER_COMPOSITION_SCHEMA_URI = 'isomer://composition-schema';

/** The prompt {@link createIsomerMcpServer} registers: the guide, plus an optional request. */
export const ISOMER_COMPOSE_PROMPT = 'compose';

/** Options for {@link createIsomerMcpServer}. */
export type IsomerMcpServerOptions<THostContext = unknown> =
  IsomerToolsOptions<THostContext> & {
    /** Server name reported to clients. */
    name: string;
    version: string;
    /** Sent to clients on initialize. Defaults to a pointer at the authoring guide. */
    instructions?: string;
  };

const DEFAULT_INSTRUCTIONS = `Answers are compositions: typed JSON the host validates and renders. Read \`${ISOMER_TOOL_NAMES.authoringGuide}\`, look up the primitives you pick with \`${ISOMER_TOOL_NAMES.describePrimitives}\`, check the composition with \`${ISOMER_TOOL_NAMES.validate}\`, and render it with \`${ISOMER_TOOL_NAMES.render}\`.`;

/** An MCP server with the Isomer tools, the authoring guide as a resource, and a `compose` prompt. Register host tools on the returned server. */
export const createIsomerMcpServer = <THostContext = unknown>(
  options: IsomerMcpServerOptions<THostContext>
): McpServer => {
  const { name, version, instructions = DEFAULT_INSTRUCTIONS } = options;
  const server = new McpServer({ name, version }, { instructions });
  const guide = () => buildIsomerAuthoringGuide(options);

  registerIsomerTools(server, createIsomerTools(options));

  server.registerResource(
    'isomer-authoring-guide',
    ISOMER_AUTHORING_GUIDE_URI,
    {
      title: 'Isomer authoring guide',
      description:
        'The guide, rules, registered views, and an index of the primitives.',
      mimeType: 'text/markdown',
    },
    (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: guide() }],
    })
  );

  server.registerResource(
    'isomer-composition-schema',
    ISOMER_COMPOSITION_SCHEMA_URI,
    {
      title: 'Composition JSON Schema',
      description:
        'The whole authoring JSON Schema for a composition, every primitive included.',
      mimeType: 'application/json',
    },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(
            options.runtime.getAuthoringContext().schema,
            null,
            2
          ),
        },
      ],
    })
  );

  server.registerPrompt(
    ISOMER_COMPOSE_PROMPT,
    {
      title: 'Compose a view',
      description: 'The authoring guide, followed by what to show.',
      argsSchema: {
        request: z.string().optional().describe('What the view should answer.'),
      },
    },
    ({ request }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text:
              request === undefined
                ? guide()
                : `${guide()}\n\n## Request\n\n${request}`,
          },
        },
      ],
    })
  );

  return server;
};
