/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CompletionModel } from 'monaco-editor/esm/vs/editor/contrib/suggest/browser/completionModel';
import { CompletionItem } from 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggest';
import {
  type CancellationToken,
  editor,
  languages,
} from 'monaco-editor/esm/vs/editor/editor.api';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  componentCompletionProvider,
  endsInJsxChildren,
  registerTsx,
} from './tsx_language';

const COMPONENTS = ['Callout', 'Stack'];

const provider = componentCompletionProvider(COMPONENTS);

const models: editor.ITextModel[] = [];

beforeAll(() => {
  registerTsx();
});

afterEach(() => {
  for (const model of models.splice(0)) {
    model.dispose();
  }
});

const lexemes = (text: string) => {
  const lines = text.split(/\r\n|\r|\n/);
  return editor.tokenize(text, 'typescript').flatMap((row, index) => {
    const line = lines[index] ?? '';
    return row.flatMap(({ offset, type }, position) => {
      const value = line.slice(offset, row[position + 1]?.offset);
      return value === '' ? [] : [{ type: type.replace(/\.tsx$/, ''), value }];
    });
  });
};

const token: CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
};

const atEnd = (text: string) => {
  const model = editor.createModel(text, 'typescript');
  models.push(model);
  return { model, position: model.getPositionAt(model.getValueLength()) };
};

const suggestionsAt = async (
  text: string,
  triggerKind = languages.CompletionTriggerKind.Invoke
) => {
  const { model, position } = atEnd(text);
  const result = await provider.provideCompletionItems(
    model,
    position,
    { triggerKind },
    token
  );
  return { model, result: result ?? { suggestions: [] } };
};

const inserted = (model: editor.ITextModel, item: languages.CompletionItem) => {
  const range =
    'startLineNumber' in item.range ? item.range : item.range.insert;
  model.applyEdits([{ range, text: item.insertText }]);
  return model.getValue();
};

const significant = (text: string) =>
  lexemes(text).filter(({ value }) => value.trim() !== '');

describe('tsx tokenizer', () => {
  it('reads an element, its attributes, and its children', () => {
    const tokens = significant('<Callout tone="info">Hello</Callout>');
    expect(tokens).toContainEqual({ type: 'attribute.name', value: 'tone' });
    expect(tokens).toContainEqual({ type: 'string', value: '"info"' });
    expect(tokens).toContainEqual({ type: '', value: 'Hello' });
  });

  it('returns to an expression after a self-closing tag', () => {
    const tokens = significant('<Callout />\nconst n = 1 < 2');
    expect(tokens).toContainEqual({ type: 'keyword', value: 'const' });
    expect(tokens).toContainEqual({ type: 'delimiter', value: '<' });
    expect(endsInJsxChildren('<Callout />')).toBe(false);
  });

  it('tracks nested elements and expressions in children', () => {
    const tokens = significant('<Callout>{1 + 2}</Callout>');
    expect(tokens).toContainEqual({ type: 'number', value: '1' });
    expect(tokens).toContainEqual({ type: 'number', value: '2' });
    expect(endsInJsxChildren('<Callout>')).toBe(true);
    expect(endsInJsxChildren('<Callout>\n<')).toBe(true);
    expect(endsInJsxChildren('<Callout>{')).toBe(false);
    expect(endsInJsxChildren('<A><B>')).toBe(true);
    expect(endsInJsxChildren('<A><B></B>')).toBe(true);
    expect(endsInJsxChildren('<A><B></B></A>')).toBe(false);
  });
});

describe('component completions', () => {
  it('replaces a typed opener instead of inserting a second one', async () => {
    const { model, result } = await suggestionsAt('<Composition>\n<');
    const callout = result.suggestions.find(({ label }) => label === 'Callout');
    expect(result.suggestions.map(({ label }) => label)).toEqual(COMPONENTS);
    expect(callout?.insertText).toBe('<Callout ');
    expect(callout).toMatchObject({ filterText: '<Callout' });
    expect(callout && inserted(model, callout)).toBe(
      '<Composition>\n<Callout '
    );
  });

  it('replaces a partial tag name along with its opener', async () => {
    const { model, result } = await suggestionsAt('<Composition>\n<Ca');
    const callout = result.suggestions.find(({ label }) => label === 'Callout');
    expect(callout && inserted(model, callout)).toBe(
      '<Composition>\n<Callout '
    );
  });

  it('inserts an opener where children can go', async () => {
    const { model, result } = await suggestionsAt('<Composition>\n');
    const callout = result.suggestions.find(({ label }) => label === 'Callout');
    expect(callout && inserted(model, callout)).toBe(
      '<Composition>\n<Callout '
    );
  });

  it('stays quiet outside children, inside an expression, and on attributes', async () => {
    expect((await suggestionsAt('const n = 1')).result.suggestions).toEqual([]);
    expect((await suggestionsAt('<Callout>{')).result.suggestions).toEqual([]);
    expect((await suggestionsAt('<Callout tone=')).result.suggestions).toEqual(
      []
    );
  });

  it('stays visible when Monaco filters on a typed opener', async () => {
    const labels = async (text: string) => {
      const { model, result } = await suggestionsAt(text);
      const position = model.getPositionAt(model.getValueLength());
      const items = result.suggestions.map(
        (completion) =>
          new CompletionItem(
            position,
            completion,
            { suggestions: result.suggestions, incomplete: false },
            provider
          )
      );
      const visible = new CompletionModel(
        items,
        position.column,
        {
          leadingLineContent: model.getLineContent(position.lineNumber),
          characterCountDelta: 0,
        },
        { distance: () => 0 },
        { filterGraceful: true },
        'inline'
      );
      return visible.items.map(({ textLabel }) => textLabel);
    };

    expect(await labels('<Composition>\n<')).toEqual(COMPONENTS);
    expect((await labels('<Composition>\n<Ca'))[0]).toBe('Callout');
    expect((await labels('<Composition>\n<St'))[0]).toBe('Stack');
  });

  it('stays quiet unless completion was invoked', async () => {
    expect(
      (
        await suggestionsAt(
          '<Composition>\n<',
          languages.CompletionTriggerKind.TriggerCharacter
        )
      ).result.suggestions
    ).toEqual([]);
  });
});
