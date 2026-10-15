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
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
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
const studioManifest = JSON.parse(
  readFileSync(join(repoRoot, 'packages/isomer-studio/package.json'), 'utf-8')
);
/** EUI and the peers npm must resolve alike for the app to share the Studio's EUI. */
const EUI_PACKAGES = [
  '@elastic/eui',
  '@elastic/eui-theme-borealis',
  '@elastic/datemath',
  '@emotion/css',
  '@emotion/react',
  'moment',
];
const FONT = createRequire(
  join(repoRoot, 'packages/isomer-primitives-slides/package.json')
).resolve('@fontsource/inter/files/inter-latin-400-normal.woff2');

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

const APP = `/** @jsxImportSource @emotion/react */
import { useState } from 'react';
import { EuiButton, EuiPopover, EuiText } from '@elastic/eui';
import type { StudioAppProps } from '@elastic/isomer-studio';
import { css } from '@emotion/react';

import styles from './app.module.css';
import './app.css';

const DemoApp = ({ Preview, path }: StudioAppProps) => {
  const [isOpen, setOpen] = useState(false);
  return (
    <div className={styles.panel}>
      <p className="demo-font">Demo app at "{path}"</p>
      <p data-testid="emotion-styled" css={css\`color: rgb(1, 2, 3);\`}>Styled by Emotion</p>
      <EuiPopover
        button={<EuiButton onClick={() => setOpen(!isOpen)}>Open popover</EuiButton>}
        isOpen={isOpen}
        closePopover={() => setOpen(false)}>
        <EuiText size="s">Inside the popover</EuiText>
      </EuiPopover>
      <Preview nodes={[]} />
    </div>
  );
};

export default DemoApp;
`;

const APP_MODULE_CSS = `.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}
`;

const APP_CSS = `@font-face {
  font-family: DemoFont;
  src: url('./demo.woff2') format('woff2');
}

.demo-font {
  font-family: DemoFont, sans-serif;
}
`;

const CSS_MODULES_D_TS = `declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
`;

const STUDIO = `import React from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, Frame, PrimitiveIcon } from '@elastic/isomer-sdk';
import type { StudioApp } from '@elastic/isomer-studio';
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

const demoIcon: PrimitiveIcon = {
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" fill="var(--isomer-icon-accent)"/></svg>',
};

export const demoApp: StudioApp = {
  id: 'demo',
  title: 'Demo',
  icon: demoIcon,
  load: () => import('./app'),
  pages: [{ path: 'nested/page', title: 'Nested page', section: 'Pages' }],
};

export const createStudioConfig = (noticeTitle: string, apps: readonly StudioApp[] = [demoApp]) =>
  defineStudioConfig({
    title: 'Consumer',
    apps,
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

const BROKEN_APP_CONFIG = `import type { StudioApp } from '@elastic/isomer-studio';

import { createStudioConfig, demoApp } from './studio';

const unchecked: unknown = { ...demoApp, id: 'Bad App' };

export default createStudioConfig('Deploy finished', [unchecked as StudioApp]);
`;

const TSCONFIG = {
  compilerOptions: {
    target: 'ES2022',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    jsx: 'react-jsx',
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    lib: ['ES2022', 'DOM'],
  },
  include: ['*.ts', '*.tsx'],
};

/** EUI's own declarations do not pass `skipLibCheck: false`, so the packed declarations are checked apart from the app. */
const DECLARATIONS_TSCONFIG = {
  extends: './tsconfig.json',
  compilerOptions: { skipLibCheck: false },
  include: ['declarations.ts'],
};

/** Every packed entry the consumer imports. */
const DECLARED_ENTRIES = [
  ...Object.keys(PACKED),
  '@elastic/isomer-sdk/markdown',
];

const DECLARATIONS = `${DECLARED_ENTRIES.map(
  (name, index) => `import type * as Entry${index} from '${name}';`
).join('\n')}

export type { ${DECLARED_ENTRIES.map((_name, index) => `Entry${index}`).join(', ')} };
`;

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
          ...Object.fromEntries(
            EUI_PACKAGES.map((name) => [
              name,
              studioManifest.dependencies[name],
            ])
          ),
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
  writeFileSync(
    join(consumer, 'tsconfig.declarations.json'),
    `${JSON.stringify(DECLARATIONS_TSCONFIG, null, 2)}\n`
  );
  writeFileSync(join(consumer, 'declarations.ts'), DECLARATIONS);
  writeFileSync(join(consumer, 'pack.tsx'), PACK);
  writeFileSync(join(consumer, 'studio.tsx'), STUDIO);
  writeFileSync(join(consumer, 'isomer-studio.config.ts'), CONFIG);
  writeFileSync(join(consumer, 'broken.config.ts'), BROKEN_CONFIG);
  writeFileSync(join(consumer, 'broken-app.config.ts'), BROKEN_APP_CONFIG);
  writeFileSync(join(consumer, 'app.tsx'), APP);
  writeFileSync(join(consumer, 'app.module.css'), APP_MODULE_CSS);
  writeFileSync(join(consumer, 'app.css'), APP_CSS);
  writeFileSync(join(consumer, 'css_modules.d.ts'), CSS_MODULES_D_TS);
  copyFileSync(FONT, join(consumer, 'demo.woff2'));

  run(consumer, 'npm', [
    'install',
    '--no-audit',
    '--no-fund',
    '--prefer-offline',
    '--loglevel=error',
  ]);
  run(consumer, 'npx', ['--no', '--', 'tsc', '-p', '.']);
  run(consumer, 'npx', [
    '--no',
    '--',
    'tsc',
    '-p',
    'tsconfig.declarations.json',
  ]);

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
  if (!checked.includes('1 app listed.')) {
    throw new Error(`check does not report the demo app:\n${checked}`);
  }
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

  const { stderr: brokenApp } = run(
    consumer,
    'npx',
    [
      '--no',
      '--',
      'isomer-studio',
      'check',
      '--config',
      'broken-app.config.ts',
    ],
    { expected: 1 }
  );
  if (!brokenApp.includes('apps[0] ("Bad App")')) {
    throw new Error(
      `The invalid app's failure does not name it:\n${brokenApp}`
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
      STUDIO_APP_ID: 'demo',
      STUDIO_APP_TITLE: 'Demo',
      STUDIO_APP_PAGE_TITLE: 'Nested page',
      STUDIO_APP_PAGE_PATH: 'nested/page',
      STUDIO_APP_FONT: 'DemoFont',
      STUDIO_APP_POPOVER: 'Open popover',
      STUDIO_APP_EMOTION: 'emotion-styled',
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
