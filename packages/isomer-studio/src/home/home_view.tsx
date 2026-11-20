/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCard,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { ColorModePreference } from '../chrome/color_mode';
import { ColorModePicker } from '../chrome/color_mode_picker';
import { ComposeIcon } from '../chrome/compose_icon';
import {
  APPS_DOCS_URL,
  DOCS_URL,
  STUDIO_CONFIG_DOCS_URL,
  VIEWS_DOCS_URL,
} from '../chrome/links';
import { Glyph, PrimitiveGlyph } from '../chrome/primitive_glyph';
import { PrimitiveSearch } from '../chrome/primitive_search';
import { formatLocation, formatRoute, GALLERY } from '../chrome/route';
import { shellBackground } from '../chrome/shell_background';
import type { ComposeParams } from '../model/compose_link';
import type { PrimitiveDoc } from '../model/describe_runtime';
import { pickFeatured } from '../model/featured';
import { SURFACE_CATALOG } from '../model/surface_catalog';
import { useStudio } from '../studio_context';
import { ReactSurface } from '../surfaces/react_surface';
import { ScaledPreview } from '../surfaces/scaled_preview';
import { SURFACE_ICONS } from '../surfaces/surface_logos';
import { previewSurfaces } from '../surfaces/surface_select';

const WIDTH = 1200;

const plural = (count: number, noun: string) =>
  `${count} ${count === 1 ? noun : `${noun}s`}`;

const heroCopy = css`
  min-width: min(100%, 360px);
`;

const fullWidth = css`
  inline-size: 100%;
`;

const cardStyles = css`
  min-width: 0;
`;

const previewStyles = css`
  aspect-ratio: 16 / 9;
  overflow: hidden;
`;

/** A featured primitive's first example, live and inert. */
const FeaturedPreview = ({
  doc: { type, examples },
}: {
  doc: PrimitiveDoc;
}) => {
  const { compose } = useStudio();
  const [example] = examples;
  // A config's `compose` or `previewExample` that throws leaves this card on its glyph, not Home blank.
  const composition = useMemo(() => {
    try {
      return example ? compose([example.node]) : undefined;
    } catch {
      return undefined;
    }
  }, [compose, example]);
  return composition ? (
    <div
      aria-hidden={true}
      css={previewStyles}
      ref={(element) => element?.setAttribute('inert', '')}>
      <ScaledPreview>
        <ReactSurface {...{ composition }} />
      </ScaledPreview>
    </div>
  ) : (
    <EuiFlexGroup
      css={previewStyles}
      justifyContent="center"
      alignItems="center">
      <PrimitiveGlyph {...{ type }} size={48} />
    </EuiFlexGroup>
  );
};

const FeaturedCard = ({ doc }: { doc: PrimitiveDoc }) => {
  const { type, label, group, purpose } = doc;
  return (
    <EuiCard
      data-testid="featured-primitive"
      css={cardStyles}
      title={label}
      titleElement="h3"
      titleSize="xs"
      textAlign="left"
      paddingSize="m"
      image={<FeaturedPreview {...{ doc }} />}
      description={purpose}
      footer={
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          <EuiButtonEmpty
            size="s"
            iconType="document"
            href={formatRoute({ mode: 'docs', page: type, example: 0 })}>
            Reference
          </EuiButtonEmpty>
          <EuiButtonEmpty
            size="s"
            iconType="code"
            href={formatRoute({ mode: 'dev', page: type, example: 0 })}>
            Workbench
          </EuiButtonEmpty>
        </EuiFlexGroup>
      }>
      <EuiText size="s" color="subdued">
        <code>{group}</code>
      </EuiText>
    </EuiCard>
  );
};

const Loaded = ({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) => (
  <EuiPanel hasBorder paddingSize="m">
    <section aria-label={title}>
      <EuiTitle size="xxs">
        <h3>
          {title} ({count})
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {children}
    </section>
  </EuiPanel>
);

/** What is missing, how to add it, and where that is documented. */
const Missing = ({
  title,
  href,
  action,
  children,
}: {
  title: string;
  href: string;
  action: string;
  children: ReactNode;
}) => (
  <EuiEmptyPrompt
    color="subdued"
    paddingSize="s"
    titleSize="xxs"
    title={<h4>{title}</h4>}
    body={<p>{children}</p>}
    actions={
      <EuiLink {...{ href }} target="_blank" external>
        {action}
      </EuiLink>
    }
  />
);

/** The landing page, without the app's header: what this Studio is for, where to start, featured primitives and what the config loaded. */
export const HomeView = ({
  title,
  onSelectPrimitive,
  colorMode,
  onColorModeChange,
  composeParams,
  missing,
}: {
  title: string;
  onSelectPrimitive: (type: string) => void;
  colorMode: ColorModePreference;
  onColorModeChange: (colorMode: ColorModePreference) => void;
  /** What the composer last showed, so Compose reopens it. */
  composeParams?: ComposeParams | undefined;
  /** The address that matched no page, which Home is showing in its place. */
  missing?: string | undefined;
}) => {
  const {
    runtime: { packs },
    apps,
    featured: featuredTypes,
    rasterizePng,
    docs: { primitives, groups, views, surfaces: supported },
  } = useStudio();
  const featured = useMemo(
    () => pickFeatured(primitives, featuredTypes),
    [primitives, featuredTypes]
  );
  const surfaces = previewSurfaces(supported, Boolean(rasterizePng));
  const first = groups[0]?.types[0] ?? primitives[0]?.type ?? '';
  const packNames = new Intl.ListFormat('en').format(packs.map(({ id }) => id));
  const { euiTheme } = useEuiTheme();

  return (
    <div data-testid="home">
      <EuiPageSection
        restrictWidth={WIDTH}
        paddingSize="xl"
        bottomBorder="extended"
        css={shellBackground(euiTheme, 'docs')}>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}>
          <EuiText size="s">
            <strong>{title}</strong>
          </EuiText>
          <ColorModePicker {...{ colorMode, onColorModeChange }} />
        </EuiFlexGroup>
        {missing === undefined ? null : (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              color="warning"
              iconType="warning"
              size="s"
              title={
                <>
                  No page at <code>{missing}</code>. Showing Home instead.
                </>
              }
            />
          </>
        )}
        <EuiSpacer size="xl" />
        <EuiFlexGroup gutterSize="xl" alignItems="center" wrap>
          <EuiFlexItem grow={2} css={heroCopy}>
            <EuiTitle size="l">
              <h1>What are we rendering today?</h1>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="m">
              <p>
                Learn every primitive of {packNames}, edit it live, and see one
                composition render on every surface your product speaks.
              </p>
            </EuiText>
            <EuiSpacer size="l" />
            <PrimitiveSearch
              size="large"
              placeholder="Search primitives by name or purpose"
              {...{ onSelectPrimitive }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1} css={heroCopy}>
            <EuiPanel hasBorder paddingSize="l">
              <EuiFlexGroup responsive={false} gutterSize="m">
                {[
                  { count: primitives.length, label: 'Primitives' },
                  { count: groups.length, label: 'Groups' },
                  { count: surfaces.length, label: 'Surfaces' },
                ].map(({ count, label }) => (
                  <EuiFlexItem key={label}>
                    <EuiStat
                      title={count}
                      description={label}
                      reverse
                      titleSize="m"
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
              <EuiHorizontalRule margin="m" />
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiButton
                  fill
                  fullWidth
                  iconType="apps"
                  href={formatRoute({
                    mode: 'docs',
                    page: GALLERY,
                    example: 0,
                  })}>
                  Browse primitives
                </EuiButton>
                <EuiButton
                  fullWidth
                  iconType="code"
                  href={formatRoute({ mode: 'dev', page: first, example: 0 })}>
                  Open the Workbench
                </EuiButton>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiFlexGroup responsive={false} gutterSize="s">
                <EuiFlexItem>
                  <EuiButtonEmpty
                    css={fullWidth}
                    size="s"
                    iconType={ComposeIcon}
                    href={formatLocation({
                      compose: true,
                      params: composeParams ?? {},
                    })}>
                    Compose
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonEmpty
                    css={fullWidth}
                    size="s"
                    iconType="external"
                    iconSide="right"
                    href={DOCS_URL}
                    target="_blank">
                    Isomer docs
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>

      <EuiPageSection
        restrictWidth={WIDTH}
        color="subdued"
        aria-labelledby="isomer-studio-featured">
        <EuiTitle size="m">
          <h2 id="isomer-studio-featured">Featured primitives</h2>
        </EuiTitle>
        <EuiSpacer />
        <EuiFlexGrid columns={3} gutterSize="l">
          {featured.map((doc) => (
            <FeaturedCard key={doc.type} {...{ doc }} />
          ))}
        </EuiFlexGrid>
        <EuiSpacer />
        <EuiButtonEmpty
          iconType="sortRight"
          iconSide="right"
          href={formatRoute({ mode: 'docs', page: GALLERY, example: 0 })}>
          All {plural(primitives.length, 'primitive')}
        </EuiButtonEmpty>
      </EuiPageSection>

      <EuiPageSection
        restrictWidth={WIDTH}
        aria-labelledby="isomer-studio-surfaces">
        <EuiFlexGroup gutterSize="xl" wrap>
          <EuiFlexItem grow={1} css={heroCopy}>
            <EuiTitle size="m">
              <h2 id="isomer-studio-surfaces">Author once, render anywhere</h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText color="subdued">
              <p>
                Isomer turns one typed composition into every surface your
                product speaks. These are the ones this runtime renders.
              </p>
              <p>
                Hosts keep their data, authorization and routing. Isomer owns
                the contract, the primitive catalog, validation and rendering.
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiFlexGrid columns={4} gutterSize="m">
              {surfaces.map((surface) => (
                <EuiCard
                  key={surface}
                  data-testid="home-surface"
                  css={cardStyles}
                  layout="vertical"
                  paddingSize="s"
                  titleElement="h3"
                  titleSize="xs"
                  icon={<EuiIcon type={SURFACE_ICONS[surface]} size="xl" />}
                  title={SURFACE_CATALOG[surface].label}
                  description={SURFACE_CATALOG[surface].note}
                />
              ))}
            </EuiFlexGrid>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>

      <EuiPageSection
        restrictWidth={WIDTH}
        color="subdued"
        aria-labelledby="isomer-studio-loaded">
        <EuiTitle size="m">
          <h2 id="isomer-studio-loaded">Loaded in this Studio</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            Everything here comes from the Studio config: the runtime and its
            packs, the apps, and which primitives are featured.{' '}
            <EuiLink href={STUDIO_CONFIG_DOCS_URL} target="_blank" external>
              Edit the config
            </EuiLink>
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGrid columns={3} gutterSize="l">
          <Loaded title="Primitive packs" count={packs.length}>
            <EuiDescriptionList
              listItems={packs.map(({ id, primitives: types, authoring }) => {
                const groupCount = authoring?.groups?.length ?? 0;
                return {
                  title: <code>{id}</code>,
                  description: [
                    plural(types.length, 'primitive'),
                    ...(groupCount ? [plural(groupCount, 'group')] : []),
                  ].join(' · '),
                };
              })}
            />
          </Loaded>
          <Loaded title="Apps" count={apps.length}>
            {apps.length ? (
              <EuiDescriptionList
                listItems={apps.map(
                  ({ id, title: name, description, icon }) => ({
                    title: (
                      <EuiLink
                        data-testid="home-app"
                        href={formatLocation({ app: id, path: '' })}>
                        <Glyph svg={icon?.svg} label={name} size={14} /> {name}
                      </EuiLink>
                    ),
                    description: description ?? `Opens ${name}.`,
                  })
                )}
              />
            ) : (
              <Missing
                title="No apps configured"
                href={APPS_DOCS_URL}
                action="Read about apps">
                An app is a page of the Studio that shows the pack in use: add{' '}
                <code>{'{ id, title, description, load }'}</code> to the
                config&apos;s <code>apps</code>.
              </Missing>
            )}
          </Loaded>
          <Loaded title="Views" count={views.length}>
            {views.length ? (
              <EuiDescriptionList
                listItems={views.map(({ id, title: name, description }) => ({
                  title: <code>{id}</code>,
                  description: description || name,
                }))}
              />
            ) : (
              <Missing
                title="No views registered"
                href={VIEWS_DOCS_URL}
                action="Read about views">
                A view is a host-owned composition the runtime builds by id:
                define one with <code>defineView</code> and pass it in{' '}
                <code>{'createIsomerRuntime({ views })'}</code>, or register it
                on <code>runtime.viewRegistry</code>.
              </Missing>
            )}
          </Loaded>
        </EuiFlexGrid>
      </EuiPageSection>
    </div>
  );
};
