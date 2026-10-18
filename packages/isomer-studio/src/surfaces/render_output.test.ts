/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, ValidationResult } from '@elastic/isomer-sdk';

import type { StudioRuntime } from '../config';

import { renderSurfaceOutput } from './render_output';

const composition: Composition = { type: 'view', body: [] };

const validation: ValidationResult = {
  valid: true,
  errors: [],
  warnings: [
    { surface: 'react', path: 'body[0]', message: 'React finding.' },
    { surface: 'snapshot', path: 'body[1]', message: 'Too tall.' },
    { surface: 'snapshot', message: 'Whole composition.' },
    { surface: 'slack', path: 'body[2]', message: 'Slack finding.' },
  ],
};

const stubRuntime = (snapshot = true) => {
  const surfaces = {
    html: { render: vi.fn(() => ({ html: '<p>Hi</p>' })) },
    markdown: { render: vi.fn(() => '# Hi') },
    text: { render: vi.fn(() => 'Hi') },
    slack: {
      render: vi.fn(() => ({
        text: 'Hi',
        blocks: [{ type: 'divider' }],
      })),
    },
    snapshot: snapshot
      ? {
          render: vi.fn(() => ({
            html: '<div>frame</div>',
            css: '.a{}',
            width: 1920,
            height: 1080,
            warnings: [
              { path: 'body[1]', message: 'Too tall.' },
              { path: 'body[3]', message: 'No height estimate.' },
            ],
          })),
        }
      : undefined,
  };
  // The output pipeline reads only these renderers.
  return { surfaces, runtime: { surfaces } as unknown as StudioRuntime };
};

describe('renderSurfaceOutput', () => {
  it('requests host-run enhancements for React and HTML', () => {
    const { surfaces, runtime } = stubRuntime();
    renderSurfaceOutput(runtime, 'react', composition, validation, {
      enhancements: ['copy'],
    });
    expect(surfaces.html.render).toHaveBeenLastCalledWith(
      composition,
      expect.objectContaining({ enhancements: ['copy'], scripts: 'host' })
    );
    renderSurfaceOutput(runtime, 'html', composition, validation, {
      enhancements: ['copy'],
    });
    expect(surfaces.html.render).toHaveBeenLastCalledWith(composition, {
      minify: false,
      enhancements: ['copy'],
      scripts: 'host',
    });
  });

  it('renders `react` as HTML with separate CSS and host scripts', () => {
    const { surfaces, runtime } = stubRuntime();

    const output = renderSurfaceOutput(
      runtime,
      'react',
      composition,
      validation
    );

    expect(surfaces.html.render).toHaveBeenCalledWith(composition, {
      css: 'separate',
      minify: false,
      scripts: 'host',
    });
    expect(output).toEqual({
      source: '<p>Hi</p>',
      language: 'html',
      warnings: [validation.warnings[0]],
    });
  });

  it("renders `html` unminified and reports the `react` surface's warnings", () => {
    const { surfaces, runtime } = stubRuntime();

    const output = renderSurfaceOutput(
      runtime,
      'html',
      composition,
      validation
    );

    expect(surfaces.html.render).toHaveBeenCalledWith(composition, {
      minify: false,
    });
    expect(output.warnings).toEqual([validation.warnings[0]]);
  });

  it('collects findings on markdown, text, and slack', () => {
    const { surfaces, runtime } = stubRuntime();

    expect(
      renderSurfaceOutput(runtime, 'markdown', composition, validation)
    ).toMatchObject({ source: '# Hi', language: 'markdown', warnings: [] });
    expect(
      renderSurfaceOutput(runtime, 'text', composition, validation)
    ).toMatchObject({ source: 'Hi', language: 'text' });
    expect(
      renderSurfaceOutput(runtime, 'slack', composition, validation)
    ).toEqual({
      source: JSON.stringify(
        { text: 'Hi', blocks: [{ type: 'divider' }] },
        null,
        2
      ),
      language: 'json',
      slack: { text: 'Hi', blocks: [{ type: 'divider' }] },
      warnings: [validation.warnings[3]],
    });
    for (const { render } of [
      surfaces.markdown,
      surfaces.text,
      surfaces.slack,
    ]) {
      expect(render).toHaveBeenCalledWith(composition, {
        onValidationError: 'collect',
      });
    }
  });

  it('warns once per Slack block type Isomer does not model', () => {
    const { runtime, surfaces } = stubRuntime();
    surfaces.slack.render.mockReturnValueOnce({
      text: 'Hi',
      blocks: [{ type: 'carousel' }, { type: 'divider' }, { type: 'carousel' }],
    });

    const { warnings } = renderSurfaceOutput(
      runtime,
      'slack',
      composition,
      validation
    );

    expect(warnings).toEqual([
      validation.warnings[3],
      {
        surface: 'slack',
        message:
          "Isomer doesn't model `carousel` blocks, so their Slack limits aren't checked and this preview may not draw them. Check the message in Block Kit Builder.",
      },
    ]);
  });

  it('leaves out the heading on every surface that renders one when `heading` is false', () => {
    const { surfaces, runtime } = stubRuntime();
    const options = { heading: false };

    for (const surface of [
      'react',
      'html',
      'markdown',
      'text',
      'slack',
    ] as const) {
      renderSurfaceOutput(runtime, surface, composition, validation, options);
    }

    expect(surfaces.html.render).toHaveBeenCalledTimes(2);
    for (const [, renderOptions] of surfaces.html.render.mock
      .calls as unknown as [unknown, object][]) {
      expect(renderOptions).toMatchObject({ heading: false });
    }
    for (const { render } of [
      surfaces.markdown,
      surfaces.text,
      surfaces.slack,
    ]) {
      expect(render).toHaveBeenCalledWith(composition, {
        onValidationError: 'collect',
        heading: false,
      });
    }
  });

  it('merges snapshot render warnings with validation warnings, without duplicates', () => {
    const { runtime } = stubRuntime();

    const output = renderSurfaceOutput(
      runtime,
      'snapshot',
      composition,
      validation
    );

    expect(output.snapshot).toEqual({
      css: '.a{}',
      html: '<div>frame</div>',
      width: 1920,
      height: 1080,
    });
    expect(output.warnings).toEqual([
      { surface: 'snapshot', path: 'body[1]', message: 'Too tall.' },
      { surface: 'snapshot', message: 'Whole composition.' },
      {
        surface: 'snapshot',
        path: 'body[3]',
        message: 'No height estimate.',
      },
    ]);
  });

  it('treats a missing path as the empty path when deduplicating', () => {
    const { runtime, surfaces } = stubRuntime();
    surfaces.snapshot?.render.mockReturnValueOnce({
      html: '',
      css: '',
      width: 1,
      height: 1,
      warnings: [{ path: '', message: 'Whole composition.' }],
    });

    const { warnings } = renderSurfaceOutput(
      runtime,
      'snapshot',
      composition,
      validation
    );

    expect(warnings).toEqual([
      { surface: 'snapshot', path: 'body[1]', message: 'Too tall.' },
      { surface: 'snapshot', message: 'Whole composition.' },
    ]);
  });

  it('reports a runtime without frames as an error, keeping its warnings', () => {
    const { runtime } = stubRuntime(false);

    expect(
      renderSurfaceOutput(runtime, 'snapshot', composition, validation)
    ).toEqual({
      source: '',
      language: 'html',
      error: 'This runtime has no frames.',
      warnings: [validation.warnings[1], validation.warnings[2]],
    });
  });

  it('recovers from a renderer that throws, keeping the surface warnings', () => {
    const { runtime, surfaces } = stubRuntime();
    surfaces.slack.render.mockImplementationOnce(() => {
      throw new Error('Half-edited node.');
    });

    expect(
      renderSurfaceOutput(runtime, 'slack', composition, validation)
    ).toEqual({
      source: '',
      language: 'text',
      error: 'Half-edited node.',
      warnings: [validation.warnings[3]],
    });
  });

  it('describes a thrown value that is not an `Error`', () => {
    const { runtime, surfaces } = stubRuntime();
    surfaces.text.render.mockImplementationOnce(() => {
      // A renderer outside the runtime's control can throw anything.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'plain string';
    });

    expect(
      renderSurfaceOutput(runtime, 'text', composition, validation).error
    ).toBe('plain string');
  });
});
