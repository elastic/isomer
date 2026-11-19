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

// `no-restricted-syntax` entries for each way to load `regex` other than a static import: `import()`, `require` or any call, so a `createRequire` result under another name is covered, and `import()` types.
const loadsOf = (regex, message, callee = '') =>
  [
    'ImportExpression > Literal.source[value=PATH]',
    'ImportExpression > TemplateLiteral.source > TemplateElement:first-child[value.raw=PATH]',
    `CallExpression${callee} > Literal.arguments[value=PATH]`,
    `CallExpression${callee} > TemplateLiteral.arguments > TemplateElement:first-child[value.raw=PATH]`,
    'TSImportType Literal[value=PATH]',
  ].map((selector) => ({
    selector: selector.replace('PATH', `/${regex.replaceAll('/', '\\/')}/`),
    message,
  }));

// Charts pack: another directory is imported through its `index.ts`. Matches `./render/cls` and `../../theme/palette`.
const CHARTS_DIR_FILE = {
  regex: '^(\\./|(\\.\\./)+)(?!primitives/)[\\w-]+/',
  message:
    'Import another directory through its index.ts (packages/isomer-primitives-charts/AGENTS.md#module-rules).',
};
// A primitive's file rather than its `index.ts`, which reaches React and depends on `render/`.
const CHARTS_PRIMITIVE_FILE = {
  regex: '^(\\./|(\\.\\./)+)primitives/[\\w-]+/',
  message:
    'Import a primitive through its index.ts; only modules it depends on, or that the React-free entries reach, import its files (packages/isomer-primitives-charts/AGENTS.md#module-rules).',
};
const CHARTS_SRC = 'packages/isomer-primitives-charts/src';
// Read from disk so a primitive's barrel is told apart from `primitives/define.ts` and the other aggregators.
const CHARTS_PRIMITIVES = readdirSync(
  new URL(`./${CHARTS_SRC}/primitives/`, import.meta.url),
  { withFileTypes: true }
)
  .filter((entry) => entry.isDirectory())
  .map(({ name }) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
// A primitive's `index.ts`, which imports the shared directories and `primitives/defaults.ts` back, with or without an extension.
const chartsPrimitiveBarrel = (prefix) => ({
  regex: `^${prefix}(${CHARTS_PRIMITIVES.join('|')})(/index)?(\\.[cm]?[jt]sx?)?$`,
  message:
    "Import a primitive's files here: its index.ts depends on this module, or reaches React (packages/isomer-primitives-charts/AGENTS.md#module-rules).",
});
// The pack's own entries, which the module graph check treats as external and does not follow.
const CHARTS_SELF_IMPORT = {
  regex: '^@elastic/isomer-primitives-charts(/|$)',
  message:
    'Import the pack through relative paths, not its own package entries (packages/isomer-primitives-charts/AGENTS.md#module-rules).',
};
const chartsBarrels = (files, patterns, ignores = []) => ({
  files,
  ignores: [
    `${CHARTS_SRC}/**/*.test.{ts,tsx}`,
    `${CHARTS_SRC}/**/*.fixtures.ts`,
    ...ignores,
  ],
  rules: {
    'no-restricted-imports': [
      'error',
      { patterns: [...patterns, CHARTS_SELF_IMPORT] },
    ],
  },
});

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
  {
    files: [`${CHARTS_SRC}/**/*.{ts,tsx}`],
    ignores: [
      `${CHARTS_SRC}/**/*.test.{ts,tsx}`,
      `${CHARTS_SRC}/**/*.fixtures.ts`,
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...loadsOf(
          CHARTS_SELF_IMPORT.regex,
          CHARTS_SELF_IMPORT.message,
          ':matches([callee.name="require"], [callee.property.name="require"], [callee.object.name="require"])'
        ),
        ...[
          'ImportExpression:not([source.type="Literal"], [source.expressions.length=0])',
          'CallExpression[callee.name="createRequire"]',
          'ImportSpecifier[imported.name="createRequire"]',
          'MemberExpression[property.name="createRequire"]',
        ].map((selector) => ({
          selector,
          message:
            'Import modules by literal specifier, with no `createRequire`, so the self-import check can see them (packages/isomer-primitives-charts/AGENTS.md#module-rules).',
        })),
      ],
    },
  },
  chartsBarrels(
    [`${CHARTS_SRC}/**/*.{ts,tsx}`],
    [CHARTS_DIR_FILE, CHARTS_PRIMITIVE_FILE],
    [`${CHARTS_SRC}/primitives/**`]
  ),
  // The primitives' barrels depend on these, or the React-free entries reach them.
  chartsBarrels(
    [
      `${CHARTS_SRC}/{format,render,resolve,scene,schema,styles,text,theme}/**/*.{ts,tsx}`,
      `${CHARTS_SRC}/entries/{resolve,scene,schema}.ts`,
    ],
    [CHARTS_DIR_FILE, chartsPrimitiveBarrel('(\\./|(\\.\\./)+)primitives/')]
  ),
  // `./<primitive>/<file>` from here is a primitive's file, which the aggregators need.
  chartsBarrels(
    [`${CHARTS_SRC}/primitives/*.{ts,tsx}`],
    [
      { ...CHARTS_DIR_FILE, regex: '^(\\.\\./)+[\\w-]+/' },
      chartsPrimitiveBarrel('\\./'),
    ]
  ),
  // `../<primitive>/<file>` from here is a sibling primitive's file.
  chartsBarrels(
    [`${CHARTS_SRC}/primitives/*/**/*.{ts,tsx}`],
    [{ ...CHARTS_DIR_FILE, regex: '^(\\.\\./){2,}[\\w-]+/' }]
  ),
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
