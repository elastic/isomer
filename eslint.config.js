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
