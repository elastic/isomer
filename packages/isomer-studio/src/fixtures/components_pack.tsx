/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The node shapes of Kibana's `@kbn/isomer-components`, unstyled.

import type {
  DefaultPackTypes,
  NamedColor,
  PrimitiveIcon,
  StyledRenderContext,
} from '@elastic/isomer-sdk';
import {
  definePrimitiveFor,
  definePrimitivePack,
  displayValueSchema,
  formatDisplayValue,
  namedColorSchema,
  nodeAnchor,
  requiredString,
} from '@elastic/isomer-sdk';
import { fromChildren, fromTextChildren } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import type {
  SlackRichTextInline,
  SlackTableCell,
  SlackTagColor,
} from '@elastic/isomer-sdk/slack';
import { bold, SLACK_LIMITS } from '@elastic/isomer-sdk/slack';
import { z } from 'zod';

interface FixturePackTypes extends DefaultPackTypes {
  context: StyledRenderContext;
}

const definePrimitive = definePrimitiveFor<FixturePackTypes>();

const labelSchema = () => requiredString().max(200);
const textSchema = () => requiredString().max(2000);

const icon = (shapes: string): PrimitiveIcon => ({
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${shapes}</svg>`,
});

const ACCENT = 'var(--isomer-icon-accent)';

const TONE_GLYPH: Record<NamedColor, string> = {
  neutral: '⚪',
  primary: '🔵',
  accent: '🟣',
  success: '✅',
  warning: '⚠️',
  risk: '🟠',
  danger: '🔴',
};

const SLACK_TAG_COLOR: Record<NamedColor, SlackTagColor> = {
  neutral: 'gray',
  primary: 'blue',
  accent: 'purple',
  success: 'green',
  warning: 'yellow',
  risk: 'orange',
  danger: 'red',
};

const calloutSchema = z.object({
  type: z.literal('callout'),
  title: labelSchema().optional(),
  body: fromTextChildren(textSchema()),
  tone: namedColorSchema.optional(),
});

export type CalloutNode = z.infer<typeof calloutSchema>;

const calloutExample: CalloutNode = {
  type: 'callout',
  tone: 'warning',
  title: 'Error rate spiked',
  body: 'web-prod-04 saw a 4x jump in 5xx responses over the last hour.',
};

export const callout = definePrimitive<CalloutNode, typeof calloutSchema>({
  type: 'callout',
  catalog: {
    type: 'callout',
    purpose: 'Highlights the most important finding or recommended next step.',
    useWhen: ['There is one thing the reader should notice first.'],
    avoidWhen: [
      'The content is ordinary explanatory prose.',
      'Another primitive already states the finding. Use at most one callout per view.',
    ],
    example: calloutExample,
  },
  icon: icon(
    `<rect x="2" y="4" width="12" height="8" rx="2" fill="${ACCENT}" fill-opacity="0.4"/>`
  ),
  examples: [
    calloutExample,
    ...(['primary', 'success', 'danger', 'neutral'] as const).map(
      (tone): CalloutNode => ({
        type: 'callout',
        tone,
        title: `A ${tone} callout`,
        body: 'States one thing the reader should notice.',
      })
    ),
    { type: 'callout', body: 'A callout without a title or tone.' },
  ],
  schema: calloutSchema,
  renderers: {
    react: ({ type, title, body, tone = 'primary' }, { context }) => (
      <div {...nodeAnchor(context, { type })} data-tone={tone}>
        {title ? <strong>{title}</strong> : null}
        <div>{body}</div>
      </div>
    ),
    text: ({ title, body, tone }) =>
      [
        tone ? `[${tone.toUpperCase()}]` : undefined,
        title ? `${title}:` : undefined,
        body,
      ]
        .filter(Boolean)
        .join(' '),
    markdown: ({ title, body, tone = 'primary' }) =>
      md.blockquote(
        md.paragraph(
          TONE_GLYPH[tone],
          ...(title ? [' ', md.strong(title)] : [])
        ),
        md.paragraph(body)
      ),
    slack: ({ title, body }) => ({
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_quote',
          elements: [
            ...(title
              ? [
                  {
                    type: 'text' as const,
                    text: `${title}\n`,
                    style: { bold: true },
                  },
                ]
              : []),
            { type: 'text' as const, text: body },
          ],
        },
      ],
    }),
  },
});

const dividerSchema = z.object({
  type: z.literal('divider'),
  label: labelSchema().optional(),
  spacing: z.enum(['compact', 'normal', 'loose']).optional(),
});

export type DividerNode = z.infer<typeof dividerSchema>;

const dividerExample: DividerNode = {
  type: 'divider',
  label: 'Supporting evidence',
};

export const divider = definePrimitive<DividerNode, typeof dividerSchema>({
  type: 'divider',
  catalog: {
    type: 'divider',
    purpose: 'Creates a deliberate break between sections of a view.',
    useWhen: ['A long view splits into genuinely separate sections.'],
    avoidWhen: [
      'Spacing alone is enough, or the content needs a panel.',
      'The view is one short sequence of nodes; most views need no divider.',
    ],
    example: dividerExample,
  },
  icon: icon(
    `<rect x="2" y="7" width="12" height="2" rx="1" fill="${ACCENT}"/>`
  ),
  examples: [
    dividerExample,
    { type: 'divider' },
    { type: 'divider', spacing: 'compact' },
  ],
  schema: dividerSchema,
  renderers: {
    react: ({ type, label }, { context }) => (
      <div {...nodeAnchor(context, { type })}>
        {label ? <span>{label}</span> : null}
        <hr />
      </div>
    ),
    text: ({ label }) => (label ? `--- ${label} ---` : '---'),
    markdown: ({ label }) => [
      md.authored('---'),
      ...(label ? [md.paragraph(md.strong(label))] : []),
    ],
    slack: ({ label }) => [
      { type: 'divider' },
      ...(label
        ? [
            {
              type: 'context' as const,
              elements: [{ type: 'mrkdwn' as const, text: bold(label) }],
            },
          ]
        : []),
    ],
  },
});

const healthSchema = z.object({
  type: z.literal('health'),
  label: fromTextChildren(labelSchema()),
  tone: namedColorSchema.optional(),
  value: displayValueSchema.optional(),
  detail: labelSchema().optional(),
});

export type HealthNode = z.infer<typeof healthSchema>;

const healthExample: HealthNode = {
  type: 'health',
  label: 'Cluster healthy',
  tone: 'success',
};

export const health = definePrimitive<HealthNode, typeof healthSchema>({
  type: 'health',
  catalog: {
    type: 'health',
    purpose: 'States the status of one thing with a colored dot.',
    useWhen: [
      'A service, host, or check has a status worth stating on its own line.',
    ],
    avoidWhen: [
      'Several statuses belong together for comparison; use a table instead.',
    ],
    example: healthExample,
  },
  icon: icon(`<circle cx="8" cy="8" r="3" fill="${ACCENT}"/>`),
  examples: [
    healthExample,
    {
      type: 'health',
      label: 'Uptime',
      tone: 'success',
      value: { raw: 0.999, format: 'percent', precision: 1 },
      detail: 'Trailing 30 days',
    },
    ...(['neutral', 'warning', 'risk', 'danger'] as const).map(
      (tone): HealthNode => ({
        type: 'health',
        label: `A ${tone} status`,
        tone,
      })
    ),
  ],
  schema: healthSchema,
  renderers: {
    react: ({ type, label, tone = 'neutral', value, detail }, { context }) => (
      <div {...nodeAnchor(context, { type })} data-tone={tone}>
        <span>{label}</span>
        {detail ? <span>{detail}</span> : null}
        {value === undefined ? null : (
          <strong>{formatDisplayValue(value)}</strong>
        )}
      </div>
    ),
    text: ({ label, tone, value, detail }) =>
      [
        tone ? `[${tone.toUpperCase()}]` : undefined,
        label,
        value === undefined ? undefined : `— ${formatDisplayValue(value)}`,
        detail ? `(${detail})` : undefined,
      ]
        .filter(Boolean)
        .join(' '),
    markdown: ({ label, tone = 'neutral', value, detail }) =>
      md.paragraph(
        TONE_GLYPH[tone],
        ' ',
        md.strong(label),
        ...(value === undefined ? [] : [' — ', formatDisplayValue(value)]),
        ...(detail ? [' ', md.emphasis(detail)] : [])
      ),
  },
});

const statSchema = z.object({
  label: labelSchema(),
  value: displayValueSchema,
  tone: namedColorSchema.optional(),
  delta: z
    .object({ label: labelSchema(), tone: namedColorSchema.optional() })
    .optional(),
  secondary: z
    .object({ label: labelSchema(), value: displayValueSchema })
    .describe(
      'A related measurement on the same tile, smaller than `value`; not a peer stat.'
    )
    .optional(),
});

const statGroupSchema = z.object({
  type: z.literal('statGroup'),
  label: labelSchema().optional(),
  stats: fromChildren('stat', z.array(statSchema).min(1).max(12), {
    text: 'label',
  }),
});

export type StatGroupNode = z.infer<typeof statGroupSchema>;

type Stat = StatGroupNode['stats'][number];

const statGroupExample: StatGroupNode = {
  type: 'statGroup',
  label: 'Summary',
  stats: [
    { label: 'Hosts', value: { raw: 5 } },
    { label: 'Total errors', value: { raw: 12847 }, tone: 'danger' },
  ],
};

const qualifiers = ({ secondary, delta }: Stat): string[] => [
  ...(secondary
    ? [`${secondary.label} ${formatDisplayValue(secondary.value)}`]
    : []),
  ...(delta ? [delta.label] : []),
];

const slackValueCell = (stat: Stat): SlackTableCell => {
  const value = formatDisplayValue(stat.value);
  const elements: SlackRichTextInline[] = [
    stat.tone
      ? { type: 'tag', text: value, color: SLACK_TAG_COLOR[stat.tone] }
      : { type: 'text', text: value, style: { bold: true } },
    ...qualifiers(stat).map((text): SlackRichTextInline => ({
      type: 'text',
      text: ` ${text}`,
      style: { italic: true },
    })),
  ];
  return {
    type: 'rich_text',
    elements: [{ type: 'rich_text_section', elements }],
  };
};

export const statGroup = definePrimitive<StatGroupNode, typeof statGroupSchema>(
  {
    type: 'statGroup',
    catalog: {
      type: 'statGroup',
      purpose:
        'Shows a small set of key metrics, each with an optional tone, delta, and secondary value.',
      useWhen: [
        'Summarizing counts, rates, latency, totals, or health numbers.',
      ],
      avoidWhen: [
        'The values need row-level comparison; use a table instead.',
        'The second number is a peer metric; add another stat instead of a secondary value.',
      ],
      example: statGroupExample,
    },
    icon: icon(
      `<rect x="4" y="3" width="3" height="10" rx="1" fill="${ACCENT}"/>`
    ),
    examples: [
      statGroupExample,
      {
        type: 'statGroup',
        stats: [
          {
            label: 'Tests',
            value: { raw: 1963 },
            secondary: { label: 'duration', value: '3.5 min' },
            delta: { label: '+12 since yesterday', tone: 'success' },
          },
          { label: 'Failures', value: { raw: 3 }, tone: 'warning' },
        ],
      },
    ],
    schema: statGroupSchema,
    renderers: {
      react: ({ type, label, stats }, { context }) => (
        <div {...nodeAnchor(context, { type })}>
          {label ? <div>{label}</div> : null}
          {stats.map((stat, index) => (
            <div key={index} data-tone={stat.tone}>
              <strong>{formatDisplayValue(stat.value)}</strong>
              <span>{stat.label}</span>
              {qualifiers(stat).map((text) => (
                <em key={text}>{text}</em>
              ))}
            </div>
          ))}
        </div>
      ),
      text: ({ label, stats }) =>
        [
          ...(label ? [label.toUpperCase()] : []),
          ...stats.map((stat) =>
            [
              `  ${stat.label}: ${formatDisplayValue(stat.value)}`,
              ...qualifiers(stat).map((text) => `(${text})`),
            ].join(' ')
          ),
        ].join('\n'),
      markdown: ({ label, stats }) => [
        ...(label ? [md.paragraph(md.strong(label))] : []),
        md.list(
          stats.map((stat) =>
            md.paragraph(
              md.strong(stat.label),
              `: ${formatDisplayValue(stat.value)}`,
              ...qualifiers(stat).flatMap((text) => [' ', md.emphasis(text)])
            )
          )
        ),
      ],
      slack: ({ label, stats }) => {
        const columns = stats.slice(0, SLACK_LIMITS.tableColumns);
        return [
          ...(label
            ? [
                {
                  type: 'header' as const,
                  text: { type: 'plain_text' as const, text: label },
                },
              ]
            : []),
          {
            type: 'table',
            rows: [
              columns.map((stat): SlackTableCell => ({
                type: 'raw_text',
                text: stat.label,
              })),
              columns.map(slackValueCell),
            ],
            column_settings: columns.map(() => ({
              align: 'left' as const,
              is_wrapped: true,
            })),
          },
        ];
      },
    },
  }
);

export const componentsPrimitives = [
  callout,
  divider,
  health,
  statGroup,
] as const;

export const componentsAuthoring = {
  groups: [
    { title: 'Narrative and content', types: ['callout', 'divider'] },
    { title: 'Data display', types: ['health', 'statGroup'] },
  ],
};

export const componentsPack = definePrimitivePack({
  id: 'components',
  primitives: componentsPrimitives,
  authoring: componentsAuthoring,
});
