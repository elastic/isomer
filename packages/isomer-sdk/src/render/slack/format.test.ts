/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { isSlackReachableImageUrl } from './assets';
import { SLACK_LIMITS } from './blocks';
import {
  bold,
  clampMrkdwn,
  clampSlackText,
  code,
  codeBlock,
  escapeMrkdwn,
  formatHeaderText,
  italic,
  link,
  slackLinkUrl,
  strike,
} from './format';

describe('mrkdwn helpers', () => {
  it('escapes only the three characters Slack reads as HTML', () => {
    expect(escapeMrkdwn('a & b < c > *d*')).toBe('a &amp; b &lt; c &gt; *d*');
  });

  it('wraps emphasis around escaped text', () => {
    expect(bold('a<b')).toBe('*a&lt;b*');
    expect(italic('x')).toBe('_x_');
    expect(strike('x')).toBe('~x~');
  });

  it('keeps code contents literal and demotes backticks', () => {
    expect(code('a<b`c')).toBe('`a<bˋc`');
    expect(codeBlock('x\n```\ny')).toBe('```\nx\n``‍`\ny\n```');
  });

  it('percent-encodes a pipe so it cannot end the link URL', () => {
    expect(link('https://a.b/a|b', 'x')).toBe('<https://a.b/a%7Cb|x>');
  });

  it('builds links and degrades a blocked destination to text', () => {
    expect(link('https://example.com/?a=1&b=2', 'Docs & more')).toBe(
      '<https://example.com/?a=1&amp;b=2|Docs &amp; more>'
    );
    expect(link('https://example.com')).toBe('<https://example.com>');
    expect(link('javascript:alert(1)', 'Click')).toBe('Click');
    expect(link('javascript:alert(1)')).toBe('javascript:alert(1)');
    expect(link('mailto:a@b.c', 'Mail')).toBe('<mailto:a@b.c|Mail>');
  });
});

// Each entry either names no absolute destination or is one `URL` repairs.
const UNLINKABLE = [
  'javascript:alert(1)',
  '#',
  '/path',
  './a',
  '//host/a',
  'https:/a',
  'https://',
  'http://?q=1',
  'https:///path',
  'http://\\host',
  'https://a.b\\@evil.com/path',
  'https://a.b/p q',
  'http://@/',
  'https://:80',
  'http://user:pw@',
  'http://./',
  'https://..',
  'http://a..b/',
  'https://a.b../',
  'https://.a.b/',
  'https://bücher.de/',
  'https://a.b:443/',
  'mailto:',
  'mailto:?subject=x',
  'mailto:/',
  'mailto://host/a',
  'mailto:/user@example.com',
  'mailto://user@example.com',
  'mailto:abc@#frag',
  'mailto:a@',
  'mailto:@b',
  'mailto:%zz',
  'mailto:a@b..c',
  'mailto:a b@c.d',
  'mailto:a%2Fb@c.d',
  'mailto:a@b\\c',
  'mailto:,a@b.c',
  'mailto:a@b.c,',
  'mailto:abc',
  'https://a.b/%zz',
  'https://a.b/?q=%',
  'https://a.b/#%4',
  'mailto:a@b.c?subject=%zz',
  'https://de.wikipedia.org/wiki/Bücher',
  'mailto:a@b.c?subject=hello world',
  'mailto:a@b.c?subject="x"',
  'mailto:a@b.c?subject=<x>',
  'mailto:a@b.c?subject=\u0085',
  'mailto:a@b.c?subject=ü',
  'mailto:a@b.c#f g',
  'mailto:a@b:c',
  'mailto:a@b.c%3Fbad',
  'mailto:a@b@c.d',
  'mailto:a@b/c.d',
  'mailto:a@b%2Fc.d',
  'mailto:a@b%20c.d',
  'mailto:a@-b.c',
  'mailto:"a b"@c.d',
  'mailto:.a@b.c',
  'http://a_b.c/',
];

const LINKABLE = [
  'https://a.b',
  'HTTPS://A.B/p',
  'http://a.b?q=1',
  'https://a.b/p?q=1#f',
  'https://a.b:8080/p',
  'https://u@a.b/',
  'https://xn--bcher-kva.de/',
  'https://example.com./',
  'http://example.com.:8080/p',
  'https://de.wikipedia.org/wiki/B%C3%BCcher',
  'mailto:a@b.c?subject=hello%20world&body=%22x%22',
  'http://[::1]:3000/',
  'mailto:a@b.c',
  'mailto:a%40b.c',
  'mailto:a@b.c,d@e.f?subject=x',
  'mailto:a@b.c#f',
  'https://a.b/%25/%2F?q=%2f#%41',
  'mailto:a@b.c?subject=100%25',
  "mailto:a.b+c_d'e@xn--bcher-kva.de.",
  'http://127.0.0.1:8080/',
];

describe('slackLinkUrl', () => {
  it.each(UNLINKABLE)('prints the label of a link to %s', (href) => {
    expect(slackLinkUrl(href)).toBeNull();
    expect(link(href, 'x')).toBe('x');
    expect(isSlackReachableImageUrl(href)).toBe(false);
  });

  it.each(LINKABLE)('links %s as written', (href) => {
    expect(slackLinkUrl(href)).toBe(href);
    expect(link(href, 'x')).toBe(`<${escapeMrkdwn(href)}|x>`);
    expect(isSlackReachableImageUrl(href)).toBe(/^https:/i.test(href));
  });
});

describe('clamping', () => {
  it('returns short text untouched and appends an ellipsis when cutting', () => {
    expect(clampSlackText('hello', 5)).toBe('hello');
    expect(clampSlackText('hello world', 6)).toBe('hello…');
    expect(clampSlackText('hello world', 1)).toBe('h');
  });

  it('clamps at a grapheme boundary, never splitting a surrogate pair or emoji sequence', () => {
    expect(clampSlackText(`a${'😀'.repeat(75)}`, 75)).toBe(
      `a${'😀'.repeat(36)}…`
    );
    expect(clampSlackText('ab👨‍👩‍👧cd', 6)).toBe('ab…');
    expect(clampSlackText('😀😀', 1)).toBe('');
  });

  it('collapses whitespace in header text and clamps to the header budget', () => {
    expect(formatHeaderText('  a \n\t b  ')).toBe('a b');
    const long = 'x'.repeat(SLACK_LIMITS.headerTextChars + 10);
    expect(formatHeaderText(long)).toHaveLength(SLACK_LIMITS.headerTextChars);
  });
});

describe('clampMrkdwn', () => {
  const pad = (n: number) => 'a'.repeat(n);

  it('returns text within the limit untouched', () => {
    expect(clampMrkdwn('*bold* <https://x.test|x>', 40)).toBe(
      '*bold* <https://x.test|x>'
    );
  });

  it('cuts before a link or mention the cut lands in', () => {
    expect(clampMrkdwn(`${pad(10)} <https://x.test/path|label> b`, 20)).toBe(
      `${pad(10)}…`
    );
    expect(clampMrkdwn(`${pad(10)} <@U123ABC> b`, 18)).toBe(`${pad(10)}…`);
    expect(
      clampMrkdwn(`${pad(10)} <https://x.test/${'p'.repeat(200)}|label>`, 20)
    ).toBe(`${pad(10)}…`);
  });

  it('keeps a link that ends at the cut', () => {
    const value = `${pad(5)} <https://x.test|x> ${'b'.repeat(40)}`;
    expect(clampMrkdwn(value, 27)).toBe(`${pad(5)} <https://x.test|x> b…`);
  });

  it('cuts through a bare less-than that opens no link', () => {
    const code = '`a<b` ';
    const output = clampMrkdwn(`${code}${'word '.repeat(700)}`, 3_000);
    expect(output.length).toBe(3_000);
    expect(output.startsWith(code)).toBe(true);
    expect(clampMrkdwn(`a<b\n> ${'c'.repeat(30)}`, 20).length).toBe(20);
  });

  it('cuts before an entity the cut lands in', () => {
    expect(clampMrkdwn(`${pad(8)}&amp;&lt;&gt;`, 11)).toBe(`${pad(8)}…`);
    expect(clampMrkdwn(`${pad(8)}&amp;&lt;&gt;`, 14)).toBe(`${pad(8)}&amp;…`);
  });

  it('never cuts inside an entity in a link label', () => {
    const value = `${pad(4)} <https://x.test|a &amp; b> tail`;
    expect(clampMrkdwn(value, 26)).toBe(`${pad(4)}…`);
  });

  it('leaves formatting marks as they fall', () => {
    expect(clampMrkdwn(`x *${'word '.repeat(10)}*`, 20)).toBe(
      `x *${'word '.repeat(3)}w…`
    );
  });

  it('keeps a grapheme whole', () => {
    expect(clampMrkdwn(`${pad(8)}😀😀`, 10)).toBe(`${pad(8)}…`);
  });

  it('clamps a long input in time bounded by the limit', () => {
    const started = performance.now();
    clampMrkdwn('a'.repeat(1_000_000), 3_000);
    clampMrkdwn(`<${'a'.repeat(1_000_000)}`, 3_000);
    expect(performance.now() - started).toBeLessThan(200);
  });
});
