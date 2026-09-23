/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import tableSource from '../../../../packages/isomer-primitives-slides/src/primitives/slide_table/index.tsx?raw';
import { excerpt, linesContaining } from '../excerpt';
import {
  frame,
  Slide,
  SlideBulletList,
  SlideCode,
  SlideFrame,
  SlideSplit,
  SlideTitle,
  toComposition,
} from '../shim';

// Raw text, so listing the folder never bundles its modules (or its test).
const folder = import.meta.glob(
  '../../../../packages/isomer-primitives-slides/src/primitives/slide_table/*',
  { eager: true, import: 'default', query: '?raw' }
);

const roles: Readonly<Record<string, string>> = {
  'catalog.ts': 'purpose, when to use it, when not to, one example',
  'examples.ts': 'the cases the SDK conformance suite renders',
  'index.test.ts': 'what conformance cannot know',
  'index.tsx': 'text, markdown, Slack, and the definition',
  'react.tsx': 'React, HTML, and the image surface',
  'schema.ts': 'the validator, the JSON Schema, and the node type',
};

const files = Object.keys(folder).map((path) => path.split('/').pop() ?? path);

const definition = excerpt(tableSource, 'export const slideTablePrimitive', 14);

export const anatomySlide = toComposition(
  <Slide title="Anatomy">
    <SlideFrame {...frame} chapter="Anatomy" chapterNumber="11">
      <SlideTitle
        eyebrow="The reference pack"
        title="A primitive is one folder."
        lede="This is slideTable, one of the four primitives added for this deck."
        size="compact"
      />
      <SlideSplit
        left={
          <SlideCode
            label="slide_table/index.tsx"
            language="ts"
            highlight={['react,', 'text,', 'markdown,', 'slack,'].flatMap(
              (needle) => linesContaining(definition, needle)
            )}>
            {definition}
          </SlideCode>
        }
        right={
          <SlideBulletList
            label="slide_table/"
            items={files.map((file) =>
              roles[file] ? `${file}: ${roles[file]}` : file
            )}
          />
        }
      />
    </SlideFrame>
  </Slide>
);
