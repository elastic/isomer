/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Example deck compositions for the slides pack.
// A deck is a Composition[] — a sequence Isomer deliberately does not model,
// because sequencing is routing and routing belongs to the host.

import type { Composition } from '@elastic/isomer-sdk';
import { buildJsxShim } from '@elastic/isomer-sdk/author';

import { slideDeckPrimitives } from '../../registry';

const {
  Composition: Slide,
  SlideBulletList,
  SlideCard,
  SlideCardGroup,
  SlideCode,
  SlideFlow,
  SlideFrame,
  SlideSplit,
  SlideStack,
  SlideTerritory,
  SlideTerritoryGroup,
  SlideTitle,
  toComposition,
} = buildJsxShim(slideDeckPrimitives);

/** Five example compositions covering this pack's primitives. */
export const deck: Composition[] = [
  toComposition(
    <Slide title="Title slide">
      <SlideFrame
        brand="Isomer"
        chapter="01 · Primitives"
        footer="Elastic"
        layout="title">
        <SlideTitle
          eyebrow="Reference pack"
          title="One composition, every surface."
          lede="The same spec renders as HTML, markdown, text, Slack, and SVG."
          size="hero"
        />
      </SlideFrame>
    </Slide>
  ),

  toComposition(
    <Slide title="Split layout">
      <SlideFrame brand="Isomer" chapter="02 · Grammar" footer="Elastic">
        <SlideSplit
          left={
            <SlideTitle
              title="Primitive pack"
              lede="Vocabulary, renderers, and validation in one value."
              size="compact"
            />
          }
          right={
            <SlideStack>
              <SlideBulletList
                label="What a pack declares"
                items={['Primitives', 'Surfaces', 'Theme bound']}
              />
            </SlideStack>
          }
        />
      </SlideFrame>
    </Slide>
  ),

  toComposition(
    <Slide title="Surface cards">
      <SlideFrame brand="Isomer" chapter="03 · Surfaces" footer="Elastic">
        <SlideTitle
          title="Six render targets."
          lede="React, HTML, SVG, Slack, Markdown, and plain text."
          size="compact"
        />
        <SlideCardGroup columns={3} style="standard">
          <SlideCard badge="01" title="React">
            Component tree; hosts mount it.
          </SlideCard>
          <SlideCard badge="02" title="HTML">
            Self-contained envelope with stylesheet.
          </SlideCard>
          <SlideCard badge="03" title="SVG">
            The same tree and stylesheet, handed to a rasterizer.
          </SlideCard>
          <SlideCard badge="04" title="Slack">
            Block Kit blocks with fallback text.
          </SlideCard>
          <SlideCard badge="05" title="Markdown">
            GitHub-flavored, readable in terminals.
          </SlideCard>
          <SlideCard badge="06" title="Text">
            80-column output for logging and alerts.
          </SlideCard>
        </SlideCardGroup>
      </SlideFrame>
    </Slide>
  ),

  toComposition(
    <Slide title="Code block">
      <SlideFrame brand="Isomer" chapter="04 · Contract" footer="Elastic">
        <SlideStack>
          <SlideTitle title="The composition contract." size="compact" />
          <SlideCode label="Composition" language="ts">
            {`const spec: Composition = {
  type: "view",
  title: "My view",
  body: [node],
};`}
          </SlideCode>
        </SlideStack>
      </SlideFrame>
    </Slide>
  ),

  toComposition(
    <Slide title="Flow diagram">
      <SlideFrame brand="Isomer" chapter="05 · Dispatch" footer="Elastic">
        <SlideStack>
          <SlideTitle title="How a composition renders." size="compact" />
          <SlideFlow
            label="Render pipeline"
            nodes={[
              'Composition',
              'Runtime',
              'Dispatcher',
              'Primitive',
              'Surface',
            ]}
            boundaryAfter={2}
          />
          <SlideTerritoryGroup>
            <SlideTerritory title="Host" tone="pink">
              Supplies composition, owns data and routing.
            </SlideTerritory>
            <SlideTerritory title="Isomer" tone="primary">
              Owns dispatch, validation, and rendering.
            </SlideTerritory>
          </SlideTerritoryGroup>
        </SlideStack>
      </SlideFrame>
    </Slide>
  ),
];
