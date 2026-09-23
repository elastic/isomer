/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideTableNode } from '@elastic/isomer-primitives-slides';

import { runtime } from '../runtime';
import {
  frame,
  Slide,
  SlideCard,
  SlideCardGroup,
  SlideCode,
  SlideFrame,
  SlideSplit,
  SlideStack,
  SlideTable,
  SlideTitle,
  SlideWindow,
  toComposition,
} from '../shim';

/** One answer, drawn on the left and printed by the text surface on the right. */
export const answer: SlideTableNode = {
  type: 'slideTable',
  label: 'Brute force · okta-corp',
  columns: ['Signal', 'Last 5m'],
  rowHeaders: true,
  rows: [
    ['Attempts', '142'],
    ['Sources', '38'],
    ['Targets', '4'],
    ['Verdict', 'Same ASN, likely coordinated'],
  ],
};

export const surfacesSlide = toComposition(
  <Slide title="Surfaces">
    <SlideFrame {...frame} chapter="Surfaces" chapterNumber="08">
      <SlideTitle
        eyebrow="The proof"
        title="One composition. Six surfaces."
        size="compact"
      />
      <SlideStack>
        <SlideCardGroup columns={6}>
          <SlideCard
            badge="React"
            label="Lightweight web"
            title="Embedded apps."
            tone="primary">
            Elements for hosts that want the answer inside their own page.
          </SlideCard>
          <SlideCard
            badge="HTML"
            label="Delivery"
            title="Hosted views."
            tone="teal">
            Markup, plus only the CSS this composition uses.
          </SlideCard>
          <SlideCard
            badge="SVG"
            label="Email, reports"
            title="Pixel-safe."
            tone="pink">
            An element and a stylesheet a rasterizer turns into PNG.
          </SlideCard>
          <SlideCard
            badge="Markdown"
            label="Docs, chat"
            title="Structured prose."
            tone="warning">
            For comments, docs, and the context an agent reads.
          </SlideCard>
          <SlideCard
            badge="Slack"
            label="Block Kit"
            title="In the thread."
            tone="success">
            Native blocks where a primitive writes them, markdown otherwise.
          </SlideCard>
          <SlideCard
            badge="Text"
            label="Terminal, SMS"
            title="The truth test."
            tone="primary">
            If the answer survives here, the composition is doing real work.
          </SlideCard>
        </SlideCardGroup>
        <SlideSplit
          left={
            <SlideWindow chrome="slack" title="soc-handoff">
              <SlideTable {...answer} />
            </SlideWindow>
          }
          right={
            <SlideCode label="Same answer, text surface" language="text">
              {runtime.surfaces.text.renderNode(answer)}
            </SlideCode>
          }
        />
      </SlideStack>
    </SlideFrame>
  </Slide>
);
