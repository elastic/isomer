/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  slideDeckFrame,
  slideDeckPrimitives,
  slidesPack,
} from '@elastic/isomer-primitives-slides';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, describe, expect, it } from 'vitest';

import { ISOMER_TOOL_NAMES } from '../tools';

import {
  createIsomerMcpServer,
  ISOMER_AUTHORING_GUIDE_URI,
  ISOMER_COMPOSE_PROMPT,
} from './server';

const slide = slideDeckPrimitives.find(({ type }) => type === 'slideFrame')!
  .examples[0];

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const connect = async (setup?: (server: McpServer) => void) => {
  const server = createIsomerMcpServer({
    name: 'isomer-test',
    version: '0.0.0',
    runtime,
    frame: slideDeckFrame,
    image: () => Promise.resolve(new Uint8Array([1, 2, 3])),
  });
  setup?.(server);
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return { client, server };
};

describe('createIsomerMcpServer', () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  const connected = async (setup?: (server: McpServer) => void) => {
    const connection = await connect(setup);
    close = () => connection.client.close();
    return connection;
  };

  it('lists the tools with JSON Schema inputs', async () => {
    const { client } = await connected();
    const { tools } = await client.listTools();
    expect(tools.map(({ name }) => name)).toEqual(
      Object.values(ISOMER_TOOL_NAMES)
    );
    const render = tools.find(({ name }) => name === ISOMER_TOOL_NAMES.render);
    expect(render?.inputSchema.properties?.surface).toMatchObject({
      enum: ['text', 'markdown', 'html', 'slack', 'png'],
    });
    expect(
      JSON.stringify(render?.inputSchema.properties?.composition)
    ).toContain(ISOMER_TOOL_NAMES.authoringGuide);
  });

  it('calls the guide tool with no arguments', async () => {
    const { client } = await connected();
    const result = await client.callTool({
      name: ISOMER_TOOL_NAMES.authoringGuide,
    });
    expect(result.isError).toBeFalsy();
    const [block] = result.content as Array<{ type: string; text: string }>;
    expect(block?.type).toBe('text');
    expect(block?.text).toContain('`slideFrame`');
  });

  it('validates over the wire', async () => {
    const { client } = await connected();
    const result = await client.callTool({
      name: ISOMER_TOOL_NAMES.validate,
      arguments: { composition: { type: 'view', body: [slide, slide] } },
    });
    expect(result.isError).toBeFalsy();
    const [block] = result.content as Array<{ type: string; text: string }>;
    expect(JSON.parse(block!.text)).toMatchObject({
      valid: false,
      errors: [expect.stringMatching(/exactly one "slideFrame"/)],
    });
  });

  it('returns png renders as image content', async () => {
    const { client } = await connected();
    const result = await client.callTool({
      name: ISOMER_TOOL_NAMES.render,
      arguments: {
        composition: { type: 'view', body: [slide] },
        surface: 'png',
      },
    });
    expect(result.content).toEqual([
      { type: 'image', data: 'AQID', mimeType: 'image/png' },
    ]);
  });

  it('serves the guide as a resource', async () => {
    const { client } = await connected();
    const { contents } = await client.readResource({
      uri: ISOMER_AUTHORING_GUIDE_URI,
    });
    const [content] = contents;
    expect(contents).toHaveLength(1);
    expect(content).toMatchObject({
      uri: ISOMER_AUTHORING_GUIDE_URI,
      mimeType: 'text/markdown',
    });
    expect(content && 'text' in content ? content.text : '').toContain(
      '## Primitive catalog'
    );
  });

  it('serves the guide as a prompt, with the request appended', async () => {
    const { client } = await connected();
    const { messages } = await client.getPrompt({
      name: ISOMER_COMPOSE_PROMPT,
      arguments: { request: 'Summarize the launch.' },
    });
    expect(messages).toHaveLength(1);
    const [{ role, content }] = messages as [
      { role: string; content: { type: string; text: string } },
    ];
    expect(role).toBe('user');
    expect(content.text).toMatch(
      /## Primitive catalog[\s\S]*## Request\n\nSummarize the launch\.$/
    );
  });

  it('takes host tools beside its own', async () => {
    const { client } = await connected((server) =>
      server.registerTool('host_search', { description: 'Host data.' }, () => ({
        content: [],
      }))
    );
    const { tools } = await client.listTools();
    expect(tools.map(({ name }) => name)).toContain('host_search');
  });
});
