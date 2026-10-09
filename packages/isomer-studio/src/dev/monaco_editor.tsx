/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'monaco-editor/esm/vs/editor/edcore.main';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';

import React, { useEffect, useRef } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { editor, languages, Uri } from 'monaco-editor/esm/vs/editor/editor.api';

import type { AuthoringTypes } from '../model/authoring_types';
import { AUTHORING_MODULE } from '../model/authoring_types';

import type { EditorFormat } from './use_editor';

export interface MonacoEditorProps {
  format: EditorFormat;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  authoring: AuthoringTypes;
}

const ROOT = 'file:///isomer-studio';
const THEMES = {
  light: 'isomer-studio-light',
  dark: 'isomer-studio-dark',
} as const;

let modelCount = 0;

const modelUri = (format: EditorFormat): Uri => {
  modelCount += 1;
  return Uri.parse(
    `${ROOT}/composition-${modelCount}.${format === 'jsx' ? 'tsx' : 'isomer.json'}`
  );
};

/** Points the global TypeScript and JSON services at this runtime's types. */
const configureLanguages = ({ declarations, bodySchema }: AuthoringTypes) => {
  const { typescriptDefaults, JsxEmit, ScriptTarget } = languages.typescript;
  typescriptDefaults.setCompilerOptions({
    target: ScriptTarget.ESNext,
    jsx: JsxEmit.ReactJSX,
    jsxImportSource: AUTHORING_MODULE,
    strict: true,
    noEmit: true,
    allowNonTsExtensions: true,
    lib: ['es2020'],
  });
  typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
  typescriptDefaults.setEagerModelSync(true);
  typescriptDefaults.setExtraLibs([
    { content: declarations, filePath: `${ROOT}/runtime.d.ts` },
  ]);

  languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    enableSchemaRequest: false,
    schemas: [
      {
        uri: `${ROOT}/body.schema.json`,
        fileMatch: ['*.isomer.json'],
        schema: bodySchema,
      },
    ],
  });
};

const hex = (color: string): string | undefined =>
  /^#[\da-f]{6,8}$/i.test(color) ? color : undefined;

/** Monaco on this runtime's types: TypeScript checks JSX, the Composition schema checks JSON. */
export const MonacoEditor = ({
  format,
  value,
  onChange,
  ariaLabel,
  authoring,
}: MonacoEditorProps) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<editor.IStandaloneCodeEditor>();
  const current = useRef(value);
  const notify = useRef(onChange);
  notify.current = onChange;

  useEffect(() => configureLanguages(authoring), [authoring]);

  useEffect(() => {
    const { colors } = euiTheme;
    const background = hex(colors.backgroundBaseSubdued);
    const themeColors = Object.fromEntries(
      Object.entries({
        'editor.background': background,
        'editorGutter.background': background,
        'editor.foreground': hex(colors.textParagraph),
        'editorLineNumber.foreground': hex(colors.textSubdued),
      }).flatMap(([key, color]): Array<[string, string]> =>
        color ? [[key, color]] : []
      )
    );
    const name = colorMode === 'DARK' ? THEMES.dark : THEMES.light;
    editor.defineTheme(name, {
      base: colorMode === 'DARK' ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [],
      colors: themeColors,
    });
    editor.setTheme(name);
  }, [euiTheme, colorMode]);

  useEffect(() => {
    if (!container.current) {
      return;
    }
    const created = editor.create(container.current, {
      model: null,
      automaticLayout: true,
      fixedOverflowWidgets: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
      fontSize: 12,
      lineNumbersMinChars: 3,
      renderLineHighlight: 'none',
      overviewRulerLanes: 0,
      padding: { top: 12, bottom: 12 },
    });
    instance.current = created;
    return () => {
      created.dispose();
      instance.current = undefined;
    };
  }, []);

  useEffect(() => {
    const { familyCode } = euiTheme.font;
    instance.current?.updateOptions({
      ariaLabel,
      ...(familyCode ? { fontFamily: familyCode } : {}),
    });
  }, [ariaLabel, euiTheme.font]);

  useEffect(() => {
    current.current = value;
    const model = instance.current?.getModel();
    if (!model || model.getValue() === value) {
      return;
    }
    model.pushEditOperations(
      [],
      [{ range: model.getFullModelRange(), text: value }],
      () => null
    );
  }, [value]);

  useEffect(() => {
    const created = instance.current;
    if (!created) {
      return;
    }
    const model = editor.createModel(
      current.current,
      format === 'jsx' ? 'typescript' : 'json',
      modelUri(format)
    );
    created.setModel(model);
    const subscription = model.onDidChangeContent(() => {
      const next = model.getValue();
      if (next !== current.current) {
        current.current = next;
        notify.current(next);
      }
    });
    return () => {
      subscription.dispose();
      created.setModel(null);
      model.dispose();
    };
  }, [format]);

  return (
    <div
      ref={container}
      css={css`
        flex: 1;
        min-height: 240px;
        border-block: ${euiTheme.border.thin};
      `}
    />
  );
};
