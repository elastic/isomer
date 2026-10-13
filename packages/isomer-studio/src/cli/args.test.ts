/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'node:path';

import { DEFAULT_PORT, normalizeBase, parseCliArgs } from './args';

const CWD = '/work/project';

const usageError = (
  run: () => unknown
): { name: string; message: string } | undefined => {
  try {
    run();
  } catch (error) {
    return error instanceof Error
      ? { name: error.name, message: error.message }
      : undefined;
  }
  return undefined;
};

describe('parseCliArgs', () => {
  it('asks for help with no command, help, or -h', () => {
    expect(parseCliArgs([], CWD)).toEqual({ command: 'help' });
    expect(parseCliArgs(['help'], CWD)).toEqual({ command: 'help' });
    expect(parseCliArgs(['build', '-h'], CWD)).toEqual({ command: 'help' });
  });

  it('defaults dev to the default port, without opening a browser', () => {
    expect(parseCliArgs(['dev'], CWD)).toEqual({
      command: 'dev',
      cwd: CWD,
      config: undefined,
      loader: 'tsx',
      port: DEFAULT_PORT,
      open: false,
    });
  });

  it('accepts port 0 and rejects what is not a port', () => {
    expect(parseCliArgs(['dev', '--port', '0'], CWD)).toMatchObject({
      port: 0,
    });
    expect(
      usageError(() => parseCliArgs(['dev', '--port', '70000'], CWD))
    ).toMatchObject({
      name: 'UsageError',
      message: '--port must be a port number; got 70000.',
    });
  });

  it('resolves --out and --report against --cwd, which resolves against the process directory', () => {
    const build = parseCliArgs(
      [
        'build',
        '--cwd',
        'packages/pack',
        '--out',
        'site',
        '--config',
        'studio.config.ts',
      ],
      CWD
    );
    expect(build).toMatchObject({
      cwd: join(CWD, 'packages/pack'),
      out: join(CWD, 'packages/pack/site'),
      config: 'studio.config.ts',
    });
    expect(
      parseCliArgs(
        ['check', '--cwd', '/elsewhere', '--report', 'report.xml'],
        CWD
      )
    ).toMatchObject({ cwd: '/elsewhere', report: '/elsewhere/report.xml' });
  });

  it('defaults build to dist/studio under --cwd and a relative base', () => {
    expect(parseCliArgs(['build'], CWD)).toMatchObject({
      out: join(CWD, 'dist/studio'),
      base: './',
    });
    expect(parseCliArgs(['build', '--base', '/isomer'], CWD)).toMatchObject({
      base: '/isomer/',
    });
  });

  it('parses check options', () => {
    expect(
      parseCliArgs(
        ['check', '--format', 'junit', '--png', '--surfaces', 'html, slack'],
        CWD
      )
    ).toMatchObject({
      command: 'check',
      format: 'junit',
      png: true,
      surfaces: ['html', 'slack'],
      report: undefined,
    });
  });

  it.each([
    [['ship'], 'Unknown command: ship.'],
    [['build', 'extra'], 'Unexpected arguments: extra.'],
    [['build', '--port', '1'], '--port does not apply to build.'],
    [['dev', '--png', '--out', 'x'], '--png, --out does not apply to dev.'],
    [
      ['check', '--format', 'xml'],
      '--format must be one of json, junit; got xml.',
    ],
    [
      ['check', '--loader', 'swc'],
      '--loader must be one of tsx, none; got swc.',
    ],
    [
      ['check', '--surfaces', 'html,pdf'],
      /^--surfaces has unknown surfaces: pdf\. Known: /,
    ],
  ])('rejects %j', (argv, message) => {
    const error = usageError(() => parseCliArgs(argv, CWD));
    expect(error?.name).toBe('UsageError');
    expect(error?.message).toMatch(message);
  });

  it('reports an unknown flag as a usage error', () => {
    expect(
      usageError(() => parseCliArgs(['dev', '--nope'], CWD))
    ).toMatchObject({
      name: 'UsageError',
    });
  });
});

describe('normalizeBase', () => {
  it('adds one trailing slash', () => {
    expect(normalizeBase('/a/b')).toBe('/a/b/');
    expect(normalizeBase('/a/b/')).toBe('/a/b/');
    expect(normalizeBase('./')).toBe('./');
  });
});
