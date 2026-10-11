/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import ts from 'typescript';

/** Runs the patched Agent Builder server path against exact unpublished tarballs. */
export const checkAgentBuilderConsumer = async (
  checkout,
  packages,
  tempDir,
  linkDirectory
) => {
  const base = '2b65619b725ae64ad572dca509daffd4aee2f149';
  assert.equal(
    execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: checkout,
      encoding: 'utf8',
    }).trim(),
    base,
    'Consumer checkout must match Kibana #296157.'
  );
  const dir = join(tempDir, 'agent-builder');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }));
  for (const name of ['@elastic/isomer-sdk', '@elastic/isomer-runtime']) {
    const pkg = packages.get(name);
    linkDirectory(pkg.dir, join(dir, 'node_modules', name));
    console.log(
      `${name}: candidate SHA256 ${createHash('sha256').update(readFileSync(pkg.filename)).digest('hex')}`
    );
  }
  const sdk = packages.get('@elastic/isomer-sdk');
  linkDirectory(
    join(sdk.dir, 'node_modules/zod'),
    join(dir, 'node_modules/zod')
  );
  const surfaces =
    'x-pack/platform/plugins/shared/agent_builder/server/services/surfaces';
  const common =
    'x-pack/platform/packages/shared/agent-builder/agent-builder-common';
  const files = {
    composition: `${surfaces}/composition.ts`,
    'composition.test': `${surfaces}/composition.test.ts`,
    'slack.test': `${surfaces}/slack.test.ts`,
    'surfaces_service.test': `${surfaces}/surfaces_service.test.ts`,
    slack: `${surfaces}/slack.ts`,
    pack: `${surfaces}/pack.ts`,
    surfaces_service: `${surfaces}/surfaces_service.ts`,
    versioned_attachment: `${common}/attachments/versioned_attachment.ts`,
    custom_rendering: `${common}/tools/custom_rendering.ts`,
    factory:
      'x-pack/platform/packages/shared/isomer/isomer/src/create_kibana_isomer_runtime.ts',
  };
  const replacements = {
    '@kbn/agent-builder-common/attachments': './versioned_attachment.js',
    '@kbn/agent-builder-common/tools/custom_rendering': './custom_rendering.js',
    '@kbn/agent-builder-common': './common.js',
    '@kbn/isomer': './factory.js',
    '@kbn/i18n': './i18n.js',
    '@kbn/zod/v4': 'zod',
    '@kbn/logging-mocks': './logger_mock.js',
  };
  for (const [name, file] of Object.entries(files)) {
    const source = readFileSync(join(checkout, file), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        isolatedModules: true,
      },
      fileName: file,
    });
    const output = outputText.replace(
      /(from\s+['"])([^'"]+)(['"])/g,
      (_match, prefix, specifier, suffix) =>
        `${prefix}${replacements[specifier] ?? (specifier.startsWith('.') ? `${specifier}.js` : specifier)}${suffix}`
    );
    writeFileSync(join(dir, `${name}.js`), output);
  }
  // These host boundaries have no Isomer or attachment behavior.
  writeFileSync(
    join(dir, 'common.js'),
    "export const ConversationOriginType = { Slack: 'slack' }; export const ChatEventType = { roundComplete: 'round_complete' }; export const ConversationRoundStatus = { completed: 'completed' };\n"
  );
  writeFileSync(
    join(dir, 'i18n.js'),
    'export const i18n = { translate: (_id, { defaultMessage }) => defaultMessage };\n'
  );
  linkDirectory(
    join(sdk.sourceDir, '../../node_modules/vitest'),
    join(dir, 'node_modules/vitest')
  );
  writeFileSync(
    join(dir, 'logger_mock.js'),
    "import { vi } from 'vitest'; export const loggerMock = { create: () => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn() }) };\n"
  );
  writeFileSync(
    join(dir, 'setup.js'),
    "import { vi } from 'vitest'; globalThis.jest = vi;\n"
  );
  writeFileSync(
    join(dir, 'vitest.config.js'),
    "export default { test: { globals: true, include: ['*.test.js'], setupFiles: ['./setup.js'] } };\n"
  );
  execFileSync(
    process.execPath,
    [
      join(sdk.sourceDir, '../../node_modules/vitest/vitest.mjs'),
      'run',
      '--config',
      join(dir, 'vitest.config.js'),
    ],
    { cwd: dir, stdio: 'inherit' }
  );
  const { SurfacesServiceImpl } = await import(
    pathToFileURL(join(dir, 'surfaces_service.js')).href
  );
  const warnings = [];
  const logger = {
    debug: () => {},
    warn: (message) => warnings.push(message),
    error: (message) => warnings.push(message),
  };
  const attachments = [
    {
      id: 'a1',
      type: 'text',
      current_version: 2,
      versions: [1, 2].map((version) => ({
        version,
        data: { version },
        created_at: '2026-10-06',
        content_hash: String(version),
      })),
    },
  ];
  const resolved = [];
  const service = new SurfacesServiceImpl({
    logger,
    attachmentsService: {
      getTypeDefinition: () => ({
        toSurfaceComposition: (_data, { attachment, version }) => {
          resolved.push(version);
          return {
            type: 'view',
            title: 'Attachment',
            body: [{ type: 'markdown', text: `${attachment.id} v${version}` }],
          };
        },
      }),
    },
  });
  const event = (message, entries = attachments) => ({
    data: {
      round: {
        input: { attachment_refs: [{ attachment_id: 'a1', version: 1 }] },
        response: { message },
      },
      attachments: entries,
    },
  });
  const render = (message, entries) =>
    service.renderPayload(event(message, entries), { originType: 'slack' });
  const list = render(
    '1. see [docs] <render_attachment id="a1" />\n2. next\n\n[docs]: https://elastic.co'
  );
  assert.equal(list.blocks[0].elements[0].style, 'ordered');
  assert.equal(list.blocks[0].elements[0].elements.length, 2);
  assert.ok(list.text.includes('a1 v2'));
  assert.ok(list.text.includes('https://elastic.co'));
  assert.ok(!list.text.includes('render_attachment'));
  assert.ok(!list.text.includes('&#x'));
  assert.deepEqual(resolved, [2]);
  assert.ok(JSON.stringify(list.blocks).includes('https://elastic.co'));
  assert.ok(
    render('<render_attachment id="a1" version="1" />').text.includes('a1 v1')
  );
  assert.ok(
    render('<render_attachment id="a1" version="latest" />').text.includes(
      'a1 v2'
    )
  );
  for (const source of [
    '`<render_attachment id="a1" />`',
    '```\n<render_attachment id="a1" />\n```',
    '    <render_attachment id="a1" />',
  ]) {
    const count = resolved.length;
    assert.ok(render(source).text.includes('render_attachment'));
    assert.equal(resolved.length, count);
  }
  assert.ok(
    render(
      '| a | b |\n| - | - |\n| before <render_attachment id="a1" /> | after |'
    ).text.includes('a1 v2')
  );
  const notes = render(
    'a[^n]\n\n<render_attachment id="a1" />\n\n[^n]: note [^m]\n[^m]: back [^n]'
  );
  assert.ok(notes.text.includes('[n]: note'));
  assert.ok(notes.text.includes('a1 v2'));
  const inert = render(`${'[x]'.repeat(1100)}\n<render_attachment id="a1" />`);
  assert.ok(inert.text.includes('[x][x]'));
  assert.ok(inert.text.includes('a1 v2'));
  assert.equal(render(''), undefined);
  assert.equal(render('<render_attachment />'), undefined);
  assert.equal(render('<render_attachment id="a1" />', []), undefined);
  assert.equal(render('<render_attachment id="a1" version="9" />'), undefined);
  assert.equal(service.renderPayload(event('Hello'), {}), undefined);
  for (const toSurfaceComposition of [
    () => {
      throw new Error('failed');
    },
    () => ({ type: 'view', body: [{ type: 'unknown' }] }),
  ]) {
    const failing = new SurfacesServiceImpl({
      logger,
      attachmentsService: {
        getTypeDefinition: () => ({ toSurfaceComposition }),
      },
    });
    assert.ok(
      failing
        .renderPayload(event('before <render_attachment id="a1" /> after'), {
          originType: 'slack',
        })
        .text.includes('before  after')
    );
  }
  assert.ok(warnings.length >= 2);
  console.log(
    `Agent Builder consumer passed at ${base}: real service, attachment adapter, pack, runtime factory, version helpers, blocks and fallback text. Host enums, i18n and test logging boundaries were stubbed; 23 patched tests ran through Vitest/Jest compatibility. This is not native Kibana Jest, bootstrap, typecheck or CI.`
  );
};
