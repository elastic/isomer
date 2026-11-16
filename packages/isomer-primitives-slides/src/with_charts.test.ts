/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsPack } from '@elastic/isomer-primitives-charts';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { exampleNodes, type PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slidesPack } from './pack';
import { frameModule } from './primitives/slide_frame/styles';
import { isomerDeckRoot } from './theme/distillery';

const exampleOf = (
  { primitives }: { primitives: typeof chartsPack.primitives },
  type: string
) =>
  exampleNodes(primitives.find((definition) => definition.type === type)!)[0];

describe('slides and charts in one runtime', () => {
  it.each([
    ['slides first', [slidesPack, chartsPack]],
    ['charts first', [chartsPack, slidesPack]],
  ])(
    "styles a chart inside a slide with both packs' stylesheets, %s",
    (_, packs) => {
      const runtime = createIsomerRuntime({ packs });

      const { body, css } = runtime.surfaces.html.render({
        type: 'view',
        body: [
          {
            type: 'slideFrame',
            body: [
              exampleOf(slidesPack, 'slideHeading'),
              exampleOf(chartsPack, 'metric'),
            ],
          } as PrimitiveNode,
        ],
      });

      const classes = [...body.matchAll(/class="([^"]+)"/g)].flatMap(
        ([, names]) => names!.split(' ')
      );
      const chartClass = classes.find((name) => name.startsWith('charts'));
      const slideClass = frameModule.handles.slide.readableName;
      expect(chartClass).toBeDefined();
      expect(classes).toContain(slideClass);
      expect(css).toContain(`.${chartClass}{`);
      expect(css).toContain(`.${slideClass}{`);
      expect(css).toMatch(
        new RegExp(`\\.${isomerDeckRoot}\\{[^}]*--slide-color-text:`)
      );
    }
  );
});
