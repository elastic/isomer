/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const sheetsByDocument = new WeakMap<Document, Map<string, CSSStyleSheet>>();

const sheetConstructor = (
  root: ShadowRoot
): typeof CSSStyleSheet | undefined => {
  const Sheet = root.ownerDocument.defaultView?.CSSStyleSheet;
  if (
    typeof Sheet !== 'function' ||
    typeof Sheet.prototype.replaceSync !== 'function' ||
    !Array.isArray(root.adoptedStyleSheets)
  ) {
    return undefined;
  }
  return Sheet;
};

const appendStyleElement = (root: ShadowRoot, css: string): void => {
  const present = [...root.querySelectorAll('style')].some(
    (style) => style.textContent === css
  );
  if (present) {
    return;
  }
  const style = root.ownerDocument.createElement('style');
  style.textContent = css;
  root.append(style);
};

const sharedSheet = (
  document: Document,
  Sheet: typeof CSSStyleSheet,
  css: string
): CSSStyleSheet => {
  let sheets = sheetsByDocument.get(document);
  if (!sheets) {
    sheets = new Map();
    sheetsByDocument.set(document, sheets);
  }
  let sheet = sheets.get(css);
  if (!sheet) {
    sheet = new Sheet();
    sheet.replaceSync(css);
    sheets.set(css, sheet);
  }
  return sheet;
};

/** Parses `css` once per document and adopts that sheet onto `root`. */
export const adoptStylesheet = (root: ShadowRoot, css: string): void => {
  const Sheet = sheetConstructor(root);
  if (!Sheet) {
    appendStyleElement(root, css);
    return;
  }
  const sheet = sharedSheet(root.ownerDocument, Sheet, css);
  if (!root.adoptedStyleSheets.includes(sheet)) {
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
  }
};
