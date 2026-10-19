/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adoptStylesheet, reactContextOf } from './adopt_stylesheet';

const shadow = (): ShadowRoot => {
  const host = document.createElement('div');
  document.body.append(host);
  return host.attachShadow({ mode: 'open' });
};

describe('adoptStylesheet', () => {
  it('appends a style element when constructable stylesheets are unavailable', () => {
    const root = shadow();
    adoptStylesheet(root, '.a { color: blue }');
    adoptStylesheet(root, '.a { color: blue }');
    const styles = root.querySelectorAll('style');
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toBe('.a { color: blue }');
  });

  it('parses one stylesheet per document and adopts it onto every shadow root', () => {
    const parsed: string[] = [];
    class Sheet {
      replaceSync(css: string) {
        parsed.push(css);
      }
    }
    const view = document.defaultView;
    if (!view) {
      throw new Error('jsdom has no window.');
    }
    const original = view.CSSStyleSheet;
    view.CSSStyleSheet = Sheet as unknown as typeof CSSStyleSheet;
    const adopted = new WeakMap<ShadowRoot, CSSStyleSheet[]>();
    const install = (root: ShadowRoot) => {
      adopted.set(root, []);
      Object.defineProperty(root, 'adoptedStyleSheets', {
        configurable: true,
        get: () => adopted.get(root),
        set: (sheets: CSSStyleSheet[]) => adopted.set(root, sheets),
      });
    };

    try {
      const first = shadow();
      const second = shadow();
      install(first);
      install(second);
      const css = '.shared { color: red }';
      adoptStylesheet(first, css);
      adoptStylesheet(second, css);
      adoptStylesheet(first, css);
      adoptStylesheet(first, '.other { color: green }');

      expect(parsed).toEqual([css, '.other { color: green }']);
      const [shared] = adopted.get(first) ?? [];
      expect(shared).toBeDefined();
      expect(adopted.get(second)?.[0]).toBe(shared);
      expect(adopted.get(first)).toHaveLength(2);
    } finally {
      view.CSSStyleSheet = original;
    }
  });
});

describe('reactContextOf', () => {
  it('adopts the stylesheet, built once, before the config builds its context', () => {
    const stylesheet = vi.fn(() => '.b { color: red }');
    const createReactContext = (root: ShadowRoot) => {
      const adopted = root.querySelector('style')?.textContent ?? '';
      return { resolveClassName: () => adopted };
    };
    const create = reactContextOf({ stylesheet, createReactContext });
    expect(create?.(shadow()).resolveClassName?.()).toBe('.b { color: red }');
    create?.(shadow());
    expect(stylesheet).toHaveBeenCalledTimes(1);
  });

  it('gives a stylesheet alone an empty context, and leaves a config without one as it is', () => {
    expect(reactContextOf({ stylesheet: () => '' })?.(shadow())).toEqual({});
    const createReactContext = () => ({});
    expect(reactContextOf({ createReactContext })).toBe(createReactContext);
    expect(reactContextOf({})).toBeUndefined();
  });
});
