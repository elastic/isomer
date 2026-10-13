/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Installs the packed Studio with npm in a directory outside the workspace,
// then checks, builds and drives it with a consumer's own config and pack.

import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { requireChromium, runStudioSpec } from './studio_spec.js';
import { repoRoot } from './workspace_packages.js';

const PACKED = {
  '@elastic/isomer-sdk': 'isomer-sdk',
  '@elastic/isomer-runtime': 'isomer-runtime',
  '@elastic/isomer-image-takumi': 'isomer-image-takumi',
  '@elastic/isomer-studio': 'isomer-studio',
};
const BASE = '/sub/';

const rootManifest = JSON.parse(
  readFileSync(join(repoRoot, 'package.json'), 'utf-8')
);
const { devDependencies } = rootManifest;

/** The environment without pnpm's `NODE_PATH`, which would resolve workspace packages. */
const isolatedEnv = (extra = {}) => {
  const { NODE_PATH: _nodePath, ...env } = process.env;
  return { ...env, ...extra };
};

const PACK = `import React from 'react';
import type { DefaultPackTypes, PrimitiveIcon, StyledRenderContext } from '@elastic/isomer-sdk';
import { definePrimitiveFor, definePrimitivePack, requiredString } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { z } from 'zod';

interface ConsumerPackTypes extends DefaultPackTypes {
  context: StyledRenderContext;
}

const definePrimitive = definePrimitiveFor<ConsumerPackTypes>();

const icon = (shape: string): PrimitiveIcon => ({
  svg: \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">\${shape}</svg>\`,
});

const bannerSchema = z.object({ type: z.literal('banner'), text: requiredString() });
type BannerNode = z.infer<typeof bannerSchema>;
export const bannerExample: BannerNode = { type: 'banner', text: 'Consumer Studio' };

const banner = definePrimitive<BannerNode, typeof bannerSchema>({
  type: 'banner',
  catalog: {
    type: 'banner',
    name: 'Banner',
    purpose: 'Names the view.',
    useWhen: ['A view needs a heading.'],
    avoidWhen: ['The view already has one.'],
    example: bannerExample,
  },
  icon: icon('<rect x="2" y="5" width="12" height="6" fill="var(--isomer-icon-accent)"/>'),
  examples: [bannerExample],
  schema: bannerSchema,
  renderers: {
    react: ({ text }) => <h1 style={{ margin: 0, fontSize: 24 }}>{text}</h1>,
    text: ({ text }) => text,
    markdown: ({ text }) => md.heading(1, text),
    slack: ({ text }) => ({ type: 'header', text: { type: 'plain_text', text } }),
  },
});

const noticeSchema = z.object({
  type: z.literal('notice'),
  title: requiredString(),
  body: requiredString(),
});
type NoticeNode = z.infer<typeof noticeSchema>;

const noticeOf = (title: string) => {
  const noticeExample: NoticeNode = { type: 'notice', title, body: 'Every service is healthy.' };
  return definePrimitive<NoticeNode, typeof noticeSchema>({
    type: 'notice',
    catalog: {
      type: 'notice',
      name: 'Notice',
      purpose: 'States one finding.',
      useWhen: ['There is one thing to say.'],
      avoidWhen: ['There is nothing to say.'],
      example: noticeExample,
    },
    icon: icon('<circle cx="8" cy="8" r="5" fill="var(--isomer-icon-accent)"/>'),
    examples: [noticeExample],
    schema: noticeSchema,
    renderers: {
      react: ({ title, body }) => (
        <div style={{ padding: 12, border: '1px solid #888' }}>
          <strong>{title}</strong>
          <p style={{ margin: 0 }}>{body}</p>
        </div>
      ),
      text: ({ title, body }) => \`\${title}: \${body}\`,
      markdown: ({ title, body }) => md.paragraph(md.strong(title), ' ', body),
      slack: ({ title, body }) => ({
        type: 'section',
        text: { type: 'mrkdwn', text: \`*\${title}*\\n\${body}\` },
      }),
    },
  });
};

/** \`noticeTitle\` is the notice example's title; an empty one is invalid. */
export const createPack = (noticeTitle: string) =>
  definePrimitivePack({ id: 'consumer', primitives: [banner, noticeOf(noticeTitle)] });
`;

const STUDIO = `import React from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, Frame } from '@elastic/isomer-sdk';
import { defineStudioConfig } from '@elastic/isomer-studio';

import { bannerExample, createPack } from './pack';

const card: Frame<string> = {
  defaultWidth: 480,
  theme: { light: '#ffffff', dark: '#1d1e24' },
  estimateHeight: () => 240,
  validateBody: (body) =>
    body[0]?.type === 'banner' ? [] : ['a card starts with a "banner"; compose adds one'],
  wrap: (_header, body, { theme }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: theme }}>
      {body}
    </div>
  ),
};

export const createStudioConfig = (noticeTitle: string) =>
  defineStudioConfig({
    title: 'Consumer',
    runtime: createIsomerRuntime({ packs: [createPack(noticeTitle)], frames: { card } }),
    createReactContext: () => ({}),
    compose: (nodes, { theme }): Composition => ({
      type: 'view',
      theme,
      body: [bannerExample, ...nodes],
    }),
  });
`;

const CONFIG = `import { createStudioConfig } from './studio';

export default createStudioConfig('Deploy finished');
`;

const BROKEN_CONFIG = `import { createStudioConfig } from './studio';

export default createStudioConfig('');
`;

const TSCONFIG = {
  compilerOptions: {
    target: 'ES2022',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    jsx: 'react-jsx',
    strict: true,
    noEmit: true,
    skipLibCheck: false,
    lib: ['ES2022', 'DOM'],
  },
  include: ['*.ts', '*.tsx'],
};

/** Runs a consumer command, failing unless it exits with `expected`. */
const run = (dir, command, args, { expected = 0 } = {}) => {
  console.log(`$ ${command} ${args.join(' ')}`);
  const { status, stdout, stderr } = spawnSync(command, args, {
    cwd: dir,
    env: isolatedEnv(),
    encoding: 'utf-8',
  });
  if (status !== expected) {
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    throw new Error(
      `${command} ${args.join(' ')} exited ${status}, expected ${expected}`
    );
  }
  return { stdout, stderr };
};

requireChromium();

const missingBuild = Object.values(PACKED).filter(
  (folder) => !existsSync(join(repoRoot, 'packages', folder, 'dist'))
);
if (
  missingBuild.length > 0 ||
  !existsSync(join(repoRoot, 'packages/isomer-studio/dist/app'))
) {
  console.error('Build the workspace first: pnpm build');
  process.exit(1);
}

const tempDir = mkdtempSync(join(tmpdir(), 'isomer-studio-consumer-'));
const keep = process.env.KEEP_STUDIO_CONSUMER === '1';

try {
  const tarballs = join(tempDir, 'tarballs');
  mkdirSync(tarballs);
  const packed = Object.fromEntries(
    Object.entries(PACKED).map(([name, folder]) => {
      const output = execFileSync(
        'pnpm',
        ['pack', '--json', '--pack-destination', tarballs],
        { cwd: join(repoRoot, 'packages', folder), encoding: 'utf-8' }
      );
      const { filename } = JSON.parse(output);
      return [name, `file:${filename}`];
    })
  );

  const consumer = join(tempDir, 'consumer');
  mkdirSync(consumer);
  writeFileSync(
    join(consumer, 'package.json'),
    `${JSON.stringify(
      {
        name: 'isomer-studio-consumer',
        private: true,
        type: 'module',
        dependencies: {
          ...packed,
          react: devDependencies.react,
          'react-dom': devDependencies['react-dom'],
          zod: devDependencies.zod,
        },
        devDependencies: {
          '@types/react': devDependencies['@types/react'],
          '@types/node': devDependencies['@types/node'],
          '@types/react-dom': devDependencies['@types/react-dom'],
          typescript: devDependencies.typescript,
        },
        overrides: Object.fromEntries(
          Object.keys(packed).map((name) => [name, `$${name}`])
        ),
      },
      null,
      2
    )}\n`
  );
  writeFileSync(
    join(consumer, 'tsconfig.json'),
    `${JSON.stringify(TSCONFIG, null, 2)}\n`
  );
  writeFileSync(join(consumer, 'pack.tsx'), PACK);
  writeFileSync(join(consumer, 'studio.tsx'), STUDIO);
  writeFileSync(join(consumer, 'isomer-studio.config.ts'), CONFIG);
  writeFileSync(join(consumer, 'broken.config.ts'), BROKEN_CONFIG);

  run(consumer, 'npm', [
    'install',
    '--no-audit',
    '--no-fund',
    '--prefer-offline',
    '--loglevel=error',
  ]);
  run(consumer, 'npx', ['--no', '--', 'tsc', '-p', '.']);

  const { stdout: checked } = run(consumer, 'npx', [
    '--no',
    '--',
    'isomer-studio',
    'check',
    '--png',
    '--format',
    'junit',
    '--report',
    'report.xml',
  ]);
  console.log(checked.trim());
  const { stderr: broken } = run(
    consumer,
    'npx',
    [
      '--no',
      '--',
      'isomer-studio',
      'check',
      '--png',
      '--config',
      'broken.config.ts',
    ],
    { expected: 1 }
  );
  if (!broken.includes('notice')) {
    throw new Error(
      `The broken example's failure does not name it:\n${broken}`
    );
  }

  const site = join(consumer, 'site');
  run(consumer, 'npx', [
    '--no',
    '--',
    'isomer-studio',
    'build',
    '--out',
    site,
    '--base',
    BASE,
  ]);

  const status = runStudioSpec({
    env: isolatedEnv({
      STUDIO_CLI: join(
        consumer,
        'node_modules/@elastic/isomer-studio/bin/isomer-studio.js'
      ),
      STUDIO_CONFIG: join(consumer, 'isomer-studio.config.ts'),
      STUDIO_SITE: site,
      STUDIO_BASE: BASE,
      STUDIO_EDIT_ROUTE: '#/dev/notice/0',
    }),
  });
  if (status !== 0) {
    throw new Error(`The browser test failed against the consumer install.`);
  }
  console.log('Packed Studio passed check, build and the browser test.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (keep) {
    console.log(`Kept ${tempDir}`);
  } else {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
