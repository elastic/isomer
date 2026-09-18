/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  ASSET_URL_MESSAGE,
  assetUrl,
  BLOCKED_HREF,
  NAVIGATION_HREF_MESSAGE,
  navigationHref,
  sanitizeAssetUrl,
  sanitizeNavigationHref,
} from './url';

const TAB = String.fromCharCode(9);
const NEWLINE = String.fromCharCode(10);
const NUL = String.fromCharCode(0);

describe('sanitizeNavigationHref', () => {
  it.each([
    ['https', 'https://example.com/a'],
    ['http', 'http://example.com/a'],
    ['mailto', 'mailto:a@example.com'],
    ['relative path', '/app/dashboards#/view/1'],
    ['bare relative', 'dashboards/1'],
  ])('allows %s', (_label, href) => {
    expect(sanitizeNavigationHref(href)).toBe(href);
  });

  it.each([
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/html,<script>x</script>'],
    ['data image', 'data:image/png;base64,AAA'],
    ['blob', 'blob:https://example.com/x'],
    ['protocol-relative', '//evil.example.com'],
    ['backslash protocol-relative', String.raw`\\evil.example.com`],
    ['vbscript', 'vbscript:msgbox(1)'],
    ['file', 'file:///etc/passwd'],
    ['empty', ''],
    ['whitespace only', '   '],
    ['angle bracket', 'https://example.com/<script>'],
  ])('rejects %s', (_label, href) => {
    expect(sanitizeNavigationHref(href)).toBeNull();
  });

  it.each([
    ['tab inside the scheme', `jav${TAB}ascript:alert(1)`],
    ['newline inside the scheme', `jav${NEWLINE}ascript:alert(1)`],
    ['nul inside the scheme', `java${NUL}script:alert(1)`],
    ['entity-encoded colon', 'javascript&colon;alert(1)'],
    ['decimal entity colon', 'javascript&#58;alert(1)'],
    ['hex entity colon', 'javascript&#x3a;alert(1)'],
  ])('normalizes before the scheme check: %s', (_label, href) => {
    // Each of these reaches a browser or markdown consumer as `javascript:`,
    // so treating it as a relative path would be a live sink.
    expect(sanitizeNavigationHref(href)).toBeNull();
  });

  it('strips surrounding whitespace from an otherwise valid href', () => {
    expect(sanitizeNavigationHref('  https://example.com  ')).toBe(
      'https://example.com'
    );
  });

  it('degrades a blocked href to an inert same-document link', () => {
    expect(BLOCKED_HREF).toBe('#');
  });
});

describe('sanitizeAssetUrl', () => {
  it.each([
    ['https', 'https://example.com/a.png'],
    ['http', 'http://example.com/a.png'],
    ['relative', '/assets/a.png'],
    ['data image png', 'data:image/png;base64,AAA'],
    ['data image svg', 'data:image/svg+xml,<'.replace('<', '%3C')],
  ])('allows %s', (_label, url) => {
    expect(sanitizeAssetUrl(url)).toBe(url);
  });

  it.each([
    ['non-image data uri', 'data:text/html,x'],
    ['bare data uri', 'data:,x'],
    ['javascript', 'javascript:alert(1)'],
    ['mailto', 'mailto:a@example.com'],
    ['protocol-relative', '//evil.example.com/a.png'],
  ])('rejects %s', (_label, url) => {
    expect(sanitizeAssetUrl(url)).toBeNull();
  });

  it('differs from the navigation policy on data:image and mailto', () => {
    // The split is the point: an inert image payload is fine in a `src`, and a
    // mail client is fine in an `href`, but not the reverse.
    expect(sanitizeAssetUrl('data:image/png;base64,AAA')).not.toBeNull();
    expect(sanitizeNavigationHref('data:image/png;base64,AAA')).toBeNull();
    expect(sanitizeNavigationHref('mailto:a@example.com')).not.toBeNull();
    expect(sanitizeAssetUrl('mailto:a@example.com')).toBeNull();
  });
});

describe('zod refinements', () => {
  it('rejects an unsafe href with the documented message', () => {
    const result = navigationHref().safeParse('javascript:alert(1)');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(NAVIGATION_HREF_MESSAGE);
  });

  it('rejects an unsafe asset url with the documented message', () => {
    const result = assetUrl().safeParse('data:text/html,x');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(ASSET_URL_MESSAGE);
  });

  it('accepts policy-satisfying values', () => {
    expect(navigationHref().safeParse('https://example.com').success).toBe(
      true
    );
    expect(assetUrl().safeParse('data:image/png;base64,AAA').success).toBe(
      true
    );
  });

  it('rejects obfuscated forms at validation time, not just render time', () => {
    expect(
      navigationHref().safeParse(`jav${TAB}ascript:alert(1)`).success
    ).toBe(false);
  });
});
