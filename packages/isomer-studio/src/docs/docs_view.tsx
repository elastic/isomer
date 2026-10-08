/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { PrimitiveTile } from '../chrome/primitive_tile';
import type { StudioRoute } from '../chrome/route';
import { formatRoute } from '../chrome/route';
import { useStudio } from '../studio_context';

import { ExamplesPanel } from './examples_panel';
import { PropsTable } from './props_table';

const SECTIONS = [
  { id: 'examples', title: 'Examples' },
  { id: 'guidance', title: 'Guidance' },
  { id: 'props', title: 'Props' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const sectionId = (id: SectionId) => `isomer-studio-${id}`;

/** The topmost section in view, or the first when the browser can't observe intersections. */
const useActiveSection = (
  page: string
): [SectionId, (id: SectionId) => void] => {
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id);

  useEffect(() => {
    setActive(SECTIONS[0].id);
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target: { id }, isIntersecting }) =>
          isIntersecting ? visible.add(id) : visible.delete(id)
        );
        const first = SECTIONS.find(({ id }) => visible.has(sectionId(id)));
        if (first) {
          setActive(first.id);
        }
      },
      { rootMargin: '0px 0px -60% 0px' }
    );
    SECTIONS.forEach(({ id }) => {
      const element = document.getElementById(sectionId(id));
      if (element) {
        observer.observe(element);
      }
    });
    return () => observer.disconnect();
  }, [page]);

  return [active, setActive];
};

const Section = ({
  id,
  showTitle = true,
  children,
}: {
  id: SectionId;
  showTitle?: boolean;
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
      {showTitle ? (
        <EuiTitle size="s">
          <h2>{title}</h2>
        </EuiTitle>
      ) : null}
      {children}
    </section>
  );
};

const Guidance = ({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: 'success' | 'danger';
}) => (
  <EuiPanel color={color} hasShadow={false} paddingSize="m">
    <EuiText size="xs" color={color}>
      <strong>{title}</strong>
    </EuiText>
    <EuiText size="s">
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>Not documented.</p>
      )}
    </EuiText>
  </EuiPanel>
);

const OnThisPage = ({
  active,
  onSelect,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <nav
      aria-label="On this page"
      css={css`
        position: sticky;
        top: ${euiTheme.size.xl};
        height: fit-content;
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.xxs};
      `}>
      <EuiText
        size="xs"
        color="subdued"
        css={css`
          text-transform: uppercase;
          font-weight: ${euiTheme.font.weight.semiBold};
        `}>
        On this page
      </EuiText>
      {SECTIONS.map(({ id, title }) => (
        <EuiButtonEmpty
          key={id}
          size="xs"
          flush="left"
          color={id === active ? 'primary' : 'text'}
          aria-current={id === active ? 'location' : undefined}
          css={css`
            align-self: flex-start;
          `}
          onClick={() => {
            onSelect(id);
            document
              .getElementById(sectionId(id))
              ?.scrollIntoView({ behavior: 'smooth' });
          }}>
          {title}
        </EuiButtonEmpty>
      ))}
    </nav>
  );
};

export interface DocsViewProps {
  route: StudioRoute;
  navigate: (next: Partial<StudioRoute>) => void;
}

/** The reference page for one primitive. */
export const DocsView = ({
  route: { page, example },
  navigate,
}: DocsViewProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    docs: { primitives },
  } = useStudio();
  const [active, setActive] = useActiveSection(page);
  const doc = primitives.find(({ type }) => type === page);
  if (!doc) {
    return null;
  }
  const { type, label, group, purpose, useWhen, avoidWhen, props } = doc;

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: minmax(0, 760px) 160px;
        justify-content: center;
        gap: ${euiTheme.size.xxl};
        padding: ${euiTheme.size.xl} ${euiTheme.size.xxl} ${euiTheme.size.xxxxl};
      `}>
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xl};
          min-width: 0;
        `}>
        <div>
          <EuiText size="xs" color="subdued">
            {group} /{' '}
            <EuiText size="xs" component="span">
              {label}
            </EuiText>
          </EuiText>
          <EuiFlexGroup
            gutterSize="m"
            alignItems="center"
            responsive={false}
            css={css`
              margin-block: ${euiTheme.size.s};
            `}>
            <EuiFlexItem grow={false}>
              <PrimitiveTile {...{ type }} size="l" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="l">
                <h1>{label}</h1>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiText>
            <p>{purpose}</p>
          </EuiText>
        </div>

        <Section id="examples" showTitle={false}>
          <ExamplesPanel
            key={type}
            {...{ doc, example }}
            onExampleChange={(next) => navigate({ example: next })}
            devHref={formatRoute({ mode: 'dev', page, example })}
          />
        </Section>

        <Section id="guidance" showTitle={false}>
          <EuiFlexGrid columns={2} gutterSize="l">
            <Guidance title="Use when" items={useWhen} color="success" />
            <Guidance title="Avoid when" items={avoidWhen} color="danger" />
          </EuiFlexGrid>
        </Section>

        <Section id="props">
          <PropsTable {...{ props }} />
        </Section>
      </div>

      <OnThisPage {...{ active }} onSelect={setActive} />
    </div>
  );
};
