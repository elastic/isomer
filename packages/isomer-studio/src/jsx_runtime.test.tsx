/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { css } from '@emotion/react';
import { render, screen } from '@testing-library/react';
import ts from 'typescript';

const buildConfig = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../tsconfig.build.json'
);

const parseBuildConfig = () => {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    buildConfig,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: ({ messageText }) => {
        throw new Error(ts.flattenDiagnosticMessageText(messageText, '\n'));
      },
    }
  );
  if (parsed === undefined) {
    throw new Error(`Could not parse ${buildConfig}.`);
  }
  return parsed;
};

describe('Emotion JSX', () => {
  it('compiles every app module against `@emotion/react/jsx-runtime`', () => {
    const { fileNames, options } = parseBuildConfig();
    const modules = fileNames.filter((name) => name.endsWith('.tsx'));
    expect(modules.length).toBeGreaterThan(0);

    modules.forEach((fileName) => {
      const { outputText } = ts.transpileModule(
        readFileSync(fileName, 'utf8'),
        { compilerOptions: options, fileName }
      );
      expect(outputText).not.toMatch(/from ["']react\/jsx-runtime["']/);
      if (/jsxs?\(/.test(outputText)) {
        expect(outputText).toMatch(/from ["']@emotion\/react\/jsx-runtime["']/);
      }
    });
  });

  it('turns the `css` prop into a generated class name', () => {
    render(
      <div
        data-testid="styled"
        css={css`
          color: red;
        `}
      />
    );
    const element = screen.getByTestId('styled');

    expect(element.className).toMatch(/^css-/);
    expect(element).not.toHaveAttribute('css');
  });
});
