/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { Accent } from '../chrome/accent';
import { PrimitiveHeading } from '../chrome/primitive_heading';
import type { StudioRoute } from '../chrome/route';
import { formatRoute } from '../chrome/route';
import { useStudio } from '../studio_context';

import { ExamplesPanel } from './examples_panel';
import { InlineCode } from './inline_code';
import {
  CONTENT_BASIS,
  OnThisPage,
  PAGE_WIDTH,
  TOC_GAP,
  useActiveEntry,
} from './on_this_page';
import { PropsTable } from './props_table';

const SECTIONS = [
  { id: 'examples', title: 'Examples' },
  { id: 'guidance', title: 'Guidance' },
  { id: 'props', title: 'Props' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const sectionId = (id: SectionId) => `isomer-studio-${id}`;

const TOC_ENTRIES = SECTIONS.map(({ id, title }) => ({
  id: sectionId(id),
  title,
}));

const TOC_IDS = TOC_ENTRIES.map(({ id }) => id);

const Section = ({
  id,
  children,
}: {
  id: SectionId;
  children: React.ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  const { title } = SECTIONS.find((section) => section.id === id) ?? {
    title: id,
  };
  return (
    <section
      id={sectionId(id)}
      aria-label={title}
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.m};
        scroll-margin-top: ${euiTheme.size.l};
      `}>
      <EuiTitle size="s">
        <h2>{title}</h2>
      </EuiTitle>
      {children}
    </section>
  );
};

const Guidance = ({
  title,
  items,
  color,
  names,
}: {
  title: string;
  items: string[];
  color: 'success' | 'danger';
  names: readonly string[];
}) => (
  <EuiPanel color={color} hasShadow={false} paddingSize="m">
    <EuiText size="xs" color={color}>
      <strong>{title}</strong>
    </EuiText>
    <EuiText size="s">
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>
              <InlineCode text={item} {...{ names }} />
            </li>
          ))}
        </ul>
      ) : (
        <p>Not documented.</p>
      )}
    </EuiText>
  </EuiPanel>
);

export interface DocsViewProps {
  route: StudioRoute;
  navigate: (next: Partial<StudioRoute>) => void;
  accent: Accent;
}

/** The reference page for one primitive. */
export const DocsView = ({
  route: { page, example },
  navigate,
  accent,
}: DocsViewProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    docs: { primitives },
  } = useStudio();
  const [active, setActive] = useActiveEntry(TOC_IDS, page);
  const names = useMemo(() => primitives.map(({ type }) => type), [primitives]);
  const doc = primitives.find(({ type }) => type === page);
  if (!doc) {
    return null;
  }
  const { type, useWhen, avoidWhen, props } = doc;

  return (
    <div
      css={css`
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: ${TOC_GAP}px;
        max-width: ${PAGE_WIDTH}px;
        margin-inline: auto;
        padding: ${euiTheme.size.xl} ${euiTheme.size.xxl} ${euiTheme.size.xxxxl};
      `}>
      <div
        css={css`
          flex: 1 1 ${CONTENT_BASIS}px;
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xl};
          min-width: 0;
        `}>
        <PrimitiveHeading {...{ doc }} />

        <Section id="examples">
          <ExamplesPanel
            key={type}
            {...{ doc, example }}
            onExampleChange={(next) => navigate({ example: next })}
            devHref={formatRoute({ mode: 'dev', page, example })}
          />
        </Section>

        <Section id="guidance">
          <div
            css={css`
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
              align-items: start;
              gap: ${euiTheme.size.l};
            `}>
            <Guidance
              title="Use when"
              items={useWhen}
              color="success"
              {...{ names }}
            />
            <Guidance
              title="Avoid when"
              items={avoidWhen}
              color="danger"
              {...{ names }}
            />
          </div>
        </Section>

        <Section id="props">
          <PropsTable {...{ props, accent, names }} />
        </Section>
      </div>

      <OnThisPage entries={TOC_ENTRIES} {...{ active }} onSelect={setActive} />
    </div>
  );
};
