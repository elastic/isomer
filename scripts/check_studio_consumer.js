/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Installs the packed Studio with npm in a directory outside the workspace,
// then checks, builds and drives it with a consumer's own config and pack.

import { execFileSync, spawn, spawnSync } from 'node:child_process';
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

import { chromium } from '@playwright/test';

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

/** Calls a hook, so a second copy of React fails the render. */
const Heading = ({ text }: { text: string }) => {
  const [size] = React.useState(24);
  return <h1 style={{ margin: 0, fontSize: size }}>{text}</h1>;
};

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
    react: ({ text }) => <Heading text={text} />,
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

/** Starts `isomer-studio` with no command in `dir` and resolves its URL and process. */
const startDev = (cli, dir) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, '--port', '0'], {
      cwd: dir,
      env: isolatedEnv(),
    });
    let output = '';
    const onData = (chunk) => {
      output += chunk;
      const url = /Isomer Studio: (http\S+)/.exec(output)?.[1];
      if (url) {
        resolve({ child, url });
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.once('exit', (code) =>
      reject(new Error(`dev exited ${code} before serving:\n${output}`))
    );
  });

const writeJson = (path, value) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

const npmInstall = (dir) =>
  run(dir, 'npm', [
    'install',
    '--no-audit',
    '--no-fund',
    '--prefer-offline',
    '--loglevel=error',
  ]);

/** Installs the packed Studio on its own, as `npx @elastic/isomer-studio` does, and returns its binary. */
const installStudioAlone = (tempDir, packed) => {
  const cache = join(tempDir, 'npx-cache');
  mkdirSync(cache);
  writeJson(join(cache, 'package.json'), {
    name: 'npx-cache',
    private: true,
    dependencies: {
      '@elastic/isomer-studio': packed['@elastic/isomer-studio'],
    },
    overrides: packed,
  });
  npmInstall(cache);
  return join(
    cache,
    'node_modules/@elastic/isomer-studio/bin/isomer-studio.js'
  );
};

/** What a pack already has: the SDK, React and zod, and nothing of the Studio's. */
const packDependencies = (packed) => ({
  '@elastic/isomer-sdk': packed['@elastic/isomer-sdk'],
  react: devDependencies.react,
  'react-dom': devDependencies['react-dom'],
  zod: devDependencies.zod,
});

const PACK_MODULE = `${PACK}\nexport const consumerPack = createPack('Deploy finished');\n`;

const assertNoStudio = (installRoot) => {
  for (const name of ['@elastic/isomer-runtime', '@elastic/isomer-studio']) {
    if (existsSync(join(installRoot, 'node_modules', name))) {
      throw new Error(`${installRoot} should not install ${name}.`);
    }
  }
};

/** In `dir`, which has no config: `check` points at `init`, and the config `init` writes passes `check`, `build` and a bare `isomer-studio`. */
const checkInit = async (cli, dir, { title, config }) => {
  const { stderr: missing } = run(dir, process.execPath, [cli, 'check'], {
    expected: 1,
  });
  if (
    !missing.includes('Run `npx @elastic/isomer-studio init` to create one')
  ) {
    throw new Error(
      `check without a config did not point at init:\n${missing}`
    );
  }

  run(dir, process.execPath, [cli, 'init']);
  if (!existsSync(join(dir, config))) {
    throw new Error(`init did not write ${config}.`);
  }

  const { stdout: checked } = run(dir, process.execPath, [cli, 'check']);
  console.log(checked.trim());
  if (!new RegExp(`^${title}: \\d+ passed, 0 failed`, 'm').test(checked)) {
    throw new Error(`The config init wrote did not pass:\n${checked}`);
  }

  run(dir, process.execPath, [cli, 'build', '--out', 'site']);
  if (!existsSync(join(dir, 'site/index.html'))) {
    throw new Error('build wrote no site.');
  }

  const { child, url } = await startDev(cli, dir);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}#/docs/banner/0`);
    await page
      .getByRole('heading', { name: 'Consumer Studio', level: 1 })
      .first()
      .waitFor();
    if (errors.length) {
      throw new Error(`The dev page threw:\n${errors.join('\n')}`);
    }
  } finally {
    await browser.close();
    child.kill();
  }
};

/** A pack in its own ES module TypeScript project. */
const checkBarePack = async (tempDir, packed, cli) => {
  const project = join(tempDir, 'bare-pack');
  mkdirSync(join(project, 'src'), { recursive: true });
  writeJson(join(project, 'package.json'), {
    name: 'bare-pack',
    private: true,
    type: 'module',
    dependencies: packDependencies(packed),
    overrides: packed,
  });
  writeJson(join(project, 'tsconfig.json'), TSCONFIG);
  writeFileSync(join(project, 'src/index.tsx'), PACK_MODULE);
  npmInstall(project);
  assertNoStudio(project);
  await checkInit(cli, project, {
    title: 'bare-pack',
    config: 'isomer-studio.config.ts',
  });
};

const JS_PACK = `import { createElement } from 'react';
import { definePrimitiveFor, definePrimitivePack, requiredString } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { z } from 'zod';

const schema = z.object({ type: z.literal('banner'), text: requiredString() });
const example = { type: 'banner', text: 'Consumer Studio' };

const banner = definePrimitiveFor()({
  type: 'banner',
  catalog: { type: 'banner', name: 'Banner', purpose: 'Names the view.', useWhen: ['A view needs a heading.'], avoidWhen: ['The view already has one.'], example },
  icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="2" y="5" width="12" height="6" fill="var(--isomer-icon-accent)"/></svg>' },
  examples: [example],
  schema,
  renderers: {
    react: ({ text }) => createElement('h1', null, text),
    text: ({ text }) => text,
    markdown: ({ text }) => md.heading(1, text),
    slack: ({ text }) => ({ type: 'header', text: { type: 'plain_text', text } }),
  },
});

export const jsPack = definePrimitivePack({ id: 'js', primitives: [banner] });
`;

/** A pack in plain JavaScript, with no tsconfig.json. */
const checkJavaScriptPack = async (tempDir, packed, cli) => {
  const project = join(tempDir, 'js-pack');
  mkdirSync(project);
  writeJson(join(project, 'package.json'), {
    name: 'js-pack',
    private: true,
    type: 'module',
    main: 'index.js',
    dependencies: packDependencies(packed),
    overrides: packed,
  });
  writeFileSync(join(project, 'index.js'), JS_PACK);
  npmInstall(project);
  assertNoStudio(project);
  await checkInit(cli, project, {
    title: 'js-pack',
    config: 'isomer-studio.config.js',
  });

  // Node's own `import`, without tsx, must reach the packed SDK's CommonJS build too.
  rmSync(join(project, 'isomer-studio.config.js'));
  run(project, process.execPath, [cli, 'init', '--loader', 'none']);
  const { stdout: checked } = run(project, process.execPath, [
    cli,
    'check',
    '--loader',
    'none',
  ]);
  console.log(checked.trim());
  if (!/^js-pack: \d+ passed, 0 failed/m.test(checked)) {
    throw new Error(
      `init --loader none wrote a config that did not pass:\n${checked}`
    );
  }
};

const KIBANA_PACKAGE = 'src/platform/packages/shared/kbn-consumer-pack';

/**
 * A Kibana-shaped pack: a CommonJS package with a root `index.ts` and no `main`, inside a repository whose one
 * `node_modules` holds every dependency. With `installed`, the repository has the Studio and the runtime too, and
 * runs its own Studio.
 */
const checkKibanaPack = async (
  tempDir,
  packed,
  npxCli,
  { installed = false } = {}
) => {
  const repo = join(tempDir, installed ? 'kibana-installed' : 'kibana');
  const pkg = join(repo, KIBANA_PACKAGE);
  mkdirSync(join(pkg, 'src'), { recursive: true });
  writeJson(join(repo, 'package.json'), {
    name: 'kibana',
    private: true,
    version: '9.3.0',
    dependencies: {
      ...packDependencies(packed),
      ...(installed
        ? {
            '@elastic/isomer-runtime': packed['@elastic/isomer-runtime'],
            '@elastic/isomer-studio': packed['@elastic/isomer-studio'],
          }
        : {}),
      '@kbn/consumer-pack': `file:${KIBANA_PACKAGE}`,
    },
    overrides: packed,
  });
  const { include: _include, ...base } = TSCONFIG;
  writeJson(join(repo, 'tsconfig.base.json'), base);
  writeJson(join(pkg, 'package.json'), {
    name: '@kbn/consumer-pack',
    private: true,
    version: '1.0.0',
    license: 'Elastic License 2.0',
  });
  writeJson(join(pkg, 'kibana.jsonc'), {
    type: 'shared-common',
    id: '@kbn/consumer-pack',
    owner: '@elastic/kibana-presentation',
  });
  writeJson(join(pkg, 'tsconfig.json'), {
    extends: '../../../../../tsconfig.base.json',
    include: ['**/*.ts', '**/*.tsx'],
  });
  writeFileSync(
    join(pkg, 'index.ts'),
    "export { consumerPack } from './src/pack';\n"
  );
  writeFileSync(join(pkg, 'src/pack.tsx'), PACK_MODULE);
  npmInstall(repo);
  if (!installed) {
    assertNoStudio(repo);
  }
  const cli = installed
    ? join(repo, 'node_modules/@elastic/isomer-studio/bin/isomer-studio.js')
    : npxCli;
  await checkInit(cli, pkg, {
    title: '@kbn/consumer-pack',
    config: 'isomer-studio.config.ts',
  });
};

/** Runs the Studio as `npx @elastic/isomer-studio` does, installed on its own, beside packs that have only the SDK, React and zod. */
const checkColdNpx = async (tempDir, packed) => {
  const cli = installStudioAlone(tempDir, packed);
  await checkBarePack(tempDir, packed, cli);
  await checkJavaScriptPack(tempDir, packed, cli);
  await checkKibanaPack(tempDir, packed, cli);
  await checkKibanaPack(tempDir, packed, cli, { installed: true });
  console.log(
    'Cold npx: init, check, build and dev passed in an ES module pack, a JavaScript pack and a Kibana-shaped package, and in a Kibana-shaped package that installs the Studio.'
  );
};

requireChromium();

const missingBuild = Object.values(PACKED).filter(
  (folder) => !existsSync(join(repoRoot, 'packages', folder, 'lib'))
);
if (
  missingBuild.length > 0 ||
  !existsSync(join(repoRoot, 'packages/isomer-studio/lib/app'))
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
  await checkColdNpx(tempDir, packed);
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
