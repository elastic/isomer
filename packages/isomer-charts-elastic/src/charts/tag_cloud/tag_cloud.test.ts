/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Wordcloud } from '@elastic/charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import { tagCloudExamples } from '@elastic/isomer-primitives-charts/schema';
import { describe, expect, it } from 'vitest';

import { renderer, resolvedCases, SIZE } from '../../shared/render.fixtures';
import { elasticModule } from '../../shared/styles';
import { sceneSpecs } from '../../specs';

import { tagCloudData } from './tag_cloud';

const { handles: elastic, vars } = elasticModule;

describe('elastic-charts renderer: tag cloud', () => {
  // jsdom has no canvas for the word cloud to measure words with, so this
  // reads the markup; Chromium draws the words in the look gate.
  it.each(resolvedCases(tagCloudExamples))('$name', ({ node, scheme }) => {
    const scene = resolveChart(node, { scheme, size: SIZE });
    if (scene.kind !== 'tagCloud') {
      throw new Error('expected a tag cloud Scene');
    }
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(
      renderer.render(scene, { environment: 'browser' }) as React.ReactElement
    );
    if (scene.empty) {
      expect(page.textContent).toBe(scene.empty.text);
      expect(page.querySelector('.echChart')).toBeNull();
      return;
    }
    // The cloud above its label, at the Scene's size, the label in its text color.
    const box = page.querySelector<HTMLElement>(
      `.${elastic.tagCloud.readableName}`
    )!;
    expect(
      [
        vars.tagCloud.width,
        vars.tagCloud.height,
        vars.tagCloud.ink,
        vars.tagCloud.fill,
      ].map(({ propName }) => box.style.getPropertyValue(propName))
    ).toEqual([
      `${SIZE.width}px`,
      `${SIZE.height}px`,
      scene.chrome.text,
      scene.chrome.background,
    ]);
    expect(
      box.querySelector(`.${elastic.tagCloudCloud.readableName} .echChart`)
    ).not.toBeNull();
    const label = box.querySelector(`.${elastic.tagCloudLabel.readableName}`);
    expect(label?.textContent ?? undefined).toBe(scene.label);
  });

  it('draws every word through one Wordcloud spec, at the Scene’s sizes and angles', () => {
    const scene = resolveChart(tagCloudExamples[0]!.node, { scheme: 'light' });
    const specs = sceneSpecs(scene, {
      environment: 'browser',
    }) as React.ReactElement<{ children: React.ReactNode }>;
    const clouds = React.Children.toArray(specs.props.children).filter(
      (child): child is React.ReactElement<Record<string, unknown>> =>
        React.isValidElement(child) && child.type === Wordcloud
    );
    expect(clouds).toHaveLength(1);
    expect(clouds[0]!.props).toMatchObject({
      data: tagCloudData(scene),
      minFontSize: scene.fontSize.min,
      maxFontSize: scene.fontSize.max,
      startAngle: scene.angles.start,
      endAngle: scene.angles.end,
      angleCount: scene.angles.count,
      weightFn: scene.scale,
    });
  });

  it('passes each word with its weight and color, naming it by index', () => {
    const scene = resolveChart(tagCloudExamples[0]!.node, { scheme: 'dark' });
    expect(tagCloudData(scene)).toEqual(
      scene.words.map(({ text, weight, color }, index) => ({
        text,
        weight,
        color,
        index,
      }))
    );
  });
});
