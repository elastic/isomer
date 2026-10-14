/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDisposable } from 'monaco-editor/esm/vs/editor/editor.api';
import { editor, languages } from 'monaco-editor/esm/vs/editor/editor.api';

const TAG_NAME = /[A-Za-z_$][\w$.:-]*/;

const KEYWORDS = [
  'as',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'const',
  'continue',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'null',
  'of',
  'return',
  'satisfies',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'yield',
];

const configuration: languages.LanguageConfiguration = {
  comments: { lineComment: '//', blockComment: ['/*', '*/'] },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
    { open: '`', close: '`', notIn: ['string', 'comment'] },
  ],
};

/** A JS expression tokenizer that also reads JSX elements, which Monaco's own TypeScript one does not. */
const tokens: languages.IMonarchLanguage = {
  defaultToken: 'invalid',
  tokenPostfix: '.tsx',
  keywords: KEYWORDS,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4})/,
  digits: /\d+(_+\d+)*/,
  tokenizer: {
    root: [{ include: 'expression' }],
    expression: [
      [
        /#?[a-z_$][\w$]*/,
        { cases: { '@keywords': 'keyword', '@default': 'identifier' } },
      ],
      [/[A-Z][\w$]*/, 'type.identifier'],
      { include: '@whitespace' },
      [/<>/, 'delimiter.bracket', '@jsxChildren'],
      [/<(?=[A-Za-z_$])/, 'delimiter.bracket', '@jsxTagName'],
      [/[{}()[\]]/, '@brackets'],
      [/[<>=!~?:&|+\-*/^%@]+/, 'delimiter'],
      [/0[xX][\da-fA-F]+n?/, 'number.hex'],
      [/(@digits)\.(@digits)([eE][-+]?(@digits))?/, 'number.float'],
      [/(@digits)[eE]([-+]?(@digits))?/, 'number.float'],
      [/(@digits)n?/, 'number'],
      [/[;,.]/, 'delimiter'],
      [/"/, 'string', '@stringDouble'],
      [/'/, 'string', '@stringSingle'],
      [/`/, 'string', '@stringBacktick'],
    ],
    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
    ],
    comment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],
    stringDouble: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],
    stringSingle: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop'],
    ],
    stringBacktick: [
      [/\$\{/, 'delimiter.bracket', '@braces'],
      [/[^\\`$]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/`/, 'string', '@pop'],
    ],
    braces: [
      [/\{/, 'delimiter.bracket', '@braces'],
      [/\}/, 'delimiter.bracket', '@pop'],
      { include: 'expression' },
    ],
    // After `<`: the element name, then the attributes.
    jsxTagName: [
      [TAG_NAME, { token: 'type.identifier', switchTo: '@jsxAttributes' }],
    ],
    jsxAttributes: [
      { include: '@whitespace' },
      [/\/>/, 'delimiter.bracket', '@pop'],
      [/>/, { token: 'delimiter.bracket', switchTo: '@jsxChildren' }],
      [/\{/, 'delimiter.bracket', '@braces'],
      [/[A-Za-z_$][\w$:-]*/, 'attribute.name'],
      [/=/, 'delimiter'],
      [/"/, 'string', '@jsxStringDouble'],
      [/'/, 'string', '@jsxStringSingle'],
    ],
    jsxStringDouble: [
      [/[^"]+/, 'string'],
      [/"/, 'string', '@pop'],
    ],
    jsxStringSingle: [
      [/[^']+/, 'string'],
      [/'/, 'string', '@pop'],
    ],
    jsxChildren: [
      [/<\//, { token: 'delimiter.bracket', switchTo: '@jsxClosingTag' }],
      [/<>/, 'delimiter.bracket', '@jsxChildren'],
      [/<(?=[A-Za-z_$])/, 'delimiter.bracket', '@jsxTagName'],
      [/\{/, 'delimiter.bracket', '@braces'],
      [/[^<{]+/, ''],
    ],
    jsxClosingTag: [
      [/[ \t\r\n]+/, ''],
      [TAG_NAME, 'type.identifier'],
      [/>/, 'delimiter.bracket', '@pop'],
    ],
  },
};

type Frame = 'tag' | 'children' | 'closing' | 'braces';

const JSX_BRACKET = /<>|<\/|\/>|\$\{|[<>{}]/g;

const jsxFrame = (text: string): Frame | undefined => {
  const stack: Frame[] = [];
  const lines = text.split(/\r\n|\r|\n/);
  editor.tokenize(text, 'typescript').forEach((row, index) => {
    const line = lines[index] ?? '';
    row.forEach(({ offset, type }, position) => {
      if (!type.startsWith('delimiter.bracket')) {
        return;
      }
      const lexeme = line.slice(offset, row[position + 1]?.offset);
      for (const [bracket] of lexeme.matchAll(JSX_BRACKET)) {
        const top = stack.length - 1;
        switch (bracket) {
          case '<>':
            stack.push('children');
            break;
          case '<':
            stack.push('tag');
            break;
          case '</':
            if (stack[top] === 'children') {
              stack[top] = 'closing';
            }
            break;
          case '/>':
            if (stack[top] === 'tag') {
              stack.pop();
            }
            break;
          case '>':
            if (stack[top] === 'tag') {
              stack[top] = 'children';
            } else if (stack[top] === 'closing') {
              stack.pop();
            }
            break;
          case '}':
            if (stack[top] === 'braces') {
              stack.pop();
            }
            break;
          default:
            stack.push('braces');
        }
      }
    });
  });
  return stack[stack.length - 1];
};

/** Whether `text` ends where an element's children go. Reads the brackets {@link tokens} marks. */
export const endsInJsxChildren = (text: string): boolean =>
  jsxFrame(text) === 'children';

/** A `<` or `<Name` already typed. The bare `<` is not a bracket until a name follows. */
const PENDING_TAG = /<([A-Za-z_$][\w$]*)?$/;

const offersComponents = (text: string): boolean => {
  const frame = jsxFrame(text);
  if (frame === 'children') {
    return true;
  }
  const pending = PENDING_TAG.exec(text);
  return frame === 'tag' && pending?.[1] !== undefined;
};

/** Replaces a `<` already before the cursor, so the inserted opener does not double it. */
const completionRange = (
  text: string,
  position: { lineNumber: number; column: number },
  word: { startColumn: number; endColumn: number }
) => {
  const pending = PENDING_TAG.exec(text);
  const { lineNumber, column } = position;
  return {
    startLineNumber: lineNumber,
    endLineNumber: lineNumber,
    startColumn: pending ? column - pending[0].length : word.startColumn,
    endColumn: pending ? column : word.endColumn,
  };
};

/** Offers `components` as tag openers in element children, or over a tag name already started, on an explicit invoke. */
export const componentCompletionProvider = (
  components: readonly string[]
): languages.CompletionItemProvider => ({
  provideCompletionItems: (model, position, { triggerKind }) => {
    const { lineNumber, column } = position;
    const text = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: lineNumber,
      endColumn: column,
    });
    if (
      triggerKind !== languages.CompletionTriggerKind.Invoke ||
      !offersComponents(text)
    ) {
      return { suggestions: [] };
    }
    const range = completionRange(
      text,
      position,
      model.getWordUntilPosition(position)
    );
    return {
      suggestions: components.map((name) => ({
        label: name,
        kind: languages.CompletionItemKind.Class,
        insertText: `<${name} `,
        range,
        command: { id: 'editor.action.triggerSuggest', title: '' },
      })),
    };
  },
});

export const registerComponentCompletions = (
  components: readonly string[]
): IDisposable =>
  languages.registerCompletionItemProvider(
    'typescript',
    componentCompletionProvider(components)
  );

/** Replaces the `typescript` language's tokenizer, so every TypeScript model reads JSX. */
export const registerTsx = () => {
  languages.register({
    id: 'typescript',
    extensions: ['.ts', '.tsx'],
    aliases: ['TypeScript', 'ts', 'typescript'],
    mimetypes: ['text/typescript'],
  });
  languages.setLanguageConfiguration('typescript', configuration);
  languages.setMonarchTokensProvider('typescript', tokens);
};
