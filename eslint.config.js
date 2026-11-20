/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync } from 'node:fs';

import js from '@eslint/js';
import licenseHeader from 'eslint-plugin-license-header';
import perfectionist from 'eslint-plugin-perfectionist';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const SCREAMING_SNAKE = '^[A-Z][A-Z0-9_]*$';

const CHART_ENGINE_IMPORTS =
  'A chart engine imports only @elastic/isomer-primitives-charts/scene.';

// A specifier or path that reaches the charts pack other than as its `./scene` entry.
const CHARTS_PACK_BEYOND_SCENE =
  '^(?!@elastic/isomer-primitives-charts/scene$)([^\\s]*/)?isomer-primitives-charts(/|$)';

// `no-restricted-syntax` entries for each way to load `regex` other than a static import: `import()`, `import()` types and calls (all calls unless `call` narrows them).
const loadsOf = (regex, message, call = 'CallExpression') =>
  [
    'ImportExpression > Literal.source[value=PATH]',
    'ImportExpression > TemplateLiteral.source > TemplateElement:first-child[value.raw=PATH]',
    `${call} > Literal.arguments[value=PATH]`,
    `${call} > TemplateLiteral.arguments > TemplateElement:first-child[value.raw=PATH]`,
    'TSImportType Literal[value=PATH]',
  ].map((selector) => ({
    selector: selector.replace('PATH', `/${regex.replaceAll('/', '\\/')}/`),
    message,
  }));

const escapeRegex = (name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The barrel-import rules of a pack laid out as `src/<dir>/index.ts` barrels, `src/primitives/<type>/`, and `src/entries/`.
 * `shared` lists the directories the primitives' barrels depend on, and `sharedEntries` the entries that reach them without React.
 */
const packModuleRules = ({ pkg, shared, sharedEntries }) => {
  const src = `packages/isomer-primitives-${pkg}/src`;
  const doc = `packages/isomer-primitives-${pkg}/AGENTS.md#module-rules`;
  // Another directory is imported through its `index.ts`. Matches `./render/cls` and `../../theme/palette`.
  const dirFile = {
    regex: '^(\\./|(\\.\\./)+)(?!primitives/)[\\w-]+/',
    message: `Import another directory through its index.ts (${doc}).`,
  };
  // A primitive's file rather than its `index.ts`, which reaches React and depends on the shared directories.
  const primitiveFile = {
    regex: '^(\\./|(\\.\\./)+)primitives/[\\w-]+/',
    message: `Import a primitive through its index.ts; only modules it depends on, or that the React-free entries reach, import its files (${doc}).`,
  };
  // Read from disk so a primitive's barrel is told apart from `primitives/define.ts` and the other aggregators.
  const primitives = readdirSync(
    new URL(`./${src}/primitives/`, import.meta.url),
    { withFileTypes: true }
  )
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => escapeRegex(name));
  // A primitive's `index.ts` or `index.tsx`, which imports the shared directories and `primitives/defaults.ts` back, with or without an extension.
  const primitiveBarrel = (prefix) => ({
    regex: `^${prefix}(${primitives.join('|')})(/index)?(\\.[cm]?[jt]sx?)?$`,
    message: `Import a primitive's files here: its index.ts depends on this module, or reaches React (${doc}).`,
  });
  // The pack's own entries, which the module graph check treats as external and does not follow.
  const selfImport = {
    regex: `^@elastic/isomer-primitives-${pkg}(/|$)`,
    message: `Import the pack through relative paths, not its own package entries (${doc}).`,
  };
  const barrels = (files, patterns, ignores = []) => ({
    files,
    ignores: [
      `${src}/**/*.test.{ts,tsx}`,
      `${src}/**/*.fixtures.ts`,
      ...ignores,
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...patterns, selfImport] },
      ],
    },
  });
  return [
    {
      files: [`${src}/**/*.{ts,tsx}`],
      ignores: [`${src}/**/*.test.{ts,tsx}`, `${src}/**/*.fixtures.ts`],
      rules: {
        'no-restricted-syntax': [
          'error',
          ...loadsOf(
            selfImport.regex,
            selfImport.message,
            'CallExpression[callee.name="require"]'
          ),
        ],
      },
    },
    barrels(
      [`${src}/**/*.{ts,tsx}`],
      [dirFile, primitiveFile],
      [`${src}/primitives/**`]
    ),
    // The primitives' barrels depend on these, or the React-free entries reach them.
    barrels(
      [
        `${src}/{${shared.join(',')}}/**/*.{ts,tsx}`,
        ...sharedEntries.map((entry) => `${src}/entries/${entry}.ts`),
      ],
      [dirFile, primitiveBarrel('(\\./|(\\.\\./)+)primitives/')]
    ),
    // `./<primitive>/<file>` from here is a primitive's file, which the aggregators need.
    barrels(
      [`${src}/primitives/*.{ts,tsx}`],
      [{ ...dirFile, regex: '^(\\.\\./)+[\\w-]+/' }, primitiveBarrel('\\./')]
    ),
    // `../<primitive>/<file>` from here is a sibling primitive's file.
    barrels(
      [`${src}/primitives/*/**/*.{ts,tsx}`],
      [{ ...dirFile, regex: '^(\\.\\./){2,}[\\w-]+/' }]
    ),
  ];
};

const namedSpecifiers = (typeGroup, valueGroup) => [
  'error',
  {
    type: 'alphabetical',
    order: 'asc',
    ignoreCase: true,
    newlinesBetween: 0,
    newlinesInside: 0,
    groups: [typeGroup, 'constants', valueGroup],
    customGroups: [
      {
        groupName: 'constants',
        elementNamePattern: SCREAMING_SNAKE,
      },
    ],
  },
];

const ELASTIC_LICENSE_HEADER = [
  '/*',
  ' * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one',
  ' * or more contributor license agreements. Licensed under the Elastic License',
  ' * 2.0; you may not use this file except in compliance with the Elastic License',
  ' * 2.0.',
  ' */',
];

const sdkRuntimeImportPatterns = [
  {
    group: ['@elastic/isomer-runtime', '@elastic/isomer-runtime/*'],
    message:
      'The sdk must not import the runtime. Packs depend on the sdk alone.',
  },
  {
    group: ['@elastic/isomer-sdk', '@elastic/isomer-sdk/*'],
    message:
      'Internal source files should import sibling internals with relative paths instead of self-importing package entries.',
  },
];

// Matches `../render`, `../../render/slack/format`, and any deeper nesting.
// An enumerated `../`/`../../` list silently stops guarding one directory down.
const sdkStageRegex = (name) => `^(\\.\\./)+${name}(/|$)`;

const sdkStageBoundary = (stage, forbidden, extraPatterns = []) => ({
  files: [`packages/isomer-sdk/src/${stage}/**/*.{ts,tsx}`],
  ignores: [
    'packages/isomer-sdk/src/**/*.test.ts',
    'packages/isomer-sdk/src/**/*.fixtures.ts',
  ],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          ...sdkRuntimeImportPatterns,
          ...forbidden.map((name) => ({
            regex: sdkStageRegex(name),
            message: `${stage}/ must not import ${name}/. Pipeline imports flow composition → define → pack → validate → render.`,
          })),
          ...extraPatterns,
        ],
      },
    ],
  },
});

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: false,
      },
    },
  },
  {
    files: ['**/*.cjs', 'packages/*/bin/*.js', 'packages/*/babel.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx,js,cjs,mjs}'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx,js,cjs,mjs}'],
    plugins: {
      perfectionist,
      'simple-import-sort': simpleImportSortPlugin,
    },
    rules: {
      // Side-effect, node:, packages (react first), parent/absolute, sibling.
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^node:'],
            ['^react', '^@?\\w'],
            ['^'],
            ['^\\./'],
          ],
        },
      ],
      'perfectionist/sort-exports': [
        'error',
        {
          type: 'alphabetical',
          order: 'asc',
          ignoreCase: true,
        },
      ],
      // Types, then SCREAMING_SNAKE constants, then values.
      'perfectionist/sort-named-exports': namedSpecifiers(
        'type-export',
        'value-export'
      ),
    },
  },
  {
    files: ['packages/isomer-sdk/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: sdkRuntimeImportPatterns,
        },
      ],
    },
  },
  sdkStageBoundary('composition', [
    'define',
    'pack',
    'validate',
    'render',
    'author',
    'testing',
  ]),
  sdkStageBoundary('define', [
    'pack',
    'validate',
    'render',
    'author',
    'testing',
  ]),
  sdkStageBoundary(
    'pack',
    ['validate', 'render', 'author', 'testing'],
    [
      {
        regex: 'define/slack_',
        message:
          'Slack payload types are reached through @elastic/isomer-sdk/slack.',
      },
    ]
  ),
  sdkStageBoundary(
    'validate',
    ['render', 'author', 'testing'],
    [
      {
        regex: 'define/slack_',
        message:
          'Slack payload types are reached through @elastic/isomer-sdk/slack.',
      },
    ]
  ),
  sdkStageBoundary(
    'render',
    ['author', 'testing'],
    [
      {
        regex: 'define/slack_',
        message:
          'Channel types enter render through render/slack, not define/slack_*.',
      },
    ]
  ),
  {
    files: ['packages/isomer-sdk/src/render/slack/**/*.{ts,tsx}'],
    ignores: [
      'packages/isomer-sdk/src/**/*.test.ts',
      'packages/isomer-sdk/src/**/*.fixtures.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...sdkRuntimeImportPatterns,
            {
              regex: sdkStageRegex('author'),
              message:
                'render/ must not import author/. Pipeline imports flow composition → define → pack → validate → render.',
            },
            {
              regex: sdkStageRegex('testing'),
              message:
                'render/ must not import testing/. Pipeline imports flow composition → define → pack → validate → render.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/isomer-runtime/src/**/*.ts'],
    ignores: ['packages/isomer-runtime/src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@elastic/isomer-runtime', '@elastic/isomer-runtime/*'],
              message:
                'Internal source files should import sibling internals with relative paths instead of self-importing package entries.',
            },
          ],
        },
      ],
    },
  },
  {
    // The slides pack layers theme/ -> render/ -> primitives/ -> src-level
    // composition. Guarding only `primitives`/`registry` would miss the four
    // composition roots at src/, each of which reaches them transitively.
    files: [
      'packages/isomer-primitives-slides/src/theme/**/*.{ts,tsx}',
      'packages/isomer-primitives-slides/src/render/**/*.{ts,tsx}',
    ],
    ignores: ['packages/isomer-primitives-slides/src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '^(\\.\\./)+(primitives|registry|body_node|dispatch|standalone|pack)(/|$)',
              message:
                'theme/ and render/ are upstream layers. Imports flow theme/ -> render/ -> primitives/ -> src-level composition, never back.',
            },
          ],
        },
      ],
    },
  },
  {
    // Chart engines draw a Scene; they never validate or resolve one, and format only through `formatAxisValue`.
    files: ['packages/isomer-charts-*/src/**/*.{ts,tsx}'],
    ignores: [
      'packages/isomer-charts-*/src/**/*.test.{ts,tsx}',
      'packages/isomer-charts-*/src/**/*.fixtures.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { regex: CHARTS_PACK_BEYOND_SCENE, message: CHART_ENGINE_IMPORTS },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...loadsOf(CHARTS_PACK_BEYOND_SCENE, CHART_ENGINE_IMPORTS),
      ],
    },
  },
  ...packModuleRules({
    pkg: 'charts',
    shared: [
      'format',
      'render',
      'resolve',
      'scene',
      'schema',
      'styles',
      'text',
      'theme',
    ],
    sharedEntries: ['resolve', 'scene', 'schema'],
  }),
  ...packModuleRules({
    pkg: 'vega',
    shared: ['render', 'schema', 'theme'],
    sharedEntries: ['schema'],
  }),
  {
    files: ['packages/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: [
      'packages/**/*.{ts,tsx}',
      'scripts/**/*.{js,cjs}',
      'eslint.config.js',
      'vitest.config.ts',
      'lint-staged.config.js',
    ],
    plugins: {
      'license-header': licenseHeader,
    },
    rules: {
      'license-header/header': ['error', ELASTIC_LICENSE_HEADER],
    },
  },
  {
    ignores: [
      '**/lib',
      '**/node_modules',
      'coverage',
      '.github',
      '.artifacts',
      '.claude',
      'test-results',
    ],
  },
  {
    files: ['**/*.{js,cjs,mjs,ts,tsx}'],
    ...prettierRecommended,
  },
  {
    files: ['**/*.{js,cjs,mjs,ts,tsx}'],
    rules: {
      curly: ['error', 'all'],
    },
  }
);
