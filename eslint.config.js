/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import js from '@eslint/js';
import licenseHeader from 'eslint-plugin-license-header';
import perfectionist from 'eslint-plugin-perfectionist';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const SCREAMING_SNAKE = '^[A-Z][A-Z0-9_]*$';

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
    files: ['**/*.{js,cjs}'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: false,
      },
    },
  },
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx,js,cjs}'],
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
      curly: ['error', 'all'],
    },
  },
  {
    files: ['**/*.{ts,tsx,js,cjs}'],
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
      '**/dist',
      '**/node_modules',
      'coverage',
      '.github',
      '.artifacts',
      '.claude',
    ],
  },
  {
    files: ['**/*.{js,cjs,ts,tsx}'],
    ...prettierRecommended,
  }
);
