/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Text and Markdown from the Scene. Every string is the Scene's own.

import { type MarkdownContent, md } from '@elastic/isomer-sdk/markdown';

import type { Scene } from '../scene/types';

/** The Scene's emphasis notes, in order. */
export const sceneNotes = ({ interactions }: Scene): string[] =>
  interactions.emphasis.flatMap(({ note }) => (note ? [note] : []));

/** The summary with each emphasis note on its own line, then the link as its own paragraph. */
export const sceneToText = (scene: Scene): string => {
  const { link } = scene.interactions;
  return [
    [scene.summary, ...sceneNotes(scene)].join('\n'),
    ...(link ? [`${link.label}: ${link.href}`] : []),
  ].join('\n\n');
};

/** The summary, each emphasis note and the link, as paragraphs. */
export const sceneToMarkdown = (scene: Scene): MarkdownContent => {
  const { link } = scene.interactions;
  return [
    md.paragraph(scene.summary),
    ...sceneNotes(scene).map((note) => md.paragraph(md.emphasis(note))),
    ...(link ? [md.paragraph(md.link(link.label, link.href))] : []),
  ];
};
