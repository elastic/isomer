/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { render, screen, within } from '@testing-library/react';
import ts from 'typescript';

import { encodeSource } from '../model/compose_link';
import { JSX_TRANSFORM_OPTIONS } from '../model/jsx_transform';
import { IsomerStudio } from '../studio';
import type { JsxTransform } from '../types';

import { componentsPack } from './components_pack';

export const runtime = createIsomerRuntime<unknown, StyledRenderContext>({
  packs: [componentsPack],
});

export const framedRuntime = createIsomerRuntime<
  unknown,
  StyledRenderContext,
  unknown
>({
  packs: [componentsPack],
  frames: {
    card: {
      defaultWidth: 320,
      theme: { light: undefined, dark: undefined },
      estimateHeight: () => 100,
      wrap: (_header, body) => <div>{body}</div>,
    },
  },
});

export const transformJsx: JsxTransform = (source) =>
  Promise.resolve(
    ts.transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        jsxFactory: JSX_TRANSFORM_OPTIONS.jsxFactory,
        jsxFragmentFactory: JSX_TRANSFORM_OPTIONS.jsxFragment,
      },
      fileName: 'composition.jsx',
    }).outputText
  );

export const findEditor = () =>
  screen.findByRole('textbox', { name: 'Callout source' });

export const renderStudio = async () => {
  render(<IsomerStudio {...{ runtime }} />);
  return findEditor();
};

export const findComposer = () =>
  screen.findByRole<HTMLTextAreaElement>('textbox', {
    name: 'Composition source',
  });

export const textPreview = () =>
  screen.getByRole('region', { name: 'Text preview' });

export const workbench = () =>
  within(screen.getByRole('region', { name: 'Composition workbench' }));

export const openLink = async (source: string, lang: 'jsx' | 'json') => {
  window.location.hash = `#/compose?code=${await encodeSource(source)}&lang=${lang}`;
};
