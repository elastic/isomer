/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Finds a host's own tags, such as `<render_attachment id="…" />`, in
// authored Markdown. The grammar is CommonMark's raw HTML open tag (§6.6) on
// one line, with `_` allowed in the name. One scan serves both paths of
// `splitAuthoredMarkdown`: the parsed path swaps each tag for a sentinel
// before parsing, and the over-budget path cuts the source at each tag.

/** A tag found by {@link findHostTags}. */
export interface HostTag {
  /** Offset of the `<` in the source. */
  readonly index: number;
  /** The tag as written. */
  readonly raw: string;
  /** The name as listed in the options. */
  readonly name: string;
  /** Values as written, keyed by lower-cased name; a bare attribute is `''`. */
  readonly attributes: Readonly<Record<string, string>>;
}

const NAME = String.raw`[A-Za-z_:][\w.:-]*`;
// A quoted value stays on one line and holds no backtick, so a code span
// opened before the tag still closes where CommonMark closes it.
const VALUE = String.raw`[^\s"'=<>\x60]+|'[^'\r\n\x60]*'|"[^"\r\n\x60]*"`;
const ATTRIBUTE = String.raw`[ \t]+${NAME}(?:[ \t]*=[ \t]*(?:${VALUE}))?`;
const ATTRIBUTE_RE = new RegExp(
  String.raw`[ \t]+(${NAME})(?:[ \t]*=[ \t]*(${VALUE}))?`,
  'g'
);

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const tagPattern = (names: readonly string[]): RegExp =>
  new RegExp(
    `<(${names.map(escapeRegExp).join('|')})((?:${ATTRIBUTE})*)[ \\t]*/?>`,
    'gi'
  );

const parseAttributes = (body: string): Record<string, string> => {
  const attributes = Object.create(null) as Record<string, string>;
  for (const [, name, value = ''] of body.matchAll(ATTRIBUTE_RE)) {
    const key = name!.toLowerCase();
    if (!(key in attributes)) {
      attributes[key] =
        value.startsWith('"') || value.startsWith("'")
          ? value.slice(1, -1)
          : value;
    }
  }
  return attributes;
};

// `\<` is an escaped `<`. Where a backslash is literal (code, HTML), the tag
// is literal too, so skipping it there changes nothing.
const isEscaped = (source: string, index: number): boolean => {
  let backslashes = 0;
  while (source[index - backslashes - 1] === '\\') {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
};

/** Every tag named in `names` (matched case-insensitively and whole), in source order. */
export const findHostTags = (
  source: string,
  names: readonly string[]
): HostTag[] => {
  const canonical = new Map<string, string>();
  for (const name of names) {
    const lower = name.toLowerCase();
    if (lower !== '' && !canonical.has(lower)) {
      canonical.set(lower, name);
    }
  }
  if (canonical.size === 0) {
    return [];
  }
  const tags: HostTag[] = [];
  for (const match of source.matchAll(tagPattern([...canonical.keys()]))) {
    if (isEscaped(source, match.index)) {
      continue;
    }
    tags.push({
      index: match.index,
      raw: match[0],
      name: canonical.get(match[1]!.toLowerCase())!,
      attributes: parseAttributes(match[2]!),
    });
  }
  return tags;
};
