/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideCode,
  SlideFrame,
  SlideHeading,
  SlideSplit,
  SlideTable,
  SlideWindow,
  toComposition,
} from '../shim';

export const slackSlide = toComposition(
  <Slide title="The same answer in Slack and in text">
    <SlideFrame {...frame} chapterNumber="03" chapter="How it works">
      <SlideHeading
        title="The same answer in Slack and in text"
        lede="A brute-force handoff posted to a channel, and the text surface rendering the same composition."
      />
      <SlideSplit
        ratio="wideLeft"
        left={{
          items: [
            <SlideWindow
              chrome="slack"
              title="soc-handoff"
              body={[
                <SlideTable
                  label="Brute force · okta-corp"
                  columns={['Signal', 'Last 5m']}
                  rowHeaders={true}
                  rows={[
                    ['Attempts', '142'],
                    ['Sources', '38'],
                    ['Targets', '4'],
                    ['Verdict', 'Same ASN, likely coordinated'],
                  ]}
                />,
              ]}
            />,
          ],
        }}
        right={{
          items: [
            <SlideCode
              panels={[
                {
                  file: 'surfaces.text.render',
                  lines: [
                    'Brute force · okta-corp',
                    'Signal    Last 5m',
                    '--------  ----------------------------',
                    'Attempts  142',
                    'Sources   38',
                    'Targets   4',
                    'Verdict   Same ASN, likely coordinated',
                  ],
                },
              ]}
            />,
          ],
        }}
      />
    </SlideFrame>
  </Slide>
);
