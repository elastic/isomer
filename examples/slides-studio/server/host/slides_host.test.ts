/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  ISOMER_AUTHORING_GUIDE_URI,
  ISOMER_COMPOSE_PROMPT,
  ISOMER_TOOL_NAMES,
  type IsomerToolResult,
} from '@elastic/isomer-agent-tools';
import {
  slidesAuthoringGuide,
  slidesAuthoringRules,
} from '@elastic/isomer-primitives-slides';
import { describe, expect, it, vi } from 'vitest';

import { runtime } from '../../common/runtime';
import { createDeckStore } from '../store';

import { createSlidesHost } from './slides_host';

const titled = {
  type: 'view',
  title: 'Envelope title',
  body: [
    {
      type: 'slideFrame',
      body: [{ type: 'slideHeading', title: 'Body heading' }],
    },
  ],
};

const setup = () => {
  const png = vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3])));
  const host = createSlidesHost({
    runtime,
    store: createDeckStore(mkdtempSync(join(tmpdir(), 'studio-host-'))),
    png,
    layoutOf: () => Promise.resolve({ overflow: undefined, overlaps: [] }),
    viewerUrl: (id) => `http://localhost:5178/decks/${id}`,
  });
  const call = (name: string, input: Record<string, unknown>) => {
    const tool = host.tools.find((entry) => entry.name === name)!;
    return tool.handler(tool.inputSchema.parse(input));
  };
  return { host, png, call };
};

const textOf = ({ content: [block] }: IsomerToolResult): string =>
  block?.type === 'text' ? block.text : '';

describe('createSlidesHost', () => {
  it('offers the isomer tools without views, then the deck tools', () => {
    const { host } = setup();
    const { listViews, requestView } = ISOMER_TOOL_NAMES;
    expect(host.tools.map(({ name }) => name)).toEqual([
      ...Object.values(ISOMER_TOOL_NAMES).filter(
        (name) => name !== listViews && name !== requestView
      ),
      'deck_create',
      'deck_list',
      'deck_get',
      'deck_set_slide',
      'deck_insert_slide',
      'deck_remove_slide',
      'deck_move_slide',
      'deck_render_slide',
    ]);
    expect(host.instructions).toContain('deck_render_slide');
  });

  it('opens the guide with the pack’s guide and the studio’s links, then the pack’s rules', async () => {
    const { host, call } = setup();
    const guide = textOf(await call(ISOMER_TOOL_NAMES.authoringGuide, {}));
    expect(guide).toContain(`## Guide\n\n${slidesAuthoringGuide}\n\n`);
    expect(guide).toContain('opens a slide at `?slide=<n>`');
    expect(guide).toContain(`## Rules\n\n- ${slidesAuthoringRules[0]}`);
    const resource = host.resources.find(
      ({ uri }) => uri === ISOMER_AUTHORING_GUIDE_URI
    )!;
    expect(resource.read()).toBe(guide);
    const compose = host.prompts.find(
      ({ name }) => name === ISOMER_COMPOSE_PROMPT
    )!;
    expect(compose.build(compose.argsSchema.parse({}))).toBe(guide);
  });

  it('holds a composition to one slide frame', async () => {
    const { call } = setup();
    const result = await call(ISOMER_TOOL_NAMES.validate, {
      composition: { ...titled, body: [titled.body[0], titled.body[0]] },
    });
    expect(JSON.parse(textOf(result))).toMatchObject({
      valid: false,
      errors: [expect.stringMatching(/exactly one "slideFrame"/)],
    });
  });

  it('renders without the envelope heading, since the frame carries its own', async () => {
    const { call } = setup();
    const text = textOf(
      await call(ISOMER_TOOL_NAMES.render, {
        composition: titled,
        surface: 'text',
      })
    );
    expect(text).toMatch(/body heading/i);
    expect(text).not.toMatch(/envelope title/i);
  });

  it.each([
    ['dark', 'dark'],
    ['light', 'light'],
    ['auto', 'light'],
    [undefined, 'light'],
  ])('renders png with theme %s as %s', async (theme, drawn) => {
    const { call, png } = setup();
    const result = await call(ISOMER_TOOL_NAMES.render, {
      composition: titled,
      surface: 'png',
      ...(theme === undefined ? {} : { theme }),
    });
    expect(result.content[0]).toMatchObject({ type: 'image' });
    expect(png).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Envelope title' }),
      drawn
    );
  });
});
